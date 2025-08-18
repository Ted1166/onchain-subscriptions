import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAccount } from 'wagmi';

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  benefits: string[];
  subscriberCount: number;
  tierId?: number;
}

interface CreatorProfileProps {
  creator: {
    name: string;
    avatar: string;
    description: string;
    category: string;
    totalSubscribers: number;
    monthlyRevenue: number;
    vaultAddress?: string;
  };
  tiers: SubscriptionTier[];
}

const CreatorProfile = ({ creator, tiers }: CreatorProfileProps) => {
  const { address, isConnected } = useAccount()

  const handleSubscribe = (tier: SubscriptionTier) => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }
    
    if (!creator.vaultAddress) {
      alert('Creator vault not deployed yet')
      return
    }

    alert(`Subscribe to ${tier.name} for ${tier.price} ${tier.currency}`)
  }
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="flex-shrink-0">
          <Avatar className="w-32 h-32">
            <AvatarImage src={creator.avatar} alt={creator.name} />
            <AvatarFallback className="text-2xl">{creator.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold text-foreground">{creator.name}</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {creator.category}
            </Badge>
          </div>
          
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
            {creator.description}
          </p>
          
          <div className="flex gap-6 text-sm text-muted-foreground">
            <div>
              <span className="text-2xl font-bold text-foreground">{creator.totalSubscribers}</span>
              <span className="block">subscribers</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">${creator.monthlyRevenue}</span>
              <span className="block">monthly revenue</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">Choose Your Support Level</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <Card key={tier.id} className="relative bg-gradient-card border-border shadow-card hover:shadow-glow transition-smooth group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">{tier.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {tier.subscriberCount} subs
                  </Badge>
                </div>
                <CardDescription className="text-3xl font-bold text-primary">
                  ${tier.price}
                  <span className="text-sm text-muted-foreground">/{tier.currency} monthly</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {tier.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full bg-gradient-primary hover:shadow-glow transition-smooth group-hover:scale-105"
                  size="lg"
                  onClick={() => handleSubscribe(tier)}
                  disabled={!isConnected}
                >
                  {isConnected ? 'Subscribe Now' : 'Connect Wallet'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreatorProfile;
