import React, { useState, useCallback, useRef } from 'react';

interface ArtworkItem {
  id: string;
  name: string;
  poster: string;
  video: string;
}

const artworks: ArtworkItem[] = [
  {
    id: '1',
    name: 'Francesco Petrarca',
    poster: '/arca-gidan/1_francesco_petrarca_poster.jpg',
    video: '/arca-gidan/1_francesco_petrarca_video.mp4',
  },
  {
    id: '2',
    name: 'Arnolfo di Cambio',
    poster: '/arca-gidan/2_arnolfo_di_cambio_poster.jpg',
    video: '/arca-gidan/2_arnolfo_di_cambio_video.mp4',
  },
  {
    id: '3',
    name: 'Giotto di Bondone',
    poster: '/arca-gidan/3_giotto_di_bondone_poster.jpg',
    video: '/arca-gidan/3_giotto_di_bondone_video.mp4',
  },
  {
    id: '4',
    name: 'Jean Buridan',
    poster: '/arca-gidan/4_jean_buridan_poster.jpg',
    video: '/arca-gidan/4_jean_buridan_video.mp4',
  },
];

interface ArtworkCardProps {
  artwork: ArtworkItem;
}

const ArtworkCard: React.FC<ArtworkCardProps> = ({ artwork }) => {
  const [showVideo, setShowVideo] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hasPlayedOnceRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) {
      // If video has played before, show it immediately (it's cached)
      if (hasPlayedOnceRef.current) {
        setShowVideo(true);
      }
      videoRef.current?.play();
    }
  }, [isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    if (!isTouchDevice) {
      setShowVideo(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isTouchDevice]);

  const handleTouchStart = useCallback(() => {
    setIsTouchDevice(true);
  }, []);

  const handleClick = useCallback(() => {
    if (isTouchDevice) {
      if (!showVideo) {
        if (hasPlayedOnceRef.current) {
          setShowVideo(true);
        }
        videoRef.current?.play();
      } else {
        setShowVideo(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }
    }
  }, [isTouchDevice, showVideo]);

  // Show video when it starts playing (first time only needs this)
  const handlePlaying = useCallback(() => {
    setShowVideo(true);
    hasPlayedOnceRef.current = true;
  }, []);

  return (
    <div
      className="relative h-full overflow-hidden cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      {/* Poster image - only hide when video is actually playing */}
      <img
        src={artwork.poster}
        alt={artwork.name}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
          showVideo ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Video - fade in when playing */}
      <video
        ref={videoRef}
        src={artwork.video}
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={handlePlaying}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
          showVideo ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Subtle gradient overlay at bottom for depth */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};

export const ArcaGidan: React.FC = () => {
  return (
    <section className="h-screen snap-start bg-[#1a1714] text-white overflow-hidden flex">
      {/* Left side - Text */}
      <div className="w-full lg:w-[40%] xl:w-[35%] flex items-center px-8 md:px-16 py-12 shrink-0">
        <div className="max-w-lg">
          <h2 className="text-4xl md:text-5xl font-normal tracking-tight leading-[1.15] mb-6">
            The Arca Gidan Prize is an open source AI art competition
          </h2>
          <p className="text-lg text-white/60 leading-relaxed mb-8">
            Over the years, we want to provide a reason for people to push themselves and open models to their limits.
          </p>
          <a
            href="https://arcagidan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-amber-400 font-medium hover:text-amber-300 transition-colors"
          >
            Visit Website
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Right side - Artwork grid (full height) */}
      <div className="hidden lg:grid grid-cols-4 flex-1 h-full">
        {artworks.map((artwork) => (
          <ArtworkCard key={artwork.id} artwork={artwork} />
        ))}
      </div>
    </section>
  );
};
