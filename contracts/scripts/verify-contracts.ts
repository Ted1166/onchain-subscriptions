import { run, network } from "hardhat";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log(`🔍 Verifying contracts on ${network.name}...`);

  // Load deployment info
  const deploymentFile = join(__dirname, `../deployments/${network.name}.json`);
  let deploymentInfo;

  try {
    deploymentInfo = JSON.parse(readFileSync(deploymentFile, "utf8"));
  } catch (error) {
    console.error("❌ Deployment file not found. Please run deployment first.");
    process.exit(1);
  }

  const contracts = deploymentInfo.contracts;

  try {
    // Verify SubscriptionFactory
    console.log("\n🏭 Verifying SubscriptionFactory...");
    await run("verify:verify", {
      address: contracts.subscriptionFactory.address,
      constructorArguments: contracts.subscriptionFactory.constructorArgs,
      contract: "contracts/SubscriptionFactory.sol:SubscriptionFactory",
    });
    console.log("✅ SubscriptionFactory verified");

    // Verify SubscriberNFT
    console.log("\n🏅 Verifying SubscriberNFT...");
    await run("verify:verify", {
      address: contracts.subscriberNFT.address,
      constructorArguments: contracts.subscriberNFT.constructorArgs,
      contract: "contracts/SubscriberNFT.sol:SubscriberNFT",
    });
    console.log("✅ SubscriberNFT verified");

    // Verify MockUSDC (if deployed)
    if (contracts.mockUSDC) {
      console.log("\n💰 Verifying MockUSDC...");
      await run("verify:verify", {
        address: contracts.mockUSDC.address,
        constructorArguments: contracts.mockUSDC.constructorArgs,
        contract: "contracts/MockUSDC.sol:MockUSDC",
      });
      console.log("✅ MockUSDC verified");
    }

    console.log("\n🎉 All contracts verified successfully!");
    
    // Display verification links
    const explorerUrl = getExplorerUrl(network.name);
    if (explorerUrl) {
      console.log("\n🌐 View on Explorer:");
      console.log(`SubscriptionFactory: ${explorerUrl}/address/${contracts.subscriptionFactory.address}`);
      console.log(`SubscriberNFT: ${explorerUrl}/address/${contracts.subscriberNFT.address}`);
      if (contracts.mockUSDC) {
        console.log(`MockUSDC: ${explorerUrl}/address/${contracts.mockUSDC.address}`);
      }
    }

  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contracts already verified");
    } else {
      console.error("❌ Verification failed:", error.message);
      process.exit(1);
    }
  }
}

function getExplorerUrl(networkName: string): string | null {
  const explorers: { [key: string]: string } = {
    "base-mainnet": "https://basescan.org",
    "base-sepolia": "https://sepolia.basescan.org",
    mainnet: "https://etherscan.io",
    sepolia: "https://sepolia.etherscan.io",
    polygon: "https://polygonscan.com",
    mumbai: "https://mumbai.polygonscan.com",
  };

  return explorers[networkName] || null;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });