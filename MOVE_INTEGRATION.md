# Move Smart Contract Integration for Sui Chat Wallet

This document provides comprehensive instructions for deploying and integrating Move smart contracts with the Sui Chat Wallet application.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Smart Contract Architecture](#smart-contract-architecture)
4. [Installation](#installation)
5. [Deployment](#deployment)
6. [Frontend Integration](#frontend-integration)
7. [Usage Examples](#usage-examples)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

## Overview

The Sui Chat Wallet integrates Move smart contracts to provide:

- **AI-Powered Wallet Management**: Smart contracts that can be controlled through natural language
- **DeFi Operations**: Automated token swapping, liquidity provision, and yield farming
- **Intent Processing**: AI oracle that interprets natural language and executes blockchain operations
- **Security Features**: Multi-level permissions and approval mechanisms

### Key Features

- 🤖 **AI Oracle**: Processes natural language intents and converts them to blockchain operations
- 💼 **Smart Wallet**: Enhanced wallet functionality with AI assistance
- 🔄 **DeFi Integration**: Automated trading, liquidity management, and staking
- 🔐 **Security Controls**: Permission levels, approval workflows, and slippage protection
- 📊 **Event Tracking**: Comprehensive logging of all operations

## Prerequisites

Before deploying the Move contracts, ensure you have:

### Required Tools

1. **Sui CLI** (Latest version)
   ```bash
   # Install Sui CLI
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui
   ```

2. **Node.js** (v18 or later)
   ```bash
   # Check Node.js version
   node --version
   ```

3. **Yarn** or **npm**
   ```bash
   # Install Yarn (optional)
   npm install -g yarn
   ```

### Network Setup

1. Initialize Sui client:
   ```bash
   sui client
   ```

2. Switch to desired network:
   ```bash
   # For development
   sui client switch --env devnet
   
   # For testing
   sui client switch --env testnet
   
   # For production
   sui client switch --env mainnet
   ```

3. Get test tokens (devnet/testnet only):
   ```bash
   sui client faucet
   ```

## Smart Contract Architecture

### Module Structure

```
move/
├── Move.toml                 # Project configuration
└── sources/
    ├── wallet_manager.move   # Core wallet functionality
    ├── ai_oracle.move        # AI intent processing
    └── defi_actions.move     # DeFi operations
```

### Core Modules

#### 1. Wallet Manager (`wallet_manager.move`)

**Purpose**: Manages user wallets with AI integration capabilities.

**Key Functions**:
- `create_wallet()`: Creates a new smart wallet
- `deposit()`: Deposits SUI tokens into the wallet
- `withdraw()`: Withdraws tokens from the wallet
- `ai_transfer()`: AI-assisted token transfers
- `batch_transfer()`: Multiple recipient transfers
- `configure_ai()`: AI settings configuration

**Key Structs**:
```rust
public struct Wallet {
    id: UID,
    owner: address,
    balance: Balance<SUI>,
    transaction_count: u64,
    ai_enabled: bool,
    // ... other fields
}
```

#### 2. AI Oracle (`ai_oracle.move`)

**Purpose**: Processes natural language intents and manages AI operations.

**Key Functions**:
- `process_intent()`: Processes natural language input
- `execute_ai_action()`: Executes approved AI actions
- `approve_intent()`: Approves pending intents
- `reject_intent()`: Rejects intents with reasons

**Key Structs**:
```rust
public struct Intent {
    id: UID,
    user_address: address,
    raw_text: String,
    intent_type: String,
    confidence_score: u8,
    status: u8, // 0=pending, 1=approved, 2=executed, 3=rejected
    // ... other fields
}
```

#### 3. DeFi Actions (`defi_actions.move`)

**Purpose**: Provides DeFi operations like swapping, liquidity provision, and staking.

**Key Functions**:
- `ai_swap()`: AI-assisted token swapping
- `add_liquidity()`: Add liquidity to pools
- `remove_liquidity()`: Remove liquidity from pools
- `stake_tokens()`: Stake tokens for rewards
- `harvest_rewards()`: Claim staking rewards

## Installation

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd sui-chat-wallet

# Install frontend dependencies
yarn install

# Make deployment script executable
chmod +x scripts/deploy.sh
```

### 2. Environment Configuration

Create `.env.local` file:

```env
# Sui Network Configuration
VITE_SUI_NETWORK=devnet
VITE_RPC_URL=https://fullnode.devnet.sui.io:443

# OpenAI Configuration (for AI features)
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Contract Configuration (will be updated after deployment)
VITE_PACKAGE_ID=0x0
```

## Deployment

### Automated Deployment

Use the provided deployment script for easy deployment:

```bash
# Deploy to devnet (default)
./scripts/deploy.sh

# Deploy to testnet
NETWORK=testnet ./scripts/deploy.sh

# Deploy to mainnet (use with caution)
NETWORK=mainnet ./scripts/deploy.sh
```

### Manual Deployment

For more control over the deployment process:

```bash
# Navigate to Move directory
cd move

# Build the contracts
sui move build

# Deploy to network
sui client publish --gas-budget 100000000 .
```

### Post-Deployment

After successful deployment:

1. **Update Configuration**: The deployment script automatically updates configuration files
2. **Verify Deployment**: Check the package on Sui Explorer
3. **Test Contracts**: Run basic function tests

## Frontend Integration

### 1. Contract Configuration

The deployment script creates `src/config/contracts.ts` with all contract addresses and function targets:

```typescript
export const CONTRACT_CONFIG = {
  network: 'devnet',
  packageId: '0x...', // Your deployed package ID
  modules: {
    walletManager: 'wallet_manager',
    aiOracle: 'ai_oracle',
    defiActions: 'defi_actions',
  },
};
```

### 2. Move Service Integration

The `MoveIntegrationService` provides a TypeScript interface to interact with Move contracts:

```typescript
import { MoveIntegrationService } from '../services/move-integration';

// Initialize service
const moveService = new MoveIntegrationService(suiClient);
moveService.setPackageId(CONTRACT_CONFIG.packageId);

// Create a wallet
const result = await moveService.createWallet(signer);
```

### 3. AI Integration

The AI service processes natural language and converts it to Move function calls:

```typescript
// Process user intent
const intent = await moveService.processIntent(
  oracleId,
  "Send 1 SUI to 0x123...",
  "TRANSFER",
  ["1", "0x123..."],
  85, // confidence score
  "gpt-4",
  signer
);
```

## Usage Examples

### Creating a Smart Wallet

```typescript
// Frontend code
const createWallet = async () => {
  try {
    const result = await moveService.createWallet(signer);
    console.log('Wallet created:', result.digest);
  } catch (error) {
    console.error('Error creating wallet:', error);
  }
};
```

### AI-Assisted Transfer

```typescript
// Process natural language intent
const processTransfer = async (userInput: string) => {
  // AI processes the input and extracts parameters
  const { recipient, amount, description } = parseTransferIntent(userInput);
  
  // Execute Move contract function
  const result = await moveService.aiTransfer(
    walletId,
    recipient,
    amount,
    description,
    signer
  );
  
  console.log('Transfer completed:', result.digest);
};
```

### DeFi Operations

```typescript
// AI-assisted token swap
const performSwap = async () => {
  const result = await moveService.aiSwap(
    poolId,
    inputCoin,
    minOutput,
    slippageTolerance,
    deadline,
    clockId,
    signer,
    coinAType,
    coinBType
  );
  
  console.log('Swap completed:', result.digest);
};
```

## Testing

### Unit Tests

Run Move contract tests:

```bash
cd move
sui move test
```

### Integration Tests

Test frontend integration:

```bash
# Run frontend tests
yarn test

# Run with Move contracts
yarn test:integration
```

### Manual Testing

1. **Create Wallet**: Test wallet creation through UI
2. **AI Commands**: Test natural language processing
3. **DeFi Operations**: Test swapping and liquidity operations
4. **Error Handling**: Test invalid inputs and edge cases

## Event Monitoring

Monitor blockchain events for real-time updates:

```typescript
// Listen for wallet events
const subscribeToEvents = async () => {
  const events = await moveService.getEventsByType(
    EVENT_TYPES.WalletCreated,
    50
  );
  
  events.forEach(event => {
    console.log('Wallet created:', event);
  });
};
```

## Security Considerations

### Permission Levels

The contracts implement multiple security levels:

- **Level 0**: View-only operations
- **Level 1**: Low-value transactions (< 0.1 SUI)
- **Level 2**: Medium-value transactions (< 1 SUI)
- **Level 3**: High-value transactions (manual approval required)

### AI Confidence Thresholds

AI operations require minimum confidence scores:

- **Low Confidence**: 50% (view operations)
- **Medium Confidence**: 70% (standard operations)
- **High Confidence**: 85% (high-value operations)

### Best Practices

1. **Test Thoroughly**: Always test on devnet/testnet first
2. **Monitor Events**: Set up event monitoring for production
3. **Backup Keys**: Securely store deployment keys
4. **Version Control**: Tag releases and maintain changelogs
5. **Documentation**: Keep documentation updated

## Troubleshooting

### Common Issues

#### 1. Deployment Failures

**Error**: `Insufficient gas`
```bash
# Solution: Increase gas budget
sui client publish --gas-budget 200000000 .
```

**Error**: `Package build failed`
```bash
# Solution: Check Move.toml configuration
cd move
sui move build --verbose
```

#### 2. Frontend Integration Issues

**Error**: `Package ID not set`
```typescript
// Solution: Update contract configuration
updateContractConfig({
  packageId: 'your_deployed_package_id'
});
```

**Error**: `Invalid object ID`
```typescript
// Solution: Verify object IDs are valid Sui addresses
if (!isValidObjectId(objectId)) {
  throw new Error('Invalid object ID format');
}
```

#### 3. AI Processing Issues

**Error**: `Confidence score too low`
- Improve AI prompts and training
- Lower confidence thresholds for testing
- Add more context to user inputs

### Debug Mode

Enable debug logging:

```typescript
// Enable verbose logging
const moveService = new MoveIntegrationService(suiClient, {
  debug: true,
  verbose: true
});
```

## Performance Optimization

### Gas Optimization

- Use appropriate gas budgets for different operations
- Batch operations when possible
- Optimize Move code for gas efficiency

### Frontend Optimization

- Cache frequently accessed data
- Use React Query for state management
- Implement proper error boundaries

## Monitoring and Analytics

### Event Tracking

```typescript
// Track user actions
const trackUserAction = (action: string, data: any) => {
  console.log(`User action: ${action}`, data);
  // Send to analytics service
};
```

### Performance Metrics

- Transaction success rates
- Average gas costs
- AI processing accuracy
- User engagement metrics

## Contributing

### Development Workflow

1. **Fork Repository**: Create your own fork
2. **Create Branch**: Use feature branches for development
3. **Write Tests**: Ensure comprehensive test coverage
4. **Update Documentation**: Keep docs current
5. **Submit PR**: Follow the PR template

### Code Standards

- Follow Move coding conventions
- Use TypeScript for frontend code
- Write comprehensive tests
- Document all public APIs

### Release Process

1. **Version Bump**: Update version numbers
2. **Changelog**: Document all changes
3. **Testing**: Run full test suite
4. **Deployment**: Deploy to testnet first
5. **Production**: Deploy to mainnet after testing

## Support

### Resources

- [Sui Documentation](https://docs.sui.io/)
- [Move Language Reference](https://move-language.github.io/)
- [OpenAI API Documentation](https://platform.openai.com/docs)

### Community

- GitHub Issues: Report bugs and feature requests
- Discord: Join the community discussion
- Documentation: Contribute to docs

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.