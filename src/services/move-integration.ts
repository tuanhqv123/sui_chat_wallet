import { SuiClient } from '@mysten/sui/client';
import { TransactionBlock } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { fromBase64, toBase64 } from '@mysten/sui/utils';

export interface MoveCallParams {
  packageId: string;
  module: string;
  function: string;
  typeArguments?: string[];
  arguments?: any[];
}

export interface WalletInfo {
  id: string;
  owner: string;
  balance: string;
  transactionCount: number;
  aiEnabled: boolean;
  createdAt: number;
  lastActivity: number;
}

export interface AIIntent {
  id: string;
  userAddress: string;
  rawText: string;
  intentType: string;
  parameters: string[];
  confidenceScore: number;
  aiModel: string;
  status: number; // 0=pending, 1=approved, 2=executed, 3=rejected
  timestamp: number;
}

export interface DeFiPoolInfo {
  id: string;
  reserveA: string;
  reserveB: string;
  lpSupply: string;
  feeRate: number;
  isActive: boolean;
  totalVolume: string;
}

export interface StakingPoolInfo {
  id: string;
  totalStaked: string;
  rewardBalance: string;
  rewardRate: number;
  isActive: boolean;
  rewardPerToken: string;
}

export interface TransactionResult {
  digest: string;
  success: boolean;
  gasUsed?: {
    computationCost: string;
    storageCost: string;
    storageRebate: string;
  };
  effects?: any;
  events?: any[];
}

class MoveIntegrationService {
  private client: SuiClient;
  private packageId: string | null = null;

  constructor(client: SuiClient) {
    this.client = client;
  }

  public setPackageId(packageId: string) {
    this.packageId = packageId;
  }

  // ======== Wallet Manager Functions ========

  /**
   * Create a new wallet for the user
   */
  public async createWallet(signer: any): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();

    txb.moveCall({
      target: `${this.packageId}::wallet_manager::create_wallet`,
      arguments: [],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  /**
   * Deposit SUI tokens into wallet
   */
  public async depositToWallet(
    walletId: string,
    amount: string,
    signer: any
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();
    const amountInMist = this.parseAmount(amount);

    // Split coins for deposit
    const [coin] = txb.splitCoins(txb.gas, [txb.pure(amountInMist)]);

    txb.moveCall({
      target: `${this.packageId}::wallet_manager::deposit`,
      arguments: [
        txb.object(walletId),
        coin,
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  /**
   * Withdraw SUI tokens from wallet
   */
  public async withdrawFromWallet(
    walletId: string,
    amount: string,
    signer: any
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();
    const amountInMist = this.parseAmount(amount);

    txb.moveCall({
      target: `${this.packageId}::wallet_manager::withdraw`,
      arguments: [
        txb.object(walletId),
        txb.pure(amountInMist),
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  /**
   * AI-assisted transfer
   */
  public async aiTransfer(
    walletId: string,
    recipient: string,
    amount: string,
    description: string,
    signer: any
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();
    const amountInMist = this.parseAmount(amount);

    txb.moveCall({
      target: `${this.packageId}::wallet_manager::ai_transfer`,
      arguments: [
        txb.object(walletId),
        txb.pure(recipient),
        txb.pure(amountInMist),
        txb.pure(description),
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  /**
   * Batch transfer to multiple recipients
   */
  public async batchTransfer(
    walletId: string,
    recipients: string[],
    amounts: string[],
    signer: any
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');
    if (recipients.length !== amounts.length) {
      throw new Error('Recipients and amounts arrays must have the same length');
    }

    const txb = new TransactionBlock();
    const amountsInMist = amounts.map(amount => this.parseAmount(amount));

    txb.moveCall({
      target: `${this.packageId}::wallet_manager::batch_transfer`,
      arguments: [
        txb.object(walletId),
        txb.pure(recipients),
        txb.pure(amountsInMist),
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  /**
   * Configure AI settings
   */
  public async configureAI(
    walletId: string,
    modelPreference: string,
    autoApproveLimit: string,
    securityLevel: number,
    signer: any
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();
    const limitInMist = this.parseAmount(autoApproveLimit);

    txb.moveCall({
      target: `${this.packageId}::wallet_manager::configure_ai`,
      arguments: [
        txb.object(walletId),
        txb.pure(modelPreference),
        txb.pure(limitInMist),
        txb.pure(securityLevel),
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  // ======== AI Oracle Functions ========

  /**
   * Process natural language intent
   */
  public async processIntent(
    oracleId: string,
    rawText: string,
    intentType: string,
    parameters: string[],
    confidenceScore: number,
    aiModel: string,
    signer: any
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();

    txb.moveCall({
      target: `${this.packageId}::ai_oracle::process_intent`,
      arguments: [
        txb.object(oracleId),
        txb.pure(rawText),
        txb.pure(intentType),
        txb.pure(parameters),
        txb.pure(confidenceScore),
        txb.pure(aiModel),
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  /**
   * Approve an AI intent
   */
  public async approveIntent(
    intentId: string,
    signer: any
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();

    txb.moveCall({
      target: `${this.packageId}::ai_oracle::approve_intent`,
      arguments: [txb.object(intentId)],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  /**
   * Reject an AI intent
   */
  public async rejectIntent(
    intentId: string,
    reason: string,
    signer: any
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();

    txb.moveCall({
      target: `${this.packageId}::ai_oracle::reject_intent`,
      arguments: [
        txb.object(intentId),
        txb.pure(reason),
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  // ======== DeFi Functions ========

  /**
   * AI-assisted token swap
   */
  public async aiSwap<CoinA, CoinB>(
    poolId: string,
    inputCoin: string,
    minOutput: string,
    slippageTolerance: number,
    deadline: number,
    clockId: string,
    signer: any,
    coinAType: string,
    coinBType: string
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();
    const minOutputInMist = this.parseAmount(minOutput);

    txb.moveCall({
      target: `${this.packageId}::defi_actions::ai_swap`,
      typeArguments: [coinAType, coinBType],
      arguments: [
        txb.object(poolId),
        txb.object(inputCoin),
        txb.pure(minOutputInMist),
        txb.pure(slippageTolerance),
        txb.pure(deadline),
        txb.object(clockId),
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  /**
   * Add liquidity to a pool
   */
  public async addLiquidity<CoinA, CoinB>(
    poolId: string,
    coinA: string,
    coinB: string,
    minLpTokens: string,
    signer: any,
    coinAType: string,
    coinBType: string
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();
    const minLpInMist = this.parseAmount(minLpTokens);

    txb.moveCall({
      target: `${this.packageId}::defi_actions::add_liquidity`,
      typeArguments: [coinAType, coinBType],
      arguments: [
        txb.object(poolId),
        txb.object(coinA),
        txb.object(coinB),
        txb.pure(minLpInMist),
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  /**
   * Stake tokens for rewards
   */
  public async stakeTokens<StakeToken, RewardToken>(
    poolId: string,
    stakeAmount: string,
    clockId: string,
    signer: any,
    stakeTokenType: string,
    rewardTokenType: string
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();
    const [coin] = txb.splitCoins(txb.gas, [txb.pure(this.parseAmount(stakeAmount))]);

    txb.moveCall({
      target: `${this.packageId}::defi_actions::stake_tokens`,
      typeArguments: [stakeTokenType, rewardTokenType],
      arguments: [
        txb.object(poolId),
        coin,
        txb.object(clockId),
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return this.parseTransactionResult(result);
  }

  // ======== Query Functions ========

  /**
   * Get wallet information
   */
  public async getWalletInfo(walletId: string): Promise<WalletInfo | null> {
    try {
      const walletObject = await this.client.getObject({
        id: walletId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!walletObject.data?.content || walletObject.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = (walletObject.data.content as any).fields;

      return {
        id: walletId,
        owner: fields.owner,
        balance: fields.balance || '0',
        transactionCount: parseInt(fields.transaction_count || '0'),
        aiEnabled: fields.ai_enabled || false,
        createdAt: parseInt(fields.created_at || '0'),
        lastActivity: parseInt(fields.last_activity || '0'),
      };
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      return null;
    }
  }

  /**
   * Get AI intent details
   */
  public async getIntentInfo(intentId: string): Promise<AIIntent | null> {
    try {
      const intentObject = await this.client.getObject({
        id: intentId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!intentObject.data?.content || intentObject.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = (intentObject.data.content as any).fields;

      return {
        id: intentId,
        userAddress: fields.user_address,
        rawText: fields.raw_text,
        intentType: fields.intent_type,
        parameters: fields.parameters || [],
        confidenceScore: parseInt(fields.confidence_score || '0'),
        aiModel: fields.ai_model,
        status: parseInt(fields.status || '0'),
        timestamp: parseInt(fields.timestamp || '0'),
      };
    } catch (error) {
      console.error('Error fetching intent info:', error);
      return null;
    }
  }

  /**
   * Get DeFi pool information
   */
  public async getPoolInfo<CoinA, CoinB>(
    poolId: string,
    coinAType: string,
    coinBType: string
  ): Promise<DeFiPoolInfo | null> {
    try {
      const poolObject = await this.client.getObject({
        id: poolId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!poolObject.data?.content || poolObject.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = (poolObject.data.content as any).fields;

      return {
        id: poolId,
        reserveA: fields.reserve_a?.fields?.balance || '0',
        reserveB: fields.reserve_b?.fields?.balance || '0',
        lpSupply: fields.lp_supply || '0',
        feeRate: parseInt(fields.fee_rate || '0'),
        isActive: fields.is_active || false,
        totalVolume: fields.total_volume || '0',
      };
    } catch (error) {
      console.error('Error fetching pool info:', error);
      return null;
    }
  }

  /**
   * Get events by transaction digest
   */
  public async getTransactionEvents(digest: string): Promise<any[]> {
    try {
      const txDetails = await this.client.getTransactionBlock({
        digest,
        options: {
          showEvents: true,
        },
      });

      return txDetails.events || [];
    } catch (error) {
      console.error('Error fetching transaction events:', error);
      return [];
    }
  }

  /**
   * Get events by event type
   */
  public async getEventsByType(eventType: string, limit: number = 50): Promise<any[]> {
    try {
      const events = await this.client.queryEvents({
        query: { MoveEventType: eventType },
        limit,
        order: 'descending',
      });

      return events.data;
    } catch (error) {
      console.error('Error fetching events by type:', error);
      return [];
    }
  }

  // ======== Utility Functions ========

  /**
   * Parse amount string to MIST (smallest SUI unit)
   */
  private parseAmount(amount: string): string {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // Convert to MIST (1 SUI = 10^9 MIST)
    const mistAmount = Math.floor(numAmount * 1_000_000_000);
    return mistAmount.toString();
  }

  /**
   * Format balance from MIST to SUI
   */
  public formatBalance(balance: string, decimals: number = 9): string {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const quotient = balanceBigInt / divisor;
    const remainder = balanceBigInt % divisor;

    if (remainder === 0n) {
      return quotient.toString();
    }

    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');

    if (trimmedRemainder === '') {
      return quotient.toString();
    }

    return `${quotient}.${trimmedRemainder}`;
  }

  /**
   * Parse transaction result
   */
  private parseTransactionResult(result: any): TransactionResult {
    return {
      digest: result.digest,
      success: result.effects?.status?.status === 'success',
      gasUsed: result.effects?.gasUsed,
      effects: result.effects,
      events: result.events,
    };
  }

  /**
   * Check if address is valid Sui address
   */
  public isValidSuiAddress(address: string): boolean {
    try {
      return /^0x[a-fA-F0-9]{64}$/.test(address);
    } catch {
      return false;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  public async estimateGas(txb: TransactionBlock): Promise<bigint> {
    try {
      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: await txb.build({ client: this.client }),
      });

      const gasUsed = dryRunResult.effects.gasUsed;
      return BigInt(gasUsed.computationCost) + BigInt(gasUsed.storageCost);
    } catch (error) {
      console.error('Error estimating gas:', error);
      return BigInt(1000000); // Default estimate
    }
  }

  /**
   * Get package info
   */
  public async getPackageInfo(packageId: string): Promise<any> {
    try {
      return await this.client.getObject({
        id: packageId,
        options: {
          showContent: true,
          showType: true,
        },
      });
    } catch (error) {
      console.error('Error fetching package info:', error);
      return null;
    }
  }

  /**
   * Call a generic Move function
   */
  public async callMoveFunction(
    params: MoveCallParams,
    signer: any
  ): Promise<TransactionResult> {
    if (!this.packageId) throw new Error('Package ID not set');

    const txb = new TransactionBlock();

    txb.moveCall({
      target: `${params.packageId || this.packageId}::${params.module}::${params.function}`,
      typeArguments: params.typeArguments || [],
      arguments: params.arguments?.map(arg => {
        if (typeof arg === 'string' && this.isValidSuiAddress(arg)) {
          return txb.object(arg);
        }
        return txb.pure(arg);
      }) || [],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    return this.parseTransactionResult(result);
  }
}

export { MoveIntegrationService };
