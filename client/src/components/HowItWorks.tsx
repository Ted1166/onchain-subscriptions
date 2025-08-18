import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Creator Sets Up Vault",
    description: "Deploy your Creator Vault contract and define subscription tiers with pricing in USDC or ETH",
    icon: "🚀"
  },
  {
    number: "02", 
    title: "Fan Approves Allowance",
    description: "Fans connect their wallet and approve a recurring allowance for their chosen subscription tier",
    icon: "💰"
  },
  {
    number: "03",
    title: "Automatic Payments",
    description: "Smart contracts handle recurring payments automatically. Creators withdraw accumulated funds monthly",
    icon: "⚡"
  },
  {
    number: "04",
    title: "Cancel Anytime",
    description: "Fans can cancel subscriptions anytime with no lock-in periods. Full transparency and control",
    icon: "🔄"
  }
];

const HowItWorks = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple, trustless subscriptions powered by smart contracts on Base
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="relative bg-gradient-card border-border shadow-card hover:shadow-glow transition-smooth group"
            >
              <CardHeader className="text-center">
                <div className="text-4xl mb-4">{step.icon}</div>
                <div className="text-primary font-mono text-sm mb-2">{step.number}</div>
                <CardTitle className="text-foreground group-hover:text-primary transition-smooth">
                  {step.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="text-center">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
              
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-border" />
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;