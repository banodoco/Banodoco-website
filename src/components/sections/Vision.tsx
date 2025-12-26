import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export const Vision = () => {
  return (
    <section id="vision" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold font-meravila leading-tight">
              Accelerating the <br />
              <span className="text-primary italic">2nd Renaissance</span>
            </h2>
            
            <p className="text-xl text-muted-foreground leading-relaxed font-light">
              As humanity's creative potential is unlocked by AI, the impact on the world may be so profound that a coming era becomes known as "The 2nd Renaissance". 
            </p>
            
            <p className="text-lg text-foreground font-medium">
              By empowering the people in this ecosystem, we believe that we can accelerate the beginning of this era by at least a few months.
            </p>

            <Button variant="outline" size="lg" className="group" asChild>
              <a href="https://schlupfloch.xyz" target="_blank" rel="noreferrer">
                Read about this idea
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </div>

          <div className="flex-1 w-full">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] group">
               {/* Placeholder for "The Creation" artwork video/image */}
               <img 
                 src="https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?q=80&w=2000&auto=format&fit=crop" 
                 alt="Renaissance Art Representation" 
                 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                 <p className="text-white font-meravila text-xl italic">"The Creation" - Exploring the boundaries of AI Art</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


