import { useRef, useEffect, useState, useCallback } from 'react';

interface CinematicVideoPlayerProps {
  hlsUrl?: string | null;
  mp4Url?: string | null;
  youtubeUrl?: string | null;
  thumbnailUrl?: string | null;
  subtitleUrl?: string | null;
  autoPlay?: boolean;
  className?: string;
  variant?: 'default' | 'compact';
}

export const CinematicVideoPlayer = ({
  hlsUrl,
  mp4Url,
  youtubeUrl,
  thumbnailUrl,
  subtitleUrl,
  autoPlay = false,
  className = '',
  variant = 'default',
}: CinematicVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // YouTube embed
  if (youtubeUrl) {
    const videoId = extractYouTubeId(youtubeUrl);
    if (videoId) {
      return (
        <div className={`relative bg-black ${className}`}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&rel=0`}
            className="w-full h-full absolute inset-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
          />
        </div>
      );
    }
  }

  const videoSrc = hlsUrl || mp4Url;

  // HLS / MP4 setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    // Reset state
    setLoading(true);
    setError(false);
    setPlaying(false);
    setProgress(0);
    setHasStarted(false);

    // If it's an HLS URL
    if (videoSrc.includes('.m3u8')) {
      // Safari native HLS
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoSrc;
        setLoading(false);
        return;
      }

      // hls.js for other browsers
      let cancelled = false;
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled || !video) return;
        if (!Hls.isSupported()) {
          setError(true);
          setLoading(false);
          return;
        }

        const hls = new Hls({ startLevel: -1, enableWorker: true });
        hls.loadSource(videoSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
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
    }

    // Direct MP4
    video.src = videoSrc;
    video.addEventListener('loadeddata', () => setLoading(false), { once: true });
    video.addEventListener('error', () => { setError(true); setLoading(false); }, { once: true });
  }, [videoSrc]);

  // Track progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const onProgress = () => {
      if (video.buffered.length > 0 && video.duration) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };

    const onDurationChange = () => setDuration(video.duration);
    const onPlay = () => { setPlaying(true); setHasStarted(true); };
    const onPause = () => setPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('progress', onProgress);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [videoSrc]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (playing) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      resetHideTimer();
    }
  }, [playing, resetHideTimer]);

  // Fullscreen
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * video.duration;
  }, []);

  const handleBigPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMuted(false);
    video.play().catch(() => {});
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black/50 text-white/40 text-sm ${className}`}>
        Failed to load video
      </div>
    );
  }

  const isCompact = variant === 'compact';

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group cursor-pointer ${className}`}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={hasStarted ? togglePlay : undefined}
    >
      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        poster={thumbnailUrl ?? undefined}
        muted={muted}
        playsInline
        loop
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
      >
        {subtitleUrl && <track kind="subtitles" src={subtitleUrl} srcLang="en" default />}
      </video>

      {/* Big play button (before first play) */}
      {!hasStarted && !loading && (
        <button
          onClick={(e) => { e.stopPropagation(); handleBigPlay(); }}
          className="absolute inset-0 flex items-center justify-center z-30 bg-black/30 hover:bg-black/40 transition-colors"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/25 transition-colors">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* Controls overlay */}
      {hasStarted && (
        <div
          className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          <div className={`relative px-3 ${isCompact ? 'pb-2' : 'pb-3'}`}>
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="w-full h-1.5 bg-white/15 rounded-full cursor-pointer mb-2 group/progress hover:h-2.5 transition-all"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-white/20 rounded-full absolute"
                style={{ width: `${buffered}%` }}
              />
              <div
                className="h-full bg-white rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow" />
              </div>
            </div>

            {/* Buttons row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <button onClick={togglePlay} className="p-1.5 text-white/90 hover:text-white transition-colors">
                  {playing ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>

                {/* Mute */}
                <button onClick={toggleMute} className="p-1.5 text-white/90 hover:text-white transition-colors">
                  {muted ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M23 9l-6 6M17 9l6 6" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 010 7" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 5a9 9 0 010 14" />
                    </svg>
                  )}
                </button>

                {/* Time display */}
                {!isCompact && (
                  <span className="text-xs text-white/60 font-mono ml-1">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="p-1.5 text-white/90 hover:text-white transition-colors">
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4H4m0 5h5m6 6v5h5m0-5h-5M9 15v5H4m0-5h5m6-6V4h5m0 5h-5" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4m8 0h4v4m0 8v4h-4m-8 0H4v-4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
