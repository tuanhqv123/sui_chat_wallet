#!/usr/bin/env python3
"""
Script to deploy the NFT minting contract to Sui devnet
"""

import subprocess
import json
import time
import os
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a command and return the output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def setup_sui_client():
    """Setup Sui client configuration"""
    print("🔧 Setting up Sui client...")
    
    # Check if sui is installed
    success, stdout, stderr = run_command("sui --version")
    if not success:
        print("❌ Sui CLI not found. Please install Sui CLI first.")
        print("   Visit: https://docs.sui.io/build/install")
        return False
    
    print(f"✅ Sui CLI found: {stdout.strip()}")
    
    # Initialize Sui client if not already configured
    success, stdout, stderr = run_command("sui client envs")
    if not success:
        print("🔧 Initializing Sui client...")
        # Auto-configure for devnet
        commands = [
            "echo 'y' | sui client new-env --alias devnet --rpc https://fullnode.devnet.sui.io:443",
            "sui client switch --env devnet"
        ]
        
        for cmd in commands:
            success, stdout, stderr = run_command(cmd)
            if not success:
                print(f"❌ Failed to run: {cmd}")
                print(f"Error: {stderr}")
                return False
    
    print("✅ Sui client configured for devnet")
    return True

def build_contract():
    """Build the Move contract"""
    print("🔨 Building Move contract...")
    
    move_dir = Path(__file__).parent / "move"
    if not move_dir.exists():
        print("❌ Move directory not found")
        return False
    
    success, stdout, stderr = run_command("sui move build", cwd=move_dir)
    if not success:
        print(f"❌ Build failed: {stderr}")
        return False
    
    print("✅ Contract built successfully")
    return True

def deploy_contract():
    """Deploy the contract to Sui devnet"""
    print("🚀 Deploying contract to Sui devnet...")
    
    move_dir = Path(__file__).parent / "move"
    
    # Deploy with gas budget
    success, stdout, stderr = run_command(
        "sui client publish --gas-budget 100000000",
        cwd=move_dir
    )
    
    if not success:
        print(f"❌ Deployment failed: {stderr}")
        return None
    
    print("✅ Contract deployed successfully!")
    print(f"📋 Deployment output:\n{stdout}")
    
    # Extract contract address from output
    lines = stdout.split('\n')
    package_id = None
    for line in lines:
        if "Published to" in line:
            parts = line.split()
            if len(parts) > 2:
                package_id = parts[-1]
                break
    
    if package_id:
        print(f"📦 Package ID: {package_id}")
        return package_id
    else:
        print("⚠️  Could not extract package ID from deployment output")
        return None

def create_contract_config(package_id):
    """Create a configuration file with the deployed contract address"""
    config = {
        "contract_address": package_id,
        "module_name": "nft_mint",
        "collection_type": f"{package_id}::nft_mint::Collection",
        "nft_type": f"{package_id}::nft_mint::NFT",
        "deployed_at": int(time.time()),
        "network": "devnet"
    }
    
    config_file = Path(__file__).parent / "contract_config.json"
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"📄 Contract config saved to: {config_file}")
    return config_file

def main():
    """Main deployment process"""
    print("🎯 Starting NFT Contract Deployment Process\n")
    
    # Step 1: Setup Sui client
    if not setup_sui_client():
        return False
    
    # Step 2: Build contract
    if not build_contract():
        return False
    
    # Step 3: Deploy contract
    package_id = deploy_contract()
    if not package_id:
        return False
    
    # Step 4: Create config file
    config_file = create_contract_config(package_id)
    
    print(f"\n🎉 Deployment Complete!")
    print(f"📦 Package ID: {package_id}")
    print(f"📄 Config file: {config_file}")
    print(f"\n🔗 You can now use this package ID in your application.")
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
