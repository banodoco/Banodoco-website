import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

const STORAGE_KEY = 'banodoco-1m-dismissed';

export const MilestonePopup = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (isDismissed) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    setTimeout(() => setIsDismissed(true), 300);
  };

  if (isDismissed || !isHomePage) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
        >
          <div className="relative bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl shadow-lg overflow-hidden max-w-[280px] sm:max-w-[260px]">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>

            <Link
              to="/1m"
              onClick={handleDismiss}
              className="block p-3.5 pr-8 group"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">🎉</span>
                <div className="min-w-0">
                  <p className="text-white/90 text-[13px] font-medium leading-snug">
                    1M messages in Discord
                  </p>
                  <p className="text-white/40 text-[11px] mt-0.5 group-hover:text-cyan-400/70 transition-colors">
                    See the data story →
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
