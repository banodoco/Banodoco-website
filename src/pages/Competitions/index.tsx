import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronRight } from 'lucide-react';
import { useCompetitions, useCompetitionEntries } from '@/hooks/useCompetitions';
import { buildArtPath } from '@/lib/routing';

const CompetitionEntryCard = ({ entry }: { entry: any }) => {
  const creatorName = entry.profile?.displayName ?? entry.profile?.discordUsername ?? 'Unknown';

  return (
    <Link
      to={buildArtPath(entry.mediaId, entry.title)}
      className="group block rounded-xl overflow-hidden border border-white/5 hover:border-white/20 bg-white/[0.02] transition-all duration-200 hover:scale-[1.01]"
    >
      {entry.thumbnailUrl ? (
        <div className="relative aspect-video overflow-hidden">
          <img
            src={entry.thumbnailUrl}
            alt={entry.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {entry.winner && (
            <div className="absolute top-2 left-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/90 text-white rounded flex items-center gap-1">
                <Trophy size={10} /> Winner
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-white/5 flex items-center justify-center text-white/20">
          No preview
        </div>
      )}
      <div className="p-3 space-y-2">
        <h3 className="font-medium text-zinc-100 text-sm truncate group-hover:text-white transition-colors">
          {entry.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {entry.profile?.avatarUrl && (
              <img src={entry.profile.avatarUrl} alt="" className="w-4 h-4 rounded-full" loading="lazy" />
            )}
            <span className="text-xs text-zinc-500 truncate">{creatorName}</span>
          </div>
          {entry.voteCount > 0 && (
            <span className="text-xs text-zinc-600">{entry.voteCount} votes</span>
          )}
        </div>
        {entry.toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.toolsUsed.slice(0, 3).map((tool: string, i: number) => (
              <span key={i} className="px-1.5 py-0.5 text-[9px] bg-white/5 text-zinc-500 rounded">
                {tool}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

const Competitions = () => {
  const { competitions, loading: compLoading } = useCompetitions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first prize competition
  const prizeComps = competitions.filter(c => c.type === 'prize');
  const communityComps = competitions.filter(c => c.type === 'community');
  const activeId = selectedId ?? prizeComps[0]?.id ?? competitions[0]?.id;
  const activeName = competitions.find(c => c.id === activeId)?.name ?? '';

  const { entries, loading: entriesLoading } = useCompetitionEntries(activeId);

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 pt-20 pb-16 lg:pt-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-8">
          <Link to="/resources" className="hover:text-zinc-300 transition-colors">Resources</Link>
          <ChevronRight size={14} />
          <span className="text-zinc-400">Competitions</span>
        </nav>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Trophy size={24} className="text-amber-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">Competitions</h1>
        </div>

        {/* Competition selector */}
        {!compLoading && competitions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {prizeComps.length > 0 && (
              <>
                <span className="text-xs text-zinc-600 uppercase tracking-wider self-center mr-2">Prize</span>
                {prizeComps.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      activeId === c.id
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </>
            )}
            {communityComps.length > 0 && (
              <>
                <span className="text-xs text-zinc-600 uppercase tracking-wider self-center mr-2 ml-4">Community</span>
                {communityComps.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      activeId === c.id
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Entries grid */}
        {entriesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-white/5">
                <div className="aspect-video bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 bg-white/10 rounded" />
                  <div className="h-3 w-1/2 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={48} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500">No entries yet for {activeName}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {entries.map(entry => (
              <CompetitionEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Competitions;
