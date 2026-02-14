import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getWeeks } from './data';
import { ArtPickCard } from './ArtPickCard';

const ArtPicksIndex = () => {
  const weeks = getWeeks();

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-20 pb-32">
      <div className="mb-20 space-y-8 text-center max-w-3xl mx-auto">
        <Link
          to="/resources"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Back to Resources
        </Link>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none">
          The Archive
        </h1>
        <p className="text-zinc-500 text-lg md:text-xl font-light leading-relaxed">
          104 weeks of community evolution. A chronological journey through the aesthetics,
          tools, and visions of the Banodoco collective.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {weeks.map((week, idx) => (
          <motion.div
            key={week.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.02, 1) }}
          >
            <ArtPickCard week={week} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ArtPicksIndex;
