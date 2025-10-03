import { useState, useCallback } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";

// Local Message type removed (unused)

export function useTransferOperations() {
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransactionBlock } =
    useSignAndExecuteTransaction();

  const [pendingTransfer, setPendingTransfer] = useState<any>(null);
  const [estimatedGasFee, setEstimatedGasFee] = useState<number>(0);
  const [isEstimatingGas, setIsEstimatingGas] = useState<boolean>(false);
  const [isExecutingTransaction, setIsExecutingTransaction] =
    useState<boolean>(false);
  const [showConfirmTransactions, setShowConfirmTransactions] =
    useState<boolean>(false);
  const [currentTransactionIndex, setCurrentTransactionIndex] =
    useState<number>(0);

  const validateTransferInfo = useCallback((transferIntent: any) => {
    const errors: string[] = [];

    // Check if we have recipient information
    if (transferIntent.recipients && transferIntent.recipients.length > 0) {
      // Multiple recipients
      transferIntent.recipients.forEach((recipient: any, index: number) => {
        if (!recipient.to_address || recipient.to_address.trim() === "") {
          errors.push(`Recipient ${index + 1}: Missing address`);
        }
        if (!recipient.amount || recipient.amount <= 0) {
          errors.push(`Recipient ${index + 1}: Invalid amount`);
        }
      });
    } else {
      // Single recipient
      if (
        !transferIntent.to_address ||
        transferIntent.to_address.trim() === ""
      ) {
        errors.push("Missing recipient address");
      }
      if (!transferIntent.amount || transferIntent.amount <= 0) {
        errors.push("Invalid amount");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  const estimateGasFee = useCallback(
    async (transferIntent: any, currentAccount: any) => {
      if (!currentAccount || !suiClient) return 0.001; // Fallback

      try {
        const tx = new Transaction();

        if (transferIntent.recipients && transferIntent.recipients.length > 1) {
          // Multiple recipients
          const amounts = transferIntent.recipients.map((r: any) =>
            Math.floor(r.amount * Number(MIST_PER_SUI))
          );
          const coins = tx.splitCoins(tx.gas, amounts);

          transferIntent.recipients.forEach((recipient: any, index: number) => {
            tx.transferObjects([coins[index]], recipient.to_address);
          });
        } else {
          // Single recipient
          const amount = Math.floor(
            (transferIntent.amount || 0) * Number(MIST_PER_SUI)
          );
          const [coin] = tx.splitCoins(tx.gas, [amount]);
          tx.transferObjects([coin], transferIntent.to_address || "");
        }

        // Set sender for dry run
        tx.setSender(currentAccount.address);

        // Build transaction for dry run
        const builtTx = await tx.build({ client: suiClient });

        // Dry run to get gas estimation
        const dryRunResult = await suiClient.dryRunTransactionBlock({
          transactionBlock: builtTx,
        });

        // Get gas used from effects
        const gasUsed = dryRunResult.effects?.gasUsed;
        if (gasUsed) {
          // Total gas cost = computationCost + storageCost + storageRebate
          const totalGasCost =
            (Number(gasUsed.computationCost) || 0) +
            (Number(gasUsed.storageCost) || 0) -
            (Number(gasUsed.storageRebate) || 0);

          // Convert from MIST to SUI
          const gasFeeInSui = totalGasCost / Number(MIST_PER_SUI);
          return Math.max(gasFeeInSui, 0.001); // Minimum 0.001 SUI
        }

        return 0.001; // Fallback
      } catch (error) {
        console.error("Gas estimation error:", error);
        return 0.001; // Fallback
      }
    },
    [suiClient]
  );

  const handleTransferIntent = useCallback(
    (transferIntent: any, currentAccount: any) => {
      // Validate transfer information first
      const validation = validateTransferInfo(transferIntent);

      if (!validation.isValid) {
        return {
          isValid: false,
          message: {
            id: Date.now().toString(),
            type: "assistant" as const,
            content: `I need more information to complete this transfer:\n\n${validation.errors
              .map((error) => `• ${error}`)
              .join("\n")}\n\nPlease provide the missing details.`,
            timestamp: new Date(),
          },
        };
      }

      // If validation passes, store transfer intent and ask user to confirm
      setPendingTransfer(transferIntent);
      setEstimatedGasFee(0);
      setIsEstimatingGas(true);
      // Open the confirmation dialog so the user can confirm & trigger wallet
      setShowConfirmTransactions(true);

      // Estimate gas fee
      estimateGasFee(transferIntent, currentAccount).then((fee) => {
        setEstimatedGasFee(fee);
        setIsEstimatingGas(false);
      });

      return { isValid: true };
    },
    [validateTransferInfo, estimateGasFee]
  );

  const executeSerialTransactions = useCallback(
    async (recipients: any[]) => {
      const results = [];

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const tx = new Transaction();
        const amount = Math.floor(recipient.amount * Number(MIST_PER_SUI));
        const [coin] = tx.splitCoins(tx.gas, [amount]);
        tx.transferObjects([coin], recipient.to_address);

        // Execute individual transaction
        const result = await signAndExecuteTransactionBlock({
          transaction: tx,
        });

        results.push(result);
      }

      return results;
    },
    [signAndExecuteTransactionBlock]
  );

  const executeSingleTransaction = useCallback(
    async (transferData: any) => {
      const tx = new Transaction();
      const amount = Math.floor(
        (transferData.amount || 0) * Number(MIST_PER_SUI)
      );
      const [coin] = tx.splitCoins(tx.gas, [amount]);
      tx.transferObjects([coin], transferData.to_address || "");

      // Execute the transaction
      const result = await signAndExecuteTransactionBlock({
        transaction: tx,
      });

      return result;
    },
    [signAndExecuteTransactionBlock]
  );

  const handleConfirmTransfer = useCallback(async () => {
    if (!pendingTransfer) return undefined as any;

    setIsExecutingTransaction(true);

    try {
      if (pendingTransfer.recipients && pendingTransfer.recipients.length > 1) {
        // Serial transactions for multiple recipients
        const results = await executeSerialTransactions(
          pendingTransfer.recipients
        );
        return results;
      } else {
        // Single transaction for single recipient
        const result = await executeSingleTransaction(pendingTransfer);
        return result;
      }
    } catch (error) {
      console.error("Transfer error:", error);
      throw error;
    } finally {
      setPendingTransfer(null);
      setIsExecutingTransaction(false);
    }
  }, [pendingTransfer, executeSerialTransactions, executeSingleTransaction]);

  const handleCancelTransfer = useCallback(() => {
    setPendingTransfer(null);
    setEstimatedGasFee(0);
    setIsEstimatingGas(false);
    setIsExecutingTransaction(false);
    setShowConfirmTransactions(false);
    setCurrentTransactionIndex(0);
  }, []);

  const handleCarouselNavigation = useCallback((newIndex: number) => {
    setCurrentTransactionIndex(newIndex);
  }, []);

  const handlePreviousTransaction = useCallback(() => {
    if (currentTransactionIndex > 0) {
      handleCarouselNavigation(currentTransactionIndex - 1);
    }
  }, [currentTransactionIndex, handleCarouselNavigation]);

  const handleNextTransaction = useCallback(() => {
    if (
      pendingTransfer?.recipients &&
      currentTransactionIndex < pendingTransfer.recipients.length - 1
    ) {
      handleCarouselNavigation(currentTransactionIndex + 1);
    }
  }, [
    pendingTransfer?.recipients,
    currentTransactionIndex,
    handleCarouselNavigation,
  ]);

  return {
    pendingTransfer,
    estimatedGasFee,
    isEstimatingGas,
    isExecutingTransaction,
    showConfirmTransactions,
    currentTransactionIndex,
    setShowConfirmTransactions,
    handleTransferIntent,
    handleConfirmTransfer,
    handleCancelTransfer,
    handlePreviousTransaction,
    handleNextTransaction,
  };
}
