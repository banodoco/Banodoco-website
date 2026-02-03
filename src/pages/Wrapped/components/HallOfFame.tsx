
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ThankedPerson } from '../types';

// Gold medal particles that pop off from the #1 bar
const MedalParticle: React.FC<{ delay: number; x: number; y: number }> = ({ delay, x, y }) => (
  <motion.span
    className="absolute text-lg sm:text-xl pointer-events-none z-20"
    initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
    animate={{
      opacity: [0, 1, 1, 0],
      x: x,
      y: y,
      scale: [0.5, 1.2, 1, 0.8],
      rotate: [0, x > 0 ? 20 : -20, 0],
    }}
    transition={{
      duration: 1.2,
      delay: delay,
      ease: "easeOut",
    }}
  >
    🥇
  </motion.span>
);

interface HallOfFameProps {
  mostThanked: ThankedPerson[];
}

const HallOfFame: React.FC<HallOfFameProps> = ({ mostThanked }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<ThankedPerson | null>(null);
  const [hoveredPerson, setHoveredPerson] = useState<ThankedPerson | null>(null);
  const [showMedals, setShowMedals] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Detect mobile for limiting bars
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Limit to top 10 on mobile, full 20 on larger screens
  const displayData = isMobile ? mostThanked.slice(0, 10) : mostThanked;
  // Reverse order so #1 is on the right
  const reversedData = [...displayData].reverse();
  const maxThanks = mostThanked[0]?.thanks || 1;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Trigger medal animation after #1 bar finishes animating
  useEffect(() => {
    if (isVisible) {
      const numBars = isMobile ? 10 : 20;
      // #1 bar is last, delay = (numBars - 1) * 0.08 + 0.6s duration
      const medalDelay = (numBars - 1) * 0.08 + 0.6;
      const timer = setTimeout(() => setShowMedals(true), medalDelay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isMobile]);

  // Gold/silver/bronze for top 3, then gradient for rest
  const getBarColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    // Gradient from cyan to blue for others
    const t = (rank - 4) / 16;
    return `hsl(${190 - t * 30}, 70%, ${55 - t * 15}%)`;
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <section ref={sectionRef}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 120 }}
        className="mb-4 sm:mb-6 text-center"
      >
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2 leading-tight">
          <span className="mr-2">🙏</span>Throughout It All, People Helped Others Figure It Out
        </h2>
        <p className="text-gray-400 text-[10px] sm:text-xs">
          The most thanked members — counted by mentions and replies in thank-you messages.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-[#1a1a1a]/50 p-3 sm:p-4 lg:p-6 rounded-2xl sm:rounded-3xl border border-white/5 backdrop-blur-sm"
      >
        {/* Chart container */}
        <div className="h-[300px] sm:h-[340px] lg:h-[400px] w-full flex flex-col">
          {/* Y-axis labels and bars area */}
          <div className="flex-1 flex">
            {/* Y-axis */}
            <div className="w-10 sm:w-12 flex flex-col justify-between text-[10px] text-gray-500 pr-2 py-2">
              <span>{maxThanks.toLocaleString()}</span>
              <span>{Math.round(maxThanks * 0.75).toLocaleString()}</span>
              <span>{Math.round(maxThanks * 0.5).toLocaleString()}</span>
              <span>{Math.round(maxThanks * 0.25).toLocaleString()}</span>
              <span>0</span>
            </div>

            {/* Bars */}
            <div className="flex-1 flex items-end gap-1 sm:gap-2 border-l border-b border-white/10 pl-2 pb-2">
              {reversedData.map((person, index) => {
                const heightPercent = (person.thanks / maxThanks) * 100;
                const barColor = getBarColor(person.rank);

                return (
                  <div
                    key={person.rank}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    onClick={() => setSelectedPerson(selectedPerson?.rank === person.rank ? null : person)}
                    onMouseEnter={() => !isMobile && setHoveredPerson(person)}
                    onMouseLeave={() => !isMobile && setHoveredPerson(null)}
                  >
                    {/* Hover tooltip - desktop only */}
                    {!isMobile && hoveredPerson?.rank === person.rank && (
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-30 bg-black/90 backdrop-blur-sm rounded-lg px-2 py-1.5 whitespace-nowrap border border-white/10 shadow-lg">
                        <p className="text-white font-medium text-xs">@{person.username}</p>
                        <p className="text-cyan-400 text-[10px]">{person.thanks.toLocaleString()} thanks</p>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-black/90 border-r border-b border-white/10" />
                      </div>
                    )}

                    {/* Bar wrapper - maintains height for medal positioning */}
                    <div className="w-full relative" style={{ height: `${heightPercent}%` }}>
                      {/* Gold medal particles for #1 - positioned at top of bar */}
                      {person.rank === 1 && showMedals && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                          <MedalParticle delay={0} x={-20} y={-40} />
                          <MedalParticle delay={0.1} x={15} y={-50} />
                          <MedalParticle delay={0.2} x={-5} y={-60} />
                          <MedalParticle delay={0.15} x={25} y={-35} />
                          <MedalParticle delay={0.25} x={-25} y={-45} />
                        </div>
                      )}

                      {/* Bar - positioned at bottom so it grows upward */}
                      <motion.div
                        className="w-full absolute bottom-0 left-0 rounded-t-sm sm:rounded-t-md overflow-hidden"
                        style={{ backgroundColor: barColor }}
                        initial={{ height: 0 }}
                        animate={isVisible ? { height: '100%' } : { height: 0 }}
                        transition={{
                          duration: 0.6,
                          delay: index * 0.08,
                          ease: [0.22, 1, 0.36, 1]
                        }}
                      >
                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected person name display - mobile only */}
          {selectedPerson && isMobile && (
            <div className="ml-10 sm:ml-12 pl-2 pt-2 text-center">
              <p className="text-white font-bold text-xs sm:text-sm">@{selectedPerson.username}</p>
              <p className="text-cyan-400 text-[10px] sm:text-xs">{selectedPerson.thanks.toLocaleString()} thanks</p>
            </div>
          )}

          {/* X-axis with avatars */}
          <div className="flex ml-10 sm:ml-12 pl-2 pt-1">
            {reversedData.map((person, index) => {
              const barColor = getBarColor(person.rank);
              const isSelected = selectedPerson?.rank === person.rank;

              return (
                <motion.div
                  key={person.rank}
                  className="flex-1 flex justify-center cursor-pointer relative"
                  initial={{ opacity: 0 }}
                  animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.08 + 0.3
                  }}
                  onClick={() => setSelectedPerson(isSelected ? null : person)}
                  onMouseEnter={() => !isMobile && setHoveredPerson(person)}
                  onMouseLeave={() => !isMobile && setHoveredPerson(null)}
                >
                  {/* Avatar */}
                  <div className={`relative transition-transform ${isSelected ? 'scale-125' : ''}`}>
                    {person.avatarUrl ? (
                      <img
                        src={person.avatarUrl}
                        alt={person.username}
                        className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full object-cover ${isSelected ? 'border-2 border-cyan-400' : 'border border-white/20'}`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[6px] sm:text-[8px] font-bold text-white/80 ${person.avatarUrl ? 'hidden' : ''}`}
                      style={{ backgroundColor: barColor + '66', border: isSelected ? '2px solid #22d3ee' : `1px solid ${barColor}` }}
                    >
                      {getInitial(person.username)}
                    </div>
                    {/* Medal for top 3 */}
                    {person.rank <= 3 && (
                      <span className="absolute -top-1 -right-1 text-[6px] sm:text-[8px]">
                        {person.rank === 1 ? '🥇' : person.rank === 2 ? '🥈' : '🥉'}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Legend for top 3 */}
        <div className="flex justify-center gap-4 sm:gap-6 mt-2 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#FFD700' }} />
            <span className="text-xs text-gray-400">1st Place</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#C0C0C0' }} />
            <span className="text-xs text-gray-400">2nd Place</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#CD7F32' }} />
            <span className="text-xs text-gray-400">3rd Place</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default HallOfFame;
