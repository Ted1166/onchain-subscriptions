import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedCreators from "@/components/FeaturedCreators";
import HowItWorks from "@/components/HowItWorks";
import CreatorProfile from "@/components/CreatorProfile";

// Mock data for creator profile
const mockCreator = {
  name: "Alex Chen",
  avatar: "/placeholder.svg",
  description: "Full-stack Web3 developer sharing knowledge about DeFi, smart contracts, and the latest in blockchain technology. Join me as we build the decentralized future together.",
  category: "Web3 Developer",
  totalSubscribers: 234,
  monthlyRevenue: 2340,
  vaultAddress: "0x..." // Replace with actual deployed vault address
};

const mockTiers = [
  {
    id: "1",
    name: "Supporter",
    price: 5,
    currency: "USDC",
    subscriberCount: 89,
    tierId: 0,
    benefits: [
      "Access to exclusive Discord channel",
      "Weekly developer newsletter",
      "Priority support for questions"
    ]
  },
  {
    id: "2", 
    name: "Developer",
    price: 15,
    currency: "USDC",
    subscriberCount: 67,
    tierId: 1,
    benefits: [
      "Everything in Supporter tier",
      "Early access to new tutorials",
      "Code review sessions",
      "1-on-1 mentoring (30min/month)"
    ]
  },
  {
    id: "3",
    name: "Architect", 
    price: 50,
    currency: "USDC",
    subscriberCount: 12,
    tierId: 2,
    benefits: [
      "Everything in Developer tier",
      "Private architecture sessions",
      "Custom smart contract reviews",
      "Direct access for urgent questions"
    ]
  }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <FeaturedCreators />
      <HowItWorks />
      
      {/* Creator Profile Section */}
      <section className="py-24 bg-secondary/10">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Creator Spotlight
            </h2>
            <p className="text-xl text-muted-foreground">
              See how creators are monetizing their content onchain
            </p>
          </div>
          <CreatorProfile creator={mockCreator} tiers={mockTiers} />
        </div>
      </section>
    </div>
  );
};

export default Index;