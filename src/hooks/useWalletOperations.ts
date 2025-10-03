import { useCallback } from "react";
import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { suiService, type WalletInfo } from "../services/sui";
import { cryptoPriceService } from "../services/crypto-price";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export function useWalletOperations() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  const fetchWalletData = useCallback(async (): Promise<WalletInfo | null> => {
    if (!currentAccount?.address) return null;

    try {
      const completeWalletInfo = await suiService.getCompleteWalletInfo(
        currentAccount.address
      );
      return completeWalletInfo;
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      return null;
    }
  }, [currentAccount?.address]);

  const handleBalanceQuery = useCallback(
    (walletData: WalletInfo | null): Message => {
      let balanceContent = `**Your Wallet Balance:**\n\n`;
      balanceContent += `**SUI Balance:** ${walletData?.balance || "0"} SUI\n`;
      balanceContent += `**Address:** \`${currentAccount?.address?.slice(
        0,
        8
      )}...${currentAccount?.address?.slice(-6)}\`\n`;
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

      return {
        id: Date.now().toString(),
        type: "assistant",
        content: balanceContent,
        timestamp: new Date(),
      };
    },
    [currentAccount?.address]
  );

  const handlePriceQuery = useCallback(
    async (userInput: string): Promise<Message> => {
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

        return {
          id: Date.now().toString(),
          type: "assistant",
          content: priceContent,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("Error fetching crypto prices:", error);

        const errorContent = `**Unable to fetch live prices**\n\nUsing cached/demo data instead:\n\n**SUI**: $2.34 (+5.67%)\n**BTC**: $65,432.10 (-2.15%)\n**ETH**: $3,421.67 (+1.23%)\n**SOL**: $198.45 (+4.56%)\n\nCheck your internet connection for live prices.`;

        return {
          id: Date.now().toString(),
          type: "assistant",
          content: errorContent,
          timestamp: new Date(),
        };
      }
    },
    []
  );

  const handleTransactionHistory = useCallback(async (): Promise<Message> => {
    if (!currentAccount?.address) {
      return {
        id: Date.now().toString(),
        type: "assistant",
        content: "No wallet connected",
        timestamp: new Date(),
        isError: true,
      };
    }

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

      return {
        id: Date.now().toString(),
        type: "assistant",
        content: historyContent,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      return {
        id: Date.now().toString(),
        type: "assistant",
        content: "Error fetching transaction history",
        timestamp: new Date(),
        isError: true,
      };
    }
  }, [currentAccount?.address]);

  return {
    currentAccount,
    disconnect,
    fetchWalletData,
    handleBalanceQuery,
    handlePriceQuery,
    handleTransactionHistory,
  };
}

