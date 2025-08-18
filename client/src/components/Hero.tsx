import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            Onchain
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Subscriptions</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Support your favorite creators with trustless, permissionless subscriptions. 
            Like Patreon, but fully onchain with USDC and ETH on Base.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:shadow-glow transition-smooth text-lg px-8 py-6"
            >
              Start Creating
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-border text-foreground hover:bg-secondary transition-smooth text-lg px-8 py-6"
            >
              Explore Creators
            </Button>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">Trustless</div>
              <div className="text-muted-foreground">No middleman, pure smart contracts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">Permissionless</div>
              <div className="text-muted-foreground">Anyone can create and subscribe</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">Transparent</div>
              <div className="text-muted-foreground">All payments onchain and verifiable</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;