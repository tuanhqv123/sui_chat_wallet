// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  ENDPOINTS: {
    MODELS: "/api/models",
    CHAT: "/api/chat",
    TRANSFER_EXECUTE: "/api/transfer/execute",
    NFT_MINT: "/api/nft/mint",
    UPLOAD_IMAGE: "/api/upload/image",
  },
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
