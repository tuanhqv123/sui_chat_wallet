// Test script to verify NFT creation flow
const testNFTFlow = async () => {
  console.log("🧪 Testing NFT Creation Flow...\n");

  // Test 1: Check if backend is running
  try {
    const modelsResponse = await fetch("http://localhost:8000/api/models");
    if (modelsResponse.ok) {
      console.log("✅ Backend is running");
    } else {
      console.log("❌ Backend is not responding");
      return;
    }
  } catch (error) {
    console.log("❌ Cannot connect to backend:", error.message);
    return;
  }

  // Test 2: Test image generation
  try {
    console.log("\n🎨 Testing image generation...");
    const imageResponse = await fetch(
      "http://localhost:8000/api/generate-image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          story_prompt: "A magical dragon flying over a mystical forest",
        }),
      }
    );

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      if (imageData.success && imageData.image_url) {
        console.log("✅ Image generation successful");
        console.log(
          "📸 Generated image URL length:",
          imageData.image_url.length
        );
      } else {
        console.log("❌ Image generation failed:", imageData.error);
      }
    } else {
      console.log("❌ Image generation request failed");
    }
  } catch (error) {
    console.log("❌ Image generation error:", error.message);
  }

  // Test 3: Test NFT minting
  try {
    console.log("\n🪙 Testing NFT minting...");
    const nftResponse = await fetch("http://localhost:8000/api/nft/mint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "mint_nft",
        owner_address: "0x1234567890abcdef1234567890abcdef12345678",
        name: "Test Dragon NFT",
        description: "A magical dragon NFT created for testing purposes",
        image_url: "https://example.com/dragon.png",
        attributes: {
          rarity: "legendary",
          element: "fire",
          power: 100,
        },
        network: "devnet",
        requires_confirmation: true,
      }),
    });

    if (nftResponse.ok) {
      const nftData = await nftResponse.json();
      if (nftData.success) {
        console.log("✅ NFT minting successful!");
        console.log("🆔 NFT ID:", nftData.nft_id);
        console.log("📋 Transaction Digest:", nftData.transaction_digest);
        console.log("💬 Message:", nftData.message);
      } else {
        console.log("❌ NFT minting failed:", nftData.error);
      }
    } else {
      console.log("❌ NFT minting request failed");
    }
  } catch (error) {
    console.log("❌ NFT minting error:", error.message);
  }

  // Test 4: Test chat with NFT creation intent
  try {
    console.log("\n💬 Testing chat with NFT creation intent...");
    const chatResponse = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "I want to create an NFT with a story about a magical dragon",
        model: "google/gemini-2.0-flash-exp:free",
        session_id: "test-session-" + Date.now(),
      }),
    });

    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log("✅ Chat response received");
      console.log("🤖 AI Response:", chatData.response);

      // Check if response contains NFT creation intent
      if (chatData.response && chatData.response.includes("NFT")) {
        console.log("✅ AI detected NFT creation intent");
      }
    } else {
      console.log("❌ Chat request failed");
    }
  } catch (error) {
    console.log("❌ Chat error:", error.message);
  }

  console.log("\n🎉 NFT Flow Test Complete!");
};

// Run the test
testNFTFlow().catch(console.error);
