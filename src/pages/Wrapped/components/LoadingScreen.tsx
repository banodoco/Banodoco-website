
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
            {/* Animated logo / title */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-3xl sm:text-5xl font-extrabold bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400 bg-clip-text text-transparent">
                Banodoco
              </h1>
              <p className="text-white/50 mt-2 text-base sm:text-lg">1M Posts Wrapped</p>
            </motion.div>

            {/* Pulsing dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-3 h-3 rounded-full bg-cyan-500"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>

            {/* Progress bar */}
            <div className="w-full">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.phasePct}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <p className="text-white/40 text-sm mt-3 text-center">
                {progress.phaseLabel}
              </p>
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
