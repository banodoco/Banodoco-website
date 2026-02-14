import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { getWeeks } from './data';
import { ArtPickCard } from './ArtPickCard';

export const ArtPicksSection = () => {
  const allWeeks = getWeeks();
  const featuredWeek = allWeeks[0];
  const recentWeeks = allWeeks.slice(1, 4);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
      {/* Featured Large Card */}
      <div className="lg:col-span-7">
        <Link
          to={`/resources/art-picks/${featuredWeek.id}`}
          className="block group relative aspect-[16/10] overflow-hidden rounded-3xl bg-zinc-900 border border-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />

          {/* Decorative week number */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <span className="text-[15rem] font-black text-white italic -rotate-12 select-none tracking-tighter">
              {featuredWeek.id.split('-')[1].toUpperCase()}
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 z-20 space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                Latest Issue
              </span>
              <span className="text-zinc-400 text-xs font-bold tracking-widest uppercase">
                {featuredWeek.title}
              </span>
            </div>
            <h3 className="text-4xl md:text-6xl font-black tracking-tighter group-hover:text-zinc-300 transition-colors">
              THE CUTTING EDGE
            </h3>
            <p className="text-zinc-400 max-w-xl line-clamp-2 text-lg font-light leading-relaxed">
              {featuredWeek.introText}
            </p>
          </div>

          <div className="absolute top-12 right-12 z-20 p-4 rounded-full bg-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
            <ArrowUpRight size={32} />
          </div>
        </Link>
      </div>

      {/* Side Recent Weeks */}
      <div className="lg:col-span-5 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <span className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Recent Archives</span>
            <Link
              to="/resources/art-picks"
              className="text-[10px] font-black tracking-widest uppercase text-white hover:text-orange-500 transition-colors"
            >
              View All Issues
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {recentWeeks.map((week) => (
              <ArtPickCard key={week.id} week={week} />
            ))}
          </div>
        </div>

        <div className="mt-12 p-8 bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed">
          <p className="text-zinc-500 text-sm leading-relaxed mb-6">
            Explore 2 years of community art. Each week features 10 hand-picked videos that defined the aesthetic of AI generation at that moment in time.
          </p>
          <Link
            to="/resources/art-picks"
            className="inline-flex items-center gap-2 text-sm font-bold border-b border-white pb-1 hover:text-orange-500 hover:border-orange-500 transition-all"
          >
            Browse the Archive
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};
