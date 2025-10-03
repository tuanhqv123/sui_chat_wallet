import { Button } from "../ui/button";

interface TransferConfirmationDialogProps {
  pendingTransfer: any;
  showConfirmTransactions: boolean;
  currentTransactionIndex: number;
  isEstimatingGas: boolean;
  estimatedGasFee: number;
  walletData: any;
  isExecutingTransaction: boolean;
  onPreviousTransaction: () => void;
  onNextTransaction: () => void;
  onCancelTransfer: () => void;
  onConfirmTransfer: () => void;
}

export function TransferConfirmationDialog({
  pendingTransfer,
  showConfirmTransactions,
  currentTransactionIndex,
  isEstimatingGas,
  estimatedGasFee,
  walletData,
  isExecutingTransaction,
  onPreviousTransaction,
  onNextTransaction,
  onCancelTransfer,
  onConfirmTransfer,
}: TransferConfirmationDialogProps) {
  if (!pendingTransfer || !showConfirmTransactions) return null;

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
      <div className="bg-bg border-2 border-border rounded-base p-6 max-w-2xl w-full mx-4">
        <h3 className="text-lg font-heading mb-4 text-text text-left">
          Confirm Transactions
        </h3>

        {/* Transaction Display */}
        <div className="mb-6">
          {pendingTransfer.recipients &&
          pendingTransfer.recipients.length > 1 ? (
            // Multiple recipients - show current transaction only
            <div className="bg-bw border-2 border-border rounded-base p-6">
              <div className="text-center">
                <h4 className="font-bold mb-2 text-left">
                  Transaction {currentTransactionIndex + 1} of{" "}
                  {pendingTransfer.recipients.length}
                </h4>
                <div className="text-sm space-y-3 text-left">
                  <div>
                    <strong>From:</strong>
                    <div className="break-words font-mono text-xs mt-1 bg-gray-50 p-2 rounded border whitespace-pre-wrap">
                      {pendingTransfer.from_address}
                    </div>
                  </div>
                  <div>
                    <strong>To:</strong>
                    <div className="break-words font-mono text-xs mt-1 bg-gray-50 p-2 rounded border whitespace-pre-wrap">
                      {
                        pendingTransfer.recipients[currentTransactionIndex]
                          .to_address
                      }
                    </div>
                  </div>
                  <div>
                    <strong>Amount:</strong>{" "}
                    {pendingTransfer.recipients[currentTransactionIndex].amount}{" "}
                    {pendingTransfer.token_type}
                  </div>
                  <div>
                    <strong>Gas Fee (estimated):</strong>{" "}
                    {isEstimatingGas ? (
                      <span className="text-sm text-gray-500">
                        Estimating...
                      </span>
                    ) : (
                      `0.001 SUI`
                    )}
                  </div>
                  <div>
                    <strong>Network:</strong> {pendingTransfer.network}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Single recipient
            <div className="bg-bw border-2 border-border rounded-base p-6">
              <div className="text-center">
                <h4 className="font-bold mb-4 text-left">Transaction</h4>
                <div className="text-sm space-y-3 text-left">
                  <div>
                    <strong>From:</strong>
                    <div className="break-words font-mono text-xs mt-1 bg-gray-50 p-2 rounded border whitespace-pre-wrap">
                      {pendingTransfer.from_address}
                    </div>
                  </div>
                  <div>
                    <strong>To:</strong>
                    <div className="break-words font-mono text-xs mt-1 bg-gray-50 p-2 rounded border whitespace-pre-wrap">
                      {pendingTransfer.to_address}
                    </div>
                  </div>
                  <div>
                    <strong>Amount:</strong> {pendingTransfer.amount}{" "}
                    {pendingTransfer.token_type}
                  </div>
                  <div>
                    <strong>Gas Fee (estimated):</strong>{" "}
                    {isEstimatingGas ? (
                      <span className="text-sm text-gray-500">
                        Estimating...
                      </span>
                    ) : (
                      `0.001 SUI`
                    )}
                  </div>
                  <div>
                    <strong>Network:</strong> {pendingTransfer.network}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons for multiple transactions */}
          {pendingTransfer.recipients &&
            pendingTransfer.recipients.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button
                  variant="default"
                  size="sm"
                  className="w-24"
                  onClick={onPreviousTransaction}
                  disabled={currentTransactionIndex === 0}
                >
                  ← Previous
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  className="w-24"
                  onClick={onNextTransaction}
                  disabled={
                    currentTransactionIndex >=
                    pendingTransfer.recipients.length - 1
                  }
                >
                  Next →
                </Button>
              </div>
            )}
        </div>

        {/* Summary */}
        <div className="bg-main border-2 border-border rounded-base p-4 mb-4">
          <h4 className="font-bold mb-3 text-left">Summary</h4>
          <div className="text-sm space-y-2 text-left">
            <div>
              <strong>Total Transactions:</strong>{" "}
              {pendingTransfer.recipients &&
              pendingTransfer.recipients.length > 1
                ? pendingTransfer.recipients.length
                : 1}
            </div>
            <div>
              <strong>Total Amount:</strong>{" "}
              {pendingTransfer.recipients &&
              pendingTransfer.recipients.length > 1
                ? `${pendingTransfer.recipients.reduce(
                    (sum: number, r: any) => sum + parseFloat(r.amount),
                    0
                  )} ${pendingTransfer.token_type}`
                : `${pendingTransfer.amount} ${pendingTransfer.token_type}`}
            </div>
            <div>
              <strong>Total Gas Fee:</strong>{" "}
              {isEstimatingGas ? (
                <span className="text-sm text-gray-500">Estimating...</span>
              ) : (
                `${parseFloat(
                  (
                    0.001 *
                    (pendingTransfer.recipients &&
                    pendingTransfer.recipients.length > 1
                      ? pendingTransfer.recipients.length
                      : 1)
                  ).toFixed(6)
                )} SUI`
              )}
            </div>
            <div className="font-semibold">
              <strong>After Transaction Balance:</strong>{" "}
              {walletData?.balance && !isEstimatingGas
                ? `${(
                    parseFloat(walletData.balance) -
                    (pendingTransfer.recipients &&
                    pendingTransfer.recipients.length > 1
                      ? pendingTransfer.recipients.reduce(
                          (sum: number, r: any) => sum + parseFloat(r.amount),
                          0
                        )
                      : parseFloat(pendingTransfer.amount)) -
                    estimatedGasFee
                  ).toFixed(6)} SUI`
                : "Calculating..."}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {pendingTransfer.recipients && pendingTransfer.recipients.length > 1
            ? "Review each transaction above. You will be prompted to sign each transaction individually."
            : "Are you sure you want to execute this transaction?"}
        </p>

        <div className="flex gap-2 justify-end">
          <Button
            variant="neutral"
            onClick={onCancelTransfer}
            disabled={isExecutingTransaction}
          >
            Cancel
          </Button>
          <Button onClick={onConfirmTransfer} disabled={isExecutingTransaction}>
            {isExecutingTransaction ? "Executing..." : "Confirm & Execute"}
          </Button>
        </div>
      </div>
    </div>
  );
}
