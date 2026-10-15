// Version F, slide 7: how it pays. Above the text, in the deck's gold-thread
// language: on the left a few machines running Astrid locally (a terminal, a
// GPU, a node graph), the nerds who build on it; their threads converge into
// the core, slide 4's lens with the mink inside; past a dotted boundary, the
// core reaches out across widening arcs to a great many people, everyone else,
// on the hosted version. Pulses run from the builders into the core, and from
// the core outward, wave after wave.
// Arriving from slide 6, the pixel mink perched on its stack powers up (her eye lights, motes gather into
// her, a ring of light) and travels across into this slide's lens, which draws in around her.
// Its core, builders and people are kept as data (window.AstridPays) so the next
// slide, the foundation, can carry the picture on.
(() => {
  const root = document.querySelector('[data-astrid-pays]');
  const M = window.AstridMink;
  if (!root || !M) return;
  const slide = root.closest('.slide');
  const canvas = root.querySelector('.pa-canvas');
  const g = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const lerp = (a, b, q) => a + (b - a) * q;
  const easeIO = (q) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
  const THREAD = '240,200,119', NODE = '255,217,145', CORE = '255,241,214';
  const TAU = Math.PI * 2;

  // ---- Labels -------------------------------------------------------------------
  const tag = (cls, html) => {
    const el = document.createElement('div');
    el.className = `pa-ax ${cls}`;
    el.innerHTML = html;
    root.appendChild(el);
    return el;
  };
  const labels = {
    local: tag('pa-side', '<b>Nerds · local</b><span>Make it more capable</span>'),
    hosted: tag('pa-side', '<b>Everyone else · hosted</b><span>Pay for an easier way to create</span>'),
    core: tag('pa-core', 'Astrid'),
  };

  // A soft light, stamped wherever something glows.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 128;
  {
    const sg = glow.getContext('2d'), rg = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, `rgba(${NODE},1)`); rg.addColorStop(0.35, `rgba(${NODE},0.35)`); rg.addColorStop(1, `rgba(${NODE},0)`);
    sg.fillStyle = rg; sg.fillRect(0, 0, 128, 128);
  }
  const halo = (x, y, r, a) => { if (a <= 0.003 || r <= 0) return; g.globalAlpha = Math.min(1, a); g.drawImage(glow, x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
  const dot = (x, y, r, color, a) => { if (a <= 0.003 || r <= 0) return; g.fillStyle = `rgba(${color},${Math.min(1, a).toFixed(3)})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const node = (x, y, size, a) => { if (a <= 0.003) return; const r = 2.6 * size * Math.max(0.7, k); halo(x, y, r * 4.4, 0.45 * a); dot(x, y, r, NODE, 0.95 * a); dot(x - r * 0.15, y - r * 0.2, r * 0.62, CORE, 0.9 * a); };

  // ---- Paths ------------------------------------------------------------------------
  const line = (pts) => {
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, len, total: len[len.length - 1] };
  };
  const at = (h, d) => {
    d = clamp(d, 0, h.total);
    let lo = 1, hi = h.len.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (h.len[m] < d) lo = m + 1; else hi = m; }
    const l0 = h.len[lo - 1], t = (d - l0) / ((h.len[lo] - l0) || 1);
    const [x0, y0] = h.pts[lo - 1], [x1, y1] = h.pts[lo];
    return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, i: lo };
  };
  const stroke = (h, d0, d1, w, color, a) => {
    if (a <= 0.003 || d1 <= d0) return;
    const p = at(h, d0), q = at(h, d1);
    g.lineWidth = w; g.strokeStyle = `rgba(${color},${Math.min(1, a).toFixed(3)})`;
    g.beginPath(); g.moveTo(p.x, p.y);
    for (let i = p.i; i < q.i; i++) g.lineTo(h.pts[i][0], h.pts[i][1]);
    g.lineTo(q.x, q.y); g.stroke();
  };
  const bez = (p0, c0, c1, p1, n = 32) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x, u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y];
  });

  // ---- Geometry -----------------------------------------------------------------------
  // Drawn in the reference's own units (1672 x 941), scaled by k about the middle.
  // The core: a lens centred at (750, 415), 136 wide and 226 tall, in those units.
  const CORE_REF = { cx: 750, cy: 415, w: 136, h: 226 };
  // On a phone the picture is scaled as one (k) above the text. Beside the text on the right, it is laid out
  // in the room to the left: positions stretch by kx across and ky down, while sizes (circles, the lens,
  // the mink, dots) scale by k so nothing is squashed.
  let W = 0, H = 0, dpr = 1, k = 1, kx = 1, ky = 1, ox = 0, oy = 0, LW = 1, small = false;
  const X = (rx) => ox + (rx - (small ? 836 : 150)) * (small ? k : kx), Y = (ry) => oy + (ry - 415) * (small ? k : ky), P = (rx, ry) => ({ x: X(rx), y: Y(ry) });
  let seed = 1;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  let machines = [], feeds = [], lens = null, arcs = [], rays = [], boundary = null, cell = 3;

  const put = (el, x, y, alignX, alignY) => {
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.transform = `translate(${(x - w * alignX).toFixed(1)}px, ${(y - h * alignY).toFixed(1)}px)`;
  };
  const layout = () => {
    const b = root.getBoundingClientRect();
    if (!b.width || !b.height) return false;
    W = b.width; H = b.height;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    small = W <= 760;
    const num = slide.querySelector('.num'), top = num.getBoundingClientRect().top - b.top;
    if (small) { // above the text, scaled as one; the picture spans reference x 150..1580 and y 70..760
      k = Math.min((W - 24) / 1430, (top - 60) / 690);
      ox = W / 2 - 29 * k;
      oy = Math.max(40 + 345 * k, top * 0.5);
    } else { // to the left of the text: from 64 px in to 56 px short of the text column, centred down the slide
      const text = slide.querySelector('.split > :first-child').getBoundingClientRect();
      const left = 64, right = text.left - b.left - 96; // the hosted band keeps ~96 px of air before the text
      kx = (right - left - 20) / 1430;
      ky = Math.min((H - 230) / 690, 1.0);
      k = Math.min(ky, kx * 1.35, 1.05);
      ox = left + 52 * k - 63 * kx; // the builders' circles (reference x 213) sit just inside the left edge
      oy = H / 2 - 20 * ky; // the picture's middle (reference y 415) a touch above the slide's middle, as the text is
    }
    LW = Math.max(0.75, Math.min(1.15, k * 1.1));
    seed = 20261015;
    // The builders' machines, and their threads into the core's left side.
    // The core: three strands of a lens, nodes at its tips and on its sides.
    // The mink is this slide's hero: as large a whole-number cell as fits (4 beside the text), the lens widened to hold her.
    cell = small ? 1 : k >= 0.62 ? 4 : Math.max(2, Math.round(3.4 * k));
    const lw0 = small ? CORE_REF.w * k : Math.max(CORE_REF.w * k, 23 * cell + 40);
    lens = { c: P(CORE_REF.cx, CORE_REF.cy), w: lw0, h: Math.max(CORE_REF.h * k, lw0 * 1.66) };
    const lensL = { x: lens.c.x - lens.w / 2, y: lens.c.y }, lensR = { x: lens.c.x + lens.w / 2, y: lens.c.y };
    machines = [[213, 277, 'term'], [213, 424, 'gpu'], [213, 570, 'graph']].map(([x, y, kind], i) => ({ ...P(x, y), r: 52 * k, kind, i }));
    feeds = machines.map((m, i) => {
      const end = { x: lensL.x + 2 * k, y: lensL.y + (i - 1) * 12 * k };
      const start = { x: m.x + m.r, y: m.y };
      const dx = end.x - start.x;
      const h = line(bez(start, { x: start.x + dx * 0.4, y: start.y }, { x: end.x - dx * 0.4, y: end.y }, end, 48));
      h.nodes = [0.3, 0.68].map((f) => f * h.total);
      return h;
    });
    // The boundary: hosted begins past this line (clear of the lens when the picture is narrowed).
    boundary = { x: Math.max(X(836), lens.c.x + lens.w / 2 + 16 * k), y0: Y(120), y1: Y(705) };
    // Everyone else: wave fronts of people widening out from the core, as in the reference: each an arc
    // (centre u, radius r, half-height hh, in reference units), the last a dense band.
    arcs = [];
    const FRONTS = [[895, 225, 180, 18, 1], [1000, 265, 225, 22, 1], [1103, 327, 275, 28, 1], [1206, 359, 330, 46, 3]];
    FRONTS.forEach(([u, r, hh, n, rows], ai) => {
      const dots = [], span = Math.asin(Math.min(1, hh / r));
      for (let row = 0; row < rows; row++) {
        const rr = r + (rows > 1 ? (row - 1) * 11 : 0), m = rows > 1 ? Math.round(n * (row === 1 ? 1.1 : 0.9)) : n;
        for (let j = 0; j < m; j++) {
          const a = -span + (2 * span * (j + (rows > 1 ? rnd() * 0.6 : 0))) / (m - 1);
          const jit = rows > 1 ? (rnd() - 0.5) * 6 : 0;
          dots.push({ ...P(u + Math.cos(a) * (rr + jit), 415 + Math.sin(a) * (rr + jit)), a: a / span, r: rows > 1 ? 1.1 + rnd() * 0.8 : 1.7 + rnd() * 0.4, bright: rnd() < (rows > 1 ? 0.3 : 0.15) });
        }
      }
      const thread = rows > 1 ? null : line(Array.from({ length: 41 }, (_, j) => { const a = -span + (2 * span * j) / 40; return [X(u + Math.cos(a) * r), Y(415 + Math.sin(a) * r)]; }));
      arcs.push({ x: u + r, dots, thread, t0: 1.7 + ai * 0.28 });
    });
    // Rays from the core's right tip out to the far front, a few bright people on them.
    rays = [[-0.42, 0.62], [-0.27, 0.45], [-0.1, 0.78], [0.03, 0.3], [0.16, 0.66], [0.3, 0.5], [0.45, 0.85]].map(([a, mark], i) => {
      const start = { x: lensR.x, y: lensR.y + (i - 3) * 4 * k };
      const end = P(820 + Math.cos(a) * 760, 415 + Math.sin(a) * 760);
      return Object.assign(line([[start.x, start.y], [end.x, end.y]]), { mark, i });
    });
    // Labels.
    labels.local.style.fontSize = labels.hosted.style.fontSize = `${Math.max(small ? 10.5 : 13, 23 * k).toFixed(1)}px`;
    labels.core.style.fontSize = `${Math.max(small ? 11 : 14, 25 * k).toFixed(1)}px`;
    put(labels.local, X(150), Y(168), 0, 0.5);
    put(labels.hosted, X(1170), Y(118), 0.5, 0.5);
    put(labels.core, lens.c.x + 4 * k, lens.c.y - lens.h / 2 - 28 * k, 0.5, 0.5);
    return true;
  };

  // ---- Time ----------------------------------------------------------------------------
  const END = 3.2, AMBIENT = 3.6;
  let ta = 0, running = false, raf = 0, last = 0, armed = false, timers = [];
  let pulses = [], waves = [], nextPulse = 0, nextWave = 0;
  const k01 = (t0, d) => clamp((ta - t0) / d);

  // ---- Drawing ---------------------------------------------------------------------------
  const lensPts = (side, n, inset) => { // a vesica edge: side -1 left, +1 right
    const hw = lens.w / 2 - inset, hh = lens.h / 2 - inset * 0.6, c = (hw * hw - hh * hh) / (2 * hw), R = hw - c;
    return Array.from({ length: n + 1 }, (_, i) => { const y = -hh + (2 * hh * i) / n; return [lens.c.x + side * (c + Math.sqrt(Math.max(0, R * R - y * y))), lens.c.y + y]; });
  };
  const glyph = (m, a) => {
    if (a <= 0) return;
    const s = m.r / 52, x = m.x, y = m.y;
    halo(x, y, m.r * 1.5, 0.06 * a);
    g.lineWidth = 1.5 * LW;
    g.strokeStyle = `rgba(${THREAD},${(0.95 * a).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, m.r, 0, TAU); g.stroke();
    g.lineWidth = 1.4 * LW;
    g.strokeStyle = `rgba(${CORE},${(0.82 * a).toFixed(3)})`;
    g.beginPath();
    if (m.kind === 'term' || m.kind === 'graph') { // a monitor on its stand
      g.roundRect(x - 26 * s, y - 20 * s, 52 * s, 34 * s, 3 * s);
      g.moveTo(x, y + 14 * s); g.lineTo(x, y + 21 * s); g.moveTo(x - 10 * s, y + 21 * s); g.lineTo(x + 10 * s, y + 21 * s);
    }
    if (m.kind === 'term') { g.moveTo(x - 16 * s, y - 10 * s); g.lineTo(x - 9 * s, y - 4 * s); g.lineTo(x - 16 * s, y + 2 * s); g.moveTo(x - 6 * s, y + 3 * s); g.lineTo(x + 4 * s, y + 3 * s); }
    if (m.kind === 'graph') { g.moveTo(x - 13 * s, y + 4 * s); g.lineTo(x - 1 * s, y - 9 * s); g.lineTo(x + 12 * s, y + 3 * s); }
    if (m.kind === 'gpu') { // a graphics card: its board, its fan, its bracket
      g.roundRect(x - 26 * s, y - 15 * s, 50 * s, 28 * s, 3 * s);
      g.moveTo(x + 24 * s, y - 15 * s); g.lineTo(x + 30 * s, y - 15 * s); g.lineTo(x + 30 * s, y + 18 * s);
      g.moveTo(x - 20 * s, y + 13 * s); g.lineTo(x - 20 * s, y + 18 * s); g.lineTo(x + 4 * s, y + 18 * s); g.lineTo(x + 4 * s, y + 13 * s);
      g.moveTo(x + 12 * s, y - 1 * s); g.arc(x + 2 * s, y - 1 * s, 10 * s, 0, TAU);
      for (let b = 0; b < 5; b++) { const an = (b / 5) * TAU + ta * 0.6; g.moveTo(x + 2 * s, y - 1 * s); g.lineTo(x + 2 * s + Math.cos(an) * 9 * s, y - 1 * s + Math.sin(an) * 9 * s); }
    }
    g.stroke();
    if (m.kind === 'graph') [[-13, 4], [-1, -9], [12, 3]].forEach(([dx, dy]) => dot(x + dx * s, y + dy * s, 2.2 * s, CORE, 0.9 * a));
    node(x + m.r, y, 0.9, a);
  };
  // The mink at any whole-number cell u, her eye lit by `glint` (the profile's glint pose), top-left at (x0, y0).
  const paintMinkAt = (x0, y0, u, glint = 0) => {
    const P2 = M.POSES.profile, G2 = M.POSES.glint;
    x0 = Math.round(x0); y0 = Math.round(y0);
    for (let j = 0; j < P2.length; j++) for (let i = 0; i < P2[0].length; i++) {
      const ch = P2[j][i];
      if (ch === '.') continue;
      g.fillStyle = M.COLORS[ch];
      g.fillRect(x0 + i * u, y0 + j * u, u, u);
    }
    if (glint > 0) {
      g.globalAlpha = glint;
      for (let j = 0; j < G2.length; j++) for (let i = 0; i < G2[0].length; i++) {
        const ch = G2[j][i];
        if (ch === '.' || ch === P2[j][i]) continue;
        g.fillStyle = M.COLORS[ch];
        g.fillRect(x0 + i * u, y0 + j * u, u, u);
      }
      g.globalAlpha = 1;
    }
  };
  // From slide 6: where she starts (her canvas there, in this slide's coordinates) and the motes she gathers.
  let fly = null;
  const FLY = { charge: 0.85, travel: 1.25, land: 0.6 }; // seconds: power up, cross, settle
  const paintMink = (x, y, a) => { // the real pixel mink, crisp, centred on (x, y)
    if (a <= 0 || (fly && ta < fly.landed)) return;
    const P2 = M.POSES.profile, u = cell, w = P2[0].length * u, h = P2.length * u;
    const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
    g.globalAlpha = a;
    for (let j = 0; j < P2.length; j++) for (let i = 0; i < P2[0].length; i++) {
      const ch = P2[j][i];
      if (ch === '.') continue;
      g.fillStyle = M.COLORS[ch];
      g.fillRect(x0 + i * u, y0 + j * u, u, u);
    }
    g.globalAlpha = 1;
  };

  const draw = () => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!lens) return;
    g.lineCap = 'round'; g.lineJoin = 'round';
    // The core: the lens traces from its tips, the mink inside it.
    const ql = ease(k01(0.05, 1.0));
    halo(lens.c.x, lens.c.y, lens.h * 0.55, 0.12 * ql);
    if (ql > 0) {
      [[0, 1.2, 0.95], [6 * k, 0.9, 0.55], [-4 * k, 0.8, 0.35]].forEach(([inset, w, a]) => {
        for (const side of [-1, 1]) {
          const h = line(lensPts(side, 40, inset)), mid = h.total / 2, half = mid * ql;
          stroke(h, mid - half, mid + half, w * LW, THREAD, a);
        }
      });
      node(lens.c.x, lens.c.y - lens.h / 2, 1, ql); node(lens.c.x, lens.c.y + lens.h / 2, 1, ql);
    }
    paintMink(lens.c.x + 4 * k, lens.c.y + 8 * k, smooth(k01(0.5, 0.5)));
    // The builders: their machines, and their threads into the core.
    machines.forEach((m, i) => {
      const q = ease(k01(0.4 + i * 0.12, 0.6));
      glyph(m, q);
      const qf = ease(k01(0.8 + i * 0.12, 0.8));
      if (qf > 0) {
        const f = feeds[i];
        stroke(f, 0, f.total * qf, 1 * LW, THREAD, 0.65);
        f.nodes.forEach((d) => { if (d <= f.total * qf) node(at(f, d).x, at(f, d).y, 1, 1); });
        for (let j = -1; j <= 1; j++) if (qf >= 1) node(f.pts[f.pts.length - 1][0], f.pts[f.pts.length - 1][1], 0.6, 1);
      }
    });
    // The boundary between local and hosted.
    const qb = k01(1.4, 0.6);
    if (qb > 0) {
      for (let y = boundary.y0; y < boundary.y0 + (boundary.y1 - boundary.y0) * ease(qb); y += 7 * k) dot(boundary.x, y, 0.75 * Math.max(0.8, k), NODE, 0.35);
    }
    // Everyone else: rays out of the core, and arcs of people widening out.
    const qr = ease(k01(1.5, 1.0));
    rays.forEach((r) => {
      if (qr <= 0) return;
      stroke(r, 0, r.total * qr, 0.6 * LW, THREAD, 0.3);
      if (qr >= r.mark) node(at(r, r.total * r.mark).x, at(r, r.total * r.mark).y, 0.95, smooth(clamp((qr - r.mark) * 5)));
    });
    for (const a of arcs) {
      const q = k01(a.t0, 0.7);
      if (q <= 0) continue;
      if (a.thread) { const mid = a.thread.total / 2, half = mid * ease(q); stroke(a.thread, mid - half, mid + half, 0.6 * LW, THREAD, 0.28); }
      for (const d of a.dots) {
        const local = clamp((q - Math.abs(d.a) * 0.35) * 2.6);
        if (local <= 0) continue;
        let lit = 0;
        for (const w of waves) { const dist = Math.abs(X(820) + (ta - w.t0) * 520 * k - d.x); lit = Math.max(lit, clamp(1 - dist / (50 * k))); }
        const al = (d.bright ? 1 : 0.85) * local * (0.85 + 0.15 * lit) + 0.2 * lit;
        halo(d.x, d.y, (d.bright ? 9 : 6.5) * k * (1 + 0.5 * lit), (d.bright ? 0.6 : 0.36) * al);
        dot(d.x, d.y, d.r * Math.max(0.8, k) * (1 + 0.3 * lit), CORE, al);
      }
    }
    // Pulses: from a builder into the core.
    for (const p of pulses) {
      const f = feeds[p.i], d = easeIO(clamp((ta - p.t0) / 1.4)) * f.total;
      stroke(f, Math.max(0, d - 40 * k), d, 1.2 * LW, NODE, 0.7);
      const q = at(f, d); halo(q.x, q.y, 9 * k, 0.75); dot(q.x, q.y, 1.8 * Math.max(0.8, k), CORE, 1);
    }
    // The core flares as a wave leaves it.
    for (const w of waves) { const e = ta - w.t0; if (e < 0.6) halo(lens.c.x, lens.c.y, lens.h * (0.35 + 0.4 * e), 0.25 * (1 - e / 0.6)); }
    if (fly) drawFly();
  };
  // The power-up and the flight, in hand-off time h (0 when she leaves slide 6).
  const drawFly = () => {
    const f = fly, h = ta - f.t0, u0 = f.c, u1 = cell;
    const end = { x: lens.c.x + 4 * k, y: lens.c.y + 8 * k }; // her centre in the lens, as paintMink draws her
    const T1 = FLY.charge, T2 = T1 + FLY.travel;
    if (h < T1) { // power up where she sits: her eye lights, motes gather into her, a ring of light, a little hop
      const c = { x: f.x + 11.5 * u0, y: f.y + 10 * u0 }, glint = smooth(clamp(h / 0.25));
      halo(c.x, c.y, (18 + 30 * smooth(clamp(h / T1))) * Math.max(1, u0 / 2), 0.25 + 0.45 * smooth(clamp(h / T1)));
      for (const m of f.motes) {
        const q = clamp((h - m.d) / (T1 - 0.15 - m.d));
        if (q <= 0 || q >= 1) continue;
        const e = q * q, x = lerp(m.x, c.x, e), y = lerp(m.y, c.y, e), px = lerp(m.x, c.x, Math.max(0, e - 0.12)), py = lerp(m.y, c.y, Math.max(0, e - 0.12));
        g.lineWidth = 1.1; g.strokeStyle = `rgba(${NODE},${(0.5 * q).toFixed(3)})`;
        g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
        halo(x, y, 6, 0.6); dot(x, y, 1.6, CORE, 0.95);
      }
      for (const r0 of [0.5, 0.68]) { // rings of light
        const q = clamp((h - r0) / 0.5);
        if (q <= 0 || q >= 1) continue;
        g.lineWidth = 1.4 * (1 - q) + 0.4; g.strokeStyle = `rgba(${NODE},${(0.7 * (1 - q)).toFixed(3)})`;
        g.beginPath(); g.arc(c.x, c.y, (14 + 80 * ease(q)) * Math.max(1, u0 / 3), 0, TAU); g.stroke();
      }
      const lift = h > T1 - 0.2 ? u0 * 2 : h > T1 - 0.3 ? u0 : 0;
      paintMinkAt(f.x, f.y - lift, u0, glint);
      return;
    }
    if (h < T2) { // the flight: an arc across into the lens, a trail of light behind her
      const q = 0.5 - 0.5 * Math.cos(Math.PI * clamp((h - T1) / FLY.travel)), u = q < 0.5 ? u0 : u1; // a gentle sine ease
      const s0 = { x: f.x + 11.5 * u0, y: f.y + 10 * u0 - 2 * u0 }, cp = { x: (s0.x + end.x) / 2, y: Math.min(s0.y, end.y) - 140 * k };
      const pos = (t) => { const v = 1 - t; return { x: v * v * s0.x + 2 * v * t * cp.x + t * t * end.x, y: v * v * s0.y + 2 * v * t * cp.y + t * t * end.y }; };
      for (let j = 12; j >= 1; j--) { // the trail
        const t = Math.max(0, q - j * 0.022), p = pos(t), a = (1 - j / 13) * 0.55;
        halo(p.x, p.y, (10 - j * 0.5) * Math.max(1, u / 2), a * 0.6); dot(p.x, p.y, 1.8 - j * 0.1, CORE, a);
      }
      const p = pos(q);
      halo(p.x, p.y, 34 * Math.max(1, u / 2), 0.45);
      paintMinkAt(p.x - 11.5 * u, p.y - 10 * u, u, 1);
      return;
    }
    // Landed: a soft flare in the lens, her eye dimming back to normal.
    const q = clamp((h - T2) / FLY.land);
    halo(lens.c.x, lens.c.y, lens.h * (0.3 + 0.5 * ease(q)), 0.45 * (1 - q));
    paintMinkAt(end.x - 11.5 * u1, end.y - 10 * u1, u1, 1 - smooth(q));
    if (q >= 1) fly = null;
  };
  const smooth = (q) => q * q * (3 - 2 * q);

  const advance = (dt) => {
    ta += dt;
    if (ta < AMBIENT) return;
    // A builder publishes something; it reaches the core; a wave goes out to everyone.
    if (ta >= nextPulse) { pulses.push({ i: Math.floor(Math.random() * 3), t0: ta }); nextPulse = ta + 2.2 + Math.random() * 1.6; }
    pulses = pulses.filter((p) => { if (ta - p.t0 >= 1.4) { waves.push({ t0: ta }); return false; } return true; });
    waves = waves.filter((w) => ta - w.t0 < 2.4);
  };

  // ---- Coming and going -----------------------------------------------------------------
  const tick = (now) => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    advance(dt);
    draw();
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (running || still) return; running = true; last = 0; raf = requestAnimationFrame(tick); };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  const reset = () => {
    timers.forEach(clearTimeout); timers = [];
    pulses = []; waves = []; ta = 0; fly = null;
    root.classList.remove('is-labelled');
    canvas.style.transition = ''; canvas.style.opacity = ''; Object.values(labels).forEach((el) => { el.style.opacity = ''; });
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  };
  const begin = () => {
    reset();
    if (!layout()) return;
    if (still) { ta = 9; root.classList.add('is-labelled'); draw(); return; }
    ta = -0.2; nextPulse = AMBIENT + 0.3;
    timers.push(setTimeout(() => { if (slide.classList.contains('on')) document.documentElement.classList.add('pa-quiet'); }, 150));
    timers.push(setTimeout(() => root.classList.add('is-labelled'), 1400));
    start();
  };
  const enter = () => {
    armed = true;
    // Grow once the network has reached this slide's node (or soon after, if it never says).
    timers.push(setTimeout(() => { if (armed) { armed = false; begin(); } }, 1500));
  };
  slide.addEventListener('dt-arrive', () => { if (armed && slide.classList.contains('on')) { armed = false; begin(); } });
  // From slide 6: its mink (stack.js paints her on .st-mink) powers up and crosses into this slide's lens.
  // She is read from her canvas at the moment of leaving; slide 6's own copy is hidden while ours flies.
  const stackSlide = document.querySelector('.st-host');
  let stMink = null;
  const showStackMink = () => { if (stMink) { stMink.style.visibility = ''; stMink = null; } };
  const flyIn = () => {
    const el = stackSlide && stackSlide.querySelector('.st-mink');
    if (still || !el) return false;
    const r = el.getBoundingClientRect(), u0 = Math.round(r.width / 23);
    if (!r.width || !u0 || getComputedStyle(el).opacity === '0') return false;
    reset();
    if (!layout()) return false;
    const b = root.getBoundingClientRect(), x = r.left - b.left, y = r.top - b.top, c = { x: x + 11.5 * u0, y: y + 10 * u0 };
    const motes = Array.from({ length: 16 }, () => { const a = Math.random() * TAU, d = (70 + Math.random() * 70) * Math.max(1, u0 / 3); return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, d: Math.random() * 0.25 }; });
    ta = -(FLY.charge + FLY.travel) + 0.95; // the lens finishes tracing as she reaches it
    fly = { t0: ta, x, y, c: u0, motes, landed: ta + FLY.charge + FLY.travel };
    stMink = el; el.style.visibility = 'hidden';
    slide.classList.add('pa-arrive');
    timers.push(setTimeout(() => slide.classList.remove('pa-arrive'), 900));
    timers.push(setTimeout(showStackMink, (FLY.charge + FLY.travel) * 1000 + 200)); // slide 6 has faded away by then
    timers.push(setTimeout(() => { if (slide.classList.contains('on')) document.documentElement.classList.add('pa-quiet'); }, 400));
    timers.push(setTimeout(() => root.classList.add('is-labelled'), (FLY.charge + FLY.travel + 0.4) * 1000));
    nextPulse = AMBIENT + 0.3;
    start();
    return true;
  };
  let wasOn = false;
  const watch = new MutationObserver((records) => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    if (on) {
      const fromStack = stackSlide && !stackSlide.classList.contains('on') && records.some((r) => r.target === stackSlide);
      if (fromStack && flyIn()) return;
      reset(); layout(); draw(); enter();
    } else {
      armed = false; stop(); fly = null; showStackMink(); slide.classList.remove('pa-arrive');
      document.documentElement.classList.remove('pa-quiet');
      timers.push(setTimeout(() => { if (!slide.classList.contains('on')) reset(); }, 700));
    }
  });
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (stackSlide) watch.observe(stackSlide, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : slide.classList.contains('on') && ta > 0 && start()));
  addEventListener('resize', () => { if (slide.classList.contains('on') && layout()) draw(); });
  root.addEventListener('click', (e) => e.stopPropagation());

  // For the next slide: where this slide's core sits, in viewport pixels.
  window.AstridPays = {
    CORE_REF,
    core() {
      if (!lens) layout();
      const b = root.getBoundingClientRect();
      return lens && { x: b.left + lens.c.x, y: b.top + lens.c.y, w: lens.w, h: lens.h, cell };
    },
    // Going on to the foundation, this picture carries on: its core, its builders and everyone else, in viewport pixels.
    snapshot() {
      if (!lens || ta < END) return null;
      const b = root.getBoundingClientRect(), v = (p) => ({ x: b.left + p.x, y: b.top + p.y });
      return {
        core: { ...v(lens.c), w: lens.w, h: lens.h, cell },
        machines: machines.map((m) => ({ ...v(m), r: m.r })),
        people: arcs.flatMap((a) => a.dots).map((d) => ({ ...v(d), r: d.r * Math.max(0.8, k), bright: d.bright })),
        k, lw: LW,
      };
    },
    hide() { // fade out as the next slide's picture takes over
      canvas.style.transition = 'opacity .35s ease'; canvas.style.opacity = '0';
      labels.local.style.opacity = labels.hosted.style.opacity = labels.core.style.opacity = '0';
    },
  };

  if (slide.classList.contains('on')) { wasOn = true; begin(); }
})();
