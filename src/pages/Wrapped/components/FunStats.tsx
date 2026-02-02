
import React from 'react';
import { motion } from 'framer-motion';

interface FunStatsProps {
  stats: {
    longestMessage: { chars: number; username: string };
    mostRepliedThread: { replies: number; topic: string };
    busiestDay: { date: string; messages: number; reason: string };
    mostUsedEmoji: { emoji: string; count: number };
    mostUsedWord: { word: string; count: number };
  };
}

const FunStats: React.FC<FunStatsProps> = ({ stats }) => {
  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-4 sm:mb-8"
      >
        <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 flex items-center gap-2">
          <span className="text-sky-500">🎲</span> Random Fun Facts
        </h2>
        <p className="text-gray-400 text-[10px] sm:text-sm">The weird and wonderful data of 1 million posts.</p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 auto-rows-[120px] sm:auto-rows-[160px] lg:auto-rows-[200px]">
        {/* Longest Message */}
        <StatCard
          className="col-span-2 sm:col-span-2 bg-gradient-to-br from-cyan-900/20 to-sky-900/20"
          label="The Novel Writer"
          value={stats.longestMessage.chars.toLocaleString()}
          suffix="chars"
          sub={`By @${stats.longestMessage.username}`}
          icon="📝"
          index={0}
        />

        {/* Busiest Day */}
        <StatCard
          className="bg-teal-500/10"
          label="Busiest Day"
          value={stats.busiestDay.messages.toString()}
          suffix="posts"
          sub={stats.busiestDay.reason}
          icon="🔥"
          index={1}
        />

        {/* Most Replied */}
        <StatCard
          className="bg-sky-500/10"
          label="Hottest Topic"
          value={stats.mostRepliedThread.replies.toString()}
          suffix="replies in one thread"
          sub={stats.mostRepliedThread.topic}
          icon="🔁"
          index={2}
        />

        {/* Emoji */}
        <StatCard
          className="bg-teal-500/10"
          label="Favorite Reaction"
          value={stats.mostUsedEmoji.count.toLocaleString()}
          suffix="times used"
          sub={`The ${stats.mostUsedEmoji.emoji} emoji reigns supreme`}
          icon={stats.mostUsedEmoji.emoji}
          index={3}
        />

        {/* Most Used Word */}
        <StatCard
          className="bg-blue-500/10"
          label="Common Vocabulary"
          value={stats.mostUsedWord.count.toLocaleString()}
          suffix="mentions"
          sub={`The word "${stats.mostUsedWord.word}"`}
          icon="💬"
          index={4}
        />
      </div>
    </section>
  );
};

const StatCard: React.FC<{
  className?: string;
  label: string;
  value: string;
  suffix: string;
  sub: string;
  icon: string;
  index?: number;
}> = ({ className, label, value, suffix, sub, icon, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
    whileHover={{ scale: 1.02 }}
    className={`p-3 sm:p-5 lg:p-8 rounded-xl sm:rounded-2xl lg:rounded-3xl border border-white/5 flex flex-col justify-between group cursor-default transition-all ${className}`}
  >
    <div className="flex justify-between items-start">
      <span className="text-[8px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-500 leading-tight">{label}</span>
      <span className="text-base sm:text-xl lg:text-2xl group-hover:scale-125 transition-transform">{icon}</span>
    </div>
    <div>
      <div className="flex items-baseline gap-1 sm:gap-1.5">
        <span className="text-lg sm:text-2xl lg:text-4xl font-black text-white">{value}</span>
        <span className="text-[8px] sm:text-xs lg:text-sm font-medium text-gray-400">{suffix}</span>
      </div>
      <p className="text-[8px] sm:text-[10px] lg:text-xs text-gray-500 mt-0.5 font-medium line-clamp-2">{sub}</p>
    </div>
  </motion.div>
);

export default FunStats;
