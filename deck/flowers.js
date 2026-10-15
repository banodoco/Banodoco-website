// Version F, slide 8: a thousand flowers. Astrid isn't just one app: it is a
// foundation. Above the text the core sits on the stack it is built from (a
// few thin plates), and from it, on rising threads like stems, app after app
// grows up and out: an anime studio, a drawing app, music videos and so on,
// each with a small community gathered round it, and beyond them a haze of
// thousands more. Now and then the core feeds an app (a pulse up its stem)
// and its community brightens.
// Going on from slide 7 the picture carries on: the core glides to the
// middle, the builders' machines settle under it as its foundation, and the
// many people of the hosted field drift up to gather round the apps.
(() => {
  const root = document.querySelector('[data-astrid-flowers]');
  const M = window.AstridMink;
  if (!root || !M) return;
  const slide = root.closest('.slide');
  const canvas = root.querySelector('.fl-canvas');
  const g = canvas.getContext('2d');
  const html = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const easeIO = (q) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
  const smooth = (q) => q * q * (3 - 2 * q);
  const lerp = (a, b, q) => a + (b - a) * q;
  const THREAD = '240,200,119', NODE = '255,217,145', CORE = '255,241,214';
  const TAU = Math.PI * 2;

  // Illustrative apps, the kinds of niche the community could build on Astrid.
  const APPS = [
    { name: 'Anime studio', glyph: 'anime' },
    { name: 'Drawing to motion', glyph: 'pencil' },
    { name: 'Music videos', glyph: 'note' },
    { name: 'Live VJ sets', glyph: 'bars' },
    { name: 'Storytelling', glyph: 'book' },
    { name: 'Archive film', glyph: 'reel' },
    { name: 'Game cinematics', glyph: 'pad' },
    { name: 'Explainers', glyph: 'bulb' },
    { name: 'Brand content', glyph: 'tag' },
  ];
  const labelEls = APPS.map((a) => {
    const el = document.createElement('span');
    el.className = 'fl-ax';
    el.textContent = a.name;
    root.appendChild(el);
    return el;
  });
  const coreLabel = document.createElement('span');
  coreLabel.className = 'fl-ax fl-core';
  coreLabel.textContent = 'Astrid';
  root.appendChild(coreLabel);

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
  const bez = (p0, c0, c1, p1, n = 36) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x, u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y];
  });

  // ---- Geometry: reference units (1672 x 941), the core at (836, 610), scaled by k about it ----------
  let W = 0, H = 0, dpr = 1, k = 1, ox = 0, oy = 0, LW = 1, small = false, cell = 3;
  const X = (rx) => ox + (rx - 836) * k, Y = (ry) => oy + (ry - 610) * k, P = (rx, ry) => ({ x: X(rx), y: Y(ry) });
  let seed = 1;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  let core = null, plates = [], apps = [], haze = [];

  const put = (el, x, y, ax, ay, size) => {
    if (size) el.style.fontSize = `${size.toFixed(1)}px`;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.transform = `translate(${(x - w * ax).toFixed(1)}px, ${(y - h * ay).toFixed(1)}px)`;
  };
  const layout = () => {
    const b = root.getBoundingClientRect();
    if (!b.width || !b.height) return false;
    W = b.width; H = b.height;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    small = W <= 760;
    const top = slide.querySelector('.num').getBoundingClientRect().top - b.top;
    // The picture spans reference x 230..1442 (with labels) and y 70..760; keep 40 px clear above it.
    k = small ? Math.min((W - 24) / 1212, (top - 50) / 690) : Math.min((W - 128) / 1212, (top - 64) / 690, 1.15);
    ox = W / 2;
    oy = small ? top / 2 + 160 * k : top - 34 * k - (760 - 610) * k;
    LW = Math.max(0.75, Math.min(1.15, k * 1.1));
    cell = small ? 1 : Math.max(2, Math.round(3 * k));
    seed = 20261016;
    core = { ...P(836, 610), w: 118 * k, h: 190 * k };
    // The foundation: the stack it is built from, a few thin plates under the core.
    plates = [0, 1, 2, 3].map((i) => ({ y: Y(712 + i * 15), w: (158 - i * 4) * k, t0: 0.25 + (3 - i) * 0.08 }));
    // The apps, on rising stems.
    const ANG = [-166, -146, -126, -107, -90, -73, -54, -34, -14], RAD = [500, 430, 500, 415, 470, 415, 500, 430, 500];
    apps = APPS.map((a, i) => {
      const th = (ANG[i] * Math.PI) / 180, r = RAD[i];
      const p = P(836 + Math.cos(th) * r, 610 + Math.sin(th) * r * 0.97);
      const start = { x: core.x + Math.cos(th) * core.w * 0.12, y: core.y - core.h * 0.42 };
      const dx = p.x - start.x, dy = p.y - start.y;
      const stem = line(bez(start, { x: start.x + dx * 0.05, y: start.y + dy * 0.55 }, { x: p.x - dx * 0.45, y: p.y - dy * 0.05 }, { x: p.x, y: p.y + 24 * k * Math.sign(dy || -1) * -1 }, 40));
      stem.knot = 0.35 + rnd() * 0.25;
      // Its community: people gathered round it, a little further out.
      const people = Array.from({ length: 12 + Math.floor(rnd() * 6) }, () => {
        const a2 = th + (rnd() - 0.5) * 1.6, d = (44 + rnd() * 46) * k;
        return { hx: p.x + Math.cos(a2) * d, hy: p.y + Math.sin(a2) * d * 0.8, r: (1.1 + rnd() * 0.9) * Math.max(0.8, k), ph: rnd() * TAU, f: 0.3 + rnd() * 0.5, w: (2 + rnd() * 4) * k, bright: rnd() < 0.2 };
      });
      return { ...a, i, x: p.x, y: p.y, th, r: 25 * k, stem, people, t0: 0.7 + Math.abs(i - 4) * 0.09, lit: 0 };
    });
    // Thousands more: a faint haze of small apps further out, each on a hair-fine thread.
    haze = Array.from({ length: small ? 30 : 64 }, () => {
      const th = -Math.PI * (0.04 + rnd() * 0.92), r = 300 + rnd() * 330;
      const p = P(836 + Math.cos(th) * r, 610 + Math.sin(th) * r * 0.97);
      return { ...p, r: (0.8 + rnd() * 1.1) * Math.max(0.8, k), a: 0.25 + rnd() * 0.35, t0: 1.5 + rnd() * 0.9, th };
    }).filter((h) => apps.every((a) => Math.hypot(a.x - h.x, a.y - h.y) > 70 * k) && h.y > Y(95));
    // Labels.
    const ls = Math.max(small ? 10 : 12.5, 20 * k);
    apps.forEach((a, i) => {
      labelEls[i].style.display = small && i % 2 ? 'none' : ''; // on a phone, every other name, so they don't collide
      const above = a.y < core.y - 330 * k; // the topmost ones carry their name above
      put(labelEls[i], a.x, above ? a.y - a.r - 10 * k : a.y + a.r + 12 * k, 0.5, above ? 1 : 0, ls);
    });
    put(coreLabel, core.x + core.w * 0.75, core.y - core.h * 0.18, 0, 0.5, Math.max(small ? 11 : 13, 22 * k));
    return true;
  };

  // ---- Drawing ---------------------------------------------------------------------------
  const lensPts = (c, w, h, side, n, inset) => {
    const hw = w / 2 - inset, hh = h / 2 - inset * 0.6, cc = (hw * hw - hh * hh) / (2 * hw), R = hw - cc;
    return Array.from({ length: n + 1 }, (_, i) => { const y = -hh + (2 * hh * i) / n; return [c.x + side * (cc + Math.sqrt(Math.max(0, R * R - y * y))), c.y + y]; });
  };
  const drawCore = (c, w, h, q, cellNow, a = 1) => {
    if (q <= 0) return;
    halo(c.x, c.y, h * 0.6, 0.14 * q * a);
    [[0, 1.2, 0.95], [6 * k, 0.9, 0.55], [-4 * k, 0.8, 0.35]].forEach(([inset, lw, al]) => {
      for (const side of [-1, 1]) {
        const ln = line(lensPts(c, w, h, side, 40, inset)), mid = ln.total / 2, half = mid * q;
        stroke(ln, mid - half, mid + half, lw * LW, THREAD, al * a);
      }
    });
    node(c.x, c.y - h / 2, 1, q * a); node(c.x, c.y + h / 2, 1, q * a);
    // The mink, crisp, at a whole number of pixels per art pixel.
    const P2 = M.POSES.profile, u = cellNow, mw = P2[0].length * u, mh = P2.length * u;
    const x0 = Math.round(c.x + 3 * k - mw / 2), y0 = Math.round(c.y + 6 * k - mh / 2);
    g.globalAlpha = smooth(clamp(q * 1.6 - 0.4)) * a;
    for (let j = 0; j < P2.length; j++) for (let i = 0; i < P2[0].length; i++) {
      const ch = P2[j][i];
      if (ch === '.') continue;
      g.fillStyle = M.COLORS[ch];
      g.fillRect(x0 + i * u, y0 + j * u, u, u);
    }
    g.globalAlpha = 1;
  };
  const glyph = (a, q) => {
    if (q <= 0) return;
    const s = a.r / 25, x = a.x, y = a.y, lit = a.lit;
    halo(x, y, a.r * (1.6 + 0.6 * lit), (0.08 + 0.25 * lit) * q);
    g.lineWidth = 1.3 * LW;
    g.strokeStyle = `rgba(${THREAD},${(0.9 * q).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, a.r * (0.6 + 0.4 * ease(q)), 0, TAU); g.stroke();
    g.lineWidth = 1.25 * LW;
    g.strokeStyle = `rgba(${CORE},${(0.85 * q).toFixed(3)})`;
    g.beginPath();
    const L = (x0, y0, x1, y1) => { g.moveTo(x + x0 * s, y + y0 * s); g.lineTo(x + x1 * s, y + y1 * s); };
    switch (a.glyph) {
      case 'anime': // a face with a big star-lit eye
        g.moveTo(x + 10 * s, y); g.arc(x, y, 10 * s, 0, TAU);
        g.moveTo(x - 1 * s, y - 2 * s); g.arc(x - 4 * s, y - 2 * s, 3 * s, 0, TAU);
        g.moveTo(x + 7 * s, y - 2 * s); g.arc(x + 4 * s, y - 2 * s, 3 * s, 0, TAU);
        L(-3, 5, 3, 5); break;
      case 'pencil': L(-9, 9, 6, -6); L(-6, 12, 9, -3); L(6, -6, 9, -3); L(-9, 9, -11, 13); L(-11, 13, -6, 12); break;
      case 'note': L(-4, 8, -4, -9); L(-4, -9, 8, -12); L(8, -12, 8, 5); g.moveTo(x - 4 * s, y + 8 * s); g.arc(x - 7 * s, y + 8 * s, 3 * s, 0, TAU); g.moveTo(x + 8 * s, y + 5 * s); g.arc(x + 5 * s, y + 5 * s, 3 * s, 0, TAU); break;
      case 'bars': [-8, -4, 0, 4, 8].forEach((bx, j) => { const hh = [4, 9, 12, 7, 3][j]; L(bx, hh, bx, -hh); }); break;
      case 'book': L(0, -8, 0, 9); L(0, -8, -10, -10); L(-10, -10, -10, 7); L(-10, 7, 0, 9); L(0, -8, 10, -10); L(10, -10, 10, 7); L(10, 7, 0, 9); break;
      case 'reel': g.moveTo(x + 10 * s, y); g.arc(x, y, 10 * s, 0, TAU); [0, 1, 2, 3, 4].forEach((j) => { const an = (j / 5) * TAU - Math.PI / 2; g.moveTo(x + Math.cos(an) * 6 * s + 2 * s, y + Math.sin(an) * 6 * s); g.arc(x + Math.cos(an) * 6 * s, y + Math.sin(an) * 6 * s, 2 * s, 0, TAU); }); break;
      case 'pad': g.roundRect(x - 12 * s, y - 6 * s, 24 * s, 12 * s, 5 * s); L(-7, -3, -7, 3); L(-10, 0, -4, 0); g.moveTo(x + 7 * s, y - 2 * s); g.arc(x + 6 * s, y - 2 * s, 1 * s, 0, TAU); g.moveTo(x + 9 * s, y + 2 * s); g.arc(x + 8 * s, y + 2 * s, 1 * s, 0, TAU); break;
      case 'bulb': g.moveTo(x + 7 * s, y - 3 * s); g.arc(x, y - 3 * s, 7 * s, 0, TAU); L(-3, 5, 3, 5); L(-3, 8, 3, 8); break;
      case 'tag': g.moveTo(x - 9 * s, y - 9 * s); g.lineTo(x + 2 * s, y - 9 * s); g.lineTo(x + 10 * s, y); g.lineTo(x + 1 * s, y + 9 * s); g.lineTo(x - 9 * s, y + 9 * s); g.closePath(); g.moveTo(x - 3 * s, y - 4 * s); g.arc(x - 5 * s, y - 4 * s, 2 * s, 0, TAU); break;
      default: break;
    }
    g.stroke();
  };

  // ---- Time -------------------------------------------------------------------------------
  const END = 3.0, AMBIENT = 3.4;
  let ta = 0, running = false, raf = 0, last = 0, armed = false, timers = [], from = null;
  let pulses = [], nextPulse = 0;
  const k01 = (t0, d) => clamp((ta - t0) / d);

  const draw = () => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!core) return;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const handoff = from && ta < 2.6;
    // The core: from slide 7's place, or tracing itself.
    if (from) {
      const q = easeIO(k01(0, 1.1));
      const c = { x: lerp(from.core.x, core.x, q), y: lerp(from.core.y, core.y, q) };
      drawCore(c, lerp(from.core.w, core.w, q), lerp(from.core.h, core.h, q), 1, q < 0.5 ? from.core.cell : cell);
    } else drawCore(core, core.w, core.h, ease(k01(0, 0.8)), cell);
    // The foundation under it: plates settling into place (slide 7's machines sink into them).
    // Drawn from the bottom up, each slab hiding the one beneath, so they read as a stack.
    for (let i = plates.length - 1; i >= 0; i--) {
      const pl = plates[i], q = from ? easeIO(k01(0.55 + pl.t0, 0.6)) : ease(k01(pl.t0, 0.5));
      if (q <= 0) continue;
      const hw = pl.w / 2, d = 13 * k, th = 3.5 * k, y = pl.y + (1 - q) * 14 * k;
      g.globalAlpha = q;
      g.beginPath(); g.moveTo(core.x - hw, y); g.lineTo(core.x, y - d); g.lineTo(core.x + hw, y); g.lineTo(core.x + hw, y + th); g.lineTo(core.x, y + d + th); g.lineTo(core.x - hw, y + th); g.closePath();
      g.fillStyle = '#16120d'; g.fill();
      g.lineWidth = 0.9 * LW; g.strokeStyle = `rgba(${THREAD},${i ? 0.42 : 0.6})`; g.stroke();
      g.beginPath(); g.moveTo(core.x - hw, y); g.lineTo(core.x, y + d); g.lineTo(core.x + hw, y); g.stroke();
      g.globalAlpha = 1;
    }
    if (from) {
      from.machines.forEach((m, i) => {
        const q = easeIO(k01(0.1 + i * 0.08, 1.0)), tgt = plates[1 + i];
        const x = lerp(m.x, core.x, q), y = lerp(m.y, tgt.y, q), r = lerp(m.r, tgt.w / 2, q) * (1 - 0.4 * q), a = 1 - q;
        if (a <= 0) return;
        g.lineWidth = 1.4 * LW; g.strokeStyle = `rgba(${THREAD},${(0.9 * a).toFixed(3)})`;
        g.beginPath(); g.ellipse(x, y, r, r * lerp(1, 0.12, q), 0, 0, TAU); g.stroke();
      });
    }
    // Faint haze: thousands more.
    for (const h of haze) {
      const q = smooth(k01(h.t0 + (from ? 0.3 : 0), 0.8));
      if (q <= 0) continue;
      g.lineWidth = 0.45 * LW; g.strokeStyle = `rgba(${THREAD},${(0.08 * q).toFixed(3)})`;
      g.beginPath(); g.moveTo(core.x, core.y - core.h * 0.42); g.lineTo(h.x, h.y); g.stroke();
      dot(h.x, h.y, h.r, NODE, h.a * q);
    }
    // The apps on their stems.
    for (const a of apps) {
      const t0 = a.t0 + (from ? 0.5 : 0), qs = ease(k01(t0, 0.8));
      if (qs > 0) {
        stroke(a.stem, 0, a.stem.total * qs, 1 * LW, THREAD, 0.6 + 0.3 * a.lit);
        if (qs < 1) { const p = at(a.stem, a.stem.total * qs); halo(p.x, p.y, 7 * k, 0.6); }
        if (qs > a.stem.knot) { const p = at(a.stem, a.stem.total * a.stem.knot); node(p.x, p.y, 0.8, 1); }
      }
      glyph(a, ease(k01(t0 + 0.65, 0.45)));
      // Its community, gathered round it.
      const qp = smooth(k01(t0 + 0.9, 0.7));
      a.people.forEach((p, j) => {
        const x = p.hx + Math.sin(ta * p.f + p.ph) * p.w, y = p.hy + Math.cos(ta * p.f * 0.8 + p.ph) * p.w * 0.6;
        let px = x, py = y, al = (p.bright ? 1 : 0.72) * qp;
        if (from && p.src) { // the hosted field's people drift up to gather here
          const q = easeIO(clamp((ta - p.src.d) / 1.5));
          px = lerp(p.src.x, x, q); py = lerp(p.src.y, y, q); al = (p.bright ? 0.95 : 0.65) * (0.6 + 0.4 * q);
        }
        al *= 1 + 0.5 * a.lit;
        if (p.bright) halo(px, py, 6 * k, 0.3 * al);
        dot(px, py, p.r, CORE, al);
      });
    }
    // Leftover people from slide 7 that don't join a community fade where they are.
    if (handoff && from.rest) {
      const a = 1 - k01(0.1, 0.9);
      for (const p of from.rest) dot(p.x, p.y + 30 * k * (1 - a), p.r, CORE, 0.55 * a);
    }
    // Pulses: the core feeds an app.
    for (const p of pulses) {
      const a = apps[p.i], q = easeIO(clamp((ta - p.t0) / 1.2)), d = a.stem.total * q;
      stroke(a.stem, Math.max(0, d - 38 * k), d, 1.3 * LW, NODE, 0.75);
      const q2 = at(a.stem, d); halo(q2.x, q2.y, 9 * k, 0.75); dot(q2.x, q2.y, 1.8 * Math.max(0.8, k), CORE, 1);
    }
  };

  const advance = (dt) => {
    ta += dt;
    apps.forEach((a) => { a.lit = Math.max(0, a.lit - dt / 1.6); });
    if (ta < AMBIENT) return;
    if (ta >= nextPulse) { pulses.push({ i: Math.floor(Math.random() * apps.length), t0: ta }); nextPulse = ta + 1.6 + Math.random() * 1.6; }
    pulses = pulses.filter((p) => { if (ta - p.t0 >= 1.2) { apps[p.i].lit = 1; return false; } return true; });
  };

  // ---- Coming and going --------------------------------------------------------------------
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
    pulses = []; ta = 0; from = null;
    root.classList.remove('is-labelled');
    apps.forEach((a) => a.people.forEach((p) => { delete p.src; }));
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  };
  const quiet = () => timers.push(setTimeout(() => { if (slide.classList.contains('on')) html.classList.add('fl-quiet'); }, 120));
  const begin = () => {
    if (!layout()) return;
    if (still) { ta = 9; root.classList.add('is-labelled'); draw(); return; }
    ta = -0.15; nextPulse = AMBIENT + 0.4;
    timers.push(setTimeout(() => root.classList.add('is-labelled'), 1500));
    quiet();
    start();
  };
  // From slide 7: carry its picture on.
  const handoff = (snap) => {
    if (!layout()) return;
    const b = root.getBoundingClientRect(), v = (p) => ({ ...p, x: p.x - b.left, y: p.y - b.top });
    from = { core: v(snap.core), machines: snap.machines.map(v), rest: [] };
    const people = snap.people.map(v), slots = apps.flatMap((a) => a.people);
    // The nearest of the hosted field's people (in order of how far right) go to the communities; the rest fade.
    people.forEach((p, i) => { if (i < slots.length) slots[i].src = { x: p.x, y: p.y, d: 0.35 + (i % 13) * 0.04 }; else from.rest.push(p); });
    window.AstridPays.hide();
    ta = 0; nextPulse = AMBIENT + 0.6;
    html.classList.add('fl-quiet');
    timers.push(setTimeout(() => root.classList.add('is-labelled'), 2000));
    start();
  };
  const paysHost = document.querySelector('[data-astrid-pays]');
  const paysSlide = paysHost && paysHost.closest('.slide');
  slide.addEventListener('dt-arrive', () => { if (armed && slide.classList.contains('on')) { armed = false; begin(); } });
  let wasOn = false;
  const watch = new MutationObserver((records) => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    if (on) {
      reset();
      const fromPays = !still && paysSlide && !paysSlide.classList.contains('on') && records.some((r) => r.target === paysSlide);
      const snap = fromPays && window.AstridPays && window.AstridPays.snapshot();
      if (snap) { handoff(snap); return; }
      layout(); draw(); armed = true;
      timers.push(setTimeout(() => { if (armed) { armed = false; begin(); } }, 1500));
    } else {
      armed = false; stop(); html.classList.remove('fl-quiet');
      timers.push(setTimeout(() => { if (!slide.classList.contains('on')) reset(); }, 700));
    }
  });
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (paysSlide) watch.observe(paysSlide, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : slide.classList.contains('on') && ta > 0 && start()));
  addEventListener('resize', () => { if (slide.classList.contains('on') && layout()) { from = null; draw(); } });

  if (slide.classList.contains('on')) { wasOn = true; begin(); }
})();
