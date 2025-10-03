# Sui Chat Wallet 🤖💰

Ứng dụng ví tiền điện tử thông minh sử dụng trí tuệ nhân tạo (AI) để thực hiện giao dịch crypto và tạo NFT chỉ bằng ngôn ngữ tự nhiên trên blockchain Sui.

## ✨ Tính năng chính

### 💬 Giao dịch bằng ngôn ngữ tự nhiên
- **Chat với AI** để gửi SUI token: "gửi 10 SUI cho địa chỉ 0x123..."
- **AI hiểu ngữ cảnh** và tự động xử lý giao dịch an toàn
- **Xác nhận bảo mật** trước khi thực hiện

### 🎨 Tạo NFT bằng AI
- **Mô tả bằng lời** để tạo NFT: "tạo NFT chú chó con dễ thương"
- **AI tự động tạo hình ảnh** sử dụng Stable Diffusion
- **Mint NFT trực tiếp** lên blockchain Sui

### 🔒 Bảo mật và dễ sử dụng
- **Kết nối ví Sui** an toàn với extension
- **Theo dõi số dư** real-time
- **Giao diện hiện đại** với React + TypeScript

## 🚀 Công nghệ sử dụng

### Frontend
- **React 18** + TypeScript + Vite
- **Tailwind CSS** + shadcn/ui
- **@mysten/dapp-kit** - tích hợp ví Sui
- **TanStack Query** - quản lý API

### Backend
- **FastAPI** + Python
- **LangGraph** - điều phối AI conversation
- **OpenRouter** - truy cập AI models (Grok, Gemini)
- **HuggingFace** - tạo hình ảnh AI
- **FreeImage** - hosting hình ảnh NFT

### Blockchain
- **Sui Testnet** - mạng thử nghiệm
- **Move language** - smart contracts
- **Sui CLI** - deployment tools

## 🚀 Hướng Dẫn Setup Từ Đầu

### 1. Yêu cầu hệ thống

Trước khi bắt đầu, đảm bảo bạn có:

- **Node.js 18+** và **npm**
- **Python 3.11+**
- **Sui Wallet** extension trong browser
- **Git**

### 2. Tải và cài đặt Sui CLI

```bash
# macOS với Homebrew
brew install sui

# Linux
curl -fsSL https://install.sui.io | bash

# Windows (PowerShell)
irm https://install.sui.io | iex

# Kiểm tra cài đặt
sui --version
```

### 3. Clone và setup project

```bash
# Clone repository
git clone https://github.com/tuanhqv123/sui_chat_wallet.git
cd sui-chat-wallet

# Cài đặt dependencies frontend
npm install

# Cài đặt dependencies backend
cd server
pip install -r requirements.txt
cd ..
```

### 4. Deploy Smart Contract lên Sui Testnet

```bash
# Vào thư mục Move
cd move

# Build contract
sui move build

# Switch sang testnet
sui client switch --env testnet

# Kiểm tra active address
sui client active-address

# Nếu chưa có address, tạo mới
sui client new-address ed25519

# Xin SUI testnet từ faucet
sui client faucet

# Deploy contract
sui client publish --gas-budget 100000000

# Sao chép Package ID từ output và paste vào contract_config.json
```

### 5. Lấy API Keys

**OpenRouter Token** (cho AI chat):

- Vào https://openrouter.ai/
- Sign up và get API key
- Chọn model: `x-ai/grok-4-fast:free` (miễn phí)

**HuggingFace Token** (cho image generation):

- Vào https://huggingface.co/
- Sign up và create token
- Model sử dụng: Stable Diffusion

**FreeImage API Key** (cho image upload):

- Vào https://freeimage.host/
- Sign up và get API key

### 6. Cấu hình Environment Variables

Tạo file `.env` trong thư mục gốc:

```env
# AI & API Keys (bắt buộc)
OPEN_ROUTER_TOKEN=sk-or-v1-xxxxxxxxxxxxx  # Từ https://openrouter.ai
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxx  # Từ https://huggingface.co
FREEIMAGE_API_KEY=xxxxxxxxxxxxxxxxxxxxxx  # Từ https://freeimage.host

# Frontend env vars
VITE_SUI_NETWORK=testnet
VITE_PACKAGE_ID=0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02
VITE_RPC_URL=https://fullnode.testnet.sui.io:443
VITE_API_BASE_URL=http://localhost:8000

# Optional
FRONTEND_URL=http://localhost:5173
X_TITLE=Sui Chat Wallet
```

### 7. Chạy ứng dụng local

```bash
# Terminal 1: Backend
cd server && python main.py

# Terminal 2: Frontend
npm run dev
```

Truy cập: `http://localhost:5174`

### 8. Test các tính năng

1. **Connect Wallet**: Click "Connect Wallet" và chọn Sui Wallet
2. **Switch to Testnet**: Trong Sui Wallet, đảm bảo đang ở Testnet
3. **Mint NFT**: Chat với AI: "mint an NFT called 'Test Dragon' with description 'A magical dragon'"
4. **Transfer Token**: Chat: "transfer 0.001 SUI to [address]"

## 🌐 Deploy Production

### **Deploy lên Render (Khuyến nghị)**

**Render** là lựa chọn tốt nhất vì:

- ✅ Hỗ trợ Docker full-stack
- ✅ Free tier 750 giờ/tháng
- ✅ Deploy tự động từ GitHub
- ✅ Đã có sẵn cấu hình

1. **Tạo tài khoản Render**

   - Vào [render.com](https://render.com)
   - Sign up với GitHub

2. **Connect Repository**

   - Click "New" → "Web Service"
   - Connect GitHub repo: `tuanhqv123/sui_chat_wallet`
   - Branch: `main`

3. **Cấu hình Service**

   - **Name**: `sui-chat-wallet`
   - **Runtime**: `Docker`
   - **Region**: `Singapore` (gần nhất)
   - **Build Command**: `docker build -t sui-chat-wallet .`
   - **Start Command**: `docker run -p $PORT:8000 sui-chat-wallet`

4. **Environment Variables** (set trong Render Dashboard):

   ```env
   # Frontend
   NODE_ENV=production
   VITE_SUI_NETWORK=testnet
   VITE_PACKAGE_ID=0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02
   VITE_RPC_URL=https://fullnode.testnet.sui.io:443

   # Backend (bắt buộc)
   OPEN_ROUTER_TOKEN=sk-or-v1-xxxxxxxxxxxxx
   HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxx
   FREEIMAGE_API_KEY=xxxxxxxxxxxxxxxxxxxxxx

   # Optional
   FRONTEND_URL=[auto-set-by-render]
   X_TITLE=Sui Chat Wallet
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Chờ 5-10 phút để build và deploy
   - App sẽ có URL: `https://sui-chat-wallet.onrender.com`

## 📋 Smart Contract Info

- **Network**: Sui Testnet
- **Package ID**: `0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02`
- **Contract**: `move/sources/nft_mint.move`
- **Function**: `mint_to_sender(name, description, image_url)`

## 🔗 API Endpoints & Services

### Backend APIs

| Method | Endpoint              | Description                    | Service Used      |
| ------ | --------------------- | ------------------------------ | ----------------- |
| GET    | `/health`             | Health check                   | -                 |
| POST   | `/api/chat`           | AI chat với blockchain intents | OpenRouter (Grok) |
| POST   | `/api/upload-image`   | Upload hình ảnh cho NFT        | FreeImage API     |
| POST   | `/api/generate-image` | Generate AI image              | HuggingFace       |

### External Services Required

1. **OpenRouter** (https://openrouter.ai/)

   - API: `OPEN_ROUTER_TOKEN`
   - Model: `x-ai/grok-4-fast:free` (miễn phí)
   - Usage: AI chat và blockchain intent detection

2. **HuggingFace** (https://huggingface.co/)

   - API: `HF_TOKEN`
   - Usage: Stable Diffusion image generation

3. **FreeImage** (https://freeimage.host/)
   - API: `FREEIMAGE_API_KEY`
   - Usage: Image upload và hosting cho NFTs

## 🎯 Cách sử dụng

1. **Truy cập app** sau khi deploy
2. **Connect Sui Wallet** (đảm bảo Testnet)
3. **Chat với AI** để thực hiện giao dịch:
   - "mint an NFT called 'My NFT' with description 'Cool NFT'"
   - "transfer 0.01 SUI to [wallet-address]"
   - "show my balance"
4. **Confirm transactions** trong wallet popup

## 🐛 Troubleshooting

### Lỗi "Dependent package not found"

- Đảm bảo wallet đang ở Testnet
- Kiểm tra Package ID trong `contract_config.json`

### Lỗi "Insufficient funds"

- Xin thêm SUI từ faucet: `sui client faucet`

### Lỗi Docker build

- Đảm bảo Docker Desktop đang chạy
- Clear cache: `docker system prune -a`

### Lỗi API calls

- Kiểm tra OpenAI API key
- Kiểm tra CORS settings

## 📞 Support

Nếu gặp vấn đề:

1. Check browser console (F12 → Console)
2. Check Network tab cho API calls
3. Check Sui Wallet extension logs
4. Check server logs trong Render dashboard

---

## 🎉 **Tóm tắt**

Dự án **Sui Chat Wallet** là một ứng dụng Web3 hoàn chỉnh cho phép người dùng:

- Chat với AI để thực hiện giao dịch blockchain
- Mint NFT với hình ảnh từ AI
- Transfer token một cách an toàn
- Quản lý ví và lịch sử giao dịch

**Tech Stack**: React + TypeScript + FastAPI + LangGraph + Sui Testnet

**Deploy**: Render (Docker full-stack) - Dễ nhất và miễn phí!

🚀 **Bắt đầu ngay với hướng dẫn trên!**
