import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle, MapPin, Trophy, Hammer, Sparkles } from 'lucide-react';

const tools = [
  {
    title: "Community Discord",
    description: "Our Discord is a gathering place for people from across the ecosystem. We've been at the cutting-edge of the technical & artistic scenes over the past two years.",
    link: "https://discord.com/invite/acg8aNBTxd",
    icon: <MessageCircle className="w-8 h-8 mb-4 text-primary" />,
    cta: "Join Discord"
  },
  {
    title: "Reigh",
    description: "Reigh is an open source art tool for travelling between images. We believe that there's a whole artform waiting to be discovered in the journey from one image to another.",
    link: "https://reigh.art",
    icon: <Sparkles className="w-8 h-8 mb-4 text-primary" />,
    cta: "Visit Reigh"
  },
  {
    title: "ADOS Events",
    description: "ADOS events bring the community together in the real world. We gather our community with people from the extended creative world to look at art, eat nice food, and create things.",
    link: "https://ados.events",
    icon: <MapPin className="w-8 h-8 mb-4 text-primary" />,
    cta: "View Events"
  },
  {
    title: "Arca Gidan Prize",
    description: "The Arca Gidan Prize is an open source AI art competition. Over the years, we want to provide a reason for people to push themselves and open models to their limits.",
    link: "https://arcagidan.com",
    icon: <Trophy className="w-8 h-8 mb-4 text-primary" />,
    cta: "Learn More"
  },
  {
    title: "Mellon",
    description: "Mellon will allow the community to combine the capabilities in the ecosystem and build and share tools that make them accessible and unlock their artistic potential.",
    subtext: "Build/share tools that combine diffusers, ComfyUI workflows, & more.",
    link: "#",
    icon: <Hammer className="w-8 h-8 mb-4 text-primary" />,
    cta: "Coming Soon",
    disabled: true
  }
];

export const Tools = () => {
  return (
    <section id="tools" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-meravila mb-6">
            We're building an interlocking collection of tools & resources
          </h2>
          <p className="text-muted-foreground text-lg">
            To empower the ecosystem to succeed and grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tools.map((tool, index) => (
            <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                {tool.icon}
                <CardTitle className="font-meravila text-2xl">{tool.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {tool.description}
                </CardDescription>
                {tool.subtext && (
                  <p className="mt-4 text-sm text-muted-foreground italic border-l-2 border-primary/20 pl-3">
                    {tool.subtext}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant={tool.disabled ? "ghost" : "link"} 
                  className="p-0 h-auto font-medium group"
                  disabled={tool.disabled}
                  asChild={!tool.disabled}
                >
                  {tool.disabled ? (
                    <span>{tool.cta}</span>
                  ) : (
                    <a href={tool.link} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                      {tool.cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};


