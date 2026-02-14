import { Link, useParams, Navigate } from 'react-router-dom';
import { getWeeks } from './data';

const ArtPicksDetail = () => {
  const { weekId } = useParams<{ weekId: string }>();
  const week = getWeeks().find((w) => w.id === weekId);

  if (!week) {
    return <Navigate to="/resources/art-picks" replace />;
  }

  const startDate = new Date(week.weekOf + 'T00:00:00');
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="pt-20 pb-16 px-6 md:px-20 lg:px-24 max-w-[1400px] mx-auto">
      <Link
        to="/resources/art-picks"
        className="inline-block text-sm text-white/40 hover:text-white transition-colors mb-6"
      >
        &larr; Back to Art Picks
      </Link>

      <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
        {week.title}
      </h1>
      <p className="text-white/50 text-sm mt-1">{dateRange}</p>

      <p className="text-white/60 mt-4 mb-8 max-w-2xl leading-relaxed">
        {week.introText}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {week.videos.map((video, i) => (
          <div key={i}>
            {/* Placeholder video thumbnail */}
            <div className="aspect-video bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-12 h-12 text-white/20"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-white/80">
              {video.title}
            </h3>
            <p className="text-xs text-white/40">{video.creator}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtPicksDetail;
