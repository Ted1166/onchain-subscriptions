import type { Address } from 'viem'

// Contract addresses (replace with actual deployed addresses)
export const CREATOR_VAULT_FACTORY = '0x...' as Address
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address // USDC on Base

// Contract ABIs (simplified versions based on the smart contract structure)
export const CREATOR_VAULT_ABI = [
  {
    "inputs": [
      {"name": "_name", "type": "string"},
      {"name": "_description", "type": "string"},
      {"name": "_price", "type": "uint256"},
      {"name": "_maxSubscribers", "type": "uint256"}
    ],
    "name": "createTier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "_tierId", "type": "uint256"},
      {"name": "_token", "type": "address"}
    ],
    "name": "subscribe",
    "outputs": [],
    "stateMutability": "nonpayable", 
    "type": "function"
  },
  {
    "inputs": [{"name": "_tierId", "type": "uint256"}],
    "name": "unsubscribe",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawFunds",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "", "type": "uint256"}],
    "name": "tiers",
    "outputs": [
      {"name": "price", "type": "uint256"},
      {"name": "name", "type": "string"},
      {"name": "description", "type": "string"},
      {"name": "maxSubscribers", "type": "uint256"},
      {"name": "currentSubscribers", "type": "uint256"},
      {"name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "", "type": "address"},
      {"name": "", "type": "uint256"}
    ],
    "name": "subscriptions",
    "outputs": [
      {"name": "tierId", "type": "uint256"},
      {"name": "amount", "type": "uint256"},
      {"name": "lastPayment", "type": "uint256"},
      {"name": "nextPayment", "type": "uint256"},
      {"name": "token", "type": "address"},
      {"name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export const ERC20_ABI = [
  {
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const