import { ethers } from "hardhat";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("🛠️  Setting up local development environment...");

  // Load deployment info
  const deploymentFile = join(__dirname, "../deployments/localhost.json");
  let deploymentInfo;
  
  try {
    deploymentInfo = JSON.parse(readFileSync(deploymentFile, "utf8"));
  } catch (error) {
    console.error("❌ Deployment file not found. Please run deployment first:");
    console.error("npx hardhat run scripts/deploy.ts --network localhost");
    process.exit(1);
  }

  const [deployer, creator1, creator2, subscriber1, subscriber2, subscriber3] = await ethers.getSigners();

  // Get contract instances
  const subscriptionFactory = await ethers.getContractAt(
    "SubscriptionFactory",
    deploymentInfo.contracts.subscriptionFactory.address
  );

  const mockUSDC = await ethers.getContractAt(
    "MockUSDC",
    deploymentInfo.contracts.mockUSDC.address
  );

  console.log("\n👥 Test accounts:");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Creator 1: ${creator1.address}`);
  console.log(`Creator 2: ${creator2.address}`);
  console.log(`Subscriber 1: ${subscriber1.address}`);
  console.log(`Subscriber 2: ${subscriber2.address}`);
  console.log(`Subscriber 3: ${subscriber3.address}`);

  try {
    // Setup test data
    console.log("\n💰 Distributing test tokens...");
    
    // Give test accounts USDC
    const testAccounts = [creator1, creator2, subscriber1, subscriber2, subscriber3];
    for (const account of testAccounts) {
      await mockUSDC.mint(account.address, ethers.parseUnits("10000", 6)); // 10,000 USDC
      console.log(`✅ Minted 10,000 mUSDC to ${account.address}`);
    }

    // Give test accounts ETH
    for (const account of testAccounts) {
      if ((await account.provider.getBalance(account.address)) < ethers.parseEther("1")) {
        await deployer.sendTransaction({
          to: account.address,
          value: ethers.parseEther("10")
        });
        console.log(`✅ Sent 10 ETH to ${account.address}`);
      }
    }

    // Register test creators
    console.log("\n🎨 Registering test creators...");

    // Creator 1 - Writer
    const acceptedTokens = [deploymentInfo.contracts.mockUSDC.address, ethers.ZeroAddress];
    await subscriptionFactory.connect(creator1).registerCreator(
      "Alice the Writer",
      "Fantasy novelist and blogger sharing exclusive stories and writing tips",
      acceptedTokens
    );
    const creator1VaultAddress = await subscriptionFactory.getVaultAddress(creator1.address);
    console.log(`✅ Creator 1 (Alice) registered with vault: ${creator1VaultAddress}`);

    // Creator 2 - Artist
    await subscriptionFactory.connect(creator2).registerCreator(
      "Bob the Digital Artist",
      "NFT artist and digital creator sharing tutorials and exclusive artwork",
      acceptedTokens
    );
    const creator2VaultAddress = await subscriptionFactory.getVaultAddress(creator2.address);
    console.log(`✅ Creator 2 (Bob) registered with vault: ${creator2VaultAddress}`);

    // Setup subscription tiers for Creator 1
    console.log("\n📋 Setting up subscription tiers for Creator 1...");
    const creator1Vault = await ethers.getContractAt("CreatorVault", creator1VaultAddress);
    
    await creator1Vault.connect(creator1).createTier(
      "Bronze Supporter",
      "Access to monthly newsletter and behind-the-scenes content",
      ethers.parseUnits("5", 6), // $5
      0 // unlimited subscribers
    );
    console.log("✅ Bronze tier created ($5/month)");

    await creator1Vault.connect(creator1).createTier(
      "Silver Supporter",
      "Everything in Bronze + exclusive short stories and early access",
      ethers.parseUnits("10", 6), // $10
      0
    );
    console.log("✅ Silver tier created ($10/month)");

    await creator1Vault.connect(creator1).createTier(
      "Gold VIP",
      "Everything in Silver + monthly video calls and character naming rights",
      ethers.parseUnits("25", 6), // $25
      100 // limited to 100 subscribers
    );
    console.log("✅ Gold tier created ($25/month, limited to 100 subs)");

    // Setup subscription tiers for Creator 2
    console.log("\n🎨 Setting up subscription tiers for Creator 2...");
    const creator2Vault = await ethers.getContractAt("CreatorVault", creator2VaultAddress);
    
    await creator2Vault.connect(creator2).createTier(
      "Art Enthusiast",
      "Monthly digital wallpapers and process videos",
      ethers.parseUnits("3", 6), // $3
      0
    );
    console.log("✅ Art Enthusiast tier created ($3/month)");

    await creator2Vault.connect(creator2).createTier(
      "Digital Collector",
      "Everything in Enthusiast + exclusive NFT drops and tutorials",
      ethers.parseUnits("15", 6), // $15
      0
    );
    console.log("✅ Digital Collector tier created ($15/month)");

    await creator2Vault.connect(creator2).createTier(
      "Premium Patron",
      "Everything in Collector + 1-on-1 art sessions and commission discounts",
      ethers.parseUnits("50", 6), // $50
      50 // limited to 50 subscribers
    );
    console.log("✅ Premium Patron tier created ($50/month, limited to 50 subs)");

    // Create some test subscriptions
    console.log("\n🎫 Creating test subscriptions...");

    // Subscriber 1 subscribes to Creator 1's Bronze tier
    await mockUSDC.connect(subscriber1).approve(creator1VaultAddress, ethers.parseUnits("100", 6));
    await creator1Vault.connect(subscriber1).subscribe(1, deploymentInfo.contracts.mockUSDC.address);
    console.log("✅ Subscriber 1 subscribed to Creator 1's Bronze tier");

    // Subscriber 1 also subscribes to Creator 2's Digital Collector tier
    await mockUSDC.connect(subscriber1).approve(creator2VaultAddress, ethers.parseUnits("100", 6));
    await creator2Vault.connect(subscriber1).subscribe(2, deploymentInfo.contracts.mockUSDC.address);
    console.log("✅ Subscriber 1 subscribed to Creator 2's Digital Collector tier");

    // Subscriber 2 subscribes to Creator 1's Silver tier with ETH
    await creator1Vault.connect(subscriber2).subscribe(2, ethers.ZeroAddress, {
      value: ethers.parseUnits("10", 6) // Note: In real scenario, you'd convert USD to ETH
    });
    console.log("✅ Subscriber 2 subscribed to Creator 1's Silver tier with ETH");

    // Subscriber 3 subscribes to Creator 2's Premium Patron tier
    await mockUSDC.connect(subscriber3).approve(creator2VaultAddress, ethers.parseUnits("100", 6));
    await creator2Vault.connect(subscriber3).subscribe(3, deploymentInfo.contracts.mockUSDC.address);
    console.log("✅ Subscriber 3 subscribed to Creator 2's Premium Patron tier");

    // Display current stats
    console.log("\n📊 Platform Statistics:");
    const stats = await subscriptionFactory.getPlatformStats();
    console.log(`Total Creators: ${stats.totalCreators}`);
    console.log(`Active Creators: ${stats.activeCreators}`);
    console.log(`Total Vaults: ${stats.totalVaults}`);
    console.log(`Total Subscriptions: ${stats.totalSubscriptions}`);
    console.log(`Total Volume: ${ethers.formatUnits(stats.totalVolume, 6)} USDC`);

    // Display creator balances
    console.log("\n💰 Creator Balances:");
    const creator1USDCBalance = await creator1Vault.getCreatorBalance(deploymentInfo.contracts.mockUSDC.address);
    const creator1ETHBalance = await creator1Vault.getCreatorBalance(ethers.ZeroAddress);
    console.log(`Creator 1 - USDC available: ${ethers.formatUnits(creator1USDCBalance.available, 6)}`);
    console.log(`Creator 1 - ETH available: ${ethers.formatUnits(creator1ETHBalance.available, 6)}`);

    const creator2USDCBalance = await creator2Vault.getCreatorBalance(deploymentInfo.contracts.mockUSDC.address);
    console.log(`Creator 2 - USDC available: ${ethers.formatUnits(creator2USDCBalance.available, 6)}`);

    // Show NFT badges
    console.log("\n🏅 NFT Badges Minted:");
    const subscriberNFT = await ethers.getContractAt("SubscriberNFT", deploymentInfo.contracts.subscriberNFT.address);
    
    const sub1Badges = await subscriberNFT.getUserBadges(subscriber1.address);
    console.log(`Subscriber 1 has ${sub1Badges.length} badges: [${sub1Badges.join(", ")}]`);
    
    const sub2Badges = await subscriberNFT.getUserBadges(subscriber2.address);
    console.log(`Subscriber 2 has ${sub2Badges.length} badges: [${sub2Badges.join(", ")}]`);
    
    const sub3Badges = await subscriberNFT.getUserBadges(subscriber3.address);
    console.log(`Subscriber 3 has ${sub3Badges.length} badges: [${sub3Badges.join(", ")}]`);

    console.log("\n🎉 Local development environment setup complete!");
    console.log("\n🔧 Useful commands:");
    console.log("- Test: npx hardhat test");
    console.log("- Coverage: npx hardhat coverage");
    console.log("- Console: npx hardhat console --network localhost");
    console.log(`- Factory contract: ${deploymentInfo.contracts.subscriptionFactory.address}`);
    console.log(`- MockUSDC contract: ${deploymentInfo.contracts.mockUSDC.address}`);

    // Save test data
    const testData = {
      accounts: {
        deployer: deployer.address,
        creator1: creator1.address,
        creator2: creator2.address,
        subscriber1: subscriber1.address,
        subscriber2: subscriber2.address,
        subscriber3: subscriber3.address,
      },
      vaults: {
        creator1: creator1VaultAddress,
        creator2: creator2VaultAddress,
      },
      tiers: {
        creator1: [
          { id: 1, name: "Bronze Supporter", price: "5" },
          { id: 2, name: "Silver Supporter", price: "10" },
          { id: 3, name: "Gold VIP", price: "25" },
        ],
        creator2: [
          { id: 1, name: "Art Enthusiast", price: "3" },
          { id: 2, name: "Digital Collector", price: "15" },
          { id: 3, name: "Premium Patron", price: "50" },
        ],
      },
      subscriptions: [
        { subscriber: "subscriber1", creator: "creator1", tier: 1, token: "USDC" },
        { subscriber: "subscriber1", creator: "creator2", tier: 2, token: "USDC" },
        { subscriber: "subscriber2", creator: "creator1", tier: 2, token: "ETH" },
        { subscriber: "subscriber3", creator: "creator2", tier: 3, token: "USDC" },
      ],
    };

    const testDataFile = join(__dirname, "../deployments/localhost-testdata.json");
    require("fs").writeFileSync(testDataFile, JSON.stringify(testData, null, 2));
    console.log(`\n📄 Test data saved to: ${testDataFile}`);

  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });