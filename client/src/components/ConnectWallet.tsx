import { Button } from "@/components/ui/button";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { metaMask } from 'wagmi/connectors';

const ConnectWallet = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect({ connector: metaMask() });
    }
  };

  return (
    <Button 
      className="bg-gradient-primary hover:shadow-glow transition-smooth"
      onClick={handleConnect}
    >
      {isConnected 
        ? `${address?.slice(0, 6)}...${address?.slice(-4)}` 
        : 'Connect Wallet'
      }
    </Button>
  );
};

export default ConnectWallet;