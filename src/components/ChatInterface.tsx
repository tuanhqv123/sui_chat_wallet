import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useModels, useChat } from "../hooks/useApi";
import { type WalletInfo } from "../services/sui";

// Import components
import { Sidebar } from "./chat/Sidebar";
import { ChatHeader } from "./chat/ChatHeader";
import { MessageList } from "./chat/MessageList";
import { InputArea } from "./chat/InputArea";
import { TransferConfirmationDialog } from "./chat/TransferConfirmationDialog";
import { NFTMintDialog } from "./chat/NFTMintDialog";
import { NFTConfirmationDialog } from "./chat/NFTConfirmationDialog";

// Import hooks
import { useWalletOperations } from "../hooks/useWalletOperations";
import { useTransferOperations } from "../hooks/useTransferOperations";
import { useNFTOperations } from "../hooks/useNFTOperations";

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

  // State
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

  // API hooks
  const { data: modelsData, isLoading: modelsLoading } = useModels();
  const chatMutation = useChat();

  // Custom hooks
  const {
    disconnect,
    fetchWalletData,
    handleBalanceQuery,
    handlePriceQuery,
    handleTransactionHistory,
  } = useWalletOperations();

  const {
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
  } = useTransferOperations();

  const {
    pendingNFTMint,
    showNFTMintDialog,
    isExecutingTransaction: isExecutingNFTTransaction,
    nftForm,
    setShowNFTMintDialog,
    handleNFTCreationIntent,
    handleConfirmNFTMint,
    handleCancelNFTMint,
    handleCreateNFT,
    handleFileChange,
    handlePasteImage,
    updateNftForm,
  } = useNFTOperations();

  // Fetch wallet data when account changes
  useEffect(() => {
    if (currentAccount?.address) {
      fetchWalletData().then(setWalletData);
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
        current_balance: walletData?.balance || "0",
        mode: currentMode,
      });

      const response = data.response || data.reply;

      // Handle structured response
      let responseContent;
      if (response.type === "transfer_intent") {
        // Use new function with validation
        const transferResult = handleTransferIntent(
          response.transfer_intent,
          currentAccount
        );
        if (!transferResult.isValid) {
          responseContent = transferResult.message!.content;
        } else {
          // Override AI hint to manually type and show our own action message
          responseContent =
            "Transfer details detected. Opening confirmation dialog...";

          setInterval(() => setShowConfirmTransactions(true), 1500);
        }
      } else if (response.type === "nft_collect_info") {
        // Handle NFT information collection
        responseContent = response.message;
      } else if (response.type === "nft_creation_intent") {
        // Handle NFT creation with image generation
        handleNFTCreationIntent(response.nft_creation_intent, walletData);
        responseContent = response.message;
      } else if (response.type === "nft_mint_intent") {
        // This will be handled by the NFT operations hook
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
        const newWalletData = await fetchWalletData();
        if (newWalletData) {
          setWalletData(newWalletData);
        }
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

    if (lowerInput.includes("balance") || lowerInput.includes("assets")) {
      const balanceMessage = handleBalanceQuery(walletData);
      setMessages((prev) => [...prev, balanceMessage]);
    } else if (lowerInput.includes("price") || lowerInput.includes("crypto")) {
      const priceMessage = await handlePriceQuery(userInput);
      setMessages((prev) => [...prev, priceMessage]);
    } else if (
      lowerInput.includes("history") ||
      lowerInput.includes("transaction")
    ) {
      const historyMessage = await handleTransactionHistory();
      setMessages((prev) => [...prev, historyMessage]);
    }
  };

  // Event handlers
  const handleNewChat = () => {
    setMessages([]);
    setInput("");
  };

  const handleViewAssets = () => {
    const balanceMessage = handleBalanceQuery(walletData);
    setMessages((prev) => [...prev, balanceMessage]);
  };

  const handleViewTransactions = async () => {
    const historyMessage = await handleTransactionHistory();
    setMessages((prev) => [...prev, historyMessage]);
  };

  // Open NFT dialog when user selects from sidebar
  const handleOpenNFTDialog = () => setShowNFTMintDialog(true);

  const handleViewPrices = async () => {
    const priceMessage = await handlePriceQuery("crypto prices");
    setMessages((prev) => [...prev, priceMessage]);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleConfirmTransferWithMessage = async () => {
    try {
      const res = await handleConfirmTransfer();

      let content = "Transfer completed successfully!";
      if (Array.isArray(res) && res.length) {
        const ids = res.map((r: any) => r?.digest).filter(Boolean);
        if (ids.length > 0)
          content = `Transfer completed successfully!\n\n${ids
            .map((id: string) => `Tx: ${id}`)
            .join("\n\n")}`;
      } else if (res?.digest) {
        content = `Transfer completed successfully!\n\nTx: ${res.digest}`;
      }

      const successMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);

      const newWalletData = await fetchWalletData();
      if (newWalletData) {
        setWalletData(newWalletData);
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
    }
  };

  const handleConfirmNFTMintWithMessage = async () => {
    try {
      const result = await handleConfirmNFTMint(currentAccount);

      // Add success message
      const successMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content:
          result && (result as any).result
            ? `NFT "${
                pendingNFTMint?.name
              }" has been successfully created on the Sui Blockchain!\n\n Details:\n• Transaction: ${
                (result as any).result.digest
              }\n• Image URL: ${
                (result as any).imageUrl
              }\n• Network: testnet\n\n Your NFT image has been uploaded and stored publicly!`
            : "NFT created successfully.",
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
            ? `❌ Error creating NFT: ${error.message}`
            : "An error occurred while creating NFT",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleCreateNFTWithMessage = () => {
    try {
      handleCreateNFT(currentAccount);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Please fill in all required information",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className="flex h-screen bg-bg text-text overflow-hidden fixed inset-0">
      {/* Sidebar */}
      <Sidebar
        onNewChat={handleNewChat}
        onViewAssets={handleViewAssets}
        onViewTransactions={handleViewTransactions}
        onCreateNFT={handleOpenNFTDialog}
        onViewPrices={handleViewPrices}
        onDisconnect={handleDisconnect}
        walletData={walletData}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Chat Header */}
        <ChatHeader
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          currentMode={currentMode}
          onModeChange={onModeChange}
          modelsData={modelsData}
          modelsLoading={modelsLoading}
        />

        {/* Chat Messages Area */}
        <MessageList messages={messages} isLoading={isLoading} />

        {/* Input Area */}
        <InputArea
          input={input}
          onInputChange={setInput}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>

      {/* Transfer Confirmation Dialog */}
      <TransferConfirmationDialog
        pendingTransfer={pendingTransfer}
        showConfirmTransactions={showConfirmTransactions}
        currentTransactionIndex={currentTransactionIndex}
        isEstimatingGas={isEstimatingGas}
        estimatedGasFee={estimatedGasFee}
        walletData={walletData}
        isExecutingTransaction={isExecutingTransaction}
        onPreviousTransaction={handlePreviousTransaction}
        onNextTransaction={handleNextTransaction}
        onCancelTransfer={handleCancelTransfer}
        onConfirmTransfer={handleConfirmTransferWithMessage}
      />

      {/* NFT Mint Dialog */}
      <NFTMintDialog
        showNFTMintDialog={showNFTMintDialog}
        nftForm={nftForm}
        onNameChange={(name) => updateNftForm({ name })}
        onDescriptionChange={(description) => updateNftForm({ description })}
        onPasteImage={handlePasteImage}
        onFileChange={handleFileChange}
        onCancel={handleCancelNFTMint}
        onCreate={handleCreateNFTWithMessage}
      />

      {/* NFT Confirmation Dialog */}
      <NFTConfirmationDialog
        pendingNFTMint={pendingNFTMint}
        showNFTMintDialog={showNFTMintDialog}
        isExecutingTransaction={isExecutingNFTTransaction}
        onCancel={handleCancelNFTMint}
        onConfirm={handleConfirmNFTMintWithMessage}
      />
    </div>
  );
}
