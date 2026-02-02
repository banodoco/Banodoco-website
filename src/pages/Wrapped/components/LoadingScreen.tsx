
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FetchProgress } from '../useDiscordData';

interface LoadingScreenProps {
  progress: FetchProgress;
  visible: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, visible }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f0f0f]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col items-center gap-6 sm:gap-8 px-4 sm:px-6 max-w-md w-full">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <img src="/banodoco.png" alt="Banodoco" className="h-12 w-12 sm:h-16 sm:w-16" draggable={false} />
            </motion.div>

            {/* Progress bar only */}
            <div className="w-full">
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.phasePct}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          {/* Background decorations */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
            <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] bg-cyan-900/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[25%] bg-blue-900/20 blur-[100px] rounded-full" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
