
import React from 'react';
import { motion } from 'framer-motion';
import type { ChannelStat } from '../types';

interface ChannelBreakdownProps {
  stats: ChannelStat[];
}

const ChannelBreakdown: React.FC<ChannelBreakdownProps> = ({ stats }) => {
  return (
    <section className="py-16 sm:py-32">
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-8 sm:mb-12"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 flex items-center gap-3">
          <span className="text-teal-500">📊</span> Where the Conversations Happen
        </h2>
        <p className="text-gray-400 text-sm sm:text-base">Our digital real estate broken down by volume.</p>
      </motion.div>

      <div className="space-y-4 sm:space-y-6">
        {stats.map((channel, i) => (
          <div key={channel.name} className="space-y-1.5 sm:space-y-2">
            <div className="flex justify-between items-end gap-2">
              <span className="text-white font-bold font-mono text-sm sm:text-base truncate">{channel.name}</span>
              <span className="text-gray-500 text-xs sm:text-sm font-medium whitespace-nowrap">
                {channel.messages.toLocaleString()} posts • <span className="text-white">{channel.percentage}%</span>
              </span>
            </div>
            <div className="h-3 sm:h-4 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${channel.percentage}%` }}
                transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                className={`h-full rounded-full bg-gradient-to-r ${
                  i === 0 ? 'from-cyan-500 to-sky-400' :
                  i === 1 ? 'from-blue-500 to-cyan-500' :
                  i === 2 ? 'from-teal-500 to-blue-500' :
                  'from-gray-600 to-gray-500'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ChannelBreakdown;
