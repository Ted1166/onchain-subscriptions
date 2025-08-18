import { ethers, network, run } from "hardhat";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

interface DeploymentInfo {
  network: string;
  chainId: number;
  timestamp: number;
  contracts: {
    subscriptionFactory: {
      address: string;
      constructorArgs: any[];
    };
    subscriberNFT: {
      address: string;
      constructorArgs: any[];
    };
    mockUSDC?: {
      address: string;
      constructorArgs: any[];
    };
  };
  gasUsed: {
    subscriptionFactory: string;
    subscriberNFT: string;
    mockUSDC?: string;
  };
}

async function main() {
  console.log("🚀 Starting deployment...");
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.config.chainId}`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);

  const deploymentInfo: DeploymentInfo = {
    network: network.name,
    chainId: network.config.chainId || 31337,
    timestamp: Date.now(),
    contracts: {
      subscriptionFactory: { address: "", constructorArgs: [] },
      subscriberNFT: { address: "", constructorArgs: [] },
    },
    gasUsed: {
      subscriptionFactory: "",
      subscriberNFT: "",
    },
  };

  try {
    // Deploy MockUSDC (only for test networks)
    let mockUSDCAddress = "";
    if (network.name === "localhost" || network.name === "hardhat" || network.name.includes("sepolia")) {
      console.log("\n📋 Deploying MockUSDC...");
      const MockUSDC = await ethers.getContractFactory("MockUSDC");
      const mockUSDC = await MockUSDC.deploy(deployer.address);
      await mockUSDC.waitForDeployment();
      
      mockUSDCAddress = await mockUSDC.getAddress();
      const mockUSDCReceipt = await mockUSDC.deploymentTransaction()?.wait();
      
      console.log(`✅ MockUSDC deployed to: ${mockUSDCAddress}`);
      console.log(`⛽ Gas used: ${mockUSDCReceipt?.gasUsed.toString()}`);

      deploymentInfo.contracts.mockUSDC = {
        address: mockUSDCAddress,
        constructorArgs: [deployer.address],
      };
      deploymentInfo.gasUsed.mockUSDC = mockUSDCReceipt?.gasUsed.toString() || "0";
    }

    // Deploy SubscriptionFactory
    console.log("\n🏭 Deploying SubscriptionFactory...");
    const SubscriptionFactory = await ethers.getContractFactory("SubscriptionFactory");
    const subscriptionFactory = await SubscriptionFactory.deploy(deployer.address);
    await subscriptionFactory.waitForDeployment();
    
    const factoryAddress = await subscriptionFactory.getAddress();
    const factoryReceipt = await subscriptionFactory.deploymentTransaction()?.wait();
    
    console.log(`✅ SubscriptionFactory deployed to: ${factoryAddress}`);
    console.log(`⛽ Gas used: ${factoryReceipt?.gasUsed.toString()}`);

    deploymentInfo.contracts.subscriptionFactory = {
      address: factoryAddress,
      constructorArgs: [deployer.address],
    };
    deploymentInfo.gasUsed.subscriptionFactory = factoryReceipt?.gasUsed.toString() || "0";

    // Get SubscriberNFT address (deployed by factory)
    const subscriberNFTAddress = await subscriptionFactory.subscriberNFT();
    console.log(`✅ SubscriberNFT deployed to: ${subscriberNFTAddress}`);

    deploymentInfo.contracts.subscriberNFT = {
      address: subscriberNFTAddress,
      constructorArgs: [factoryAddress, "Subscriber Badge", "SUB"],
    };

    // Add supported tokens to factory
    if (mockUSDCAddress) {
      console.log("\n🪙 Adding MockUSDC as supported token...");
      await subscriptionFactory.addSupportedToken(mockUSDCAddress, "mUSDC");
      console.log("✅ MockUSDC added as supported token");
    }

    // Add ETH as supported token (address(0))
    console.log("🪙 Adding ETH as supported token...");
    await subscriptionFactory.addSupportedToken(ethers.ZeroAddress, "ETH");
    console.log("✅ ETH added as supported token");

    // Save deployment info
    const deploymentsDir = join(__dirname, "../deployments");
    if (!existsSync(deploymentsDir)) {
      mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = join(deploymentsDir, `${network.name}.json`);
    writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${deploymentFile}`);

    // Display summary
    console.log("\n🎉 Deployment Summary:");
    console.log("====================");
    console.log(`Network: ${network.name} (Chain ID: ${network.config.chainId})`);
    console.log(`SubscriptionFactory: ${factoryAddress}`);
    console.log(`SubscriberNFT: ${subscriberNFTAddress}`);
    if (mockUSDCAddress) {
      console.log(`MockUSDC: ${mockUSDCAddress}`);
    }

    const totalGasUsed = BigInt(deploymentInfo.gasUsed.subscriptionFactory) + 
                        BigInt(deploymentInfo.gasUsed.mockUSDC || "0");
    console.log(`Total Gas Used: ${totalGasUsed.toString()}`);

    // Verification instructions
    if (network.name !== "localhost" && network.name !== "hardhat") {
      console.log("\n🔍 To verify contracts, run:");
      console.log(`npx hardhat run scripts/verify-contracts.ts --network ${network.name}`);
    }

    // Display environment variables to update
    console.log("\n🔧 Update your .env file with:");
    console.log(`SUBSCRIPTION_FACTORY_ADDRESS=${factoryAddress}`);
    console.log(`SUBSCRIBER_NFT_ADDRESS=${subscriberNFTAddress}`);
    if (mockUSDCAddress) {
      console.log(`MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
    }

    return {
      subscriptionFactory: factoryAddress,
      subscriberNFT: subscriberNFTAddress,
      mockUSDC: mockUSDCAddress,
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });