# Sui Chat Wallet

AI-powered Web3 Wallet Interface for Sui Blockchain

## Features

- 🤖 AI-powered chat interface for crypto/DeFi interactions
- 💰 Multi-token wallet with SUI and token support
- 🖼️ NFT minting and management
- 💸 Transfer tokens between wallets
- 📊 Real-time transaction history
- 🔐 Secure wallet integration with Sui Wallet

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Python + FastAPI + LangGraph
- **Blockchain**: Sui Testnet
- **AI**: OpenAI GPT models
- **Database**: In-memory session storage (Supabase optional for persistence)

## Quick Start

### Local Development

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd sui-chat-wallet
   ```

2. **Install frontend dependencies**

   ```bash
   npm install
   ```

3. **Install backend dependencies**

   ```bash
   cd server
   pip install -r requirements.txt
   cd ..
   ```

4. **Start development servers**

   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   cd server && python main.py
   ```

5. **Open your browser**
   ```
   http://localhost:5174
   ```

## Deployment

### Deploy to Render (Recommended)

1. **Connect your GitHub repository to Render**

2. **Create a new Web Service**

   - **Runtime**: Docker
   - **Build Command**: `docker build -t sui-chat-wallet .`
   - **Start Command**: `docker run -p $PORT:8000 sui-chat-wallet`

3. **Set Environment Variables**:

   ```env
   NODE_ENV=production
   VITE_SUI_NETWORK=testnet
   VITE_PACKAGE_ID=0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02
   VITE_RPC_URL=https://fullnode.testnet.sui.io:443
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Deploy!** 🚀

### Manual Deployment

If you prefer manual deployment:

```bash
# Build the Docker image
docker build -t sui-chat-wallet .

# Run the container
docker run -p 8000:8000 sui-chat-wallet
```

## Environment Variables

### Frontend (.env)

```env
VITE_SUI_NETWORK=testnet
VITE_PACKAGE_ID=0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02
VITE_RPC_URL=https://fullnode.testnet.sui.io:443
```

### Backend

```env
OPENAI_API_KEY=your_openai_api_key
# Optional: Supabase for persistent session storage
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Smart Contract

The NFT minting contract is deployed on Sui Testnet:

- **Package ID**: `0xb0ed4616666009ff326069b936cd15316d740527f5855f437656d4233fbb4d02`
- **Network**: Testnet
- **Source**: `move/sources/nft_mint.move`

## API Endpoints

- `GET /health` - Health check
- `POST /api/chat` - AI chat with blockchain intents
- `POST /api/upload-image` - Upload images for NFT creation
- `POST /api/generate-image` - Generate AI images

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
