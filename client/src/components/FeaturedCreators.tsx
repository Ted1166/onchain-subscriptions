import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const creators = [
  {
    name: "Alex Chen",
    category: "Web3 Developer",
    subscribers: 234,
    avatar: "/placeholder.svg",
    description: "Building the future of DeFi, one tutorial at a time",
    revenue: "$2,340"
  },
  {
    name: "Sarah Kim",
    category: "Digital Artist",
    subscribers: 567,
    avatar: "/placeholder.svg", 
    description: "Creating generative art and NFT collections",
    revenue: "$5,670"
  },
  {
    name: "Marcus Johnson",
    category: "Writer",
    subscribers: 189,
    avatar: "/placeholder.svg",
    description: "Exploring the intersection of tech and philosophy",
    revenue: "$1,890"
  }
];

const FeaturedCreators = () => {
  return (
    <section className="py-24 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Featured Creators
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover amazing creators building the future and support them directly onchain
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {creators.map((creator, index) => (
            <Card 
              key={index} 
              className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-smooth cursor-pointer group"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-smooth">
                      {creator.name}
                    </h3>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {creator.category}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-4 text-sm">
                  {creator.description}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{creator.subscribers}</span> subscribers
                  </div>
                  <div className="text-primary font-semibold">
                    {creator.revenue}/month
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCreators;