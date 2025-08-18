import { createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { metaMask, walletConnect } from 'wagmi/connectors'

const projectId = 'your-project-id'

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    metaMask(),
    walletConnect({ projectId }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})
