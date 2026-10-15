// Version F, slide 8: how it pays. Above the text, in the deck's gold-thread
// language: on the left a few machines running Astrid locally (a terminal, a
// GPU, a node graph), the nerds who build on it; their threads converge into
// the core, slide 4's lens with the mink inside; past a dotted boundary, the
// core reaches out across widening arcs to a great many people, everyone else,
// on the hosted version. Pulses run from the builders into the core, and from
// the core outward, wave after wave.
// The core's position and size are kept as data (window.AstridPays.core()) so
// slide 7 can end on exactly this core.
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
  let W = 0, H = 0, dpr = 1, k = 1, ox = 0, oy = 0, LW = 1, small = false;
  const X = (rx) => ox + (rx - 836) * k, Y = (ry) => oy + (ry - 415) * k, P = (rx, ry) => ({ x: X(rx), y: Y(ry) });
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
    // The picture spans reference y 70..760 and x 150..1600; it sits above the label.
    // The picture spans reference x 150..1580; keep at least 64 px clear at each side.
    k = small ? Math.min((W - 24) / 1430, (top - 60) / 690) : Math.min((W - 128) / 1430, (top - 30) / 690, 1.15);
    ox = W / 2 - 29 * k; // the picture's middle (reference x 865) on the slide's middle
    oy = small ? Math.max(40 + 345 * k, top * 0.5) : top - 24 * k + (415 - 740) * k; // on a phone, centred in the room above the text
    LW = Math.max(0.75, Math.min(1.15, k * 1.1));
    seed = 20261015;
    // The builders' machines, and their threads into the core's left side.
    const lensL = P(CORE_REF.cx - CORE_REF.w / 2, CORE_REF.cy), lensR = P(CORE_REF.cx + CORE_REF.w / 2, CORE_REF.cy);
    machines = [[213, 277, 'term'], [213, 424, 'gpu'], [213, 570, 'graph']].map(([x, y, kind], i) => ({ ...P(x, y), r: 52 * k, kind, i }));
    feeds = machines.map((m, i) => {
      const end = { x: lensL.x + 2 * k, y: lensL.y + (i - 1) * 12 * k };
      const start = { x: m.x + m.r, y: m.y };
      const dx = end.x - start.x;
      const h = line(bez(start, { x: start.x + dx * 0.4, y: start.y }, { x: end.x - dx * 0.4, y: end.y }, end, 48));
      h.nodes = [0.3, 0.68].map((f) => f * h.total);
      return h;
    });
    // The core: three strands of a lens, nodes at its tips and on its sides.
    lens = { c: P(CORE_REF.cx, CORE_REF.cy), w: CORE_REF.w * k, h: CORE_REF.h * k };
    // The boundary: hosted begins past this line.
    boundary = { x: X(836), y0: Y(120), y1: Y(705) };
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
    cell = small ? 1 : Math.max(2, Math.round(3 * k));
    // Labels.
    labels.local.style.fontSize = labels.hosted.style.fontSize = `${Math.max(small ? 10.5 : 13, 23 * k).toFixed(1)}px`;
    labels.core.style.fontSize = `${Math.max(small ? 11 : 14, 25 * k).toFixed(1)}px`;
    put(labels.local, X(150), Y(168), 0, 0.5);
    put(labels.hosted, X(1170), Y(118), 0.5, 0.5);
    put(labels.core, X(CORE_REF.cx + 4), Y(CORE_REF.cy - CORE_REF.h / 2 - 40), 0.5, 0.5);
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
  const paintMink = (x, y, a) => { // the real pixel mink, crisp, centred on (x, y)
    if (a <= 0) return;
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
    pulses = []; waves = []; ta = 0;
    root.classList.remove('is-labelled');
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
  let wasOn = false;
  new MutationObserver(() => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    if (on) { reset(); layout(); draw(); enter(); }
    else { armed = false; stop(); document.documentElement.classList.remove('pa-quiet'); timers.push(setTimeout(() => { if (!slide.classList.contains('on')) reset(); }, 700)); }
  }).observe(slide, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : slide.classList.contains('on') && ta > 0 && start()));
  addEventListener('resize', () => { if (slide.classList.contains('on') && layout()) draw(); });
  root.addEventListener('click', (e) => e.stopPropagation());

  // For slide 7: where this slide's core sits, in viewport pixels, so it can end on exactly this core.
  window.AstridPays = {
    CORE_REF,
    core() {
      if (!lens) layout();
      const b = root.getBoundingClientRect();
      return lens && { x: b.left + lens.c.x, y: b.top + lens.c.y, w: lens.w, h: lens.h, cell };
    },
  };

  if (slide.classList.contains('on')) { wasOn = true; begin(); }
})();
