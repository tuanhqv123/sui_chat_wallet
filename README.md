# Sui Chat Wallet

An intelligent crypto wallet that uses artificial intelligence to execute cryptocurrency transactions and create NFTs using natural language on the Sui blockchain.

## Features

### Natural Language Transactions

- **Chat with AI** to send SUI tokens: "send 10 SUI to address 0x123..."
- **AI understands context** and automatically processes secure transactions
- **Secure confirmation** before execution

### AI-Powered NFT Creation

- **Describe in words** to create NFTs: "create NFT of cute puppy"
- **AI automatically generates images** using Stable Diffusion
- **Mint NFTs directly** on Sui blockchain

### Security & User-Friendly

- **Connect Sui Wallet** securely with extension
- **Real-time balance tracking**
- **Modern interface** with React + TypeScript

## Technology Stack

### Frontend

- **React 18** + TypeScript + Vite
- **Tailwind CSS** + shadcn/ui
- **@mysten/dapp-kit** - Sui wallet integration
- **TanStack Query** - API management

### Backend

- **FastAPI** + Python
- **LangGraph** - AI conversation orchestration
- **OpenRouter** - AI models access (Grok, Gemini)
- **HuggingFace** - AI image generation
- **FreeImage** - NFT image hosting

### Blockchain

- **Sui Testnet** - test network
- **Move language** - smart contracts
- **Sui CLI** - deployment tools

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and **npm**
- **Python 3.11+**
- **Sui Wallet** extension in browser
- **Git**

### 1. Install Sui CLI

```bash
# macOS with Homebrew
brew install sui

# Linux
curl -fsSL https://install.sui.io | bash

# Windows (PowerShell)
irm https://install.sui.io | iex

# Verify installation
sui --version
```

### 2. Clone and Setup Project

```bash
# Clone repository
git clone https://github.com/tuanhqv123/sui_chat_wallet.git
cd sui-chat-wallet

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
pip install -r requirements.txt
cd ..
```

### 3. Deploy Smart Contract to Sui Testnet

```bash
# Navigate to Move directory
cd move

# Build contract
sui move build

# Switch to testnet
sui client switch --env testnet

# Check active address
sui client active-address

# Create new address if needed
sui client new-address ed25519

# Request SUI from faucet
sui client faucet

# Deploy contract
sui client publish --gas-budget 100000000

# Copy Package ID from output and paste into contract_config.json
```

### 4. Get API Keys

**OpenRouter Token** (for AI chat):

- Visit https://openrouter.ai/
- Sign up and get API key
- Select model: `x-ai/grok-4-fast:free` (free)

**HuggingFace Token** (for image generation):

- Visit https://huggingface.co/
- Sign up and create token
- Model used: Stable Diffusion

**FreeImage API Key** (for image upload):

- Visit https://freeimage.host/
- Sign up and get API key

### 5. Configure Environment Variables

Create `.env` file in root directory:

```env
# AI & API Keys (required)
OPEN_ROUTER_TOKEN=sk-or-v1-xxxxxxxxxxxxx  # From https://openrouter.ai
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxx  # From https://huggingface.co
FREEIMAGE_API_KEY=xxxxxxxxxxxxxxxxxxxxxx  # From https://freeimage.host

# Frontend env vars
VITE_SUI_NETWORK=testnet
VITE_PACKAGE_ID=0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02
VITE_RPC_URL=https://fullnode.testnet.sui.io:443
VITE_API_BASE_URL=http://localhost:8000

# Optional
FRONTEND_URL=http://localhost:5173
X_TITLE=Sui Chat Wallet
```

### 6. Run Application Locally

```bash
# Terminal 1: Backend
cd server && python main.py

# Terminal 2: Frontend
npm run dev
```

Visit: `http://localhost:5174`

### 7. Test Features

1. **Connect Wallet**: Click "Connect Wallet" and select Sui Wallet
2. **Switch to Testnet**: In Sui Wallet, ensure you're on Testnet
3. **Mint NFT**: Chat with AI: "mint an NFT called 'Test Dragon' with description 'A magical dragon'"
4. **Transfer Token**: Chat: "transfer 0.001 SUI to [address]"

## Production Deployment

### Deploy to Render (Recommended)

**Render** is the best option because:

- ✅ Full-stack Docker support
- ✅ Free tier 750 hours/month
- ✅ Automatic deployment from GitHub
- ✅ Pre-configured setup

1. **Create Render Account**

   - Visit [render.com](https://render.com)
   - Sign up with GitHub

2. **Connect Repository**

   - Click "New" → "Web Service"
   - Connect GitHub repo: `tuanhqv123/sui_chat_wallet`
   - Branch: `main`

3. **Configure Service**

   - **Name**: `sui-chat-wallet`
   - **Runtime**: `Docker`
   - **Region**: `Singapore` (closest)
   - **Build Command**: `docker build -t sui-chat-wallet .`
   - **Start Command**: `docker run -p $PORT:8000 sui-chat-wallet`

4. **Environment Variables** (set in Render Dashboard):

   ```env
   # Frontend
   NODE_ENV=production
   VITE_SUI_NETWORK=testnet
   VITE_PACKAGE_ID=0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02
   VITE_RPC_URL=https://fullnode.testnet.sui.io:443

   # Backend (required)
   OPEN_ROUTER_TOKEN=sk-or-v1-xxxxxxxxxxxxx
   HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxx
   FREEIMAGE_API_KEY=xxxxxxxxxxxxxxxxxxxxxx

   # Optional
   FRONTEND_URL=[auto-set-by-render]
   X_TITLE=Sui Chat Wallet
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait 5-10 minutes for build and deployment
   - App will be available at: `https://sui-chat-wallet.onrender.com`

## Smart Contract Info

- **Network**: Sui Testnet
- **Package ID**: `0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02`
- **Contract**: `move/sources/nft_mint.move`
- **Function**: `mint_to_sender(name, description, image_url)`

## API Endpoints & Services

### Backend APIs

| Method | Endpoint              | Description                    | Service Used      |
| ------ | --------------------- | ------------------------------ | ----------------- |
| GET    | `/health`             | Health check                   | -                 |
| POST   | `/api/chat`           | AI chat with blockchain intents | OpenRouter (Grok) |
| POST   | `/api/upload-image`   | Upload NFT images              | FreeImage API     |
| POST   | `/api/generate-image` | Generate AI images             | HuggingFace       |

### External Services Required

1. **OpenRouter** (https://openrouter.ai/)

   - API: `OPEN_ROUTER_TOKEN`
   - Model: `x-ai/grok-4-fast:free` (free)
   - Usage: AI chat and blockchain intent detection

2. **HuggingFace** (https://huggingface.co/)

   - API: `HF_TOKEN`
   - Usage: Stable Diffusion image generation

3. **FreeImage** (https://freeimage.host/)
   - API: `FREEIMAGE_API_KEY`
   - Usage: NFT image upload and hosting

## Usage

1. **Access app** after deployment
2. **Connect Sui Wallet** (ensure Testnet)
3. **Chat with AI** to execute transactions:
   - "mint an NFT called 'My NFT' with description 'Cool NFT'"
   - "transfer 0.01 SUI to [wallet-address]"
   - "show my balance"
4. **Confirm transactions** in wallet popup
