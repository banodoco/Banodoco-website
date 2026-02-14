import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, User, Sparkles } from 'lucide-react';
import { getWeeks } from './data';

const ArtPicksDetail = () => {
  const { weekId } = useParams();
  const allWeeks = getWeeks();
  const week = allWeeks.find((w) => w.id === weekId);

  if (!week) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Week not found</h1>
        <Link to="/resources/art-picks" className="text-orange-500 underline">
          Back to Archive
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-20 pb-32">
      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-24">
        <div className="lg:col-span-8 space-y-8">
          <Link
            to="/resources/art-picks"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Back to Archive
          </Link>
          <div className="space-y-4">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none">
              {week.title}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                Curated by Banodoco Editorial
              </span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Issue #{week.id.split('w')[1]}
              </span>
            </div>
          </div>
          <p className="text-zinc-400 text-xl font-light leading-relaxed max-w-3xl border-l border-zinc-800 pl-8 py-4">
            {week.introText}
          </p>
        </div>

        <div className="lg:col-span-4 flex items-end">
          <div className="w-full aspect-square bg-zinc-900/50 rounded-3xl border border-zinc-800 flex items-center justify-center p-12 text-center group">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                <Sparkles size={24} />
              </div>
              <div className="text-xl font-black tracking-tighter">FEATURED ISSUE</div>
              <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                Exploration of<br />Temporal Consistency
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Grid — Editorial Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
        {week.videos.map((video, idx) => {
          const span =
            idx === 0
              ? 'lg:col-span-8'
              : idx === 3 || idx === 7
                ? 'lg:col-span-6'
                : 'lg:col-span-4';

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (idx % 4) * 0.1 }}
              className={`${span} group relative aspect-video overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />

              {/* Placeholder play icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                <Play size={48} className="text-white" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 z-20 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-orange-500 uppercase mb-2">
                  <User size={12} />
                  {video.creator}
                </div>
                <h3 className="text-xl font-bold tracking-tight">{video.title}</h3>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ArtPicksDetail;
