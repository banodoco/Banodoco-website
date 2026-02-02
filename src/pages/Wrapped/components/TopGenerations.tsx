
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TopGeneration } from '../types';

interface TopGenerationsProps {
  data: TopGeneration[];
}

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const MediaItem: React.FC<{ gen: TopGeneration; onClick: () => void }> = ({ gen, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className="relative group cursor-pointer rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5 shadow-lg"
      onClick={onClick}
    >
      <div className="aspect-square relative overflow-hidden bg-[#111]">
        {gen.mediaType === 'video' ? (
          <video
            src={gen.mediaUrl}
            className="w-full h-full object-cover pointer-events-none"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={gen.mediaUrl}
            alt={gen.content || 'Community generation'}
            className="w-full h-full object-cover pointer-events-none"
            loading="lazy"
          />
        )}

        {/* Invisible tap target - ensures touch events work on iPad */}
        <div className="absolute inset-0 z-10" />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              {gen.avatarUrl ? (
                <img src={gen.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-cyan-500/30 flex items-center justify-center text-[8px] font-bold text-white">
                  {String(gen.author).charAt(0)}
                </div>
              )}
              <span className="text-white text-xs font-medium truncate">{gen.author}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-300">
              <span className="text-cyan-400 font-bold">{gen.reaction_count} reactions</span>
              <span className="text-gray-500">{gen.channel}</span>
            </div>
          </div>
        </div>

        {/* Reaction badge always visible */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold text-cyan-400">
          {gen.reaction_count}
        </div>

        {/* Video indicator */}
        {gen.mediaType === 'video' && (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white">
            VIDEO
          </div>
        )}
      </div>
    </motion.div>
  );
};

const LightboxModal: React.FC<{ gen: TopGeneration; onClose: () => void }> = ({ gen, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-w-3xl w-full max-h-[90vh] bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {gen.mediaType === 'video' ? (
            <video
              src={gen.mediaUrl}
              className="w-full max-h-[60vh] object-contain bg-black"
              controls
              autoPlay
              loop
            />
          ) : (
            <img
              src={gen.mediaUrl}
              alt={gen.content || 'Community generation'}
              className="w-full max-h-[60vh] object-contain bg-black"
            />
          )}
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            {gen.avatarUrl ? (
              <img src={gen.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-cyan-500/30 flex items-center justify-center text-sm font-bold text-white">
                {gen.author.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-white font-bold text-sm">@{gen.author}</p>
              <p className="text-gray-500 text-xs">{gen.channel} &middot; {new Date(gen.created_at).toLocaleDateString()}</p>
            </div>
            <div className="ml-auto text-cyan-400 font-bold text-sm">{gen.reaction_count} reactions</div>
          </div>
          {gen.content && (
            <p className="text-gray-300 text-sm line-clamp-3">{gen.content}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const TopGenerations: React.FC<TopGenerationsProps> = ({ data }) => {
  const [selectedGen, setSelectedGen] = useState<TopGeneration | null>(null);

  // Group by month, sorted oldest → newest
  const grouped = useMemo(() => {
    const map = new Map<string, TopGeneration[]>();
    for (const gen of data) {
      if (!map.has(gen.month)) map.set(gen.month, []);
      map.get(gen.month)!.push(gen);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <section className="py-16 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-8 sm:mb-12"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 flex items-center gap-3">
          <span className="text-sky-500">🎨</span> Top Generations Over Time
        </h2>
        <p className="text-gray-400 text-sm sm:text-base">
          The most loved creations from the community — sorted by reactions each month.
        </p>
      </motion.div>

      {/* All months in chronological order */}
      <div className="space-y-10 sm:space-y-14">
        {grouped.map(([month, gens]) => (
          <div key={month}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold text-white">{formatMonth(month)}</h3>
              <span className="text-xs text-gray-500 font-medium">{gens.length} top posts</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {gens.map((gen, i) => (
                <MediaItem
                  key={gen.message_id || `${month}-${i}`}
                  gen={gen}
                  onClick={() => setSelectedGen(gen)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedGen && (
          <LightboxModal gen={selectedGen} onClose={() => setSelectedGen(null)} />
        )}
      </AnimatePresence>
    </section>
  );
};

export default TopGenerations;
