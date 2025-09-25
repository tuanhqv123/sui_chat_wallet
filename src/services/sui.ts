import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

export interface WalletBalance {
  coinType: string;
  balance: string;
  formattedBalance: string;
}

export interface TokenInfo {
  coinType: string;
  balance: string;
  metadata?: {
    name?: string;
    symbol?: string;
    decimals?: number;
    iconUrl?: string;
  };
}

export interface TransactionSummary {
  digest: string;
  timestamp?: string;
  sender?: string;
  recipients?: string[];
  amount?: string;
  coinType?: string;
  type: "sent" | "received" | "other";
  status: "success" | "failure";
}

export interface SendTransactionParams {
  recipient: string;
  amount: string;
  coinType?: string;
}

export interface WalletInfo {
  address: string;
  balance: string;
  tokens: TokenInfo[];
  nfts: NFTInfo[];
  network: string;
  chainId?: string;
}

export interface NFTInfo {
  objectId: string;
  type: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  creator?: string;
  collection?: string;
}

export interface NetworkInfo {
  name: string;
  chainId: string;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
}

class SuiService {
  private client: SuiClient;
  private network: "mainnet" | "testnet" | "devnet" | "localnet";

  constructor(
    network: "mainnet" | "testnet" | "devnet" | "localnet" = "devnet"
  ) {
    this.network = network;
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
  }

  public switchNetwork(network: "mainnet" | "testnet" | "devnet" | "localnet") {
    this.network = network;
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
  }

  public getCurrentNetwork(): string {
    return this.network;
  }

  public getNetworkInfo(): NetworkInfo {
    const networkConfigs = {
      mainnet: {
        name: "Sui Mainnet",
        chainId: "sui",
        rpcUrl: "https://fullnode.mainnet.sui.io:443",
        explorerUrl: "https://suiexplorer.com",
      },
      testnet: {
        name: "Sui Testnet",
        chainId: "sui-testnet",
        rpcUrl: "https://fullnode.testnet.sui.io:443",
        explorerUrl: "https://suiexplorer.com?network=testnet",
        faucetUrl: "https://faucet.testnet.sui.io",
      },
      devnet: {
        name: "Sui Devnet",
        chainId: "sui-devnet",
        rpcUrl: "https://fullnode.devnet.sui.io:443",
        explorerUrl: "https://suiexplorer.com?network=devnet",
        faucetUrl: "https://faucet.devnet.sui.io",
      },
      localnet: {
        name: "Sui Localnet",
        chainId: "sui-localnet",
        rpcUrl: "http://localhost:9000",
        explorerUrl: "http://localhost:3000",
      },
    };

    return networkConfigs[this.network];
  }

  public async getCompleteWalletInfo(address: string): Promise<WalletInfo> {
    try {
      const [balance, tokens, nfts] = await Promise.all([
        this.getSuiBalance(address),
        this.getAllTokens(address),
        this.getNFTs(address),
      ]);

      const networkInfo = this.getNetworkInfo();

      return {
        address,
        balance,
        tokens,
        nfts,
        network: networkInfo.name,
        chainId: networkInfo.chainId,
      };
    } catch (error) {
      console.error("Error fetching complete wallet info:", error);
      throw new Error("Failed to fetch wallet information");
    }
  }

  public async getNFTs(address: string): Promise<NFTInfo[]> {
    try {
      const objects = await this.client.getOwnedObjects({
        owner: address,
        options: {
          showContent: true,
          showDisplay: true,
          showType: true,
        },
      });

      // Filter for NFT-like objects (objects with display and content)
      const nftObjects = objects.data.filter((obj) => {
        const content = obj.data?.content;
        const display = obj.data?.display;
        return content && display;
      });

      return nftObjects.map((obj) => {
        const content = obj.data?.content as Record<string, unknown>;
        const display = obj.data?.display as Record<string, unknown>;

        return {
          objectId: obj.data?.objectId || "",
          type: obj.data?.type || "",
          name:
            ((display?.data as Record<string, unknown>)?.name as string) ||
            ((content?.fields as Record<string, unknown>)?.name as string) ||
            "Unknown NFT",
          description:
            ((display?.data as Record<string, unknown>)
              ?.description as string) ||
            ((content?.fields as Record<string, unknown>)
              ?.description as string) ||
            "",
          imageUrl:
            ((display?.data as Record<string, unknown>)?.image_url as string) ||
            ((content?.fields as Record<string, unknown>)?.url as string) ||
            "",
          creator:
            ((content?.fields as Record<string, unknown>)?.creator as string) ||
            "",
          collection:
            ((content?.fields as Record<string, unknown>)
              ?.collection as string) || "",
        };
      });
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      // Return empty array instead of throwing to prevent breaking the wallet info fetch
      return [];
    }
  }

  public async getWalletBalance(address: string): Promise<WalletBalance[]> {
    try {
      const balances = await this.client.getAllBalances({ owner: address });

      return balances.map((balance) => ({
        coinType: balance.coinType,
        balance: balance.totalBalance,
        formattedBalance: this.formatBalance(
          balance.totalBalance,
          this.getDecimalsForCoinType(balance.coinType)
        ),
      }));
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      throw new Error("Failed to fetch wallet balance");
    }
  }

  public async getSuiBalance(address: string): Promise<string> {
    try {
      const balance = await this.client.getBalance({ owner: address });
      return this.formatBalance(balance.totalBalance, 9); // SUI has 9 decimals
    } catch (error) {
      console.error("Error fetching SUI balance:", error);
      throw new Error("Failed to fetch SUI balance");
    }
  }

  public async getAllTokens(address: string): Promise<TokenInfo[]> {
    try {
      const coins = await this.client.getAllCoins({ owner: address });
      const balanceMap = new Map<string, string>();

      // Aggregate balances by coin type
      coins.data.forEach((coin) => {
        const currentBalance = balanceMap.get(coin.coinType) || "0";
        const newBalance = (
          BigInt(currentBalance) + BigInt(coin.balance)
        ).toString();
        balanceMap.set(coin.coinType, newBalance);
      });

      // Convert to TokenInfo array
      const tokens: TokenInfo[] = [];
      for (const [coinType, balance] of balanceMap.entries()) {
        const metadata = await this.getCoinMetadata(coinType);
        tokens.push({
          coinType,
          balance,
          metadata,
        });
      }

      return tokens;
    } catch (error) {
      console.error("Error fetching tokens:", error);
      throw new Error("Failed to fetch tokens");
    }
  }

  public async getTransactionHistory(
    address: string,
    limit: number = 20
  ): Promise<TransactionSummary[]> {
    try {
      const transactions = await this.client.queryTransactionBlocks({
        filter: {
          FromOrToAddress: { addr: address },
        },
        options: {
          showEffects: true,
          showInput: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        },
        limit,
        order: "descending",
      });

      return transactions.data.map((tx) =>
        this.parseTransaction(tx as unknown as Record<string, unknown>, address)
      );
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      throw new Error("Failed to fetch transaction history");
    }
  }

  public async estimateGasFee(params: SendTransactionParams): Promise<string> {
    try {
      const amount = this.parseAmount(params.amount);
      const tx = new Transaction();

      const [coin] = tx.splitCoins(tx.gas, [amount]);
      tx.transferObjects([coin], params.recipient);

      // Dry run to estimate gas
      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: await tx.build({ client: this.client }),
      });

      const gasUsed = dryRunResult.effects.gasUsed;
      const totalGas =
        BigInt(gasUsed.computationCost) + BigInt(gasUsed.storageCost);

      return this.formatBalance(totalGas.toString(), 9);
    } catch (error) {
      console.error("Error estimating gas fee:", error);
      return "0.001"; // Default estimate
    }
  }

  public async getObjectDetails(
    objectId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const result = await this.client.getObject({
        id: objectId,
        options: {
          showContent: true,
          showDisplay: true,
          showType: true,
        },
      });
      return result.data as Record<string, unknown> | null;
    } catch (error) {
      console.error("Error fetching object details:", error);
      throw new Error("Failed to fetch object details");
    }
  }

  public isValidSuiAddress(address: string): boolean {
    try {
      // Basic validation - Sui addresses are 32 bytes (64 hex chars) with 0x prefix
      return /^0x[a-fA-F0-9]{64}$/.test(address);
    } catch {
      return false;
    }
  }

  public formatAddress(address: string): string {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  private formatBalance(balance: string, decimals: number): string {
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
  }

  private parseAmount(amount: string): number {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error("Invalid amount");
    }

    // Convert to MIST (SUI's smallest unit, 1 SUI = 10^9 MIST)
    const mistAmount = Math.floor(numAmount * 1_000_000_000);
    return mistAmount;
  }

  private getDecimalsForCoinType(coinType: string): number {
    // SUI coin type
    if (coinType === "0x2::sui::SUI") {
      return 9;
    }

    // Default for other tokens (should fetch from metadata)
    return 9;
  }

  private async getCoinMetadata(
    coinType: string
  ): Promise<TokenInfo["metadata"]> {
    try {
      if (coinType === "0x2::sui::SUI") {
        return {
          name: "Sui",
          symbol: "SUI",
          decimals: 9,
          iconUrl: undefined,
        };
      }

      // For other coins, we would query the coin metadata
      // This is a simplified version
      return {
        name: "Unknown Token",
        symbol: "UNKNOWN",
        decimals: 9,
        iconUrl: undefined,
      };
    } catch (error) {
      console.error("Error fetching coin metadata:", error);
      return undefined;
    }
  }

  private parseTransaction(
    tx: Record<string, unknown>,
    userAddress: string
  ): TransactionSummary {
    const digest = tx.digest as string;
    const timestamp = tx.timestampMs
      ? new Date(parseInt(tx.timestampMs as string)).toISOString()
      : undefined;
    const transaction = tx.transaction as Record<string, unknown> | undefined;
    const sender = transaction?.data as Record<string, unknown> | undefined;

    // Determine transaction type
    let type: "sent" | "received" | "other" = "other";
    let recipients: string[] = [];
    let amount = "0";
    let coinType = "0x2::sui::SUI";

    // Analyze balance changes to determine type and amount
    const balanceChanges = tx.balanceChanges as
      | Array<Record<string, unknown>>
      | undefined;
    if (balanceChanges) {
      for (const change of balanceChanges) {
        if (
          (change.owner as Record<string, unknown>)?.AddressOwner ===
          userAddress
        ) {
          const changeAmount = BigInt(change.amount as string);
          if (changeAmount < 0) {
            type = "sent";
            amount = this.formatBalance((-changeAmount).toString(), 9);
          } else if (changeAmount > 0) {
            type = "received";
            amount = this.formatBalance(changeAmount.toString(), 9);
          }
          coinType = change.coinType as string;
        }
      }
    }

    // Extract recipients from object changes or transaction data
    const objectChanges = tx.objectChanges as
      | Array<Record<string, unknown>>
      | undefined;
    if (objectChanges) {
      recipients = objectChanges
        .filter(
          (change: Record<string, unknown>) =>
            (change.owner as Record<string, unknown>)?.AddressOwner &&
            (change.owner as Record<string, unknown>).AddressOwner !==
              userAddress
        )
        .map(
          (change: Record<string, unknown>) =>
            (change.owner as Record<string, unknown>).AddressOwner as string
        );
    }

    const effects = tx.effects as Record<string, unknown> | undefined;
    const status = effects?.status as Record<string, unknown> | undefined;
    const finalStatus = status?.status === "success" ? "success" : "failure";

    return {
      digest,
      timestamp,
      sender: sender?.sender as string | undefined,
      recipients: [...new Set(recipients)], // Remove duplicates
      amount,
      coinType,
      type,
      status: finalStatus,
    };
  }

  public getExplorerUrl(digest: string): string {
    const baseUrls = {
      mainnet: "https://suiexplorer.com",
      testnet: "https://suiexplorer.com",
      devnet: "https://suiexplorer.com",
      localnet: "http://localhost:3000",
    };

    return `${baseUrls[this.network]}/txblock/${digest}?network=${
      this.network
    }`;
  }

  public buildTransferTransaction(params: SendTransactionParams): Transaction {
    const tx = new Transaction();

    if (params.coinType && params.coinType !== "0x2::sui::SUI") {
      // For custom coins, use object reference
      const [splitCoin] = tx.splitCoins(tx.object(params.coinType), [
        tx.pure.u64(parseInt(params.amount)),
      ]);
      tx.transferObjects([splitCoin], params.recipient);
    } else {
      // For SUI, use the gas coin
      const [coin] = tx.splitCoins(tx.gas, [
        tx.pure.u64(parseInt(params.amount)),
      ]);
      tx.transferObjects([coin], params.recipient);
    }

    return tx;
  }
}

export const suiService = new SuiService();
