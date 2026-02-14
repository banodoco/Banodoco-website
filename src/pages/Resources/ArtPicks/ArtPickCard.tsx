import { Link } from 'react-router-dom';
import type { ArtPickWeek } from './data';

interface ArtPickCardProps {
  week: ArtPickWeek;
}

export const ArtPickCard = ({ week }: ArtPickCardProps) => {
  const dateRange = (() => {
    const start = new Date(week.weekOf + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  })();

  return (
    <div className="group">
      <Link to={`/resources/art-picks/${week.id}`} className="block">
        {/* Placeholder thumbnail */}
        <div className="aspect-video bg-white/5 border border-white/10 rounded-lg flex items-center justify-center transition-colors group-hover:bg-white/10 group-hover:border-white/20">
          <svg
            className="w-10 h-10 text-white/20 group-hover:text-white/40 transition-colors"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-white/80 group-hover:text-white transition-colors">
          {week.title}
        </h3>
        <p className="text-xs text-white/40">{dateRange}</p>
      </Link>
      <Link
        to={`/resources/art-picks/${week.id}`}
        className="inline-block mt-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
      >
        Art picks from this week &rarr;
      </Link>
    </div>
  );
};
