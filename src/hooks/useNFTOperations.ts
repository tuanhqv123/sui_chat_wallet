import { useState, useCallback } from "react";
// Import on-chain package info
import contractConfig from "../../contract_config.json" assert { type: "json" };
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction as SuiTransaction } from "@mysten/sui/transactions";
import { useImageUpload, useImageGeneration } from "./useApi";

interface NFTForm {
  name: string;
  description: string;
  imageUrl: string;
  imageFile: File | null;
}

export function useNFTOperations() {
  const { mutateAsync: signAndExecuteTransactionBlock } =
    useSignAndExecuteTransaction();
  const imageUploadMutation = useImageUpload();
  const imageGenerationMutation = useImageGeneration();

  const [pendingNFTMint, setPendingNFTMint] = useState<any>(null);
  const [showNFTMintDialog, setShowNFTMintDialog] = useState(false);
  const [isExecutingTransaction, setIsExecutingTransaction] =
    useState<boolean>(false);
  const [nftForm, setNftForm] = useState<NFTForm>({
    name: "",
    description: "",
    imageUrl: "",
    imageFile: null,
  });

  // Function to upload image anonymously and get URL
  const uploadAnonymous = useCallback(
    async (base64Image: string): Promise<string> => {
      try {
        // Call backend endpoint to upload image
        const response = await fetch("http://localhost:8000/api/upload-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_base64: base64Image,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Upload failed");
        }

        if (!data.image_url) {
          throw new Error("No image URL returned from backend");
        }

        console.log("✅ Image uploaded successfully:", data.image_url);
        return data.image_url;
      } catch (error) {
        console.error("Image upload error:", error);
        throw new Error(
          `Failed to upload image: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
    []
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      try {
        const data = await imageUploadMutation.mutateAsync(file);

        setNftForm((prev) => ({
          ...prev,
          imageUrl: data.image_url!,
          imageFile: file,
        }));
      } catch (error) {
        console.error("Upload error:", error);
        throw error;
      }
    },
    [imageUploadMutation]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  const handlePasteImage = useCallback(
    (event: React.ClipboardEvent) => {
      const items = event.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleImageUpload(file);
            break;
          }
        }
      }
    },
    [handleImageUpload]
  );

  const handleNFTCreationIntent = useCallback(
    (nftCreationIntent: any, walletData: any) => {
      console.log("🎨 NFT Creation Intent received:", nftCreationIntent);

      // Check if image_base64 is already provided from backend
      if (nftCreationIntent.image_base64) {
        console.log("🎨 Using provided image_base64");

        // Set the generated image to NFT form
        setNftForm((prev) => ({
          ...prev,
          imageUrl: `data:image/jpeg;base64,${nftCreationIntent.image_base64}`,
          name: nftCreationIntent.name || prev.name,
          description: nftCreationIntent.description || prev.description,
        }));

        // Set pending NFT mint for confirmation dialog
        setPendingNFTMint({
          intent: "mint_nft",
          owner_address: walletData?.address || "",
          name: nftCreationIntent.name || nftForm.name,
          description: nftCreationIntent.description || nftForm.description,
          image_url: `data:image/jpeg;base64,${nftCreationIntent.image_base64}`,
          network: (contractConfig as any).network || "testnet",
          requires_confirmation: true,
        });

        // Show NFT mint dialog
        setShowNFTMintDialog(true);
      } else if (nftCreationIntent.description) {
        console.log("🎨 Generating image from description");

        // Generate image based on description
        imageGenerationMutation.mutate(
          { story_prompt: nftCreationIntent.description },
          {
            onSuccess: (data) => {
              if (data.success && data.image_base64) {
                // Set the generated image to NFT form
                setNftForm((prev) => ({
                  ...prev,
                  imageUrl: `data:image/jpeg;base64,${data.image_base64}`,
                  name: nftCreationIntent.name || prev.name,
                  description:
                    nftCreationIntent.description || prev.description,
                }));

                // Set pending NFT mint for confirmation dialog
                setPendingNFTMint({
                  intent: "mint_nft",
                  owner_address: walletData?.address || "",
                  name: nftCreationIntent.name || nftForm.name,
                  description:
                    nftCreationIntent.description || nftForm.description,
                  image_url: `data:image/jpeg;base64,${data.image_base64}`,
                  network: (contractConfig as any).network || "testnet",
                  requires_confirmation: true,
                });

                setShowNFTMintDialog(true);
              }
            },
            onError: (error) => {
              console.error("Failed to generate image:", error);
            },
          }
        );
      } else {
        console.log("🎨 No image data, showing form without image");

        // If no description, just set the form data
        setNftForm((prev) => ({
          ...prev,
          name: nftCreationIntent.name || prev.name,
          description: nftCreationIntent.description || prev.description,
        }));

        // Set pending NFT mint for confirmation dialog
        setPendingNFTMint({
          intent: "mint_nft",
          owner_address: walletData?.address || "",
          name: nftCreationIntent.name || nftForm.name,
          description: nftCreationIntent.description || nftForm.description,
          image_url: "",
          network: (contractConfig as any).network || "testnet",
          requires_confirmation: true,
        });

        // Show NFT mint dialog
        setShowNFTMintDialog(true);
      }
    },
    [imageGenerationMutation, nftForm.name, nftForm.description]
  );

  const handleConfirmNFTMint = useCallback(
    async (currentAccount: any) => {
      if (!pendingNFTMint) return;

      try {
        setIsExecutingTransaction(true);

        // Use Sui SDK to mint the NFT on blockchain directly
        if (!currentAccount?.address) {
          throw new Error("Wallet not connected");
        }

        // Debug: Check wallet network
        console.log("🔍 Wallet chains:", currentAccount?.chains);
        console.log(
          "🔍 Contract config network:",
          (contractConfig as any).network
        );
        console.log("🔍 Package ID:", (contractConfig as any).package_id);

        const txb = new SuiTransaction();

        // Use package info from contract_config.json (written by CLI deploy)
        const packageId: string = (contractConfig as any).package_id;
        const moduleName = (contractConfig as any).module_name || "nft_mint";
        const functionName = "mint_to_sender";

        // Step 1: Upload image to get public URL
        let imageUrl = "";
        if (
          pendingNFTMint.image_url &&
          pendingNFTMint.image_url.startsWith("data:")
        ) {
          console.log("📤 Uploading image to get public URL...");
          imageUrl = await uploadAnonymous(pendingNFTMint.image_url);
          console.log("✅ Image uploaded successfully:", imageUrl);
        } else {
          imageUrl = pendingNFTMint.image_url || "";
        }

        // Step 2: Call the mint_to_sender function
        // Convert strings to byte arrays for Move contract
        const nameBytes = new TextEncoder().encode(pendingNFTMint.name);
        const descriptionBytes = new TextEncoder().encode(
          pendingNFTMint.description
        );
        const imageUrlBytes = new TextEncoder().encode(imageUrl);

        txb.moveCall({
          target: `${packageId}::${moduleName}::${functionName}`,
          arguments: [
            txb.pure.vector("u8", Array.from(nameBytes)),
            txb.pure.vector("u8", Array.from(descriptionBytes)),
            txb.pure.vector("u8", Array.from(imageUrlBytes)),
          ],
        });

        // Sign and execute transaction
        const result = await signAndExecuteTransactionBlock({
          transaction: txb,
        });

        console.log("🔨 NFT Mint Transaction Result:", result);

        return {
          success: true,
          result,
          imageUrl,
        };
      } catch (error) {
        console.error("NFT mint error:", error);
        throw error;
      } finally {
        setIsExecutingTransaction(false);
        setPendingNFTMint(null);
        setShowNFTMintDialog(false);
      }
    },
    [pendingNFTMint, signAndExecuteTransactionBlock, uploadAnonymous]
  );

  const handleCancelNFTMint = useCallback(() => {
    setPendingNFTMint(null);
    setShowNFTMintDialog(false);
  }, []);

  const handleCreateNFT = useCallback(
    (currentAccount: any) => {
      if (!nftForm.name || !nftForm.description || !nftForm.imageUrl) {
        throw new Error("Please fill in all required information");
      }

      const nftIntent = {
        intent: "mint_nft",
        owner_address: currentAccount?.address || "",
        name: nftForm.name,
        description: nftForm.description,
        image_url: nftForm.imageUrl,
        network: (contractConfig as any).network || "testnet",
        requires_confirmation: true,
      };

      setPendingNFTMint(nftIntent);
      setShowNFTMintDialog(false); // Set to false to show confirmation dialog
    },
    [nftForm]
  );

  const updateNftForm = useCallback((updates: Partial<NFTForm>) => {
    setNftForm((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    pendingNFTMint,
    showNFTMintDialog,
    isExecutingTransaction,
    nftForm,
    setShowNFTMintDialog,
    handleNFTCreationIntent,
    handleConfirmNFTMint,
    handleCancelNFTMint,
    handleCreateNFT,
    handleImageUpload,
    handleFileChange,
    handlePasteImage,
    updateNftForm,
  };
}
