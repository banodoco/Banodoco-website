import { Link } from 'react-router-dom';
import { getWeeks } from './data';
import { ArtPickCard } from './ArtPickCard';

export const ArtPicksSection = () => {
  const weeks = getWeeks();
  const featured = weeks[0];
  const nextFour = weeks.slice(1, 5);

  const startDate = new Date(featured.weekOf + 'T00:00:00');
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="mt-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white">Art From The Community</h2>
        <Link
          to="/resources/art-picks"
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          View all &rarr;
        </Link>
      </div>

      {/* Side-by-side: featured left, 2x2 grid right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Featured latest week — left half */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col">
          <div className="aspect-video bg-white/5 flex items-center justify-center">
            <svg
              className="w-14 h-14 text-white/15"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>

          <div className="p-4 md:p-5 flex flex-col flex-1">
            <h3 className="text-lg md:text-xl font-semibold text-white">
              Top Art From the {featured.title}
            </h3>
            <p className="text-xs text-white/40 mt-0.5">{dateRange}</p>

            <p className="text-white/50 text-sm mt-2 leading-relaxed line-clamp-3">
              {featured.introText}
            </p>

            <Link
              to={`/resources/art-picks/${featured.id}`}
              className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/80 hover:bg-white/15 hover:text-white transition-colors self-start"
            >
              View all picks from this week &rarr;
            </Link>
          </div>
        </div>

        {/* 2x2 grid of previous weeks — right half */}
        <div className="grid grid-cols-2 gap-3">
          {nextFour.map((week) => (
            <ArtPickCard key={week.id} week={week} />
          ))}
        </div>
      </div>
    </div>
  );
};
