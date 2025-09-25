import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  useCurrentAccount,
  useDisconnectWallet,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction as SuiTransaction } from "@mysten/sui/transactions";
import ReactMarkdown from "react-markdown";
// import { ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { suiService, type WalletInfo } from "../services/sui";
import { cryptoPriceService } from "../services/crypto-price";
import {
  useModels,
  useChat,
  useNFTMint,
  useImageUpload,
  useImageGeneration,
} from "../hooks/useApi";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

interface ChatInterfaceProps {
  sessionId: string;
  currentMode: "nft" | "transfer";
  onModeChange: (mode: "nft" | "transfer") => void;
}

export function ChatInterface({
  sessionId,
  currentMode,
  onModeChange,
}: ChatInterfaceProps) {
  // Session ID is available but not currently used
  console.log("Session ID:", sessionId);
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransactionBlock } =
    useSignAndExecuteTransaction();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hello! I'm your Sui blockchain assistant. I can help you:\n\n• Send SUI tokens to other addresses\n• Check your wallet balance and assets\n• View transaction history\n• Get cryptocurrency prices\n\nWhat would you like to do today?",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("x-ai/grok-4-fast:free");
  const [walletData, setWalletData] = useState<WalletInfo | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<any>(null);
  const [pendingNFTMint, setPendingNFTMint] = useState<any>(null);
  const [estimatedGasFee, setEstimatedGasFee] = useState<number>(0);
  const [isEstimatingGas, setIsEstimatingGas] = useState<boolean>(false);
  const [showNFTMintDialog, setShowNFTMintDialog] = useState(false);
  const [isExecutingTransaction, setIsExecutingTransaction] =
    useState<boolean>(false);
  const [showConfirmTransactions, setShowConfirmTransactions] =
    useState<boolean>(false);
  const [currentTransactionIndex, setCurrentTransactionIndex] =
    useState<number>(0);
  const [hasViewedAllTransactions, setHasViewedAllTransactions] =
    useState<boolean>(false);
  const [nftForm, setNftForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    imageFile: null as File | null,
  });

  // API hooks
  const { data: modelsData, isLoading: modelsLoading } = useModels();
  const chatMutation = useChat();
  const nftMintMutation = useNFTMint();
  const imageUploadMutation = useImageUpload();
  const imageGenerationMutation = useImageGeneration();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing API key on mount - no need to show dialog automatically

  const fetchWalletData = useCallback(async () => {
    if (!currentAccount?.address) return;

    try {
      const completeWalletInfo = await suiService.getCompleteWalletInfo(
        currentAccount.address
      );
      setWalletData(completeWalletInfo);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    }
  }, [currentAccount?.address]);

  // Fetch wallet data when account changes
  useEffect(() => {
    if (currentAccount?.address) {
      fetchWalletData();
    }
  }, [currentAccount?.address, fetchWalletData]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get AI response using TanStack Query mutation
      const data = await chatMutation.mutateAsync({
        message: userMessage.content,
        model: selectedModel,
        wallet_address: currentAccount?.address || "",
        current_balance: walletData?.balance || "0", // Send current balance for validation
        mode: currentMode, // Pass current mode to backend
      });

      const response = data.reply;

      // Handle structured response
      let responseContent;
      if (response.type === "transfer_intent") {
        // Use new function with validation
        handleTransferIntent(response.transfer_intent);
        responseContent = response.message;
      } else if (response.type === "nft_collect_info") {
        // Handle NFT information collection
        responseContent = response.message;
        // Continue conversation to collect more info
      } else if (response.type === "nft_creation_intent") {
        // Handle NFT creation with image generation
        handleNFTCreationIntent(response.nft_creation_intent);
        responseContent = response.message;
      } else if (response.type === "nft_mint_intent") {
        setPendingNFTMint(response.nft_mint_intent);
        setShowNFTMintDialog(true);
        responseContent = response.message;
      } else {
        // Check if user wants to show confirm transactions
        if (
          userMessage.content
            .toLowerCase()
            .includes("show confirm transactions") &&
          pendingTransfer
        ) {
          setShowConfirmTransactions(true);
          setCurrentTransactionIndex(0);
          setHasViewedAllTransactions(false);
          responseContent = "Showing transaction confirmation dialog...";
        } else {
          responseContent = response.message || response;
        }
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Check if the AI response suggests refreshing wallet data
      if (
        responseContent.toLowerCase().includes("balance") ||
        responseContent.toLowerCase().includes("check") ||
        responseContent.toLowerCase().includes("refresh")
      ) {
        await fetchWalletData();
      }

      // Handle specific blockchain operations
      await handleBlockchainIntent(input.trim());
    } catch (error: unknown) {
      console.error("Error sending message:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        timestamp: new Date(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockchainIntent = async (userInput: string) => {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes("send") || lowerInput.includes("transfer")) {
      // This will be handled by AI response parsing
    } else if (
      lowerInput.includes("balance") ||
      lowerInput.includes("assets")
    ) {
      await handleBalanceQuery();
    } else if (lowerInput.includes("price") || lowerInput.includes("crypto")) {
      await handlePriceQuery(userInput);
    } else if (
      lowerInput.includes("history") ||
      lowerInput.includes("transaction")
    ) {
      await handleTransactionHistory();
    }
  };

  const handleBalanceQuery = async () => {
    if (!currentAccount?.address) return;

    let balanceContent = `**Your Wallet Balance:**\n\n`;
    balanceContent += `**SUI Balance:** ${walletData?.balance || "0"} SUI\n`;
    balanceContent += `**Address:** \`${currentAccount.address.slice(
      0,
      8
    )}...${currentAccount.address.slice(-6)}\`\n`;
    balanceContent += `**Network:** ${walletData?.network || "Unknown"}\n\n`;

    if (walletData?.tokens && walletData.tokens.length > 0) {
      balanceContent += `**Other Tokens:**\n`;
      walletData.tokens.forEach((token, index) => {
        const formattedBalance = (
          parseFloat(token.balance) / Math.pow(10, 9)
        ).toFixed(4);
        balanceContent += `${index + 1}. ${
          token.metadata?.name || "Unknown"
        } (${token.metadata?.symbol || "?"}): ${formattedBalance}\n`;
      });
      balanceContent += `\nTotal tokens: ${walletData.tokens.length}`;
    } else {
      balanceContent += `**Other Tokens:** None found`;
    }

    if (walletData?.nfts && walletData.nfts.length > 0) {
      balanceContent += `\n\n**NFTs:**\n`;
      walletData.nfts.forEach((nft, index) => {
        balanceContent += `${index + 1}. ${nft.name || "Unknown NFT"} (${
          nft.type
        })\n`;
      });
      balanceContent += `\nTotal NFTs: ${walletData.nfts.length}`;
    } else {
      balanceContent += `\n\n**NFTs:** None found`;
    }

    const balanceMessage: Message = {
      id: Date.now().toString(),
      type: "assistant",
      content: balanceContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, balanceMessage]);
  };

  const handlePriceQuery = async (userInput: string) => {
    // Show loading message
    const loadingMessage: Message = {
      id: Date.now().toString(),
      type: "assistant",
      content: "Fetching real-time cryptocurrency prices...",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Extract specific crypto from user input if mentioned
      const input = userInput.toLowerCase();
      let cryptos = ["SUI", "BTC", "ETH", "SOL"];

      if (input.includes("sui")) cryptos = ["SUI"];
      else if (input.includes("bitcoin") || input.includes("btc"))
        cryptos = ["BTC"];
      else if (input.includes("ethereum") || input.includes("eth"))
        cryptos = ["ETH"];
      else if (input.includes("solana") || input.includes("sol"))
        cryptos = ["SOL"];

      const priceData = await cryptoPriceService.getPrices(cryptos);

      if (priceData.length === 0) {
        throw new Error("Could not fetch price data");
      }

      let priceContent = `**Live Cryptocurrency Prices:**\n\n`;

      priceData.forEach((crypto) => {
        const changeSign = crypto.change24h >= 0 ? "+" : "";
        const formattedPrice = cryptoPriceService.formatPrice(crypto.price);

        priceContent += `**${crypto.name} (${crypto.symbol})**: $${formattedPrice}\n`;
        priceContent += `   24h Change: ${changeSign}${crypto.change24h.toFixed(
          2
        )}%\n`;

        if (crypto.marketCap) {
          priceContent += `   Market Cap: ${cryptoPriceService.formatMarketCap(
            crypto.marketCap
          )}\n`;
        }
        priceContent += `\n`;
      });

      priceContent += `Last updated: ${new Date().toLocaleTimeString()}\n`;
      priceContent += `Data provided by CoinGecko API`;

      // Replace loading message with actual data
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id ? { ...msg, content: priceContent } : msg
        )
      );
    } catch (error) {
      console.error("Error fetching crypto prices:", error);

      // Replace loading message with error message
      const errorContent = `**Unable to fetch live prices**\n\nUsing cached/demo data instead:\n\n**SUI**: $2.34 (+5.67%)\n**BTC**: $65,432.10 (-2.15%)\n**ETH**: $3,421.67 (+1.23%)\n**SOL**: $198.45 (+4.56%)\n\nCheck your internet connection for live prices.`;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id ? { ...msg, content: errorContent } : msg
        )
      );
    }
  };

  const handleTransactionHistory = async () => {
    if (!currentAccount?.address) return;

    try {
      const transactions = await suiService.getTransactionHistory(
        currentAccount.address,
        5
      );

      let historyContent = `**Recent Transactions:**\n\n`;

      if (transactions.length > 0) {
        transactions.forEach((tx, index) => {
          const statusText = tx.status === "success" ? "SUCCESS" : "FAILED";
          historyContent += `${index + 1}. ${tx.type.toUpperCase()}: ${
            tx.amount
          } SUI (${statusText})\n`;
          if (tx.recipients && tx.recipients.length > 0) {
            historyContent += `   To: ${suiService.formatAddress(
              tx.recipients[0]
            )}\n`;
          }
          if (tx.timestamp) {
            historyContent += `   ${new Date(tx.timestamp).toLocaleString()}\n`;
          }
          historyContent += `\n`;
        });

        historyContent += `View more on [Sui Explorer](${suiService.getExplorerUrl(
          ""
        )})`;
      } else {
        historyContent += `No transactions found for this address.`;
      }

      const historyMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: historyContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, historyMessage]);
    } catch (error) {
      console.error("Error fetching transaction history:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // const formatWalletAddress = (address: string) => {
  //   if (!address) return "";
  //   return `${address.slice(0, 6)}...${address.slice(-4)}`;
  // };

  // const copyToClipboard = async (text: string) => {
  //   try {
  //     await navigator.clipboard.writeText(text);
  //   } catch (error) {
  //     console.error("Failed to copy to clipboard:", error);
  //   }
  // };

  const { mutate: disconnect } = useDisconnectWallet();

  const handleDisconnect = () => {
    disconnect();
  };

  const handleViewAssets = () => {
    handleBalanceQuery();
  };

  const handleViewTransactions = () => {
    handleTransactionHistory();
  };

  const handleConfirmTransfer = async () => {
    if (!pendingTransfer || !currentAccount) return;

    // Add user confirmation message first
    const confirmMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "user",
      content: "Confirm",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMessage]);

    setIsExecutingTransaction(true);

    try {
      if (pendingTransfer.recipients && pendingTransfer.recipients.length > 1) {
        // Serial transactions for multiple recipients
        await executeSerialTransactions();
      } else {
        // Single transaction for single recipient
        await executeSingleTransaction();
      }
    } catch (error) {
      console.error("Transfer error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        type: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Transaction failed. Please try again.",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setPendingTransfer(null);
      setIsExecutingTransaction(false);
    }
  };

  const executeSerialTransactions = async () => {
    const recipients = pendingTransfer.recipients;
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

      // Add individual success message
      const successMessage: Message = {
        id: (Date.now() + 2 + i).toString(),
        type: "assistant",
        content: `Transaction ${i + 1}/${recipients.length} successful! Sent ${
          recipient.amount
        } ${pendingTransfer.token_type} to ${recipient.to_address.slice(
          0,
          8
        )}... Digest: ${result.digest}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    }

    // Add summary message
    const summaryMessage: Message = {
      id: (Date.now() + 100).toString(),
      type: "assistant",
      content: `🎉 All ${
        recipients.length
      } transactions completed successfully! Total: ${recipients.reduce(
        (sum: number, r: any) => sum + r.amount,
        0
      )} ${pendingTransfer.token_type}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, summaryMessage]);
  };

  const executeSingleTransaction = async () => {
    const tx = new Transaction();
    const amount = Math.floor(
      (pendingTransfer.amount || 0) * Number(MIST_PER_SUI)
    );
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    tx.transferObjects([coin], pendingTransfer.to_address || "");

    // Execute the transaction
    const result = await signAndExecuteTransactionBlock({
      transaction: tx,
    });

    // Add success message to chat
    const successMessage: Message = {
      id: (Date.now() + 2).toString(),
      type: "assistant",
      content: `Transfer successful! Sent ${pendingTransfer.amount} ${
        pendingTransfer.token_type
      } to ${pendingTransfer.to_address?.slice(0, 8)}... Digest: ${
        result.digest
      }`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, successMessage]);
  };

  const handleCancelTransfer = () => {
    setPendingTransfer(null);
    setEstimatedGasFee(0);
    setIsEstimatingGas(false);
    setIsExecutingTransaction(false);
    setShowConfirmTransactions(false);
    setCurrentTransactionIndex(0);
    setHasViewedAllTransactions(false);
  };

  // Function to validate transfer information
  const validateTransferInfo = (transferIntent: any) => {
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
  };

  // Function to handle transfer intent with validation
  const handleNFTCreationIntent = (nftCreationIntent: any) => {
    // Store the NFT creation intent

    // Generate image based on story prompt
    if (nftCreationIntent.story_prompt) {
      imageGenerationMutation.mutate(
        { story_prompt: nftCreationIntent.story_prompt },
        {
          onSuccess: (data) => {
            if (data.success && data.image_url) {
              // Set the generated image to NFT form
              setNftForm((prev) => ({
                ...prev,
                imageUrl: data.image_url || "",
                name: nftCreationIntent.name || prev.name,
                description: nftCreationIntent.description || prev.description,
              }));

              // Set pending NFT mint for confirmation dialog
              setPendingNFTMint({
                intent: "mint_nft",
                owner_address: walletData?.address || "",
                name: nftCreationIntent.name || nftForm.name,
                description:
                  nftCreationIntent.description || nftForm.description,
                image_url: data.image_url || "",
                attributes: {},
                network: "devnet",
                requires_confirmation: true,
              });

              setShowNFTMintDialog(false);
            }
          },
          onError: (error) => {
            console.error("Failed to generate image:", error);
          },
        }
      );
    }
  };

  const handleTransferIntent = (transferIntent: any) => {
    // Validate transfer information first
    const validation = validateTransferInfo(transferIntent);

    if (!validation.isValid) {
      // Ask user to provide missing information
      const missingInfoMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: `I need more information to complete this transfer:\n\n${validation.errors
          .map((error) => `• ${error}`)
          .join("\n")}\n\nPlease provide the missing details.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, missingInfoMessage]);
      return;
    }

    // If validation passes, store transfer intent and ask user to confirm
    setPendingTransfer(transferIntent);
    setEstimatedGasFee(0);
    setIsEstimatingGas(true);
    setShowConfirmTransactions(false);

    // Estimate gas fee
    estimateGasFee(transferIntent).then((fee) => {
      setEstimatedGasFee(fee);
      setIsEstimatingGas(false);
    });

    // Don't send auto message - let AI respond naturally
  };

  // Function to handle carousel navigation
  const handleCarouselNavigation = (newIndex: number) => {
    setCurrentTransactionIndex(newIndex);

    // Check if user has viewed all transactions
    if (pendingTransfer?.recipients && pendingTransfer.recipients.length > 1) {
      const totalTransactions = pendingTransfer.recipients.length;
      setHasViewedAllTransactions(newIndex >= totalTransactions - 1);
    } else {
      // Single transaction - consider it viewed immediately
      setHasViewedAllTransactions(true);
    }
  };

  const handlePreviousTransaction = () => {
    if (currentTransactionIndex > 0) {
      handleCarouselNavigation(currentTransactionIndex - 1);
    }
  };

  const handleNextTransaction = () => {
    if (
      pendingTransfer?.recipients &&
      currentTransactionIndex < pendingTransfer.recipients.length - 1
    ) {
      handleCarouselNavigation(currentTransactionIndex + 1);
    }
  };

  // Function to estimate gas fee using dryRunTransactionBlock
  const estimateGasFee = useCallback(
    async (transferIntent: any) => {
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
    [suiClient, currentAccount]
  );

  const handleConfirmNFTMint = async () => {
    if (!pendingNFTMint) return;

    try {
      // First, get the contract info from backend
      const contractData = await nftMintMutation.mutateAsync(pendingNFTMint);
      console.log("🔨 Contract Data:", contractData);

      // Now use Sui SDK to mint the NFT on blockchain
      if (!currentAccount?.address) {
        throw new Error("Wallet not connected");
      }

      const txb = new SuiTransaction();

      // Call the mint_to_sender function
      txb.moveCall({
        target: `${contractData.package_id}::${contractData.module_name}::${contractData.function_name}`,
        arguments: [
          txb.pure(pendingNFTMint.name),
          txb.pure(pendingNFTMint.description),
          txb.pure(pendingNFTMint.image_url),
        ],
      });

      // Sign and execute transaction
      const result = await signAndExecuteTransactionBlock({
        transaction: txb,
      });

      console.log("🔨 NFT Mint Transaction Result:", result);

      // Show success message
      const successMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content: `🎉 NFT "${pendingNFTMint.name}" đã được tạo thành công trên Sui blockchain!\n\n📋 Chi tiết:\n• Transaction: ${result.digest}\n• Network: ${pendingNFTMint.network}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    } catch (error) {
      console.error("NFT mint error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content:
          error instanceof Error
            ? `❌ Lỗi khi tạo NFT: ${error.message}`
            : "An error occurred while creating NFT",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setPendingNFTMint(null);
      setShowNFTMintDialog(false);
    }
  };

  const handleCancelNFTMint = () => {
    setPendingNFTMint(null);
    setShowNFTMintDialog(false);
  };

  const handleImageUpload = async (file: File) => {
    try {
      const data = await imageUploadMutation.mutateAsync(file);

      setNftForm((prev) => ({
        ...prev,
        imageUrl: data.image_url!,
        imageFile: file,
      }));
    } catch (error) {
      console.error("Upload error:", error);
      alert(
        error instanceof Error ? error.message : "Có lỗi xảy ra khi upload ảnh"
      );
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handlePasteImage = (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          handleImageUpload(file);
          break;
        }
      }
    }
  };

  const handleCreateNFT = async () => {
    if (!nftForm.name || !nftForm.description || !nftForm.imageUrl) {
      alert("Please fill in all required information");
      return;
    }

    const nftIntent = {
      intent: "mint_nft",
      owner_address: currentAccount?.address || "",
      name: nftForm.name,
      description: nftForm.description,
      image_url: nftForm.imageUrl,
      attributes: {},
      network: "devnet",
      requires_confirmation: true,
    };

    setPendingNFTMint(nftIntent);
    setShowNFTMintDialog(false); // Set to false to show confirmation dialog
  };

  return (
    <div className="flex h-screen bg-bg text-text overflow-hidden fixed inset-0">
      {/* Sidebar */}
      <div className="w-64 bg-bg border-r-2 border-border flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b-2 border-border h-16 bg-main">
          <h1 className="text-2xl font-heading italic text-text">
            Sui Chat Wallet
          </h1>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b-2 border-border">
          <Button
            className="w-full"
            onClick={() => {
              setMessages([]);
              setInput("");
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
          >
            New Chat
          </Button>
        </div>

        {/* Spacer to push wallet to bottom */}
        <div className="flex-1"></div>

        {/* Wallet Section at bottom */}
        <div className="border-t-2 border-border h-20">
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="neutral"
                  className="w-full justify-between h-12 text-base font-heading"
                >
                  <span>Wallet</span>▲
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" side="top">
                <DropdownMenuItem onClick={handleViewAssets}>
                  View Assets ({walletData?.tokens?.length || 0})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewTransactions}>
                  Transaction History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowNFTMintDialog(true)}>
                  Create NFT
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handlePriceQuery("crypto prices")}
                >
                  Crypto Prices
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDisconnect}>
                  Disconnect Wallet
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Chat Header */}
        <div className="p-4 border-b-2 border-border h-16 bg-main">
          <div className="flex items-center justify-start">
            <div className="flex items-center gap-3">
              {/* AI Model Selector */}
              <div className="flex items-center gap-2">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select AI Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading models...
                      </SelectItem>
                    ) : (
                      modelsData?.data?.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-2">
                <Select
                  value={currentMode}
                  onValueChange={(value: "nft" | "transfer") => {
                    onModeChange(value);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="nft">NFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages Area */}
        <ScrollArea className="flex-1 p-0">
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0 overflow-hidden bg-bw border-2 border-border">
                  <img
                    src={
                      message.type === "user"
                        ? "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Emery"
                        : "https://api.dicebear.com/9.x/bottts/svg?seed=Felix&backgroundColor=transparent"
                    }
                    alt={message.type === "user" ? "user avatar" : "ai avatar"}
                    className="h-full w-full object-cover"
                  />
                  <AvatarFallback>
                    {message.type === "user" ? "U" : "AI"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[80%] rounded-base border-2 border-border p-3 shadow-shadow ${
                    message.isError
                      ? "bg-destructive text-destructive-foreground"
                      : message.type === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-main text-main-foreground"
                  }`}
                >
                  <div className="text-sm markdown-content text-left">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  <p className="text-xs opacity-70 mt-2 text-right">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 ">
                <Avatar className="h-8 w-8 overflow-hidden border-2 border-border">
                  <img
                    src="https://api.dicebear.com/9.x/bottts/svg?seed=Felix&backgroundColor=transparent"
                    alt="ai avatar"
                    className="h-full w-full object-cover"
                  />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="border-2 border-border rounded-base p-3 ">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t-2 border-border bg-bg h-20">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Transfer Confirmation Dialog */}
      {pendingTransfer && showConfirmTransactions && (
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
                        {
                          pendingTransfer.recipients[currentTransactionIndex]
                            .amount
                        }{" "}
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
                      onClick={handlePreviousTransaction}
                      disabled={currentTransactionIndex === 0}
                    >
                      ← Previous
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      className="w-24"
                      onClick={handleNextTransaction}
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
                              (sum: number, r: any) =>
                                sum + parseFloat(r.amount),
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
              {pendingTransfer.recipients &&
              pendingTransfer.recipients.length > 1
                ? "Review each transaction above. You will be prompted to sign each transaction individually."
                : "Are you sure you want to execute this transaction?"}
            </p>

            <div className="flex gap-2 justify-end">
              <Button
                variant="neutral"
                onClick={handleCancelTransfer}
                disabled={isExecutingTransaction}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmTransfer}
                disabled={isExecutingTransaction || !hasViewedAllTransactions}
              >
                {isExecutingTransaction
                  ? "Executing..."
                  : !hasViewedAllTransactions
                  ? "Review All Transactions First"
                  : "Confirm & Execute"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* NFT Mint Dialog */}
      {showNFTMintDialog && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
          <div className="bg-bg border-2 border-border rounded-base p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-heading mb-4 text-text">
              Create New NFT
            </h3>
            <div className="space-y-4">
              {/* NFT Preview */}
              {nftForm.imageUrl && (
                <div className="bg-bw border-2 border-border rounded-base p-4">
                  <h4 className="font-heading mb-2">Preview:</h4>
                  <div className="space-y-2 flex flex-col items-center">
                    <img
                      src={nftForm.imageUrl}
                      alt="NFT Preview"
                      className="w-48 h-48 object-cover rounded-base border-2 border-border"
                    />
                    <div className="text-sm text-center">
                      <div>
                        <strong>Name:</strong> {nftForm.name || "Untitled"}
                      </div>
                      <div>
                        <strong>Description:</strong>{" "}
                        {nftForm.description || "No description"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-heading">NFT Image:</label>
                <div
                  className="border-2 border-dashed border-border rounded-base p-8 text-center cursor-pointer hover:bg-bw transition-colors"
                  onPaste={handlePasteImage}
                  onClick={() =>
                    document.getElementById("nft-image-input")?.click()
                  }
                >
                  {nftForm.imageUrl ? (
                    <div className="text-sm text-gray-600">
                      Image selected. Click to change or paste new image.
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      Click to select image or paste from clipboard
                    </div>
                  )}
                  <input
                    id="nft-image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* NFT Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-heading">NFT Name:</label>
                  <Input
                    value={nftForm.name}
                    onChange={(e) =>
                      setNftForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter NFT name..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-heading">Description:</label>
                  <textarea
                    value={nftForm.description}
                    onChange={(e) =>
                      setNftForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter NFT description..."
                    className="w-full mt-1 p-3 border-2 border-border rounded-base bg-bw text-text resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="neutral" onClick={handleCancelNFTMint}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNFT}>Create NFT</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NFT Mint Confirmation Dialog */}
      {pendingNFTMint && !showNFTMintDialog && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
          <div className="bg-bg border-2 border-border rounded-base p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-heading mb-4 text-text">
              Confirm NFT Creation
            </h3>
            <div className="space-y-4">
              <div className="bg-bw border-2 border-border rounded-base p-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Name:</strong> {pendingNFTMint.name}
                  </div>
                  <div>
                    <strong>Description:</strong> {pendingNFTMint.description}
                  </div>
                  <div>
                    <strong>Network:</strong> {pendingNFTMint.network}
                  </div>
                  {pendingNFTMint.image_url && (
                    <img
                      src={pendingNFTMint.image_url}
                      alt="NFT"
                      className="w-20 h-20 object-cover rounded-base border border-border mt-2"
                    />
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to create this NFT?
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="neutral" onClick={handleCancelNFTMint}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmNFTMint}>Confirm</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
