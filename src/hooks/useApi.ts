import { useQuery, useMutation } from "@tanstack/react-query";
import { getApiUrl, API_CONFIG } from "../config/api";

export interface TransferRecipient {
  to_address: string;
  amount: number;
}

export interface TransferIntent {
  intent: string;
  from_address: string;
  to_address?: string; // For single recipient (backward compatibility)
  amount?: number; // For single recipient (backward compatibility)
  recipients?: TransferRecipient[]; // For multiple recipients
  token_type: string;
  network: string;
  requires_confirmation: boolean;
}

export interface NFTMintIntent {
  intent: string;
  owner_address: string;
  name: string;
  description: string;
  image_url: string;
  attributes: Record<string, any>;
  network: string;
  requires_confirmation: boolean;
}

export interface TransferResponse {
  success: boolean;
  transaction_digest?: string;
  message: string;
  error?: string;
  requires_wallet_signature?: boolean;
  transfer_intent?: TransferIntent;
}

export interface NFTMintResponse {
  success: boolean;
  nft_id?: string;
  transaction_digest?: string;
  message: string;
  error?: string;
  package_id?: string;
  function_name?: string;
  module_name?: string;
  nft_type?: string;
  instructions?: string;
}

export interface ImageUploadResponse {
  success: boolean;
  image_url?: string;
  filename?: string;
  size?: number;
  content_type?: string;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface ChatRequest {
  message: string;
  model: string;
  wallet_address?: string;
  current_balance?: string;
  mode?: string; // "nft" or "transfer"
}

export interface ImageGenerationRequest {
  story_prompt?: string;
  prompt?: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  message?: string;
  image_url?: string;
  image_base64?: string;
  prompt?: string;
  prompt_used?: string;
  error?: string;
}

export interface ChatResponse {
  success: boolean;
  reply?: any; // Can be string or structured object (legacy)
  response?: any; // Can be string or structured object (new)
  error?: string;
}

export interface ModelsResponse {
  success: boolean;
  data: ModelInfo[];
}

// Fetch available models
export const useModels = () => {
  return useQuery<ModelsResponse>({
    queryKey: ["models"],
    queryFn: async () => {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.MODELS);
      console.log("Fetching models from:", url);
      const response = await fetch(url);
      console.log("Models response status:", response.status);
      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }
      const data = await response.json();
      console.log("Models data:", data);
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - models don't change often
  });
};

// Chat mutation
export const useChat = () => {
  return useMutation<ChatResponse, Error, ChatRequest>({
    mutationFn: async ({
      message,
      model,
      wallet_address,
      current_balance,
      mode,
    }) => {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CHAT), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          model,
          wallet_address,
          current_balance,
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      return data;
    },
  });
};

// Transfer execution mutation
export const useTransfer = () => {
  return useMutation<TransferResponse, Error, TransferIntent>({
    mutationFn: async (transferIntent) => {
      const response = await fetch(
        getApiUrl(API_CONFIG.ENDPOINTS.TRANSFER_EXECUTE),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transferIntent),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to execute transfer");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to execute transfer");
      }

      return data;
    },
  });
};

// NFT mint mutation
export const useNFTMint = () => {
  return useMutation<NFTMintResponse, Error, NFTMintIntent>({
    mutationFn: async (nftIntent) => {
      console.log("🔨 NFT Mint Request:", nftIntent);

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.NFT_MINT), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nftIntent),
      });

      console.log("🔨 NFT Mint Response Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔨 NFT Mint Error:", errorText);
        throw new Error(`Failed to mint NFT: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("🔨 NFT Mint Success:", data);

      if (!data.success) {
        throw new Error(data.error || "Failed to mint NFT");
      }

      return data;
    },
  });
};

// Image generation mutation
export const useImageGeneration = () => {
  return useMutation<ImageGenerationResponse, Error, ImageGenerationRequest>({
    mutationFn: async ({ story_prompt }) => {
      const response = await fetch(getApiUrl("/api/generate-image"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ story_prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    },
  });
};

// Image upload mutation
export const useImageUpload = () => {
  return useMutation<ImageUploadResponse, Error, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        getApiUrl(API_CONFIG.ENDPOINTS.UPLOAD_IMAGE),
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      return data;
    },
  });
};
