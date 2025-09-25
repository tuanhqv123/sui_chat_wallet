const { SuiClient, getFullnodeUrl } = require("@mysten/sui/client");
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const { Transaction } = require("@mysten/sui/transactions");
const fs = require("fs");
const path = require("path");

async function deployContract() {
  console.log("🚀 Starting contract deployment...");

  // Connect to Sui devnet
  const client = new SuiClient({ url: getFullnodeUrl("devnet") });

  // Generate a new keypair
  const keypair = new Ed25519Keypair();
  const address = keypair.toSuiAddress();

  console.log("📋 Generated address:", address);

  // Get some SUI for gas
  console.log("💰 Requesting test SUI from faucet...");
  try {
    const response = await fetch(`https://faucet.devnet.sui.io/gas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        FixedAmountRequest: {
          recipient: address,
        },
      }),
    });

    if (response.ok) {
      console.log("✅ Test SUI received from faucet");
    } else {
      console.log("⚠️  Faucet request failed, but continuing...");
    }
  } catch (error) {
    console.log("⚠️  Faucet error:", error.message);
  }

  // Wait a bit for the transaction to be processed
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Check balance
  const coins = await client.getCoins({ owner: address });
  console.log(
    "💰 Current balance:",
    coins.data.length > 0 ? "Has coins" : "No coins"
  );

  // Build the Move package path
  const moveDir = path.join(__dirname, "..", "move");

  // Deploy the contract
  console.log("📦 Deploying contract...");

  try {
    // Read the compiled module
    const modulePath = path.join(
      moveDir,
      "build",
      "sui_chat_wallet",
      "bytecode_modules",
      "nft_mint.mv"
    );
    const moduleBytes = fs.readFileSync(modulePath);

    // For now, we'll use a simplified approach with just the module
    const modules = [Array.from(moduleBytes)];
    const dependencies = [];

    const txb = new Transaction();
    const [upgradeCap] = txb.publish({
      modules,
      dependencies,
    });

    txb.transferObjects([upgradeCap], address);

    const result = await client.signAndExecuteTransaction({
      transaction: txb,
      signer: keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log("✅ Contract deployed successfully!");
    console.log("📋 Transaction digest:", result.digest);

    // Find the package ID
    const packageId = result.objectChanges?.find(
      (change) => change.type === "published"
    )?.packageId;

    if (packageId) {
      console.log("📦 Package ID:", packageId);

      // Save the package ID to a config file
      const config = {
        package_id: packageId,
        network: "devnet",
        deployed_at: new Date().toISOString(),
        contract_address: packageId,
        module_name: "nft_mint",
        nft_type: `${packageId}::nft_mint::NFT`,
      };

      fs.writeFileSync(
        path.join(__dirname, "..", "contract_config.json"),
        JSON.stringify(config, null, 2)
      );

      console.log("📄 Config saved to contract_config.json");

      // Test minting an NFT
      console.log("🪙 Testing NFT minting...");

      const mintTx = new Transaction();
      mintTx.moveCall({
        target: `${packageId}::nft_mint::mint_to_sender`,
        arguments: [
          mintTx.pure.string("Test Dragon NFT"),
          mintTx.pure.string("A magical dragon NFT created for testing"),
          mintTx.pure.string("https://example.com/dragon.png"),
        ],
      });

      const mintResult = await client.signAndExecuteTransaction({
        transaction: mintTx,
        signer: keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log("✅ NFT minted successfully!");
      console.log("📋 Mint transaction digest:", mintResult.digest);

      // Find the minted NFT
      const nftObject = mintResult.objectChanges?.find(
        (change) =>
          change.type === "created" && change.objectType?.includes("NFT")
      );

      if (nftObject) {
        console.log("🪙 NFT Object ID:", nftObject.objectId);
        console.log("🎉 NFT creation test completed successfully!");
      }
    } else {
      console.log("❌ Could not find package ID in deployment result");
    }
  } catch (error) {
    console.error("❌ Deployment failed:", error);

    // Try alternative deployment method
    console.log("🔄 Trying alternative deployment method...");

    try {
      const result = await client.publish({
        packagePath: moveDir,
        signer: keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log("✅ Alternative deployment successful!");
      console.log("📋 Transaction digest:", result.digest);
    } catch (altError) {
      console.error("❌ Alternative deployment also failed:", altError);
    }
  }
}

deployContract().catch(console.error);
