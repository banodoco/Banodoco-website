import { useState } from 'react';
import { Play } from 'lucide-react';

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  caption?: string;
  className?: string;
}

export const YouTubeEmbed = ({ videoId, title, caption, className = '' }: YouTubeEmbedProps) => {
  const [playing, setPlaying] = useState(false);
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

  return (
    <div className={`rounded-lg overflow-hidden border border-white/10 bg-black ${className}`}>
      <div className="relative aspect-video bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={title ?? 'Video'}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label={title ? `Play ${title}` : 'Play video'}
          >
            <img
              src={thumbnail}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full border bg-black/60 backdrop-blur transition group-hover:scale-105 group-hover:bg-black/80"
                style={{
                  borderColor: 'var(--rp-section-accent-border)',
                  color: 'var(--rp-section-accent)',
                  boxShadow: '0 14px 38px -28px var(--rp-section-accent)',
                }}
              >
                <Play size={20} className="translate-x-0.5 fill-current" />
              </div>
            </div>
            {(title || caption) && (
              <div className="absolute inset-x-2 bottom-2 text-left pointer-events-none">
                <div className="inline-block rounded-md bg-black/75 backdrop-blur-sm px-2.5 py-1.5">
                  {title && (
                    <p className="text-xs font-semibold leading-tight text-[var(--rp-section-accent)]">{title}</p>
                  )}
                  {caption && (
                    <p className="text-[11px] text-zinc-300 mt-0.5 leading-tight">{caption}</p>
                  )}
                </div>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
