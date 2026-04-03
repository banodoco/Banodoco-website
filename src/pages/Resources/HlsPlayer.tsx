import { useRef, useEffect, useState } from 'react';

interface HlsPlayerProps {
  hlsUrl: string;
  thumbnailUrl?: string | null;
  autoPlay?: boolean;
  defaultMuted?: boolean;
  showMuteToggle?: boolean;
  className?: string;
}

export const HlsPlayer = ({
  hlsUrl,
  thumbnailUrl,
  autoPlay = true,
  defaultMuted = true,
  showMuteToggle = true,
  className = '',
}: HlsPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMuted, setIsMuted] = useState(defaultMuted);

  useEffect(() => {
    setIsMuted(defaultMuted);
  }, [defaultMuted, hlsUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    // Safari: native HLS support
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      if (autoPlay) video.play().catch(() => {});
      setLoading(false);
      return;
    }

    // Other browsers: use hls.js
    let cancelled = false;

    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !video) return;

      if (!Hls.isSupported()) {
        setError(true);
        setLoading(false);
        return;
      }

      const hls = new Hls({
        startLevel: -1,
        enableWorker: true,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (autoPlay) video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
        const data = args[1] as { fatal: boolean } | undefined;
        if (data?.fatal) {
          setError(true);
          setLoading(false);
        }
      });

      hlsRef.current = hls;
    }).catch(() => {
      setError(true);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl, autoPlay]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black/50 text-white/40 text-sm ${className}`}>
        Failed to load video
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        poster={thumbnailUrl ?? undefined}
        muted={isMuted}
        controls
        playsInline
        className="w-full h-full"
      />
      {showMuteToggle && (
        <button
          type="button"
          onClick={() => setIsMuted(prev => !prev)}
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-black/65 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-black/80 transition-colors"
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M23 9l-6 6" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9l6 6" />
              </svg>
              Muted
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 010 7" />
              </svg>
              Sound On
            </>
          )}
        </button>
      )}
    </div>
  );
};
