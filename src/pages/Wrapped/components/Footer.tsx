
import React from 'react';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  return (
    <footer className="py-8 sm:py-12 text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="space-y-3 sm:space-y-4"
      >
        <div className="flex flex-wrap justify-center gap-1.5 items-center text-sm sm:text-base text-gray-400 font-medium">
          Made with <span className="text-red-500">&#9829;</span> by the <span className="text-white font-bold">Banodoco</span> community
        </div>

        <div className="flex flex-col gap-1 text-xs text-gray-500">
          <p>Data analysis powered by <span className="text-gray-300 font-mono">Claude Code</span></p>
          <p>Visualized with <span className="text-gray-300 font-mono">React & Framer Motion</span></p>
        </div>

        <p className="text-[9px] sm:text-[10px] text-gray-600 uppercase tracking-[0.15em] sm:tracking-[0.2em]">
          © 2025 BANODOCO DISCORD • ALL RIGHTS RESERVED
        </p>
      </motion.div>
    </footer>
  );
};

export default Footer;
