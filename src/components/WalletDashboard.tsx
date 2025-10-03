import { useState, useEffect, useCallback } from "react";
import { useCurrentAccount, useCurrentWallet } from "@mysten/dapp-kit";
import { suiService } from "../services/sui";
import type { TokenInfo, TransactionSummary } from "../services/sui";
import {
  Wallet,
  Copy,
  ExternalLink,
  RefreshCw,
  Coins,
  History,
  TrendingUp,
} from "lucide-react";

interface WalletDashboardProps {
  onClose?: () => void;
}

export function WalletDashboard({ onClose }: WalletDashboardProps) {
  const account = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();

  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [suiBalance, setSuiBalance] = useState<string>("0");
  const [activeTab, setActiveTab] = useState<"overview" | "tokens" | "history">(
    "overview"
  );

  const walletAddress = account?.address;
  const walletChains = account?.chains;

  const loadWalletData = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      // Load all data in parallel
      const [tokensData, transactionData, suiBalanceData] = await Promise.all([
        suiService.getAllTokens(walletAddress),
        suiService.getTransactionHistory(walletAddress, 10),
        suiService.getSuiBalance(walletAddress),
      ]);

      setTokens(tokensData);
      setTransactions(transactionData);
      setSuiBalance(suiBalanceData);
    } catch (error) {
      console.error("Error loading wallet data:", error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress && connectionStatus === "connected") {
      loadWalletData();
    }
  }, [walletAddress, connectionStatus, loadWalletData]);

  const copyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      // You could add a toast notification here
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatBalance = (balance: string, decimals: number): string => {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const quotient = balanceBigInt / divisor;
    const remainder = balanceBigInt % divisor;

    if (remainder === 0n) {
      return quotient.toString();
    }

    const remainderStr = remainder.toString().padStart(decimals, "0");
    const trimmedRemainder = remainderStr.replace(/0+$/, "");

    if (trimmedRemainder === "") {
      return quotient.toString();
    }

    return `${quotient}.${trimmedRemainder}`;
  };

  if (!walletAddress) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">No wallet connected</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Wallet Dashboard</h2>
            <div className="flex items-center space-x-2 text-gray-400">
              <span className="text-sm">{formatAddress(walletAddress)}</span>
              <button
                onClick={copyAddress}
                className="hover:text-white transition-colors"
                title="Copy address"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={`https://suiexplorer.com/address/${walletAddress}?network=${suiService.getCurrentNetwork()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                title="View on explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            {/* Network information */}
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  walletChains?.[0]?.includes("testnet")
                    ? "bg-green-100 text-green-800"
                    : walletChains?.[0]?.includes("devnet")
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Network: {walletChains?.[0] || "unknown"}
              </span>
              {walletChains?.[0]?.includes("devnet") && (
                <p className="text-xs text-yellow-400 mt-1">
                  ⚠️ Switch to testnet in your wallet to mint NFTs
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadWalletData}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw
              className={`w-5 h-5 text-white ${loading ? "animate-spin" : ""}`}
            />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Network Info */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-blue-400 font-medium">
            Connected to: {suiService.getCurrentNetwork().toUpperCase()}
          </span>
          <span className="text-green-400 text-sm">● Connected</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-white/5 p-1 rounded-xl">
        {[
          { id: "overview", label: "Overview", icon: TrendingUp },
          { id: "tokens", label: "Tokens", icon: Coins },
          { id: "history", label: "History", icon: History },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() =>
              setActiveTab(id as "overview" | "tokens" | "history")
            }
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === id
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-2 text-blue-400">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading wallet data...</span>
          </div>
        </div>
      ) : (
        <div>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Main SUI Balance */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">SUI Balance</h3>
                  <div className="text-2xl">💧</div>
                </div>
                <div className="text-4xl font-bold text-white mb-2">
                  {suiBalance} SUI
                </div>
                <div className="text-gray-400 text-sm">
                  Network: {suiService.getCurrentNetwork()}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <Coins className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="text-gray-400 text-sm">Total Tokens</p>
                      <p className="text-xl font-bold text-white">
                        {tokens.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <History className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-gray-400 text-sm">
                        Recent Transactions
                      </p>
                      <p className="text-xl font-bold text-white">
                        {transactions.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-gray-400 text-sm">Active Network</p>
                      <p className="text-xl font-bold text-white capitalize">
                        {suiService.getCurrentNetwork()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tokens Tab */}
          {activeTab === "tokens" && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">
                Token Holdings
              </h3>

              {tokens.length === 0 ? (
                <div className="text-center py-8">
                  <Coins className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No tokens found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tokens.map((token, index) => (
                    <div
                      key={index}
                      className="bg-white/5 border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {token.metadata?.symbol?.[0] || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {token.metadata?.name || "Unknown Token"}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {token.metadata?.symbol || "UNKNOWN"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">
                            {formatBalance(
                              token.balance,
                              token.metadata?.decimals || 9
                            )}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {token.metadata?.symbol || "UNKNOWN"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">
                Transaction History
              </h3>

              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No transactions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.digest}
                      className="bg-white/5 border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              tx.type === "sent"
                                ? "bg-red-500/20"
                                : tx.type === "received"
                                ? "bg-green-500/20"
                                : "bg-gray-500/20"
                            }`}
                          >
                            <span className="text-sm">
                              {tx.type === "sent"
                                ? "↗️"
                                : tx.type === "received"
                                ? "↙️"
                                : "🔄"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white capitalize">
                              {tx.type === "sent"
                                ? "Sent"
                                : tx.type === "received"
                                ? "Received"
                                : "Transaction"}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {tx.timestamp
                                ? new Date(tx.timestamp).toLocaleString()
                                : "Unknown time"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-medium ${
                              tx.type === "sent"
                                ? "text-red-400"
                                : tx.type === "received"
                                ? "text-green-400"
                                : "text-gray-400"
                            }`}
                          >
                            {tx.type === "sent"
                              ? "-"
                              : tx.type === "received"
                              ? "+"
                              : ""}
                            {tx.amount} SUI
                          </p>
                          <p
                            className={`text-sm ${
                              tx.status === "success"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {tx.status}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          {formatAddress(tx.digest)}
                        </span>
                        <a
                          href={suiService.getExplorerUrl(tx.digest)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
