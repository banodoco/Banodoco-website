import { useEffect, useRef, useState } from 'react';

const FRAME_COUNT = 25;
const FRAME_PATHS = Array.from({ length: FRAME_COUNT }, (_, i) => `/assorted_propaganda/${i + 1}.webp`);

const TILE_COUNT = 6;
const MAX_TILT_DEG = 14;
const HOVER_LIFT_PX = 8;
const BOX_DEPTH_PX = 26;
const INFLUENCE_MARGIN_PX = 280;

const TILE_SEEDS: Array<{ start: number; intervalMs: number }> = Array.from({ length: TILE_COUNT }, (_, i) => ({
  start: Math.floor(Math.random() * FRAME_COUNT),
  intervalMs: 700 + ((i * 137) % 600),
}));

type Tilt = { x: number; y: number };

const SIDE_FACE_STYLE: Record<'right' | 'left' | 'top' | 'bottom', { wrapStyle: React.CSSProperties; objectPosition: string }> = {
  right: {
    wrapStyle: {
      width: `${BOX_DEPTH_PX}px`,
      top: 0,
      right: 0,
      height: '100%',
      transform: `translateZ(-${BOX_DEPTH_PX / 2}px) rotateY(90deg)`,
      transformOrigin: 'right center',
    },
    objectPosition: 'right center',
  },
  left: {
    wrapStyle: {
      width: `${BOX_DEPTH_PX}px`,
      top: 0,
      left: 0,
      height: '100%',
      transform: `translateZ(-${BOX_DEPTH_PX / 2}px) rotateY(-90deg)`,
      transformOrigin: 'left center',
    },
    objectPosition: 'left center',
  },
  top: {
    wrapStyle: {
      width: '100%',
      height: `${BOX_DEPTH_PX}px`,
      top: 0,
      left: 0,
      transform: `translateZ(${BOX_DEPTH_PX / 2}px) rotateX(-90deg)`,
      transformOrigin: 'center top',
    },
    objectPosition: 'center top',
  },
  bottom: {
    wrapStyle: {
      width: '100%',
      height: `${BOX_DEPTH_PX}px`,
      bottom: 0,
      left: 0,
      transform: `translateZ(${BOX_DEPTH_PX / 2}px) rotateX(90deg)`,
      transformOrigin: 'center bottom',
    },
    objectPosition: 'center bottom',
  },
};

const SideFace = ({ side, src }: { side: 'right' | 'left' | 'top' | 'bottom'; src: string }) => {
  const cfg = SIDE_FACE_STYLE[side];
  return (
    <div
      aria-hidden
      className="absolute overflow-hidden bg-zinc-950"
      style={cfg.wrapStyle}
    >
      <img
        src={src}
        alt=""
        className="absolute inset-0 w-full h-full object-cover brightness-[0.45] saturate-[0.75]"
        style={{ objectPosition: cfg.objectPosition }}
      />
    </div>
  );
};

const Tile = ({ start, intervalMs, tilt, lift }: { start: number; intervalMs: number; tilt: Tilt; lift: number }) => {
  const frameRef = useRef(start);
  const [src, setSrc] = useState(FRAME_PATHS[start]);

  useEffect(() => {
    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % FRAME_COUNT;
      setSrc(FRAME_PATHS[frameRef.current]);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  const transform = `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${lift}px)`;

  return (
    <div className="relative aspect-square w-full" style={{ perspective: '1100px' }}>
      <div
        className="relative h-full w-full transition-transform duration-300 ease-out will-change-transform"
        style={{ transformStyle: 'preserve-3d', transform }}
      >
        <SideFace side="right" src={src} />
        <SideFace side="left" src={src} />
        <SideFace side="top" src={src} />
        <SideFace side="bottom" src={src} />
        <div
          className="absolute inset-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-[0_18px_44px_-22px_rgba(0,0,0,0.7)]"
          style={{ transform: `translateZ(${BOX_DEPTH_PX / 2}px)` }}
        >
          <div className="absolute inset-0 z-10 bg-gradient-to-br from-white/10 to-transparent opacity-30 pointer-events-none" />
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export const CommunityMontage = () => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [tilt, setTilt] = useState<Tilt>({ x: 0, y: 0 });
  const [lift, setLift] = useState(0);

  useEffect(() => {
    FRAME_PATHS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const el = wrapRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;

        const dx = e.clientX - cx;
        const dy = e.clientY - cy;

        // How far the cursor is OUTSIDE the collage's bounding box (0 when inside)
        const outsideX = Math.max(0, Math.abs(dx) - halfW);
        const outsideY = Math.max(0, Math.abs(dy) - halfH);
        const distOutside = Math.hypot(outsideX, outsideY);

        // Influence: 1 anywhere over the collage, smoothstep down to 0 over INFLUENCE_MARGIN_PX
        const t = Math.max(0, Math.min(1, 1 - distOutside / INFLUENCE_MARGIN_PX));
        const influence = t * t * (3 - 2 * t);

        // Direction toward cursor, clamped so we never exceed MAX_TILT_DEG
        const nx = Math.max(-1, Math.min(1, dx / halfW));
        const ny = Math.max(-1, Math.min(1, dy / halfH));

        setTilt({
          x: -ny * MAX_TILT_DEG * influence,
          y: nx * MAX_TILT_DEG * influence,
        });
        setLift(HOVER_LIFT_PX * influence);
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={wrapRef} className="grid grid-cols-3 gap-3 sm:gap-4">
      {TILE_SEEDS.map((seed, i) => (
        <Tile key={i} start={seed.start} intervalMs={seed.intervalMs} tilt={tilt} lift={lift} />
      ))}
    </div>
  );
};
