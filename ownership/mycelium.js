/* mycelium.js — the background network. Filaments grow once from the bottom
   edge, wandering and branching upward, and thin into darkness before the
   top of the viewport; then a handful of fork nodes keep breathing. Two
   canvases: the net is drawn additively onto a persistent canvas and never
   repainted, while the nodes clear + redraw every frame — so the breathing
   costs nothing and the filaments never strobe. Purely atmospheric
   (aria-hidden, pointer-events none); at ~15% max visual presence it is
   meant to be felt, not read. */
const wrap = document.getElementById('mycelium');
const netCanvas = document.getElementById('myc-net');
const nodeCanvas = document.getElementById('myc-nodes');
const net = netCanvas.getContext('2d');
const nodes = nodeCanvas.getContext('2d');

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, 2);   /* cap: retina is enough */
const GROW_MS = 8000;       /* the net draws itself in over ~8s, once */
const MAX_DEPTH = 4;        /* branch depth; children grow thinner */
const TOP_STOP = 0.3;       /* growth stops at 70% viewport height */
const MAX_NODES = 24;       /* a handful of breathing fork dots */

let w = 0;
let h = 0;
let segs = [];
let pulseNodes = [];
let netRaf = 0;
let nodeRaf = 0;
let growthDone = false;
let growthState = { start: 0, drawn: 0 };

function fit() {
  w = window.innerWidth;
  h = window.innerHeight;
  netCanvas.width = Math.round(w * DPR);
  netCanvas.height = Math.round(h * DPR);
  nodeCanvas.width = netCanvas.width;
  nodeCanvas.height = netCanvas.height;
  net.setTransform(DPR, 0, 0, DPR, 0, 0);
  nodes.setTransform(DPR, 0, 0, DPR, 0, 0);
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* One wandering polyline from a root point: y climbs 1-3px a step while x
   drifts ±1.5px with momentum. Alpha fades with height — 0.14 at the
   bottom, 0.02 by 70% up — so the net thins into the dark and never
   reaches the top. Forks are recorded as node candidates. */
function growFilament(x, y, depth, width, out) {
  let vx = (Math.random() - 0.5) * 1.2;
  /* per-filament stop height: a shared stop line reads as a clipped hedge;
     scattering it (±) lets the network's top edge thin out organically.
     The climb is capped in absolute px too — on a very tall viewport a
     fraction-of-h net becomes a golden sandstorm; the network is ground
     cover, never wallpaper. */
  const climb = Math.min(h * (1 - TOP_STOP), 780);
  const stopY = h - climb * (0.8 + Math.random() * 0.35);
  while (y > stopY) {
    const stepY = 1 + Math.random() * 2;
    vx = Math.max(-1.5, Math.min(1.5, vx + (Math.random() - 0.5) * 0.6));
    const nx = x + vx;
    const ny = y - stepY;
    /* fade over the full climb (bottom -> stopY), not just the first 30% */
    const a = 0.14 - 0.12 * clamp01((h - y) / Math.min(h * (1 - TOP_STOP), 780));
    out.segs.push({ x1: x, y1: y, x2: nx, y2: ny, width, alpha: a });
    x = nx;
    y = ny;
    if (depth < MAX_DEPTH && Math.random() < 0.018) {
      out.forks.push({
        x, y,
        r: 1.5 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 0.9,
      });
      growFilament(x, y, depth + 1, width * 0.7, out);
    }
  }
}

function generate() {
  const out = { segs: [], forks: [] };
  /* density scales with width — a fixed count reads 3x heavier at 400px
     than at 1280px. One root per ~44px, jittered. */
  const roots = Math.max(8, Math.round(w / 44)) + Math.floor(Math.random() * 5);
  for (let i = 0; i < roots; i++) {
    growFilament(Math.random() * w, h, 0, 0.6 + Math.random() * 0.6, out);
  }
  const pool = out.forks.sort(() => Math.random() - 0.5).slice(0, MAX_NODES);
  return { segs: out.segs, pulseNodes: pool };
}

function drawSegment(ctx, s) {
  ctx.strokeStyle = `rgba(217, 164, 65, ${s.alpha})`;
  ctx.lineWidth = s.width;
  ctx.beginPath();
  ctx.moveTo(s.x1, s.y1);
  ctx.lineTo(s.x2, s.y2);
  ctx.stroke();
}

/* Reduced-motion path: same generator, run to completion synchronously —
   a still net, no breathing, no parallax, no rAF at all. */
function drawAll() {
  net.lineCap = 'round';
  for (const s of segs) drawSegment(net, s);
}

function stepGrowth(now) {
  const t = Math.min(1, (now - growthState.start) / GROW_MS);
  const target = Math.floor(t * segs.length);
  net.lineCap = 'round';
  for (; growthState.drawn < target; growthState.drawn++) {
    drawSegment(net, segs[growthState.drawn]);
  }
  if (t < 1) {
    netRaf = requestAnimationFrame(stepGrowth);
  } else {
    growthDone = true;
    nodeRaf = requestAnimationFrame(nodeFrame());
  }
}

function beginGrowth() {
  growthState = { start: performance.now(), drawn: 0 };
  netRaf = requestAnimationFrame(stepGrowth);
}

/* The breathing dots: cleared and redrawn every frame, a soft shadowBlur
   glow, radius and alpha driven by a slow sine per node. */
function nodeFrame() {
  const frame = (now) => {
    nodes.clearRect(0, 0, w, h);
    for (const n of pulseNodes) {
      const pulse = 0.5 + 0.5 * Math.sin((now / 1000) * n.speed + n.phase);
      nodes.save();
      nodes.shadowColor = 'rgba(240, 200, 119, 0.9)';
      nodes.shadowBlur = 6;
      nodes.fillStyle = `rgba(240, 200, 119, ${0.2 + 0.3 * pulse})`;
      nodes.beginPath();
      nodes.arc(n.x, n.y, n.r * (0.55 + 0.45 * pulse), 0, Math.PI * 2);
      nodes.fill();
      nodes.restore();
    }
    nodeRaf = requestAnimationFrame(frame);
  };
  return frame;
}

/* Pause the loops entirely while the tab is hidden — the net's growth
   clock is wall time, so a hidden spell simply fast-forwards on resume
   without redrawing anything twice (the drawn counter is preserved). */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(netRaf);
    cancelAnimationFrame(nodeRaf);
  } else if (!growthDone) {
    netRaf = requestAnimationFrame(stepGrowth);
  } else {
    nodeRaf = requestAnimationFrame(nodeFrame());
  }
});

/* Scroll parallax: the whole wrapper drifts slowly against the document. */
let ticking = false;
window.addEventListener('scroll', () => {
  if (REDUCED || ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    wrap.style.transform = `translate3d(0, ${window.scrollY * -0.06}px, 0)`;
    ticking = false;
  });
});

/* Debounced rebuild: a fresh net on a new viewport. */
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(rebuild, 250);
});

function rebuild() {
  cancelAnimationFrame(netRaf);
  cancelAnimationFrame(nodeRaf);
  net.clearRect(0, 0, w, h);
  nodes.clearRect(0, 0, w, h);
  fit();
  const gen = generate();
  segs = gen.segs;
  pulseNodes = gen.pulseNodes;
  growthDone = false;
  if (REDUCED) drawAll();
  else beginGrowth();
}

export function initMycelium() {
  fit();
  const gen = generate();
  segs = gen.segs;
  pulseNodes = gen.pulseNodes;
  if (REDUCED) {
    drawAll();
    return;
  }
  beginGrowth();
}
