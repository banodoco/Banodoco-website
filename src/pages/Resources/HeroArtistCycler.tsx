import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useHeroArtistPieces } from '@/hooks/useHeroArtistPieces';
import { ArtGalleryModal } from './ArtGallery/ArtGalleryModal';

interface HeroArtistCyclerProps {
  usernames?: readonly string[];
}

const DEFAULT_USERNAMES = ['VisualFrisson', 'fabdream', 'emmacatnip'] as const;

export const HeroArtistCycler = ({
  usernames = DEFAULT_USERNAMES,
}: HeroArtistCyclerProps) => {
  const { pieces, loading } = useHeroArtistPieces(usernames);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [readyIds, setReadyIds] = useState<ReadonlySet<string>>(() => new Set());

  const markReady = (id: string) => {
    setReadyIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (pieces.length === 0) {
      setIndex(0);
      return;
    }

    setIndex((currentIndex) => currentIndex % pieces.length);
  }, [pieces.length]);

  useEffect(() => {
    if (pieces.length <= 1 || hovered || open) return undefined;

    const intervalId = window.setInterval(() => {
      setIndex((currentIndex) => (currentIndex + 1) % pieces.length);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hovered, open, pieces.length]);


  if (loading) {
    return <div className="bg-white/5 w-full h-full" />;
  }

  if (pieces.length === 0) {
    return null;
  }

  const currentPiece = pieces[index];
  if (!currentPiece) {
    return null;
  }

  const { thumbnailUrl, creator } = currentPiece;
  const displayName = creator.displayName ?? creator.username ?? 'Unknown';
  const isReady = readyIds.has(currentPiece.id);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group w-full h-full block relative overflow-hidden text-left cursor-pointer"
        aria-label={`Play ${displayName} artwork`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPiece.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: isReady ? 1 : 0, x: isReady ? 0 : 24 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{
              opacity: { duration: 0.9, ease: [0.22, 0.61, 0.36, 1] },
              x: { duration: 0.7, ease: 'easeOut' },
            }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-white/5 overflow-hidden">
              {/* Parallax zoom on hover — slow drift rather than a snap */}
              <div className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.08]">
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt={currentPiece.caption ?? 'Art piece'}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                    ref={(node) => {
                      if (!node) return;
                      const id = currentPiece.id;
                      const finalize = () => markReady(id);
                      if (typeof node.decode === 'function') {
                        node.decode().then(finalize).catch(finalize);
                      } else if (node.complete && node.naturalWidth > 0) {
                        finalize();
                      }
                    }}
                    onLoad={() => markReady(currentPiece.id)}
                    onError={() => markReady(currentPiece.id)}
                  />
                )}
              </div>
            </div>

            {/* Stacked actions in bottom-right: play pill above creator pill */}
            <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3">
              {/* Play invite — settled at rest, pops on hover to feel clickable */}
              <span
                className="inline-flex items-center gap-2 rounded-full border py-2 pl-3 pr-4 backdrop-blur-md transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.08]"
                style={{
                  backgroundColor: 'var(--rp-section-accent-soft)',
                  borderColor: 'var(--rp-section-accent-border)',
                  color: 'var(--rp-section-accent)',
                  boxShadow: '0 14px 38px -26px var(--rp-section-accent)',
                }}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/20 bg-current/10 transition-colors duration-300 group-hover:bg-current/15">
                  <Play className="w-2.5 h-2.5 fill-current translate-x-[0.5px]" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Play</span>
              </span>
              {/* Creator pill */}
              <span
                className="inline-flex items-center gap-2 rounded-full border bg-black/55 px-3 py-2 shadow-lg backdrop-blur-md"
                style={{
                  borderColor: 'var(--rp-section-accent-border)',
                  color: 'var(--rp-section-accent)',
                }}
              >
                {creator.avatarUrl && (
                  <img
                    src={creator.avatarUrl}
                    alt=""
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <span className="max-w-[160px] truncate text-sm">{displayName}</span>
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </button>
      {open && <ArtGalleryModal artPiece={currentPiece} onClose={() => setOpen(false)} />}
    </>
  );
};
