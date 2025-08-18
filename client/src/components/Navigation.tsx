import { Button } from "@/components/ui/button";
import ConnectWallet from "./ConnectWallet";

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-glass backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
          <span className="text-xl font-bold text-foreground">SubVault</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <a href="#" className="text-muted-foreground hover:text-foreground transition-smooth">
            Explore
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-smooth">
            Creators
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-smooth">
            How it Works
          </a>
        </div>

        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-foreground"
            onClick={() => alert('Sign In clicked')}
          >
            Sign In
          </Button>
          <ConnectWallet />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;