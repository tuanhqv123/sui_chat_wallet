# Sui Chat Wallet

AI-powered Web3 Wallet Interface for Sui Blockchain với khả năng mint NFT thông qua chat AI

## Features

- 🤖 **AI Chat Interface**: Chat với AI để thực hiện các giao dịch crypto/DeFi
- 💰 **Multi-token Wallet**: Quản lý SUI và các token khác
- 🖼️ **NFT Minting**: Tạo NFT với hình ảnh từ AI hoặc upload
- 💸 **Token Transfer**: Chuyển token giữa các ví
- 📊 **Transaction History**: Lịch sử giao dịch real-time
- 🔐 **Secure Integration**: Tích hợp với Sui Wallet extension

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Python + FastAPI + LangGraph
- **Blockchain**: Sui Testnet
- **AI**: OpenAI GPT-4
- **Database**: In-memory storage (không cần database ngoài)

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

### 5. Cấu hình Environment Variables

Tạo file `.env` trong thư mục gốc:

```env
# OpenAI API Key (bắt buộc)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Frontend env vars
VITE_SUI_NETWORK=testnet
VITE_PACKAGE_ID=0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02
VITE_RPC_URL=https://fullnode.testnet.sui.io:443
```

### 6. Chạy ứng dụng local

```bash
# Terminal 1: Backend
cd server && python main.py

# Terminal 2: Frontend
npm run dev
```

Truy cập: `http://localhost:5174`

### 7. Test các tính năng

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

4. **Environment Variables**:
   ```env
   NODE_ENV=production
   OPENAI_API_KEY=sk-your-openai-key-here
   VITE_SUI_NETWORK=testnet
   VITE_PACKAGE_ID=0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02
   VITE_RPC_URL=https://fullnode.testnet.sui.io:443
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

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/chat` | AI chat với blockchain intents |
| POST | `/api/upload-image` | Upload hình ảnh cho NFT |
| POST | `/api/generate-image` | Generate AI image |

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
