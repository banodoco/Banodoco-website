// Version F, slide 4: Astrid, as an abstract picture. Above the headline, an
// arch. At its crown two things grow into one: on the left the agent, a
// breathing nucleus of motes; on the right the interface, a window drawn in
// thread whose open side is woven out of the agent's own threads. From the
// agent, hyphae run down to the left and bud round abilities; from the
// interface, down to the right, budding small square panels. Faint motes
// around the outside are the community: every few seconds one sends a bright
// mote along a fresh thread, and a new extension buds where it lands; now and
// then a pulse runs from an extension up into the core, as it is used.
// Arriving from slide 3, the empty "Nothing here — yet" ring flies up and
// becomes the core's seed. Hovering (or tapping) an extension names it.
(() => {
  const root = document.querySelector('[data-astrid-core]');
  if (!root) return;
  const slide = root.closest('.slide');
  const canvas = root.querySelector('.ac-canvas');
  const g = canvas.getContext('2d');
  const html = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gapRoot = document.querySelector('[data-gap]');
  const gapSlide = gapRoot && gapRoot.closest('.slide');
  const ring = gapRoot && gapRoot.querySelector('.gp-empty i');
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const ease = (k) => 1 - Math.pow(1 - k, 2.2); // quick to start, long to settle, like a growing tip
  const smooth = (k) => k * k * (3 - 2 * k);
  const pop = (k) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); // a bud: swells a touch past full
  const THREAD = '240,200,119', NODE = '255,217,145', INK = '239,230,214';
  const TAU = Math.PI * 2;

  // Illustrative community-made extensions, in the order they bud.
  const NAMES = [
    ['Film grain look', 'Wan i2v', 'Lip-sync', 'Upscaler', 'Depth map', 'Style LoRA', 'Beat detection', 'Frame interpolation',
      'Relight', 'Rotoscope', 'Colour match', 'Motion transfer', 'Background removal', 'Face restore', 'Sound effects', 'Inpainting'],
    ['Grade wheels', 'Storyboard view', 'Shot list', 'Mask brush', 'Keyframe curves', 'Audio waveform', 'Camera path', 'Compare wipe',
      'Reference board', 'Onion skin', 'Colour scopes', 'Subtitle track', 'Loop region', 'Lens picker', 'Depth view', 'Shot notes'],
  ];

  // ---- Labels and the card ------------------------------------------------
  const tag = (text) => {
    const el = document.createElement('span');
    el.className = 'ac-ax';
    el.textContent = text;
    root.appendChild(el);
    return el;
  };
  const labels = {
    agent: tag('agent'), face: tag('interface'),
    extA: tag('extends the agent'), extF: tag('extends the interface'),
    comA: tag('community'), comF: tag('community'),
  };
  const card = document.createElement('div');
  card.className = 'ac-card';
  card.setAttribute('aria-hidden', 'true');
  card.innerHTML = '<span class="ac-where">community-made</span><span class="ac-name"></span>';
  root.appendChild(card);

  // A soft light, drawn once and stamped wherever something glows.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 256;
  {
    const sg = glow.getContext('2d');
    const rg = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, `rgba(${NODE},1)`);
    rg.addColorStop(1, `rgba(${NODE},0)`);
    sg.fillStyle = rg;
    sg.fillRect(0, 0, 256, 256);
  }
  const halo = (x, y, r, a) => {
    if (a <= 0.003 || r <= 0) return;
    g.globalAlpha = Math.min(1, a);
    g.drawImage(glow, x - r, y - r, r * 2, r * 2);
    g.globalAlpha = 1;
  };

  // ---- Geometry ------------------------------------------------------------
  // Seeded, so the picture has the same shape on every visit.
  let seed = 1;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
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
    return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, ang: Math.atan2(y1 - y0, x1 - x0), i: lo };
  };
  // The stretch of a line between two distances along it.
  const trace = (h, d0, d1) => {
    if (d1 <= d0) return;
    const a = at(h, d0), b = at(h, d1);
    g.moveTo(a.x, a.y);
    for (let i = a.i; i < b.i; i++) g.lineTo(h.pts[i][0], h.pts[i][1]);
    g.lineTo(b.x, b.y);
  };
  const bez = (p0, c0, c1, p1, n) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x,
      u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y];
  });
  const quarter = (cx, cy, r, a0) => Array.from({ length: 5 }, (_, i) => {
    const a = a0 + (i / 4) * (Math.PI / 2);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const box = (x, y, w, h, r) => [...quarter(x + w - r, y + r, r, -Math.PI / 2), ...quarter(x + w - r, y + h - r, r, 0),
    ...quarter(x + r, y + h - r, r, Math.PI / 2), ...quarter(x + r, y + r, r, Math.PI), [x + w - r, y]];
  const inside = (x, y, r) => x > r.l && x < r.r && y > r.t && y < r.b;

  let W = 0, H = 0, dpr = 1, s = 1, small = false;
  let C, J, A, Ra, F, text, keep, yB, fade = null, play = null;
  let motes = [], web = [], lumps = [0, 0], frame = null, inner = [], weave = [], sides = [], boxes = [];

  // A wandering path through waypoints: a random walk that steers harder as
  // it nears each one, and turns aside from the text.
  const wander = (a, way, o) => {
    const step = o.step, pts = [[a.x, a.y]];
    let x = a.x, y = a.y, k = 0;
    let ang = o.ang ?? Math.atan2(way[0].y - y, way[0].x - x) + (o.rand() - 0.5);
    for (let i = 0; i < 900; i++) {
      const b = way[k], end = k === way.length - 1;
      const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy);
      if (d < step * (end ? 1.5 : 5)) { if (end) { pts.push([b.x, b.y]); break; } k++; continue; }
      const diff = ((Math.atan2(dy, dx) - ang + Math.PI * 3) % TAU) - Math.PI;
      ang += diff * (0.06 + (end ? 0.5 : 0.12) * clamp(1 - d / (240 * s))) + (o.rand() - 0.5) * o.noise;
      if (o.avoid) {
        const nx = x + Math.cos(ang) * 16 * s, ny = y + Math.sin(ang) * 16 * s;
        if (inside(nx, ny, keep)) {
          const away = Math.atan2(ny - (keep.t + keep.b) / 2, nx - (keep.l + keep.r) / 2);
          ang += (((away - ang + Math.PI * 3) % TAU) - Math.PI) * 0.4;
        }
      }
      x += Math.cos(ang) * step; y += Math.sin(ang) * step;
      pts.push([x, y]);
    }
    return pts;
  };
  // A free side-branch: sets off at an angle and curls as it goes.
  const curl = (x, y, ang, length) => {
    const pts = [[x, y]];
    const bend = (rnd() - 0.5) * 0.14, step = 3.5 * s;
    for (let d = 0; d < length; d += step) {
      ang += bend + (rnd() - 0.5) * 0.3;
      x += Math.cos(ang) * step; y += Math.sin(ang) * step;
      pts.push([x, y]);
    }
    return pts;
  };
  const put = (el, x, y, align) => {
    const w = el.offsetWidth, h = el.offsetHeight, l = x - w * align, t = y - h / 2;
    el.style.transform = `translate(${l.toFixed(1)}px, ${t.toFixed(1)}px)`;
    el.style.visibility = '';
    const r = { l: l - 10 * s, t: t - 8 * s, r: l + w + 10 * s, b: t + h + 8 * s };
    boxes.push(r);
    return r;
  };

  // When a trunk's growing tip passes a point d along it (inverse of ease).
  const reach = (h, d) => h.t0 + h.dur * (1 - Math.pow(1 - clamp(d / h.total), 1 / 2.2));

  const layout = () => {
    const b = root.getBoundingClientRect();
    if (!b.width || !b.height) return false;
    W = b.width; H = b.height;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const col = slide.querySelector(':scope > .split > :first-child');
    const tb = col.getBoundingClientRect();
    text = { l: tb.left - b.left, t: tb.top - b.top, r: tb.right - b.left, b: tb.bottom - b.top };
    small = W <= 760;
    s = small ? clamp(W / 560, 0.56, 0.86) : clamp(Math.min(W / 1440, H / 900), 0.62, 1.3);
    seed = 20261015;
    boxes = [];
    Object.values(labels).forEach((el) => { el.style.visibility = 'hidden'; }); // shown once placed
    keep = small ? { l: -1e4, t: text.t - 24 * s, r: 1e4, b: 1e4 } : { l: text.l - 26 * s, t: text.t - 22 * s, r: text.r + 26 * s, b: 1e4 };
    yB = small ? text.t - 40 * s : H - 118;

    // The crown of the arch, centred over the text.
    C = { x: W / 2, y: small ? Math.max(70 + 80 * s, text.t * 0.3) : Math.max(160 * s, text.t * 0.43) };
    Ra = 72 * s;
    A = { x: C.x - 84 * s, y: C.y + 4 * s };
    F = { w: 184 * s, h: 120 * s };
    F.l = C.x - 26 * s; F.r = F.l + F.w; F.t = C.y - F.h / 2 - 2 * s; F.b = F.t + F.h;
    F.x = (F.l + F.r) / 2; F.y = (F.t + F.b) / 2;
    J = { x: C.x - 19 * s, y: C.y };

    // The agent: motes gathered in a soft nucleus, densest at its heart, a few straying past its rim.
    motes = [];
    const count = small ? 120 : 175;
    for (let i = 0; i < count; i++) {
      const th = rnd() * TAU, stray = i < count * 0.08, heart = !stray && i < count * 0.12;
      const u = stray ? 1.0 + rnd() * 0.32 : heart ? 0.05 + rnd() * 0.3 : 0.08 + Math.pow(rnd(), 0.8) * 0.86;
      const hx = A.x + Math.cos(th) * Ra * u, hy = A.y + Math.sin(th) * Ra * u * 0.94;
      motes.push({
        hx, hy, u, heart,
        size: (heart ? 1.7 + rnd() * 0.7 : 0.7 + rnd() * 0.9) * Math.max(0.85, s),
        lum: stray ? 0.18 + rnd() * 0.18 : heart ? 0.9 : (0.34 + 0.5 * (1 - u)) * (0.65 + rnd() * 0.35),
        wx: (1 + rnd() * 3) * s, wy: (1 + rnd() * 3) * s, fx: 0.35 + rnd() * 0.7, fy: 0.35 + rnd() * 0.7, ph: rnd() * TAU,
        t0: 0.08 + 0.5 * clamp(Math.hypot(hx - J.x, hy - J.y) / (Ra * 2.2)) + rnd() * 0.16, x: hx, y: hy, k: 0,
      });
    }
    // The motes keep loose company: threads between close neighbours.
    web = [];
    const links = new Map();
    for (let i = 0; i < motes.length; i++) {
      for (let j = i + 1; j < motes.length; j++) {
        const d = Math.hypot(motes[i].hx - motes[j].hx, motes[i].hy - motes[j].hy);
        if (d > 15 * s || (links.get(i) || 0) > 1 || (links.get(j) || 0) > 1 || rnd() < 0.4) continue;
        web.push([motes[i], motes[j]]);
        links.set(i, (links.get(i) || 0) + 1); links.set(j, (links.get(j) || 0) + 1);
      }
    }
    lumps = [rnd() * TAU, rnd() * TAU];

    // The interface: a window drawn in one thread, which leaves the agent,
    // runs round the frame and goes back in. Its open side is the join.
    const R = 7 * s;
    const P0 = { x: A.x + 26 * s, y: A.y - 26 * s }, P1 = { x: A.x + 22 * s, y: A.y + 30 * s };
    const lt = { x: F.l + 22 * s, y: F.t }, lb = { x: F.l + 22 * s, y: F.b };
    frame = line([
      ...bez(P0, { x: P0.x + 10 * s, y: F.t + 6 * s }, { x: lt.x - 26 * s, y: F.t }, lt, 14),
      ...quarter(F.r - R, F.t + R, R, -Math.PI / 2),
      ...quarter(F.r - R, F.b - R, R, 0),
      ...bez(lb, { x: lb.x - 26 * s, y: F.b }, { x: P1.x + 10 * s, y: F.b - 6 * s }, P1, 14),
    ]);
    fade = g.createLinearGradient(A.x + 8 * s, 0, F.l + 30 * s, 0);
    fade.addColorStop(0, `rgba(${THREAD},0.08)`);
    fade.addColorStop(1, `rgba(${THREAD},1)`);
    // Inside it, only a hint: a preview, a short list, two rows of clips.
    const ix = F.l + 34 * s, ir = F.r - 12 * s;
    inner = [
      { h: line([[F.l + 30 * s, F.t + 13 * s], [F.r - 10 * s, F.t + 13 * s]]), a: 0.24, w: 0.6, t0: 1.0 },
      { h: line(box(ix, F.t + 24 * s, 92 * s, 52 * s, 3 * s)), a: 0.42, w: 0.7, t0: 1.08 },
    ];
    [1, 0.72, 0.86, 0.5].forEach((f, k) => {
      const x0 = ix + 104 * s;
      inner.push({ h: line([[x0, F.t + (27 + k * 8) * s], [x0 + (ir - x0) * f, F.t + (27 + k * 8) * s]]), a: 0.24, w: 0.6, t0: 1.2 + k * 0.05 });
    });
    [F.b - 27 * s, F.b - 18 * s].forEach((y, row) => {
      let x = ix, k = 0;
      while (x < ir - 6 * s) {
        const w = Math.min(ir - x, (row ? 14 : 9) * s + rnd() * 20 * s);
        inner.push({ h: line([[x + 1.2 * s, y], [x + w - 1.2 * s, y]]), a: row ? 0.16 : 0.22, w: 2.4 * s, t0: 1.32 + row * 0.08 + k * 0.025 });
        x += w + 3 * s; k++;
      }
    });
    play = { x0: ix, x1: ir, y0: F.b - 32 * s, y1: F.b - 10 * s };
    // The join: threads from the agent woven into the window's open side.
    weave = [];
    for (let i = 0; i < 18; i++) {
      const th = (rnd() - 0.5) * 2.0, rr = Ra * (0.3 + rnd() * 0.6);
      const p0 = { x: A.x + Math.cos(th) * rr, y: A.y + Math.sin(th) * rr };
      const p1 = { x: F.l + (6 + rnd() * 46) * s, y: F.t + (12 + rnd() * (F.h / s - 24)) * s };
      const k = p1.x - p0.x;
      weave.push({
        h: line(bez(p0, { x: p0.x + k * (0.45 + rnd() * 0.3), y: p0.y + (rnd() - 0.5) * 24 * s },
          { x: p1.x - k * (0.45 + rnd() * 0.3), y: p1.y + (rnd() - 0.5) * 24 * s }, p1, 16)),
        a: 0.12 + rnd() * 0.2, ph: rnd() * TAU, t0: 0.55 + i * 0.04,
      });
    }

    // Labels for the two halves of the core.
    put(labels.agent, A.x - Ra - 18 * s, A.y - Ra * 0.5, 1);
    put(labels.face, F.r + 18 * s, F.t + F.h * 0.26, 0);
    sides = [grow(0), grow(1)];
    return true;
  };

  // Each side's growth: two tapering primaries out of its lobe, one down past
  // the text's shoulder and one out to the side; branches off them that end
  // in buds; and the community gathered round the outside.
  const grow = (i) => {
    const agent = i === 0;
    const X = (x) => (agent ? x : W - x); // written for the left; the right is its mirror
    const sd = { i, agent, trunks: [], curls: [], slots: [], queue: [], n: 0, people: [] };
    const noise = 0.26;
    const rim = (deg) => { const a = (deg * Math.PI) / 180; return { x: A.x + Math.cos(a) * Ra * 0.9, y: A.y + Math.sin(a) * Ra * 0.9, ang: a }; };
    const roots = agent ? [rim(112), rim(152)] : [{ x: F.r - 44 * s, y: F.b, ang: 1.25 }, { x: F.r, y: F.b - 36 * s, ang: 0.45 }];
    // Between the screen's edge and the text's shoulder; on a phone, between the edge and the middle.
    const edge = small ? W / 2 - 30 * s : (agent ? text.l : W - text.r) - 36 * s;
    const xo = small ? 46 * s : clamp(Math.max(80 * s, W * 0.11), 30, edge - 120 * s);
    const ways = small
      ? [[{ x: edge - 0.5 * (edge - xo), y: yB }], [{ x: xo + 0.1 * (edge - xo), y: C.y + 0.62 * (yB - C.y) }]]
      : [[{ x: edge, y: text.t - 46 * s }, { x: edge - 0.22 * (edge - xo), y: yB }],
        [{ x: xo + 0.5 * (edge - xo), y: C.y + 0.36 * (yB - C.y) }, { x: xo, y: C.y + 0.7 * (yB - C.y) }]];
    roots.forEach((r, k) => {
      const h = line(wander(r, ways[k].map((p) => ({ x: X(Math.min(p.x, keep.l - 8 * s + (small ? 1e4 : 0))), y: p.y })), { step: 5 * s, noise, ang: r.ang, rand: rnd, avoid: true }));
      h.t0 = 1.05 + k * 0.16 + (agent ? 0 : 0.08);
      h.dur = clamp(h.total / (400 * s), 0.9, 1.5);
      h.primary = true;
      sd.trunks.push(h);
    });

    // Places for extensions: branches set off forward from the primaries,
    // alternating sides, each ending in a bud; and the primaries' own tips.
    const crowd = small ? 30 * s : 38 * s;
    const core = { l: F.l - 16 * s, t: F.t - 16 * s, r: F.r + 16 * s, b: F.b + 20 * s };
    const ok = (x, y, slots) => x > 16 && x < W - 16 && y > C.y + 24 * s && y < yB + 10 * s && !inside(x, y, keep)
      && Math.hypot(x - A.x, y - A.y) > Ra + 22 * s && !inside(x, y, core)
      && !boxes.some((r) => inside(x, y, r)) && slots.every((o) => Math.hypot(o.x - x, o.y - y) > crowd);
    sd.trunks.forEach((tr) => {
      let flip = agent ? 1 : -1;
      for (let d = (46 + rnd() * 16) * s; d < tr.total - 26 * s; d += (34 + rnd() * 20) * s) {
        const p = at(tr, d);
        flip = -flip;
        for (const len of [(36 + rnd() * 38) * s, 28 * s]) {
          const a = p.ang + flip * (0.5 + rnd() * 0.45);
          const q = { x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len };
          if (!ok(q.x, q.y, sd.slots)) continue;
          const conn = line(wander(p, [q], { step: 3.4 * s, noise: noise * 0.7, ang: a - flip * 0.25, rand: rnd }));
          sd.slots.push({ side: i, agent, x: q.x, y: q.y, trunk: tr, d, conn, born: null, flash: 0 });
          break;
        }
      }
      const e = at(tr, tr.total);
      if (ok(e.x, e.y, sd.slots)) sd.slots.push({ side: i, agent, x: e.x, y: e.y, trunk: tr, d: tr.total, conn: null, born: null, flash: 0 });
    });
    // The side's label: under the arch beside its inner primary (on a phone, below
    // the side), at the first place that is clear of every thread and bud.
    {
      const el = agent ? labels.extA : labels.extF, lw = el.offsetWidth, lh = el.offsetHeight;
      const lines = sd.trunks.flatMap((h) => h.pts).concat(sd.slots.flatMap((x) => (x.conn ? x.conn.pts : [[x.x, x.y]])));
      const fits = (x, y) => { // x: the label's inner end, y: its middle
        const l = agent ? x : x - lw, t = y - lh / 2, pad = 7 * s;
        return l > 10 && l + lw < W - 10 && t + lh < keep.t && !boxes.some((r) => l < r.r && l + lw > r.l && t < r.b && t + lh > r.t)
          && lines.every(([px, py]) => px < l - pad || px > l + lw + pad || py < t - pad || py > t + lh + pad);
      };
      let spot = null;
      if (small) spot = { x: X(14), y: yB + 16 * s };
      for (let f = 0.24; !spot && f < 0.7; f += 0.04) {
        const p = at(sd.trunks[0], sd.trunks[0].total * f);
        for (let o = 16; o < 90; o += 10) { const x = p.x + (agent ? 1 : -1) * o * s; if (fits(x, p.y)) { spot = { x, y: p.y }; break; } }
      }
      if (spot) put(el, spot.x, spot.y, agent ? 0 : 1);
    }
    // A little fuzz along the primaries, away from the buds.
    sd.trunks.forEach((tr) => {
      for (let d = (30 + rnd() * 30) * s; d < tr.total - 14 * s; d += (44 + rnd() * 50) * s) {
        if (sd.slots.some((x) => x.trunk === tr && Math.abs(x.d - d) < 14 * s)) continue;
        const p = at(tr, d);
        const h = line(curl(p.x, p.y, p.ang + (rnd() < 0.5 ? -1 : 1) * (0.7 + rnd() * 0.6), (6 + rnd() * 14) * s));
        h.t0 = reach(tr, d); h.dur = h.total / (90 * s); h.knot = p; h.tip = rnd() < 0.5;
        sd.curls.push(h);
      }
    });
    // Order of growth: nearest the lobe first; five come up on arrival, spread along the side.
    const far = (x) => x.d + (x.conn ? x.conn.total * 0.5 : 0);
    sd.slots.sort((a, b) => far(a) - far(b));
    const cap = small ? 9 : 15;
    while (sd.slots.length > cap) sd.slots.splice(1 + Math.floor((sd.slots.length - 2) * rnd()), 1);
    const n = sd.slots.length;
    const first = [...new Set(Array.from({ length: Math.min(5, n) }, (_, k) => sd.slots[Math.round((k * (n - 1) * 0.86) / 4)]))];
    sd.queue = [...first, ...sd.slots.filter((x) => !first.includes(x))];
    sd.queue.forEach((x, k) => { x.name = NAMES[i][k % NAMES[i].length]; });
    first.forEach((x) => {
      const t = reach(x.trunk, x.d) + 0.04;
      if (x.conn) { x.conn.t0 = t; x.conn.dur = clamp(x.conn.total / (220 * s), 0.25, 0.5); x.born = t + x.conn.dur; } else x.born = t;
    });
    sd.n = first.length;
    sd.slots.forEach((x) => {
      if (x.conn && x.conn.t0 === undefined) x.conn.t0 = null;
      // The way home: back along the bud's own branch and its primary into the lobe.
      const back = [];
      if (x.conn) for (let k = x.conn.pts.length - 1; k >= 0; k--) back.push(x.conn.pts[k]);
      const p = at(x.trunk, x.d);
      back.push([p.x, p.y]);
      for (let k = p.i - 1; k >= 0; k--) back.push(x.trunk.pts[k]);
      x.home = line(back);
    });

    // The community: faint motes round the outside of the arch, mostly low.
    const pts = sd.trunks.flatMap((h) => h.pts.filter((_, k) => k % 3 === 0))
      .concat(sd.slots.flatMap((x) => (x.conn ? x.conn.pts.filter((_, k) => k % 3 === 0) : [[x.x, x.y]])));
    const clear = (x, y, r) => pts.every((p) => Math.hypot(p[0] - x, p[1] - y) > r);
    const want = small ? 8 : 14, reachMax = Math.hypot(W / 2, H);
    const free = (x, y) => {
      const out = Math.hypot(x - C.x, (y - C.y) * 1.25) / reachMax; // how far outside the arch
      return x > 12 && x < W - 12 && y > 24 && y < (small ? text.t - 24 * s : H - 92) && out > (small ? 0.12 : 0.4)
        && clear(x, y, 30 * s) && !inside(x, y, keep) && !boxes.some((r) => inside(x, y, r))
        && !(!small && agent && x < 210 && y > H - 110) && sd.people.every((o) => Math.hypot(o.x - x, o.y - y) > 15 * s);
    };
    // Small gatherings, a few people each, mostly low.
    for (let tries = 0; sd.people.length < want && tries < 600; tries++) {
      const cx = X(16 + rnd() * (W / 2 - (small ? 60 * s : 16))), cy = small ? 40 + rnd() * (C.y - 60 * s - 40) : 30 + rnd() * (H - 30);
      if ((!small && cy < C.y && rnd() < 0.7) || !free(cx, cy) || sd.people.some((o) => Math.hypot(o.x - cx, o.y - cy) < 70 * s)) continue;
      const n = 2 + Math.floor(rnd() * 3);
      for (let k = 0, made = 0; k < 12 && made < n && sd.people.length < want; k++) {
        const a = rnd() * TAU, d = k ? (14 + rnd() * 18) * s : 0, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        if (k && !free(x, y)) continue;
        made++;
        sd.people.push({ x, y, r: (1.3 + rnd() * 0.9) * Math.max(0.85, s), a: y < C.y ? 0.2 + rnd() * 0.1 : 0.3 + rnd() * 0.2,
          ph: rnd() * TAU, f: 0.4 + rnd() * 0.6, lit: -9, t0: 2.2 + rnd() * 0.9 });
      }
    }
    const low = small ? sd.people : sd.people.filter((p) => p.y > C.y + 0.3 * (yB - C.y));
    if (low.length) {
      const top = low.reduce((a, b) => (b.y < a.y ? b : a));
      if (small) put(agent ? labels.comA : labels.comF, X(14), top.y - 18 * s, agent ? 0 : 1); // in the corners
      else put(agent ? labels.comA : labels.comF, Math.min(W - 16, Math.max(16, top.x + (agent ? -6 : 6) * s)), top.y - 18 * s, agent ? 0 : 1);
    }
    return sd;
  };

  // ---- Time ---------------------------------------------------------------
  // One clock, ta, in seconds from the moment the core blooms. The arrival
  // runs faster on revisits; after it, everything runs in real time.
  const END = 3.6, AMBIENT = 4.2, LABELS = 2.8;
  let ta = 0, pace = 1, visits = 0, running = false, loop = 0, last = 0, timers = [];
  let sends = [], pulses = [], sparks = [], flare = [0, 0], nextSend = 0, nextUse = 0, nextSpark = 0, turn = 0;
  let hot = null, pinned = null, pointer = null, touched = false, seedEl = null, labelled = false;

  const born = (x) => x.born !== null && ta >= x.born;
  const send = () => {
    // Alternate sides, now and then twice running; land on the next free place.
    turn = Math.random() < 0.75 ? 1 - turn : turn;
    let sd = sides[turn];
    let x = sd.queue[sd.n];
    if (!x) { sd = sides[1 - turn]; x = sd.queue[sd.n]; }
    const fresh = !!x;
    if (!x) { // all grown: the community keeps improving what is there
      const all = sides.flatMap((o) => o.slots.filter(born));
      x = all[Math.floor(Math.random() * all.length)];
      if (!x) return;
      sd = sides[x.side];
    } else sd.n++;
    const near = sd.people.slice().sort((a, b) => Math.hypot(a.x - x.x, a.y - x.y) - Math.hypot(b.x - x.x, b.y - x.y)).slice(0, 4);
    const p = near[Math.floor(Math.random() * near.length)];
    if (!p) return;
    const path = line(wander(p, [x], { step: 5 * s, noise: 0.4, rand: Math.random, avoid: true }));
    p.lit = ta;
    sends.push({ p, x, fresh, path, t0: ta + 0.45, dur: clamp(path.total / (150 * s), 1.1, 2.6) });
  };
  const use = (x) => {
    if (!x) {
      const all = sides.flatMap((o) => o.slots.filter(born));
      x = all[Math.floor(Math.random() * all.length)];
    }
    if (x && pulses.length < 3) pulses.push({ h: x.home, t0: ta, side: x.side });
  };

  const advance = (dt) => {
    ta += ta >= 0 && ta < END ? dt / pace : dt;
    flare = flare.map((f) => f * Math.exp(-dt / 0.9));
    if (!labelled && ta >= LABELS) { labelled = true; root.classList.add('is-labelled'); }
    if (seedEl && ta >= 0) { seedEl.remove(); seedEl = null; if (ring) ring.style.visibility = ''; }
    if (ta < AMBIENT) return;
    if (ta >= nextSend) { send(); nextSend = ta + (sides.some((o) => o.n < o.queue.length) ? 3.4 + Math.random() * 1.8 : 8 + Math.random() * 4); }
    if (ta >= nextUse) { use(); nextUse = ta + 4.2 + Math.random() * 3.4; }
    if (ta >= nextSpark) { sparks.push({ w: weave[Math.floor(Math.random() * weave.length)], t0: ta, back: Math.random() < 0.4 }); nextSpark = ta + 0.9 + Math.random() * 1.3; }
    sends = sends.filter((sn) => {
      const end = sn.t0 + sn.dur;
      if (!sn.landed && ta >= end) {
        sn.landed = true;
        const x = sn.x;
        if (sn.fresh) {
          x.born = ta;
          if (x.conn) { x.conn.t0 = ta + 0.12; x.conn.dur = 0.55; x.conn.rev = true; }
        } else x.flash = 1;
        timers.push(setTimeout(() => use(x), 900));
      }
      return ta < end + 2.8;
    });
    pulses = pulses.filter((pl) => {
      if ((ta - pl.t0) * 230 * s < pl.h.total) return true;
      flare[pl.side] = 1;
      return false;
    });
    sparks = sparks.filter((sp) => ta - sp.t0 < 1.2);
    sides.forEach((sd) => sd.slots.forEach((x) => { if (x.flash) x.flash = Math.max(0, x.flash - dt / 1.4); }));
  };

  // ---- Drawing --------------------------------------------------------------
  const stroke = (h, d0, d1, width, color, a) => {
    if (a <= 0.003 || d1 <= d0) return;
    g.lineWidth = width;
    g.strokeStyle = `rgba(${color},${Math.min(1, a).toFixed(3)})`;
    g.beginPath(); trace(h, d0, d1); g.stroke();
  };
  // A hypha growing out from its start (or back from its end), its tip lit,
  // glowing a moment after it arrives and then settling.
  const hypha = (h, width, alpha, big) => {
    if (h.t0 === null || h.t0 === undefined) return;
    const k = clamp((ta - h.t0) / h.dur);
    if (k <= 0) return;
    const grown = h.total * ease(k);
    const fresh = k < 1 ? 1 : Math.exp(-(ta - h.t0 - h.dur) / 0.8);
    const d0 = h.rev ? h.total - grown : 0, d1 = h.rev ? h.total : grown;
    if (h.primary) { // thick at the lobe, fine at the tip
      g.lineCap = 'butt';
      for (let d = 0, step = 24 * s; d < grown; d += step) {
        const u = (d + step / 2) / h.total;
        stroke(h, d, Math.min(grown, d + step), width * (1.75 - 1.1 * u), THREAD, alpha * (1 + 0.5 * fresh) * (1.3 - 0.6 * u));
      }
      g.lineCap = 'round';
    } else stroke(h, d0, d1, width, THREAD, alpha * (1 + 0.5 * fresh));
    if (k >= 1) return;
    const tip = h.rev ? d0 : d1;
    stroke(h, h.rev ? tip : Math.max(0, tip - 40 * s), h.rev ? Math.min(h.total, tip + 40 * s) : tip, width + 0.5, NODE, alpha * 1.7);
    const p = at(h, tip);
    halo(p.x, p.y, (big ? 9 : 4.5) * s, big ? 0.75 : 0.5);
  };
  const dot = (x, y, r, color, a) => {
    if (a <= 0.003) return;
    g.fillStyle = `rgba(${color},${Math.min(1, a).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  };

  const draw = () => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!sides.length) return;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const breath = Math.sin(ta * 1.14);
    const core = clamp(ta / 1.4);

    // The warmth of the core, and the seed it grew from.
    halo(C.x + 10 * s, C.y, 200 * s, (0.05 + 0.012 * breath) * core);
    halo(J.x, J.y, 58 * s, (0.1 + 0.035 * breath + 0.05 * (flare[0] + flare[1])) * core);
    if (ta > -0.3 && ta < 1.2) {
      const a = ta < 0 ? (seedEl ? 0 : clamp((ta + 0.3) / 0.3)) : 1 - clamp((ta - 0.25) / 0.8);
      halo(J.x, J.y, 11 * s, 0.6 * a);
      dot(J.x, J.y, 3 * s, NODE, a);
    }
    if (ta >= 0 && ta < 1) {
      const e = clamp(ta / 1);
      halo(J.x, J.y, (8 + 56 * (1 - Math.pow(1 - e, 3))) * s, 0.32 * (1 - e));
    }
    if (ta <= 0) return;

    // The join: threads woven between the two, swaying a little.
    g.lineWidth = 0.55;
    for (const w of weave) {
      const k = clamp((ta - w.t0) / 0.7);
      if (k <= 0) continue;
      const n = w.h.pts.length - 1, upto = Math.round(smooth(k) * n), sway = Math.sin(ta * 0.8 + w.ph) * 2.6 * s;
      g.strokeStyle = `rgba(${THREAD},${(w.a * (1 + 0.4 * (flare[0] + flare[1]))).toFixed(3)})`;
      g.beginPath();
      for (let j = 0; j <= upto; j++) {
        const [x, y] = w.h.pts[j], off = Math.sin((Math.PI * j) / n) * sway;
        j ? g.lineTo(x, y + off) : g.moveTo(x, y + off);
      }
      g.stroke();
    }
    for (const sp of sparks) {
      const k = clamp((ta - sp.t0) / 1.2), e = smooth(sp.back ? 1 - k : k);
      const n = sp.w.h.pts.length - 1, j = Math.min(n, Math.floor(e * n)), [x, y] = sp.w.h.pts[j];
      const off = Math.sin((Math.PI * j) / n) * Math.sin(ta * 0.8 + sp.w.ph) * 2.6 * s;
      halo(x, y + off, 5 * s, 0.5 * Math.sin(Math.PI * k));
    }

    // The interface: its frame in one thread, then the hints inside.
    const fl = 1 + 0.6 * flare[1];
    const kf = clamp((ta - 0.35) / 1.1);
    if (kf > 0) {
      g.strokeStyle = fade;
      g.lineWidth = 0.95;
      g.globalAlpha = Math.min(1, 0.58 * fl);
      const d = frame.total * smooth(kf);
      g.beginPath(); trace(frame, 0, d); g.stroke();
      for (const it of inner) {
        const k = clamp((ta - it.t0) / 0.5);
        if (k <= 0) continue;
        g.globalAlpha = Math.min(1, it.a * fl);
        g.lineWidth = it.w;
        g.beginPath(); trace(it.h, 0, it.h.total * smooth(k)); g.stroke();
      }
      g.globalAlpha = 1;
      if (kf < 1) { const p = at(frame, d); halo(p.x, p.y, 8 * s, 0.7); }
      const u = (ta * 0.05 + 0.18) % 1, pa = 0.5 * clamp((ta - 1.6) / 0.6) * smooth(clamp(u / 0.06)) * smooth(clamp((1 - u) / 0.06));
      if (pa > 0) {
        const x = play.x0 + (play.x1 - play.x0) * u;
        g.strokeStyle = `rgba(${NODE},${(pa * fl).toFixed(3)})`;
        g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(x, play.y0); g.lineTo(x, play.y1); g.stroke();
      }
    }

    // The agent: a nucleus of motes that gathers out of the seed and breathes,
    // held in a soft membrane that lies open towards the window.
    const fa = 1 + 0.7 * flare[0];
    halo(A.x, A.y, Ra * 1.25, (0.09 + 0.02 * breath) * core * fa);
    const km = clamp((ta - 0.3) / 1.1);
    if (km > 0) {
      const br = 1 + 0.035 * Math.sin(ta * 1.14), open = 0.66, span = Math.PI - open, N = 64, grown = smooth(km) * span;
      const rad = (th) => Ra * 1.07 * br * (1 + 0.05 * Math.sin(3 * th + lumps[0] + 0.3 * Math.sin(ta * 0.4)) + 0.03 * Math.sin(5 * th - lumps[1] + ta * 0.17));
      g.lineCap = 'butt';
      g.lineWidth = 0.85;
      for (let k = 0; k < N; k++) {
        const t0 = -span + (2 * span * k) / N, t1 = t0 + (2 * span) / N, mid = (t0 + t1) / 2;
        if (span - Math.abs(mid) > grown) continue;
        const a = 0.4 * fa * smooth(clamp((span - Math.abs(mid)) / 0.7));
        if (a < 0.004) continue;
        g.strokeStyle = `rgba(${THREAD},${a.toFixed(3)})`;
        g.beginPath();
        for (let j = 0; j <= 3; j++) {
          const th = Math.PI + t0 + ((t1 - t0) * j) / 3, r = rad(th);
          const x = A.x + Math.cos(th) * r, y = A.y + Math.sin(th) * r * 0.94;
          j ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
      g.lineCap = 'round';
    }
    for (const m of motes) {
      const k = clamp((ta - m.t0) / 0.9);
      const br = 1 + 0.045 * Math.sin(ta * 1.14 - m.u * 1.8);
      const hx = A.x + (m.hx - A.x) * br + m.wx * Math.sin(ta * m.fx + m.ph);
      const hy = A.y + (m.hy - A.y) * br + m.wy * Math.cos(ta * m.fy + m.ph * 1.3);
      const e = 1 - Math.pow(1 - k, 3);
      m.x = J.x + (hx - J.x) * e; m.y = J.y + (hy - J.y) * e; m.k = k;
    }
    g.lineWidth = 0.5;
    for (const [a, b] of web) {
      const d = Math.hypot(a.x - b.x, a.y - b.y), al = 0.16 * clamp(1 - d / (24 * s)) * Math.min(a.k, b.k) * fa;
      if (al <= 0.004) continue;
      g.strokeStyle = `rgba(${THREAD},${al.toFixed(3)})`;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    for (const m of motes) {
      if (m.k <= 0) continue;
      const tw = m.heart ? 0.85 + 0.15 * Math.sin(ta * 1.7 + m.ph) : 1;
      if (m.heart) halo(m.x, m.y, 7 * s, 0.22 * m.k * fa);
      dot(m.x, m.y, m.size, NODE, m.lum * tw * m.k * fa);
    }

    // The extensions' hyphae: trunks, fuzz, and each bud's own thread.
    for (const sd of sides) {
      for (const h of sd.trunks) hypha(h, 0.95, 0.5, true);
      for (const h of sd.curls) {
        hypha(h, 0.6, 0.3, false);
        if (h.tip && ta > h.t0 + h.dur) { const p = h.pts[h.pts.length - 1]; dot(p[0], p[1], 1.1, NODE, 0.4); }
        if (ta > h.t0) dot(h.knot.x, h.knot.y, 1.15, NODE, 0.45);
      }
      for (const x of sd.slots) if (x.conn) hypha(x.conn, 0.75, 0.42, false);
    }
    // A hovered extension shows its way into the core.
    const shown = pinned || hot;
    if (shown) stroke(shown.home, 0, shown.home.total, 1, NODE, 0.42);

    // The community, and what it sends.
    for (const sd of sides) {
      for (const p of sd.people) {
        const lit = clamp(1 - Math.abs(ta - p.lit - 0.3) / 0.6);
        const a = p.a * (0.8 + 0.2 * Math.sin(ta * p.f + p.ph)) * clamp((ta - p.t0) / 1.1);
        halo(p.x, p.y, 7 * s, a * 0.3);
        dot(p.x, p.y, p.r, INK, a + lit * 0.6);
        if (lit > 0) halo(p.x, p.y, 11 * s, 0.5 * lit);
      }
    }
    for (const sn of sends) {
      if (ta < sn.t0) continue;
      const k = clamp((ta - sn.t0) / sn.dur), d = sn.path.total * smooth(k);
      const a = k < 1 ? 1 : clamp(1 - (ta - sn.t0 - sn.dur) / 2.6);
      stroke(sn.path, 0, d, 0.6, THREAD, 0.3 * a);
      if (k < 1) {
        stroke(sn.path, Math.max(0, d - 36 * s), d, 1, NODE, 0.6);
        const p = at(sn.path, d);
        halo(p.x, p.y, 9 * s, 0.75);
        dot(p.x, p.y, 1.6 * s, NODE, 0.95);
      }
    }

    // The extensions themselves: round abilities on the left, square panels on the right.
    for (const sd of sides) {
      for (const x of sd.slots) {
        if (!born(x)) continue;
        const k = clamp((ta - x.born) / 0.55), sc = k < 1 ? Math.max(0.01, pop(k)) : 1;
        const lit = 1 + 0.35 * flare[x.side] + (x === shown ? 0.6 : 0) + x.flash;
        if (k < 1) halo(x.x, x.y, (6 + 26 * k) * s, 0.5 * (1 - k));
        if (x.flash) halo(x.x, x.y, (10 + 20 * (1 - x.flash)) * s, 0.4 * x.flash);
        halo(x.x, x.y, 12 * s, 0.2 * lit);
        if (sd.agent) {
          const r = 3.1 * s * sc;
          dot(x.x, x.y, r, NODE, 0.92);
          dot(x.x - r * 0.25, x.y - r * 0.3, r * 0.45, '255,241,207', 0.8);
        } else {
          const q = 8.6 * s * sc, rr = 2 * s * sc;
          g.beginPath(); g.roundRect(x.x - q / 2, x.y - q / 2, q, q, rr);
          g.fillStyle = `rgba(${NODE},${(0.3 * lit).toFixed(3)})`; g.fill();
          g.strokeStyle = `rgba(${NODE},0.9)`; g.lineWidth = 1; g.stroke();
        }
        if (x === shown) {
          g.strokeStyle = `rgba(${NODE},0.7)`; g.lineWidth = 0.8;
          g.beginPath();
          if (sd.agent) g.arc(x.x, x.y, 8 * s, 0, TAU); else g.roundRect(x.x - 8 * s, x.y - 8 * s, 16 * s, 16 * s, 3.5 * s);
          g.stroke();
        }
      }
    }
    // Being used: a pulse runs from an extension home into the core.
    for (const pl of pulses) {
      const d = (ta - pl.t0) * 230 * s;
      stroke(pl.h, Math.max(0, d - 30 * s), d, 1.1, NODE, 0.55);
      const p = at(pl.h, d);
      halo(p.x, p.y, 7 * s, 0.6);
    }
  };

  // ---- Coming and going -------------------------------------------------------
  const frameLoop = (id) => {
    const tick = (now) => {
      if (id !== loop || !running) return;
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      advance(dt);
      draw();
    };
    requestAnimationFrame(tick);
  };
  const start = () => {
    if (running || still || waiting || document.hidden || !slide.classList.contains('on')) return;
    running = true; last = 0;
    frameLoop(++loop);
  };
  const stop = () => { running = false; loop++; };

  const dropSeed = () => {
    if (seedEl) { seedEl.remove(); seedEl = null; }
    if (ring) ring.style.visibility = '';
  };
  // From slide 3: the empty ring lifts off the chart and flies up to become the seed.
  const FLIGHT = 1.0;
  const launch = () => {
    if (!ring) return false;
    const r = ring.getBoundingClientRect(), b = root.getBoundingClientRect();
    if (!r.width) return false;
    const from = { x: r.left + r.width / 2, y: r.top + r.height / 2 }, to = { x: b.left + J.x, y: b.top + J.y };
    const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const c = { x: (from.x + to.x) / 2 + ((to.y - from.y) / d) * d * 0.22, y: (from.y + to.y) / 2 - ((to.x - from.x) / d) * d * 0.22 };
    seedEl = document.createElement('div');
    seedEl.className = 'ac-seed';
    seedEl.setAttribute('aria-hidden', 'true');
    seedEl.innerHTML = '<i></i><b></b>';
    document.body.appendChild(seedEl);
    ring.style.visibility = 'hidden';
    const steps = 24;
    seedEl.animate(Array.from({ length: steps + 1 }, (_, k) => {
      const t = smooth(k / steps), u = 1 - t;
      const x = u * u * from.x + 2 * u * t * c.x + t * t * to.x, y = u * u * from.y + 2 * u * t * c.y + t * t * to.y;
      return { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` };
    }), { duration: FLIGHT * 1000, fill: 'forwards' });
    seedEl.querySelector('i').animate([
      { transform: 'scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'scale(.55) rotate(50deg)', opacity: 0.9, offset: 0.55 },
      { transform: 'scale(.12) rotate(90deg)', opacity: 0 },
    ], { duration: FLIGHT * 1000, easing: 'ease-in', fill: 'forwards' });
    seedEl.querySelector('b').animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(.6)', offset: 0.45 }, { opacity: 1, transform: 'scale(1)' }],
      { duration: FLIGHT * 1000, fill: 'forwards' });
    return true;
  };

  const reset = () => {
    timers.forEach(clearTimeout);
    if (!slide.classList.contains('on')) html.classList.remove('ac-quiet');
    timers = [];
    dropSeed();
    sends = []; pulses = []; sparks = []; flare = [0, 0];
    labelled = false;
    root.classList.remove('is-labelled');
    hot = pinned = null;
    card.classList.remove('is-on');
    slide.style.cursor = '';
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
  };
  // Everything grown at once: for reduced motion, and after a resize.
  const settle = (n) => {
    ta = Math.max(ta, AMBIENT);
    sides.forEach((sd, i) => {
      sd.n = Math.min(sd.queue.length, n[i]);
      sd.queue.forEach((x, k) => {
        if (k >= sd.n) return;
        x.born = -100;
        if (x.conn) { x.conn.t0 = -100; x.conn.dur = 0.5; }
      });
    });
    labelled = true;
    root.classList.add('is-labelled');
  };

  let waiting = null;
  const begin = (fromGap) => {
    reset();
    if (!layout()) return;
    visits++;
    if (still) { ta = 0; settle([9, 9]); draw(); return; }
    pace = visits > 1 ? 0.65 : 1;
    if (fromGap && launch()) { pace = 1; ta = -FLIGHT; } else ta = -(visits > 1 ? 0.2 : 0.4);
    nextSend = AMBIENT + 0.5; nextUse = AMBIENT + 2.2; nextSpark = 1.6;
    // Once the network has reached this slide's node, the threads it left behind quieten under the picture.
    timers.push(setTimeout(() => { if (slide.classList.contains('on')) html.classList.add('ac-quiet'); }, (fromGap ? 1.5 : 1.3) * 1000));
    start();
  };
  const enter = (fromGap) => {
    // On a first load the Mycelial mark plays first; grow once it has landed.
    if (html.classList.contains('dt-intro')) {
      if (waiting) return;
      waiting = new MutationObserver(() => {
        if (html.classList.contains('dt-intro')) return;
        waiting.disconnect(); waiting = null;
        if (slide.classList.contains('on')) begin(false);
      });
      waiting.observe(html, { attributes: true, attributeFilter: ['class'] });
      return;
    }
    // Labels and the text are measured, so lay out once the fonts are in (the ring cannot wait).
    if (document.fonts && document.fonts.status !== 'loaded' && !fromGap) {
      document.fonts.ready.then(() => { if (slide.classList.contains('on') && !running) begin(false); });
      return;
    }
    begin(fromGap);
  };
  const leave = () => {
    stop();
    html.classList.remove('ac-quiet');
    dropSeed();
    if (waiting) { waiting.disconnect(); waiting = null; }
    hot = pinned = null;
    card.classList.remove('is-on');
    slide.style.cursor = '';
    // The stage fades with the slide's other content; clear it once out of sight.
    timers.push(setTimeout(() => { if (!slide.classList.contains('on')) reset(); }, 700));
  };

  let wasOn = false;
  const watch = new MutationObserver((records) => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    if (!on) { leave(); return; }
    const fromGap = !still && gapSlide && !gapSlide.classList.contains('on') && records.some((r) => r.target === gapSlide);
    enter(!!fromGap);
  });
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (gapSlide) watch.observe(gapSlide, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  let resizing = 0;
  addEventListener('resize', () => {
    clearTimeout(resizing);
    resizing = setTimeout(() => {
      if (!slide.classList.contains('on') || !sides.length) return;
      const n = sides.map((sd) => sd.n);
      sends = []; pulses = []; sparks = [];
      dropSeed();
      if (!layout()) return;
      settle(n);
      hot = pinned = null;
      card.classList.remove('is-on');
      draw();
    }, 120);
  });

  // ---- Hovering ------------------------------------------------------------
  const local = (e) => { const b = root.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  const pick = (p, r) => {
    let best = null, bd = r * r;
    for (const sd of sides) {
      for (const x of sd.slots) {
        if (!born(x)) continue;
        const d = (x.x - p.x) ** 2 + (x.y - p.y) ** 2;
        if (d < bd) { bd = d; best = x; }
      }
    }
    return best;
  };
  const show = () => {
    const x = pinned || hot;
    card.classList.toggle('is-on', !!x);
    slide.style.cursor = hot ? 'pointer' : '';
    if (still) draw();
    if (!x) return;
    card.querySelector('.ac-name').textContent = x.name;
    card.style.setProperty('--c', x.agent ? '#e0ab5e' : '#f3d9a8');
    // Open toward the middle, clear of the edge.
    const gap = 14 * s, left = x.agent;
    const px = left ? x.x + gap : x.x - gap;
    card.style.transform = `translate(${px.toFixed(1)}px, ${x.y.toFixed(1)}px) translate(${left ? 0 : -100}%, -50%)`;
  };
  slide.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || !sides.length || !slide.classList.contains('on')) return;
    pointer = local(e);
    const h = pick(pointer, 15 * Math.max(1, s));
    if (h !== hot) { hot = h; show(); }
  });
  slide.addEventListener('pointerleave', () => { pointer = null; if (hot) { hot = null; show(); } });
  slide.addEventListener('pointerdown', (e) => { touched = e.pointerType === 'touch'; });
  // Clicks and taps on an extension (or the core) stay here; they never turn the slide.
  slide.addEventListener('click', (e) => {
    if (!sides.length) return;
    const p = local(e);
    const x = pick(p, (touched ? 26 : 15) * Math.max(1, s));
    if (x) { e.stopPropagation(); pinned = pinned === x ? null : x; show(); return; }
    const inCore = Math.hypot(p.x - A.x, p.y - A.y) < Ra || inside(p.x, p.y, { l: F.l, t: F.t, r: F.r, b: F.b });
    if (inCore) { e.stopPropagation(); if (!still && ta > END) { const all = sides.flatMap((o) => o.slots.filter(born)); use(all[Math.floor(Math.random() * all.length)]); } return; }
    if (pinned) { e.stopPropagation(); pinned = null; show(); }
  });

  if (slide.classList.contains('on')) { wasOn = true; enter(false); }
})();
