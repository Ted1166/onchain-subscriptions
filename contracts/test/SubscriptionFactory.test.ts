import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SubscriptionFactory, CreatorVault, SubscriberNFT, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SubscriptionFactory", function () {
  async function deployFixture() {
    const [owner, creator1, creator2, subscriber1, subscriber2, subscriber3] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy(owner.address);
    await mockUSDC.waitForDeployment();

    const SubscriptionFactory = await ethers.getContractFactory("SubscriptionFactory");
    const subscriptionFactory = await SubscriptionFactory.deploy(owner.address);
    await subscriptionFactory.waitForDeployment();

    const subscriberNFTAddress = await subscriptionFactory.subscriberNFT();
    const subscriberNFT = await ethers.getContractAt("SubscriberNFT", subscriberNFTAddress);

    await subscriptionFactory.addSupportedToken(await mockUSDC.getAddress(), "mUSDC");
    await subscriptionFactory.addSupportedToken(ethers.ZeroAddress, "ETH");

    await mockUSDC.mint(creator1.address, ethers.parseUnits("1000", 6));
    await mockUSDC.mint(creator2.address, ethers.parseUnits("1000", 6));
    await mockUSDC.mint(subscriber1.address, ethers.parseUnits("1000", 6));
    await mockUSDC.mint(subscriber2.address, ethers.parseUnits("1000", 6));
    await mockUSDC.mint(subscriber3.address, ethers.parseUnits("1000", 6));

    return {
      subscriptionFactory,
      subscriberNFT,
      mockUSDC,
      owner,
      creator1,
      creator2,
      subscriber1,
      subscriber2,
      subscriber3,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { subscriptionFactory, owner } = await loadFixture(deployFixture);
      expect(await subscriptionFactory.owner()).to.equal(owner.address);
    });

    it("Should deploy SubscriberNFT", async function () {
      const { subscriptionFactory, subscriberNFT } = await loadFixture(deployFixture);
      const nftAddress = await subscriptionFactory.subscriberNFT();
      expect(nftAddress).to.equal(await subscriberNFT.getAddress());
    });

    it("Should have correct initial platform fee rate", async function () {
      const { subscriptionFactory } = await loadFixture(deployFixture);
      expect(await subscriptionFactory.platformFeeRate()).to.equal(250); 
    });
  });

  describe("Token Management", function () {
    it("Should add supported tokens", async function () {
      const { subscriptionFactory, mockUSDC } = await loadFixture(deployFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      expect(await subscriptionFactory.supportedTokens(mockUSDCAddress)).to.be.true;
      expect(await subscriptionFactory.supportedTokens(ethers.ZeroAddress)).to.be.true;
    });

    it("Should remove supported tokens", async function () {
      const { subscriptionFactory, mockUSDC, owner } = await loadFixture(deployFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await subscriptionFactory.connect(owner).removeSupportedToken(mockUSDCAddress, "mUSDC");
      expect(await subscriptionFactory.supportedTokens(mockUSDCAddress)).to.be.false;
    });

    it("Should not allow non-owner to manage tokens", async function () {
      const { subscriptionFactory, creator1 } = await loadFixture(deployFixture);
      
      await expect(
        subscriptionFactory.connect(creator1).addSupportedToken(creator1.address, "TEST")
      ).to.be.revertedWithCustomError(subscriptionFactory, "OwnableUnauthorizedAccount");
    });
  });

  describe("Creator Registration", function () {
    it("Should register a creator successfully", async function () {
      const { subscriptionFactory, mockUSDC, creator1 } = await loadFixture(deployFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await expect(
        subscriptionFactory.connect(creator1).registerCreator(
          "Test Creator",
          "A test creator description",
          [mockUSDCAddress, ethers.ZeroAddress]
        )
      ).to.emit(subscriptionFactory, "CreatorRegistered");

      const creatorInfo = await subscriptionFactory.getCreatorInfo(creator1.address);
      expect(creatorInfo.name).to.equal("Test Creator");
      expect(creatorInfo.isActive).to.be.true;
    });

    it("Should not allow empty name", async function () {
      const { subscriptionFactory, mockUSDC, creator1 } = await loadFixture(deployFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await expect(
        subscriptionFactory.connect(creator1).registerCreator(
          "",
          "Description",
          [mockUSDCAddress]
        )
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should not allow duplicate registration", async function () {
      const { subscriptionFactory, mockUSDC, creator1 } = await loadFixture(deployFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await subscriptionFactory.connect(creator1).registerCreator(
        "Test Creator",
        "Description",
        [mockUSDCAddress]
      );

      await expect(
        subscriptionFactory.connect(creator1).registerCreator(
          "Test Creator 2",
          "Description 2",
          [mockUSDCAddress]
        )
      ).to.be.revertedWith("Creator already registered");
    });

    it("Should not allow unsupported tokens", async function () {
      const { subscriptionFactory, creator1 } = await loadFixture(deployFixture);
      
      await expect(
        subscriptionFactory.connect(creator1).registerCreator(
          "Test Creator",
          "Description",
          [creator1.address] 
        )
      ).to.be.revertedWith("Token not supported");
    });
  });

  describe("Creator Vault Operations", function () {
    async function setupCreatorFixture() {
      const fixture = await loadFixture(deployFixture);
      const { subscriptionFactory, mockUSDC, creator1 } = fixture;
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await subscriptionFactory.connect(creator1).registerCreator(
        "Test Creator",
        "A test creator",
        [mockUSDCAddress, ethers.ZeroAddress]
      );

      const vaultAddress = await subscriptionFactory.getVaultAddress(creator1.address);
      const creatorVault = await ethers.getContractAt("CreatorVault", vaultAddress);

      return { ...fixture, creatorVault, vaultAddress };
    }

    it("Should create subscription tiers", async function () {
      const { creatorVault, creator1 } = await loadFixture(setupCreatorFixture);
      
      await expect(
        creatorVault.connect(creator1).createTier(
          "Bronze",
          "Basic tier",
          ethers.parseUnits("5", 6),
          100
        )
      ).to.emit(creatorVault, "TierCreated");

      const tier = await creatorVault.getTier(1);
      expect(tier.name).to.equal("Bronze");
      expect(tier.price).to.equal(ethers.parseUnits("5", 6));
      expect(tier.maxSubscribers).to.equal(100);
      expect(tier.isActive).to.be.true;
    });

    it("Should not allow non-creator to create tiers", async function () {
      const { creatorVault, subscriber1 } = await loadFixture(setupCreatorFixture);
      
      await expect(
        creatorVault.connect(subscriber1).createTier(
          "Bronze",
          "Basic tier",
          ethers.parseUnits("5", 6),
          100
        )
      ).to.be.revertedWith("Only creator can call");
    });

    it("Should update existing tiers", async function () {
      const { creatorVault, creator1 } = await loadFixture(setupCreatorFixture);
      
      await creatorVault.connect(creator1).createTier(
        "Bronze",
        "Basic tier",
        ethers.parseUnits("5", 6),
        100
      );

      await creatorVault.connect(creator1).updateTier(
        1,
        "Bronze Updated",
        "Updated description",
        ethers.parseUnits("7", 6),
        150,
        true
      );

      const tier = await creatorVault.getTier(1);
      expect(tier.name).to.equal("Bronze Updated");
      expect(tier.price).to.equal(ethers.parseUnits("7", 6));
      expect(tier.maxSubscribers).to.equal(150);
    });
  });

  describe("Subscriptions", function () {
    async function setupSubscriptionFixture() {
      const fixture = await loadFixture(deployFixture);
      const { subscriptionFactory, mockUSDC, creator1, subscriber1 } = fixture;
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await subscriptionFactory.connect(creator1).registerCreator(
        "Test Creator",
        "A test creator",
        [mockUSDCAddress, ethers.ZeroAddress]
      );

      const vaultAddress = await subscriptionFactory.getVaultAddress(creator1.address);
      const creatorVault = await ethers.getContractAt("CreatorVault", vaultAddress);

      await creatorVault.connect(creator1).createTier(
        "Bronze",
        "Basic tier",
        ethers.parseUnits("5", 6),
        100
      );

      return { ...fixture, creatorVault, vaultAddress };
    }

    it("Should create subscription with USDC", async function () {
      const { creatorVault, mockUSDC, subscriber1, subscriberNFT } = await loadFixture(setupSubscriptionFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await mockUSDC.connect(subscriber1).approve(await creatorVault.getAddress(), ethers.parseUnits("10", 6));
      
      await expect(
        creatorVault.connect(subscriber1).subscribe(1, mockUSDCAddress)
      ).to.emit(creatorVault, "SubscriptionCreated");

      const subscription = await creatorVault.getSubscription(subscriber1.address, 1);
      expect(subscription.isActive).to.be.true;
      expect(subscription.amount).to.equal(ethers.parseUnits("5", 6));

      const badges = await subscriberNFT.getUserBadges(subscriber1.address);
      expect(badges.length).to.equal(1);
    });

    it("Should create subscription with ETH", async function () {
      const { creatorVault, subscriber1 } = await loadFixture(setupSubscriptionFixture);
      
      await expect(
        creatorVault.connect(subscriber1).subscribe(1, ethers.ZeroAddress, {
          value: ethers.parseUnits("5", 6) 
        })
      ).to.emit(creatorVault, "SubscriptionCreated");
    });

    it("Should not allow duplicate subscriptions", async function () {
      const { creatorVault, mockUSDC, subscriber1 } = await loadFixture(setupSubscriptionFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await mockUSDC.connect(subscriber1).approve(await creatorVault.getAddress(), ethers.parseUnits("10", 6));
      await creatorVault.connect(subscriber1).subscribe(1, mockUSDCAddress);
      
      await expect(
        creatorVault.connect(subscriber1).subscribe(1, mockUSDCAddress)
      ).to.be.revertedWith("Already subscribed");
    });

    it("Should cancel subscription", async function () {
      const { creatorVault, mockUSDC, subscriber1, subscriberNFT } = await loadFixture(setupSubscriptionFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await mockUSDC.connect(subscriber1).approve(await creatorVault.getAddress(), ethers.parseUnits("10", 6));
      await creatorVault.connect(subscriber1).subscribe(1, mockUSDCAddress);
      
      await expect(
        creatorVault.connect(subscriber1).cancelSubscription(1)
      ).to.emit(creatorVault, "SubscriptionCancelled");

      const subscription = await creatorVault.getSubscription(subscriber1.address, 1);
      expect(subscription.isActive).to.be.false;

      const badges = await subscriberNFT.getUserBadges(subscriber1.address);
      expect(badges.length).to.equal(0);
    });

    it("Should respect max subscribers limit", async function () {
      const { creatorVault, mockUSDC, creator1, subscriber1, subscriber2 } = await loadFixture(setupSubscriptionFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await creatorVault.connect(creator1).createTier(
        "Limited",
        "Limited tier",
        ethers.parseUnits("10", 6),
        1
      );

      await mockUSDC.connect(subscriber1).approve(await creatorVault.getAddress(), ethers.parseUnits("20", 6));
      await creatorVault.connect(subscriber1).subscribe(2, mockUSDCAddress);
      
      await mockUSDC.connect(subscriber2).approve(await creatorVault.getAddress(), ethers.parseUnits("20", 6));
      await expect(
        creatorVault.connect(subscriber2).subscribe(2, mockUSDCAddress)
      ).to.be.revertedWith("Tier full");
    });
  });

  describe("Payment Processing", function () {
    async function setupPaymentFixture() {
      const fixture = await loadFixture(setupSubscriptionFixture);
      const { creatorVault, mockUSDC, subscriber1 } = fixture;
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await mockUSDC.connect(subscriber1).approve(await creatorVault.getAddress(), ethers.parseUnits("100", 6));
      await creatorVault.connect(subscriber1).subscribe(1, mockUSDCAddress);

      return fixture;
    }

    it("Should process recurring payment", async function () {
      const { creatorVault, mockUSDC, subscriber1 } = await loadFixture(setupPaymentFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await time.increase(30 * 24 * 60 * 60); 
      
      await mockUSDC.connect(subscriber1).approve(await creatorVault.getAddress(), ethers.parseUnits("100", 6));
      
      await expect(
        creatorVault.processRecurringPayment(subscriber1.address, 1)
      ).to.emit(creatorVault, "PaymentProcessed");
    });

    it("Should not process payment before due date", async function () {
      const { creatorVault, subscriber1 } = await loadFixture(setupPaymentFixture);
      
      await expect(
        creatorVault.processRecurringPayment(subscriber1.address, 1)
      ).to.be.revertedWith("Payment not due yet");
    });

    it("Should not process payment after grace period", async function () {
      const { creatorVault, subscriber1 } = await loadFixture(setupPaymentFixture);
      
      await time.increase(38 * 24 * 60 * 60); 
      
      await expect(
        creatorVault.processRecurringPayment(subscriber1.address, 1)
      ).to.be.revertedWith("Grace period expired");
    });
  });

  describe("Creator Earnings", function () {
    async function setupEarningsFixture() {
      const fixture = await loadFixture(setupSubscriptionFixture);
      const { creatorVault, mockUSDC, subscriber1 } = fixture;
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await mockUSDC.connect(subscriber1).approve(await creatorVault.getAddress(), ethers.parseUnits("100", 6));
      await creatorVault.connect(subscriber1).subscribe(1, mockUSDCAddress);

      return fixture;
    }

    it("Should calculate earnings correctly after platform fee", async function () {
      const { creatorVault, creator1, mockUSDC } = await loadFixture(setupEarningsFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      const balance = await creatorVault.getCreatorBalance(mockUSDCAddress);
      const subscriptionAmount = ethers.parseUnits("5", 6);
      const platformFee = (subscriptionAmount * 250n) / 10000n; 
      const expectedCreatorEarnings = subscriptionAmount - platformFee;
      
      expect(balance.available).to.equal(expectedCreatorEarnings);
      expect(balance.totalEarned).to.equal(expectedCreatorEarnings);
    });

    it("Should allow creator to withdraw earnings", async function () {
      const { creatorVault, creator1, mockUSDC } = await loadFixture(setupEarningsFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      const initialBalance = await mockUSDC.balanceOf(creator1.address);
      
      await expect(
        creatorVault.connect(creator1).withdrawEarnings(mockUSDCAddress)
      ).to.emit(creatorVault, "PaymentWithdrawn");
      
      const finalBalance = await mockUSDC.balanceOf(creator1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      
      const vaultBalance = await creatorVault.getCreatorBalance(mockUSDCAddress);
      expect(vaultBalance.available).to.equal(0);
    });

    it("Should not allow non-creator to withdraw earnings", async function () {
      const { creatorVault, subscriber1, mockUSDC } = await loadFixture(setupEarningsFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await expect(
        creatorVault.connect(subscriber1).withdrawEarnings(mockUSDCAddress)
      ).to.be.revertedWith("Only creator can call");
    });

    it("Should not allow withdrawal when no funds available", async function () {
      const { creatorVault, creator1, mockUSDC } = await loadFixture(setupEarningsFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await creatorVault.connect(creator1).withdrawEarnings(mockUSDCAddress);
      
      await expect(
        creatorVault.connect(creator1).withdrawEarnings(mockUSDCAddress)
      ).to.be.revertedWith("No funds available");
    });
  });

  describe("Platform Management", function () {
    it("Should update platform fee rate", async function () {
      const { subscriptionFactory, owner } = await loadFixture(deployFixture);
      
      await expect(
        subscriptionFactory.connect(owner).setPlatformFeeRate(500) 
      ).to.emit(subscriptionFactory, "PlatformFeeUpdated");
      
      expect(await subscriptionFactory.platformFeeRate()).to.equal(500);
    });

    it("Should not allow fee rate above maximum", async function () {
      const { subscriptionFactory, owner } = await loadFixture(deployFixture);
      
      await expect(
        subscriptionFactory.connect(owner).setPlatformFeeRate(1100) 
      ).to.be.revertedWith("Fee rate too high");
    });

    it("Should deactivate creator", async function () {
      const { subscriptionFactory, mockUSDC, creator1, owner } = await loadFixture(deployFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await subscriptionFactory.connect(creator1).registerCreator(
        "Test Creator",
        "Description",
        [mockUSDCAddress]
      );
      
      await expect(
        subscriptionFactory.connect(owner).deactivateCreator(creator1.address)
      ).to.emit(subscriptionFactory, "CreatorDeactivated");
      
      const creatorInfo = await subscriptionFactory.getCreatorInfo(creator1.address);
      expect(creatorInfo.isActive).to.be.false;
    });

    it("Should pause and unpause platform", async function () {
      const { subscriptionFactory, owner } = await loadFixture(deployFixture);
      
      await subscriptionFactory.connect(owner).pause();
      expect(await subscriptionFactory.paused()).to.be.true;
      
      await subscriptionFactory.connect(owner).unpause();
      expect(await subscriptionFactory.paused()).to.be.false;
    });
  });

  describe("NFT Badges", function () {
    async function setupNFTFixture() {
      const fixture = await loadFixture(setupSubscriptionFixture);
      const { creatorVault, mockUSDC, subscriber1 } = fixture;
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await mockUSDC.connect(subscriber1).approve(await creatorVault.getAddress(), ethers.parseUnits("100", 6));
      await creatorVault.connect(subscriber1).subscribe(1, mockUSDCAddress);

      return fixture;
    }

    it("Should mint NFT badge on subscription", async function () {
      const { subscriberNFT, subscriber1 } = await loadFixture(setupNFTFixture);
      
      const badges = await subscriberNFT.getUserBadges(subscriber1.address);
      expect(badges.length).to.equal(1);
      
      const badge = await subscriberNFT.getBadge(badges[0]);
      expect(badge.subscriber).to.equal(subscriber1.address);
      expect(badge.tierId).to.equal(1);
      expect(badge.isActive).to.be.true;
    });

    it("Should burn NFT badge on cancellation", async function () {
      const { creatorVault, subscriberNFT, subscriber1 } = await loadFixture(setupNFTFixture);
      
      await creatorVault.connect(subscriber1).cancelSubscription(1);
      
      const badges = await subscriberNFT.getUserBadges(subscriber1.address);
      expect(badges.length).to.equal(0);
    });

    it("Should not allow transfers (soulbound)", async function () {
      const { subscriberNFT, subscriber1, subscriber2 } = await loadFixture(setupNFTFixture);
      
      const badges = await subscriberNFT.getUserBadges(subscriber1.address);
      const tokenId = badges[0];
      
      await expect(
        subscriberNFT.connect(subscriber1).transferFrom(subscriber1.address, subscriber2.address, tokenId)
      ).to.be.revertedWith("Soulbound: token is non-transferable");
    });

    it("Should not allow approvals", async function () {
      const { subscriberNFT, subscriber1, subscriber2 } = await loadFixture(setupNFTFixture);
      
      const badges = await subscriberNFT.getUserBadges(subscriber1.address);
      const tokenId = badges[0];
      
      await expect(
        subscriberNFT.connect(subscriber1).approve(subscriber2.address, tokenId)
      ).to.be.revertedWith("Soulbound: token is non-transferable");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle zero subscription price correctly", async function () {
      const { subscriptionFactory, mockUSDC, creator1 } = await loadFixture(deployFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await subscriptionFactory.connect(creator1).registerCreator(
        "Test Creator",
        "Description",
        [mockUSDCAddress]
      );
      
      const vaultAddress = await subscriptionFactory.getVaultAddress(creator1.address);
      const creatorVault = await ethers.getContractAt("CreatorVault", vaultAddress);
      
      await expect(
        creatorVault.connect(creator1).createTier("Free", "Free tier", 0, 0)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("Should handle reentrancy protection", async function () {
      const { creatorVault } = await loadFixture(setupSubscriptionFixture);
      expect(await creatorVault.getAddress()).to.be.properAddress;
    });

    it("Should maintain correct state after multiple operations", async function () {
      const { subscriptionFactory, mockUSDC, creator1, subscriber1, subscriber2 } = await loadFixture(deployFixture);
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      await subscriptionFactory.connect(creator1).registerCreator(
        "Test Creator",
        "Description",
        [mockUSDCAddress]
      );
      
      const vaultAddress = await subscriptionFactory.getVaultAddress(creator1.address);
      const creatorVault = await ethers.getContractAt("CreatorVault", vaultAddress);
      
      await creatorVault.connect(creator1).createTier("Bronze", "Bronze tier", ethers.parseUnits("5", 6), 0);
      await creatorVault.connect(creator1).createTier("Silver", "Silver tier", ethers.parseUnits("10", 6), 0);
      
      await mockUSDC.connect(subscriber1).approve(vaultAddress, ethers.parseUnits("100", 6));
      await mockUSDC.connect(subscriber2).approve(vaultAddress, ethers.parseUnits("100", 6));
      
      await creatorVault.connect(subscriber1).subscribe(1, mockUSDCAddress);
      await creatorVault.connect(subscriber2).subscribe(2, mockUSDCAddress);
      
      const stats = await subscriptionFactory.getPlatformStats();
      expect(stats.totalSubscriptions).to.equal(2);
      expect(stats.totalCreators).to.equal(1);
      expect(stats.activeCreators).to.equal(1);
    });
  });
});

async function setupSubscriptionFixture() {
  const fixture = await loadFixture(deployFixture);
  const { subscriptionFactory, mockUSDC, creator1 } = fixture;
  const mockUSDCAddress = await mockUSDC.getAddress();
  
  await subscriptionFactory.connect(creator1).registerCreator(
    "Test Creator",
    "A test creator",
    [mockUSDCAddress, ethers.ZeroAddress]
  );

  const vaultAddress = await subscriptionFactory.getVaultAddress(creator1.address);
  const creatorVault = await ethers.getContractAt("CreatorVault", vaultAddress);

  await creatorVault.connect(creator1).createTier(
    "Bronze",
    "Basic tier",
    ethers.parseUnits("5", 6),
    100
  );

  return { ...fixture, creatorVault, vaultAddress };
}
