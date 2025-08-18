# SubVault — Onchain Subscriptions for Creators

[![Base Ecosystem](https://img.shields.io/badge/Base-Onchain-green)](https://base.org)

## 💳 Overview

**SubVault** is an onchain subscription platform that allows creators (artists, writers, streamers, developers) to monetize their content directly on Base. Fans can subscribe using USDC or ETH through a **trustless, permissionless smart contract**, enabling recurring payments without intermediaries.

Think of it like Patreon, but fully decentralized and fully transparent.

---

## ⚙️ How It Works

### Creator Onboarding
1. Creator registers on the dApp.
2. Deploys a “Creator Vault” via a **factory contract**.
3. Defines subscription tiers (e.g., $5, $10, $20 per month).

### Fan Subscription
1. Fan connects their wallet (Metamask, Coinbase Wallet, etc.).
2. Chooses a subscription tier.
3. Approves a recurring USDC or ETH allowance to the vault contract.

### Recurring Payments
- The contract locks fan’s funds or sets up a streaming-style payment.
- Each billing cycle, the creator can withdraw accumulated subscriptions.
- Fans can cancel at any time (no lock-in).

### Optional Features / Future Extensions
- NFT badges for subscribers (e.g., “Gold Tier Supporter”).
- Exclusive token-gated content for subscribers.
- Leaderboard of top supporters for social engagement.

---

## 🏆 Why SubVault?

- **Creator Economy Focused** — supports creators directly and transparently.
- **High Engagement** — recurring subscriptions drive repeat transactions on Base.
- **Hackathon-Friendly MVP** — deployable in 3 days with core subscription functionality.
- **Extensible** — future upgrades can include NFTs, token-gated content, analytics, and more.

---

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity** on Base (EVM-compatible).
- Contracts:
  - `SubscriptionFactory.sol` — deploys new Creator Vaults.
  - `CreatorVault.sol` — manages subscriptions, withdrawals, and cancellations.
- ERC20 (USDC) + ETH support.
- OpenZeppelin libraries for SafeERC20, Ownable, ReentrancyGuard.
- License: MIT (open source).

### Frontend
- **Next.js + TypeScript**
- **wagmi + viem** for wallet and contract interactions.
- **RainbowKit** for wallet onboarding.
- **TailwindCSS** for rapid styling.

### Deployment
- Base Sepolia for testing → Base Mainnet for production.
- Optional: IPFS/Arweave for metadata storage (subscription tiers, creator profiles).
- Optional: Farcaster integration for social engagement.

---

## 📦 Installation / Setup

```bash
# Clone repository
git clone https://github.com/yourusername/subbase.git
cd subbase

# Install frontend dependencies
cd frontend
npm install

# Deploy contracts (using Hardhat)
cd ../contracts
npm install
npx hardhat compile
npx hardhat deploy --network base-sepolia
