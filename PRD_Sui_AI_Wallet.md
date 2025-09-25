# Product Requirements Document (PRD)
## Sui Web3 Wallet with AI Chat Interface

### 📋 Project Overview

**Product Name:** Sui Chat Wallet
**Version:** 1.0
**Target Launch:** Q1 2025
**Development Timeline:** 3-4 months

---

## 🎯 Executive Summary

A decentralized Web3 wallet application built on Sui blockchain using zkLogin authentication, Move smart contracts, and natural language chat interface powered by OpenAI. Users interact with their wallet through conversational commands while maintaining full Web3 decentralization.

---

## 🔍 Problem Statement

Users want to interact with their Sui wallet using natural language while maintaining true Web3 decentralization and security.

---

## 🎯 Core Features

1. **zkLogin Authentication**: OAuth-based Web3 authentication without seed phrases
2. **Move Smart Contracts**: Custom Sui Move contracts for wallet operations
3. **Chat Interface**: Natural language interaction using OpenAI API
4. **Decentralized Operations**: All wallet functions on-chain via Sui network
5. **Web3 UI**: ShadcnUI components for blockchain interactions

---

## 👥 Target Audience

- Sui blockchain users who prefer conversational interfaces
- Crypto users who want simplified wallet interactions
- Users comfortable with AI chat assistants

---

## ✨ Chat Commands

### Balance & Portfolio
- "What's my SUI balance?"
- "Show me all my tokens"
- "What are my assets worth?"

### Transactions
- "Send 10 SUI to 0x123..."
- "Transfer 5 USDC to Alice"
- "Show my transaction history"

### Price Information
- "What's the price of SUI?"
- "How much is 1 ETH in USD?"
- "Show me token prices"

### General Queries
- "Help me understand gas fees"
- "What's the best time to transact?"

---

## 🛠 Technical Stack

### Frontend (Web3)
```typescript
// Core Framework
- React 18+ with TypeScript
- Vite for fast development
- TailwindCSS + ShadcnUI

// Sui Web3 Integration
- @mysten/dapp-kit (React hooks for Sui)
- @mysten/sui/client (Sui client)
- @mysten/sui/zklogin (zkLogin authentication)
- @mysten/sui/transactions (Transaction building)
```

### Smart Contracts (Move)
```move
// Sui Move modules
module wallet_chat::wallet_operations {
    // Balance queries
    // Transaction operations
    // Multi-signature support
    // Access control
}

module wallet_chat::ai_interface {
    // Chat command parsing
    // Transaction validation
    // Permission management
}
```

### AI Integration
```typescript
// OpenAI API
- GPT-4 for natural language processing
- Function calling for wallet operations
- LangGraph for tool routing

// Web3 Integration
- Client-side AI processing
- On-chain transaction validation
- Decentralized command execution
```

---

## 🏗 Web3 Architecture

```
User Chat → OpenAI API → LangGraph → Move Contracts → Sui Network
         ←            ←           ←                ←

 zkLogin Auth → Ephemeral Keys → Transaction Signing → On-Chain Execution
```

### zkLogin Flow
```typescript
// 1. OAuth Authentication
const authUrl = await getZkLoginAuthUrl({
  provider: 'google',
  redirectUrl: window.location.origin,
  clientId: process.env.GOOGLE_CLIENT_ID
})

// 2. Generate Ephemeral Keys
const ephemeralKeyPair = new Ed25519Keypair()
const ephemeralPublicKey = ephemeralKeyPair.getPublicKey()

// 3. Create Sui Address
const suiAddress = jwtToAddress(jwt, salt)

// 4. Sign Transactions
const zkProof = await generateZkProof(jwt, ephemeralKeyPair, userSalt)
```

---

## 🔧 Development Plan

### Phase 1: Move Contracts (3 weeks)
- [ ] Design wallet operation Move modules
- [ ] Implement balance query functions
- [ ] Create transaction validation logic
- [ ] Deploy contracts to Sui testnet

### Phase 2: zkLogin Integration (3 weeks)
- [ ] Set up OAuth providers (Google, Apple)
- [ ] Implement ephemeral key management
- [ ] Create Sui address derivation
- [ ] Test zkLogin authentication flow

### Phase 3: Web3 Frontend (3 weeks)
- [ ] React + TypeScript setup with Vite
- [ ] ShadcnUI component integration
- [ ] Sui dApp Kit wallet connection
- [ ] zkLogin UI components

### Phase 4: AI Chat Interface (3 weeks)
- [ ] OpenAI API integration
- [ ] LangGraph tool definitions
- [ ] Move contract interaction via AI
- [ ] Natural language command parsing

### Phase 5: Testing & Deploy (2 weeks)
- [ ] End-to-end testing on testnet
- [ ] Security audit of Move contracts
- [ ] Performance optimization
- [ ] Mainnet deployment

---

## 🔑 Core Components

### Move Smart Contracts
```move
// wallet_operations.move
module wallet_chat::wallet_operations {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // Wallet structure
    struct Wallet has key, store {
        id: UID,
        owner: address,
        balance: u64,
        transactions: vector<Transaction>,
    }

    // Transaction record
    struct Transaction has store {
        from: address,
        to: address,
        amount: u64,
        timestamp: u64,
    }

    // Send SUI tokens
    public entry fun send_sui(
        wallet: &mut Wallet,
        recipient: address,
        amount: u64,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // Validate sender
        assert!(wallet.owner == tx_context::sender(ctx), 0);

        // Transfer coins
        transfer::public_transfer(payment, recipient);

        // Record transaction
        let transaction = Transaction {
            from: wallet.owner,
            to: recipient,
            amount,
            timestamp: tx_context::epoch(ctx),
        };
        vector::push_back(&mut wallet.transactions, transaction);
    }

    // Get wallet balance
    public fun get_balance(wallet: &Wallet): u64 {
        wallet.balance
    }
}
```

### zkLogin Integration
```typescript
// zklogin-auth.ts
import {
  getZkLoginSignature,
  jwtToAddress,
  generateRandomness,
  generateNonce
} from '@mysten/sui/zklogin';

export class ZkLoginAuth {
  private ephemeralKeyPair: Ed25519Keypair;
  private userSalt: string;

  async authenticate(provider: 'google' | 'facebook') {
    // Generate ephemeral keys
    this.ephemeralKeyPair = new Ed25519Keypair();

    // Create OAuth URL
    const authUrl = await this.getAuthUrl(provider);

    // Redirect to OAuth
    window.location.href = authUrl;
  }

  async handleCallback(jwt: string) {
    // Derive Sui address
    const suiAddress = jwtToAddress(jwt, this.userSalt);

    // Generate ZK proof
    const zkProof = await this.generateProof(jwt);

    return { suiAddress, zkProof };
  }
}
```

### AI Tool Integration
```typescript
// ai-tools.ts
const walletTools = [
  {
    name: "send_transaction",
    description: "Send SUI tokens to another address",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient address" },
        amount: { type: "number", description: "Amount in SUI" }
      }
    },
    execute: async (params: any) => {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::wallet_operations::send_sui`,
        arguments: [params.to, params.amount]
      });
      return await suiClient.signAndExecuteTransaction({ tx });
    }
  },
  {
    name: "get_balance",
    description: "Get current wallet balance",
    execute: async () => {
      return await suiClient.getBalance({ owner: currentAddress });
    }
  }
];
```

---

## ✅ Success Metrics

- User adoption and chat engagement
- Transaction success rate via chat commands
- User satisfaction with AI responses
- Response time for chat operations

---

**Document Version:** 2.0 (Simplified)
**Last Updated:** September 23, 2025