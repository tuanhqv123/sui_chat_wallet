// Contract configuration for Sui Chat Wallet
// This file contains all the contract addresses and function targets

export interface ContractConfig {
  network: string;
  packageId: string;
  modules: {
    walletManager: string;
    aiOracle: string;
    defiActions: string;
  };
  rpcUrl: string;
}

// Default configuration - will be updated after deployment
export const CONTRACT_CONFIG: ContractConfig = {
  network: process.env.VITE_SUI_NETWORK || 'devnet',
  packageId: process.env.VITE_PACKAGE_ID || '0x0', // Will be updated after deployment
  modules: {
    walletManager: 'wallet_manager',
    aiOracle: 'ai_oracle',
    defiActions: 'defi_actions',
  },
  rpcUrl: process.env.VITE_RPC_URL || 'https://fullnode.devnet.sui.io:443',
};

// Move function targets
export const MOVE_CALLS = {
  // Wallet Manager Functions
  createWallet: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::create_wallet`,
  deposit: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::deposit`,
  withdraw: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::withdraw`,
  aiTransfer: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::ai_transfer`,
  batchTransfer: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::batch_transfer`,
  configureAI: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::configure_ai`,
  toggleAI: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::toggle_ai`,

  // AI Oracle Functions
  processIntent: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.aiOracle}::process_intent`,
  executeAIAction: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.aiOracle}::execute_ai_action`,
  approveIntent: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.aiOracle}::approve_intent`,
  rejectIntent: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.aiOracle}::reject_intent`,
  createAIPermission: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.aiOracle}::create_ai_permission`,
  updateOracleConfig: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.aiOracle}::update_oracle_config`,

  // DeFi Actions Functions
  createPool: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::create_pool`,
  aiSwap: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::ai_swap`,
  addLiquidity: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::add_liquidity`,
  removeLiquidity: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::remove_liquidity`,
  createStakingPool: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::create_staking_pool`,
  stakeTokens: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::stake_tokens`,
  harvestRewards: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::harvest_rewards`,
};

// Event types for filtering blockchain events
export const EVENT_TYPES = {
  // Wallet Manager Events
  WalletCreated: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::WalletCreated`,
  TransactionExecuted: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::TransactionExecuted`,
  BalanceUpdated: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::BalanceUpdated`,
  AIActionTriggered: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.walletManager}::AIActionTriggered`,

  // AI Oracle Events
  IntentProcessed: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.aiOracle}::IntentProcessed`,
  AIActionExecuted: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.aiOracle}::AIActionExecuted`,
  IntentRejected: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.aiOracle}::IntentRejected`,
  OracleConfigUpdated: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.aiOracle}::OracleConfigUpdated`,

  // DeFi Events
  SwapExecuted: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::SwapExecuted`,
  LiquidityAdded: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::LiquidityAdded`,
  LiquidityRemoved: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::LiquidityRemoved`,
  TokensStaked: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::TokensStaked`,
  TokensUnstaked: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::TokensUnstaked`,
  RewardsHarvested: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules.defiActions}::RewardsHarvested`,
};

// Common coin types on Sui
export const COIN_TYPES = {
  SUI: '0x2::sui::SUI',
  // Add other coin types as needed
};

// AI Models supported
export const AI_MODELS = {
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
  GPT_4: 'gpt-4',
  GPT_4_TURBO: 'gpt-4-turbo-preview',
  CLAUDE_3: 'claude-3',
};

// Security levels for AI operations
export const SECURITY_LEVELS = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  MAX: 3,
};

// Intent types that the AI can process
export const INTENT_TYPES = {
  TRANSFER: 'TRANSFER',
  BALANCE_QUERY: 'BALANCE_QUERY',
  HISTORY_QUERY: 'HISTORY_QUERY',
  SWAP: 'SWAP',
  ADD_LIQUIDITY: 'ADD_LIQUIDITY',
  REMOVE_LIQUIDITY: 'REMOVE_LIQUIDITY',
  STAKE: 'STAKE',
  UNSTAKE: 'UNSTAKE',
  HARVEST: 'HARVEST',
};

// Status codes for intents
export const INTENT_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  EXECUTED: 2,
  REJECTED: 3,
};

// Operation types for DeFi
export const DEFI_OPERATIONS = {
  SWAP: 1,
  ADD_LIQUIDITY: 2,
  REMOVE_LIQUIDITY: 3,
  STAKE: 4,
  UNSTAKE: 5,
  HARVEST: 6,
};

// Gas budget constants (in MIST)
export const GAS_BUDGETS = {
  CREATE_WALLET: 10_000_000, // 0.01 SUI
  DEPOSIT: 5_000_000, // 0.005 SUI
  WITHDRAW: 5_000_000, // 0.005 SUI
  TRANSFER: 10_000_000, // 0.01 SUI
  AI_TRANSFER: 15_000_000, // 0.015 SUI
  PROCESS_INTENT: 20_000_000, // 0.02 SUI
  SWAP: 25_000_000, // 0.025 SUI
  ADD_LIQUIDITY: 30_000_000, // 0.03 SUI
  STAKE: 20_000_000, // 0.02 SUI
  DEFAULT: 50_000_000, // 0.05 SUI
};

// Confidence thresholds for AI operations
export const CONFIDENCE_THRESHOLDS = {
  LOW: 50,
  MEDIUM: 70,
  HIGH: 85,
};

// Maximum slippage tolerance (in basis points)
export const MAX_SLIPPAGE = 5000; // 50%

// Default slippage tolerance (in basis points)
export const DEFAULT_SLIPPAGE = 100; // 1%

// Update configuration after deployment
export const updateContractConfig = (newConfig: Partial<ContractConfig>) => {
  Object.assign(CONTRACT_CONFIG, newConfig);

  // Update MOVE_CALLS with new package ID
  if (newConfig.packageId) {
    Object.keys(MOVE_CALLS).forEach(key => {
      const [, ...parts] = (MOVE_CALLS as any)[key].split('::');
      (MOVE_CALLS as any)[key] = `${newConfig.packageId}::${parts.join('::')}`;
    });

    // Update EVENT_TYPES with new package ID
    Object.keys(EVENT_TYPES).forEach(key => {
      const [, ...parts] = (EVENT_TYPES as any)[key].split('::');
      (EVENT_TYPES as any)[key] = `${newConfig.packageId}::${parts.join('::')}`;
    });
  }
};

// Utility function to get function target
export const getFunctionTarget = (module: keyof typeof CONTRACT_CONFIG.modules, functionName: string): string => {
  return `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules[module]}::${functionName}`;
};

// Utility function to get event type
export const getEventType = (module: keyof typeof CONTRACT_CONFIG.modules, eventName: string): string => {
  return `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.modules[module]}::${eventName}`;
};

// Validation functions
export const isValidPackageId = (packageId: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(packageId);
};

export const isValidObjectId = (objectId: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(objectId);
};

export const isValidSuiAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
};

// Helper to format amounts
export const formatSuiAmount = (amount: string | number, decimals: number = 9): string => {
  const amountBigInt = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const quotient = amountBigInt / divisor;
  const remainder = amountBigInt % divisor;

  if (remainder === 0n) {
    return quotient.toString();
  }

  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmedRemainder = remainderStr.replace(/0+$/, '');

  if (trimmedRemainder === '') {
    return quotient.toString();
  }

  return `${quotient}.${trimmedRemainder}`;
};

// Helper to parse amounts to MIST
export const parseToMist = (amount: string): string => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Invalid amount');
  }
  return Math.floor(numAmount * 1_000_000_000).toString();
};
