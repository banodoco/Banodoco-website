import { useRef, useEffect, useState } from 'react';

interface HlsPlayerProps {
  hlsUrl: string;
  thumbnailUrl?: string | null;
  autoPlay?: boolean;
  className?: string;
}

export const HlsPlayer = ({ hlsUrl, thumbnailUrl, autoPlay = true, className = '' }: HlsPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

      hls.on(Hls.Events.ERROR, (_event: unknown, data: { fatal: boolean }) => {
        if (data.fatal) {
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
        controls
        playsInline
        className="w-full h-full"
      />
    </div>
  );
};
