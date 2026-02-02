
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import SpriteGrid from './SpriteGrid';

const Hero: React.FC = () => {

  return (
    <section className="h-[100svh] flex flex-col items-center justify-center text-center relative px-4 overflow-hidden">
      {/* Sprite Grid Background */}
      <div className="absolute inset-0 z-0 opacity-30 overflow-hidden">
        <SpriteGrid />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="space-y-2 sm:space-y-3 relative z-10 pointer-events-none"
      >
        <div className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-cyan-400 backdrop-blur-sm">
          Celebrating
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-8xl font-black tracking-tighter leading-none">
          <span className="block text-white drop-shadow-lg">🎉 1 Million 🎉</span>
          <span className="block bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500">
            POSTS
          </span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-gray-400 font-medium max-w-2xl mx-auto">
          A Community in Review
        </p>

        <p className="text-gray-500 text-xs sm:text-sm uppercase tracking-widest font-semibold">
          A thousand days of AI Art & Innovation
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1 }}
        className="absolute bottom-8 sm:bottom-10 animate-bounce z-10"
      >
        <div className="flex flex-col items-center text-gray-500 text-xs font-semibold gap-2">
          SCROLL TO EXPLORE
          <ChevronDown size={20} />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
