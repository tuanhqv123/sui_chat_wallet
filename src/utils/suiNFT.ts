import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";

// Sui client for devnet
const suiClient = new SuiClient({
  url: "https://fullnode.devnet.sui.io:443",
});

// Contract configuration
const CONTRACT_CONFIG = {
  packageId:
    "0xec55390071d122616c22b53fc95bbb6718ed3a7a1f9b3e5251b1c8733029b757",
  moduleName: "nft_mint",
  functionName: "mint_to_sender",
  network: "devnet" as const,
};

export interface NFTMintParams {
  name: string;
  description: string;
  imageUrl: string;
  attributes?: Record<string, string>;
}

export interface NFTMintResult {
  success: boolean;
  nftId?: string;
  transactionDigest?: string;
  error?: string;
}

/**
 * Mint a new NFT using the deployed Sui contract
 */
export async function mintNFTReal(
  params: NFTMintParams,
  signAndExecuteTransaction: any
): Promise<NFTMintResult> {
  try {
    console.log("🔨 Minting NFT with real Sui contract...");
    console.log("📋 Package ID:", CONTRACT_CONFIG.packageId);
    console.log("📋 NFT Name:", params.name);

    // Build the transaction
    const tx = new Transaction();

    // Call the mint_to_sender function
    tx.moveCall({
      target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.moduleName}::${CONTRACT_CONFIG.functionName}`,
      arguments: [
        tx.pure.string(params.name),
        tx.pure.string(params.description),
        tx.pure.string(params.imageUrl),
      ],
    });

    // Execute the transaction using wallet
    const result = await signAndExecuteTransaction({
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log("✅ NFT minting transaction successful!");
    console.log("📋 Transaction digest:", result.digest);

    // Find the created NFT object
    const nftObject = result.objectChanges?.find(
      (change: any) =>
        change.type === "created" && change.objectType?.includes("NFT")
    );

    if (nftObject) {
      console.log("🪙 NFT Object ID:", nftObject.objectId);

      return {
        success: true,
        nftId: nftObject.objectId,
        transactionDigest: result.digest,
      };
    } else {
      console.log("⚠️  NFT object not found in transaction results");
      return {
        success: true,
        transactionDigest: result.digest,
      };
    }
  } catch (error) {
    console.error("❌ NFT minting failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get NFT information from the blockchain
 */
export async function getNFTInfo(nftId: string): Promise<any> {
  try {
    const object = await suiClient.getObject({
      id: nftId,
      options: {
        showContent: true,
        showDisplay: true,
        showType: true,
      },
    });

    if (object.data) {
      return {
        id: nftId,
        type: object.data.type,
        content: object.data.content,
        display: object.data.display,
        version: object.data.version,
        digest: object.data.digest,
      };
    } else {
      throw new Error("NFT object not found");
    }
  } catch (error) {
    throw new Error(`Failed to get NFT info: ${error}`);
  }
}

/**
 * Get contract information
 */
export function getContractInfo() {
  return {
    packageId: CONTRACT_CONFIG.packageId,
    moduleName: CONTRACT_CONFIG.moduleName,
    functionName: CONTRACT_CONFIG.functionName,
    network: CONTRACT_CONFIG.network,
    nftType: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.moduleName}::NFT`,
  };
}
