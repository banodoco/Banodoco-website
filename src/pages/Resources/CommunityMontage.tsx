import { useEffect, useRef } from 'react';

const FRAME_COUNT = 25;
const FRAME_PATHS = Array.from({ length: FRAME_COUNT }, (_, i) => `/assorted_propaganda/${i + 1}.jpg`);
const INITIAL_FRAME = Math.floor(Math.random() * FRAME_COUNT);
const FRAME_INTERVAL_MS = 800;

export const CommunityMontage = () => {
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef(INITIAL_FRAME);

  useEffect(() => {
    FRAME_PATHS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % FRAME_COUNT;
      if (imgRef.current) imgRef.current.src = FRAME_PATHS[frameRef.current];
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent z-10 opacity-35 pointer-events-none" />
      <img
        ref={imgRef}
        src={FRAME_PATHS[INITIAL_FRAME]}
        alt="Community montage"
        className="w-full h-full object-cover"
      />
    </div>
  );
};
