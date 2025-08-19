import { ethers, network } from "hardhat";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log(`📊 Getting contract information for ${network.name}...`);

  const deploymentFile = join(__dirname, `../deployments/${network.name}.json`);
  let deploymentInfo;

  try {
    deploymentInfo = JSON.parse(readFileSync(deploymentFile, "utf8"));
  } catch (error) {
    console.error("❌ Deployment file not found. Please run deployment first.");
    process.exit(1);
  }

  const factoryAddress = deploymentInfo.contracts.subscriptionFactory.address;
  const nftAddress = deploymentInfo.contracts.subscriberNFT.address;

  const subscriptionFactory = await ethers.getContractAt("SubscriptionFactory", factoryAddress);
  const subscriberNFT = await ethers.getContractAt("SubscriberNFT", nftAddress);

  try {
    console.log("\n🏭 SubscriptionFactory Information:");
    console.log("=====================================");
    console.log(`Address: ${factoryAddress}`);
    console.log(`Owner: ${await subscriptionFactory.owner()}`);
    console.log(`Platform Fee Rate: ${await subscriptionFactory.platformFeeRate()} basis points`);
    console.log(`Paused: ${await subscriptionFactory.paused()}`);

    console.log("\n📈 Platform Statistics:");
    const stats = await subscriptionFactory.getPlatformStats();
    console.log(`Total Creators: ${stats.totalCreators}`);
    console.log(`Active Creators: ${stats.activeCreators}`);
    console.log(`Total Vaults: ${stats.totalVaults}`);
    console.log(`Total Subscriptions: ${stats.totalSubscriptions}`);
    console.log(`Total Volume: ${ethers.formatUnits(stats.totalVolume, 6)} USDC equivalent`);

    console.log("\n🪙 Supported Tokens:");
    const supportedTokens = await subscriptionFactory.getSupportedTokens();
    for (let i = 0; i < supportedTokens.length; i++) {
      const tokenAddress = supportedTokens[i];
      if (tokenAddress === ethers.ZeroAddress) {
        console.log(`${i + 1}. ETH (Native) - ${tokenAddress}`);
      } else {
        try {
          const token = await ethers.getContractAt("MockUSDC", tokenAddress);
          const symbol = await token.symbol();
          const decimals = await token.decimals();
          console.log(`${i + 1}. ${symbol} (${decimals} decimals) - ${tokenAddress}`);
        } catch {
          console.log(`${i + 1}. Unknown Token - ${tokenAddress}`);
        }
      }
    }

    console.log("\n🎨 Registered Creators:");
    const creatorsList = await subscriptionFactory.getCreatorsList();
    if (creatorsList.length === 0) {
      console.log("No creators registered yet.");
    } else {
      for (let i = 0; i < creatorsList.length; i++) {
        const creatorAddress = creatorsList[i];
        const creatorInfo = await subscriptionFactory.getCreatorInfo(creatorAddress);
        const vault = await ethers.getContractAt("CreatorVault", creatorInfo.vaultAddress);

        console.log(`\n${i + 1}. ${creatorInfo.name}`);
        console.log(`   Address: ${creatorAddress}`);
        console.log(`   Vault: ${creatorInfo.vaultAddress}`);
        console.log(`   Description: ${creatorInfo.description}`);
        console.log(`   Created: ${new Date(Number(creatorInfo.createdAt) * 1000).toLocaleDateString()}`);
        console.log(`   Active: ${creatorInfo.isActive}`);

        try {
          const totalTiers = await vault.getTotalTiers();
          const totalActiveSubscriptions = await vault.totalActiveSubscriptions();
          console.log(`   Total Tiers: ${totalTiers}`);
          console.log(`   Active Subscriptions: ${totalActiveSubscriptions}`);

          console.log(`   Subscription Tiers:`);
          for (let tierId = 1; tierId <= totalTiers; tierId++) {
            try {
              const tier = await vault.getTier(tierId);
              if (tier.price > 0) {
                console.log(`     Tier ${tierId}: ${tier.name} - $${ethers.formatUnits(tier.price, 6)}/month`);
                console.log(`       Subscribers: ${tier.currentSubscribers}${tier.maxSubscribers > 0 ? `/${tier.maxSubscribers}` : ''}`);
                console.log(`       Active: ${tier.isActive}`);
              }
            } catch (error) {
            }
          }

          console.log(`   Balances:`);
          for (const tokenAddress of supportedTokens) {
            try {
              const balance = await vault.getCreatorBalance(tokenAddress);
              if (balance.totalEarned > 0) {
                const symbol = tokenAddress === ethers.ZeroAddress ? "ETH" : "USDC";
                const decimals = tokenAddress === ethers.ZeroAddress ? 18 : 6;
                console.log(`     ${symbol} - Available: ${ethers.formatUnits(balance.available, decimals)}, Total Earned: ${ethers.formatUnits(balance.totalEarned, decimals)}`);
              }
            } catch (error) {
            }
          }
        } catch (error) {
          console.log(`   Error getting vault details: ${error}`);
        }
      }
    }

    console.log("\n🏅 SubscriberNFT Information:");
    console.log("=============================");
    console.log(`Address: ${nftAddress}`);
    console.log(`Name: ${await subscriberNFT.name()}`);
    console.log(`Symbol: ${await subscriberNFT.symbol()}`);
    console.log(`Total Supply: ${await subscriberNFT.getTotalSupply()}`);
    console.log(`Owner: ${await subscriberNFT.owner()}`);

    console.log("\n📋 Recent Events:");
    try {
      const currentBlock = await ethers.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);

      const subscriptionEvents = await subscriptionFactory.queryFilter(
        subscriptionFactory.filters.SubscriptionCreated(),
        fromBlock
      );

      if (subscriptionEvents.length > 0) {
        console.log("Recent Subscriptions:");
        for (const event of subscriptionEvents.slice(-5)) {
          console.log(`  - Vault: ${event.args?.vault}, Subscriber: ${event.args?.subscriber}, Tier: ${event.args?.tierId}, Amount: ${ethers.formatUnits(event.args?.amount || 0, 6)}`);
        }
      } else {
        console.log("No recent subscription events found.");
      }
    } catch (error) {
      console.log("Could not fetch recent events.");
    }

    console.log("\n🌐 Network Information:");
    console.log("=======================");
    console.log(`Network: ${network.name}`);
    console.log(`Chain ID: ${network.config.chainId}`);
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`Current Block: ${currentBlock}`);

    try {
      const gasPrice = await ethers.provider.getFeeData();
      console.log(`Gas Price: ${ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei')} gwei`);
    } catch (error) {
      console.log("Gas price information not available.");
    }

    console.log("\n✅ Contract information retrieved successfully!");

  } catch (error) {
    console.error("❌ Error getting contract information:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });