import React from 'react';
import { Github, Twitter, Disc } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-secondary/30 py-16 border-t">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <h3 className="text-2xl font-bold font-meravila mb-2">Ba-no-do-co</h3>
          <p className="text-muted-foreground max-w-md text-sm">
            Building tools and nurturing a culture to inspire, empower and reward open collaboration in the AI and digital art ecosystem.
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="#" className="p-2 hover:bg-secondary rounded-full transition-colors" aria-label="Twitter">
            <Twitter className="w-5 h-5" />
          </a>
          <a href="#" className="p-2 hover:bg-secondary rounded-full transition-colors" aria-label="Discord">
            <Disc className="w-5 h-5" />
          </a>
          <a href="#" className="p-2 hover:bg-secondary rounded-full transition-colors" aria-label="GitHub">
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
      <div className="text-center mt-12 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Banodoco. All rights reserved.
      </div>
    </footer>
  );
};


