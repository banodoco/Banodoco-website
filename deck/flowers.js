// Version F, slide 8: a thousand flowers, as people reached. It reads left to right: Astrid (the lens core with
// the mink) under the text on the left; to the right, a crowd of people, sparse at first. Niche apps fire out of
// the core along fine threads, one after another, for as long as the slide is on. Each lands in the crowd with its
// name, which shows for a moment and fades; a community of people lights up round it, and a quiet counter under
// Astrid climbs: people who could be reached. After the first twenty the niches come round again in new variations
// at new places, and the crowd keeps filling until the picture is a bustling, endless-feeling field. The apps and
// the number are illustrative, a vision rather than a metric.
// From slide 7 the picture carries on: its core glides into place, its builders fold into it and its people drift
// out to become the first of the crowd. Going on to slide 9 it hands over its core and its visible communities.
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
  const fly = (u) => 1 - Math.pow(1 - u, 2.6); // fired out fast, slowing as it lands
  const THREAD = '240,200,119', NODE = '255,217,145', CORE = '255,241,214', CROWD = '205,188,156'; // CROWD: people not yet reached
  const BG = '13,10,7';
  const TAU = Math.PI * 2;

  // Illustrative: the kinds of app people could build on Astrid, each for its own niche, in the order they first
  // fire. After the twentieth they come round again, each time as a variation on its niche.
  const NICHES = [
    { glyph: 'anime', names: ['Anime studio for a niche fandom', 'Anime shorts for mecha fans', 'Fan films for a cult manga'] },
    { glyph: 'columns', names: ['Storyboards → motion for architects', 'Walkthroughs for interior designers', 'Concept films for urban planners'] },
    { glyph: 'book', names: ['Interactive storytelling', 'Choose-your-path stories for teens', 'Audio dramas with moving pictures'] },
    { glyph: 'bars', names: ['Live VJ / DJ sets', 'Visuals for techno nights', 'Projection shows for small venues'] },
    { glyph: 'note', names: ['Music videos for indie bands', 'Lyric videos for choirs', 'Visualisers for bedroom producers'] },
    { glyph: 'die', names: ['Tabletop RPG campaign recaps', 'Lore films for fantasy fandoms', 'Trailers for indie board games'] },
    { glyph: 'reel', names: ['Archive film restoration', 'Home movies, revived', 'Local history in colour'] },
    { glyph: 'bulb', names: ['Classroom explainers', 'Science shorts for museums', 'Training films for nurses'] },
    { glyph: 'pad', names: ['Game cinematics', 'Trailers for indie games', 'Cutscenes for modders'] },
    { glyph: 'bubble', names: ['Comics → animated panels', 'Motion comics for webtoons', 'Animated zines'] },
    { glyph: 'tag', names: ['Brand content for small shops', 'Product films for craft sellers', 'Menus that move for cafés'] },
    { glyph: 'moon', names: ['Animated bedtime stories', 'Lullaby films for toddlers', 'Picture books brought to life'] },
    { glyph: 'rings', names: ['Wedding films', 'Anniversary montages', 'Memorial tributes'] },
    { glyph: 'hanger', names: ['Fashion lookbooks', 'Runway previews for design students', 'Try-on films for vintage sellers'] },
    { glyph: 'phones', names: ['Lo-fi loops for streamers', 'Intros for game streamers', 'Ambient loops for study streams'] },
    { glyph: 'mic', names: ['Visuals for podcasts', 'Clips for audiobook authors', 'Video for community radio'] },
    { glyph: 'house', names: ['Real-estate walkthroughs', 'Holiday-let tours', 'Renovation before-and-afters'] },
    { glyph: 'bowl', names: ['Recipe films for home cooks', 'Street-food stories', 'Cooking classes in any language'] },
    { glyph: 'frame', names: ['Living portraits for galleries', 'Art-history explainers', 'Exhibition trailers'] },
    { glyph: 'ball', names: ['Highlights for amateur leagues', 'Tribute reels for football clubs', 'Training breakdowns for coaches'] },
  ];
  // Where the first fifteen land (u, v: 0–1 across and down the open ground to the right of Astrid); the rest find
  // the emptiest places, spreading over more of the screen as the crowd fills.
  const FIRST = [[0.17, 0.66], [0.56, 0.29], [0.64, 0.97], [0.72, 0.66], [0.38, 0.06], [0.09, 0.97], [0.93, 0.08], [0.99, 0.33],
    [0.92, 0.93], [0.45, 0.6], [0.3, 0.355], [0.37, 0.92], [0.65, 0.03], [0.97, 0.6], [0.79, 0.44]];
  // When each fires (s): the first four inside four seconds, then one every 1.2 s for as long as the slide is on.
  const LAUNCH = [0.5, 1.3, 2.05, 2.75, 3.9, 5.0, 6.1, 7.2, 8.3, 9.5, 10.7, 11.9, 13.1, 14.3, 15.5];
  const launchAt = (n) => (n < LAUNCH.length ? LAUNCH[n] : LAUNCH[LAUNCH.length - 1] + (n - LAUNCH.length + 1) * 1.2);
  // People who could be reached once app n has landed: rounded, rising to billions, then easing towards the world's
  // connected population. A vision, not a count.
  const REACH = [2e6, 5e6, 10e6, 20e6, 35e6, 60e6, 100e6, 150e6, 230e6, 350e6, 500e6, 750e6, 1.1e9, 1.5e9, 2e9];
  const reachOf = (n) => (n < 0 ? 0 : n < REACH.length ? REACH[n] : 5.5e9 - 3.5e9 * Math.pow(0.95, n - REACH.length + 1));
  const HOLD = 2.4; // how long a name stays once its app has landed, before it fades
  const WINDOW = 64; // only the most recent apps are drawn: their threads and nodes have faded out by then

  // Names: a small pool reused as apps come and go, and one hidden span to measure them with.
  const POOL = 7;
  const pool = Array.from({ length: POOL }, () => {
    const el = document.createElement('span');
    el.className = 'fl-ax';
    root.appendChild(el);
    return { el, text: '', x: NaN, y: NaN, o: -1 };
  });
  const measure = document.createElement('span');
  measure.className = 'fl-ax fl-measure';
  measure.setAttribute('aria-hidden', 'true');
  root.appendChild(measure);
  const coreLabel = document.createElement('span');
  coreLabel.className = 'fl-ax fl-core';
  coreLabel.textContent = 'Astrid';
  root.appendChild(coreLabel);
  const count = document.createElement('div');
  count.className = 'fl-count';
  count.innerHTML = '<b class="fl-n"><span class="fl-v">0</span><span class="fl-u"></span></b><span class="fl-cl">people who could be reached</span>';
  root.appendChild(count);
  const countV = count.querySelector('.fl-v'), countU = count.querySelector('.fl-u'), countL = count.querySelector('.fl-cl');

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

  // ---- Geometry ------------------------------------------------------------------------------------------------
  let W = 0, H = 0, dpr = 1, k = 1, LW = 1, small = false, cell = 3, CAP = 4000;
  let seed = 1;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  let core = null, field = null, apps = [], appBase = 0, dots = [], countBox = null, textBox = null, coreBox = null, lim = null, S = null, labelH = 20;
  let grid = new Map(), sp = 6, widths = new Map(); // widths: each name's measured width at the current size

  const put = (el, x, y, ax, ay, size) => {
    if (size) el.style.fontSize = `${size.toFixed(1)}px`;
    const w = el.offsetWidth, h = el.offsetHeight, l = x - w * ax, t = y - h * ay;
    el.style.transform = `translate(${l.toFixed(1)}px, ${t.toFixed(1)}px)`;
    return { l, t, r: l + w, b: t + h, w, h };
  };
  const hit = (b, x, y, pad = 0) => b && x > b.l - pad && x < b.r + pad && y > b.t - pad && y < b.b + pad;
  const overlap = (a, b, pad = 0) => a.l < b.r + pad && a.r > b.l - pad && a.t < b.b + pad && a.b > b.t - pad;
  // Soft value noise over the crowd, so it gathers in loose towns rather than spreading evenly.
  let noiseGrid = [];
  const NX = 7, NY = 5;
  const noise = (x, y) => {
    const gx = clamp(x / W) * (NX - 1), gy = clamp(y / H) * (NY - 1);
    const i = Math.min(NX - 2, Math.floor(gx)), j = Math.min(NY - 2, Math.floor(gy)), fx = smooth(gx - i), fy = smooth(gy - j);
    const n = (a, b) => noiseGrid[b * NX + a];
    return lerp(lerp(n(i, j), n(i + 1, j), fx), lerp(n(i, j + 1), n(i + 1, j + 1), fx), fy);
  };

  // ---- The crowd: one flat list of people, with a spatial grid for spacing and for lighting neighbourhoods ----
  const key = (x, y) => `${Math.floor(x / sp)},${Math.floor(y / sp)}`;
  const near = (x, y, d) => {
    const n = Math.ceil(d / sp), cx = Math.floor(x / sp), cy = Math.floor(y / sp);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const cl = grid.get(`${cx + i},${cy + j}`);
      if (cl) for (const o of cl) if (Math.hypot(o.x - x, o.y - y) < d) return true;
    }
    return false;
  };
  const around = (x, y, rx, ry, fn) => {
    const x0 = Math.floor((x - rx) / sp), x1 = Math.floor((x + rx) / sp), y0 = Math.floor((y - ry) / sp), y1 = Math.floor((y + ry) / sp);
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) { const cl = grid.get(`${i},${j}`); if (cl) for (const o of cl) fn(o); }
  };
  const add = (d) => { dots.push(d); const kk = key(d.x, d.y); (grid.get(kk) || grid.set(kk, []).get(kk)).push(d); return d; };
  const person = (x, y, extra) => ({
    x, y, r: (small ? 0.9 : 1.0) * Math.max(0.8, k) * (0.85 + rnd() * 0.55), a0: 0.27 + rnd() * 0.2, lights: [], firstLit: extra.lights?.[0]?.t ?? Infinity,
    ph: rnd() * TAU, f: 0.35 + rnd() * 0.6, w: (1 + rnd() * 2.2) * k, bright: rnd() < 0.14, ...extra,
  });
  // How far the crowd reaches by app n: at first the open ground right of Astrid; then, from about the twentieth app,
  // up to Astrid's side and down towards the footer, until the picture is full.
  const spread = (n) => smooth(clamp((n - 17) / 26));
  const regionOf = (n) => {
    const s = spread(n);
    return small
      ? { x0: lerp(field.x0 - 30, core.x + core.w / 2 + 14, s), x1: lim.r, y0: lim.t, y1: lim.b, s }
      : { x0: lerp(field.x0 - 90 * k, core.x + core.w / 2 + 34 * k, s), x1: lim.r, y0: lim.t, y1: lerp(lim.b, H - 122 * k, s), s };
  };
  const edge = (x, y, reg) => smooth(clamp((reg.x1 - x) / (70 * k))) * smooth(clamp((y - reg.y0) / (60 * k))) * smooth(clamp((reg.y1 - y) / (60 * k)));
  const density = (x, y, reg) => smooth(clamp((x - reg.x0) / (220 * k))) * edge(x, y, reg) * lerp(0.18 + 0.82 * noise(x, y), 0.22 + 0.78 * noise(x, y), reg.s);
  const clear = (x, y, reg) => x > reg.x0 && x < reg.x1 && y > reg.y0 && y < reg.y1
    && !hit(textBox, x, y, 22 * k) && !hit(countBox, x, y, 14 * k) && !hit(coreBox, x, y, 26 * k);
  const scatter = (n, minD, t0, reg, avoid, far = 1) => {
    for (let tries = 0, got = 0; got < n && tries < n * 60 && dots.length < CAP; tries++) {
      const x = lerp(reg.x0, reg.x1, rnd()), y = lerp(reg.y0, reg.y1, rnd());
      if (rnd() > density(x, y, reg) || !clear(x, y, reg) || near(x, y, minD) || (avoid && avoid(x, y))) continue;
      const d = add(person(x, y, { t0: t0(x) }));
      if (far < 1) { d.r *= 0.75 + 0.25 * far; d.a0 *= far; }
      got++;
    }
  };
  // Lighting: the latest light at or before tc (a person can be lit by one app and, much later, by another).
  const lightAt = (d, t) => { let L = null; for (const l of d.lights) { if (l.t <= t) L = l; else break; } return L; };

  // ---- The apps, made one at a time as they are due, the same way every time for a given screen ---------------
  // Keep only the visible/recent window. Absolute indices keep launch timing and labels unchanged.
  const makeApp = (n) => {
    const niche = NICHES[n % NICHES.length], name = niche.names[Math.floor(n / NICHES.length) % niche.names.length];
    const reg = regionOf(n), r = (small ? 9 : 13) * k;
    let x, y;
    if (n < FIRST.length) {
      x = lerp(field.x0, field.x1, FIRST[n][0]); y = lerp(field.y0, field.y1, FIRST[n][1]);
      if (!small && hit(textBox, x, y, 40 * k)) x = textBox.r + 60 * k + (x - field.x0) * 0.4; // never under the text
    } else { // the emptiest of a few places, away from the recent apps
      const cx0 = Math.max(reg.x0 + (small ? 20 : 60 * k), S.x + (small ? 40 : 130 * k)), cx1 = W - (small ? 40 : 110 * k);
      const cy0 = lim.t + (small ? 16 : 46 * k), cy1 = reg.y1 - (small ? 16 : 40 * k);
      let best = -1;
      for (let c = 0; c < 26; c++) {
        const px = lerp(cx0, cx1, rnd()), py = lerp(cy0, cy1, rnd());
        if (hit(textBox, px, py, (small ? 24 : 64) * k) || hit(countBox, px, py, (small ? 24 : 56) * k) || hit(coreBox, px, py, (small ? 24 : 60) * k)) continue;
        let dmin = Infinity;
        for (let j = Math.max(appBase, n - 24); j < n; j++) {
          const prior = apps[j - appBase];
          if (prior) dmin = Math.min(dmin, Math.hypot((px - prior.x) / 1.2, py - prior.y));
        }
        const score = dmin + rnd() * 20 * k;
        if (score > best) { best = score; x = px; y = py; }
      }
      if (best < 0) { x = lerp(field.x0, field.x1, rnd()); y = lerp(field.y0, field.y1, rnd()); }
    }
    const dx = x - S.x, dy = y - S.y;
    const thread = line(bez(S, { x: S.x + dx * 0.42, y: S.y + dy * 0.04 }, { x: x - dx * 0.4, y }, { x: x - r, y }, 44));
    thread.total = Math.max(thread.total, 1);
    const L = launchAt(n), F = clamp(0.82 + Math.hypot(dx, dy) / Math.max(W, 900) * 0.45, 0.9, 1.25);
    const R = (small ? 28 + rnd() * 6 : n < FIRST.length ? 46 + 2.2 * n : 46 + rnd() * 24) * k;
    // Its name: right of the glyph, else below, above, or left; on screen and clear of the text and the counter.
    if (!widths.has(name)) { measure.textContent = name; widths.set(name, measure.offsetWidth); }
    const w = widths.get(name), h = labelH, gap = 7 * k;
    const cands = [
      { l: x + r + gap, t: y - h / 2 }, { l: x - w / 2, t: y + r + 3 * k }, { l: x - w / 2, t: y - r - 3 * k - h }, { l: x - r - gap - w, t: y - h / 2 },
    ].map((c) => ({ ...c, r: c.l + w, b: c.t + h }));
    const ok = (c) => c.l > 10 && c.r < W - (small ? 10 : 30 * k) && c.t > 8 && c.b < H - (small ? 96 : 84 * k)
      && !overlap(c, textBox, 10 * k) && !overlap(c, countBox, 10 * k) && !overlap(c, coreBox, 10 * k);
    let box = small ? cands[1] : cands.find(ok) || cands[1];
    if (small || !ok(box)) { const sh = clamp(box.l, 10, W - 10 - w) - box.l; box = { ...box, l: box.l + sh, r: box.r + sh }; }
    const app = { i: n, name, glyph: niche.glyph, x, y, r, R, thread, L, F, T: L + F, box, off: { x: box.l - x, y: box.t - y }, w, h };
    // Its community: the people already near light up as a ripple spreads (those lit long ago light again), and
    // new people join while there is room.
    const light = (d) => app.T + 0.12 + 0.9 * clamp(d / R);
    around(x, y, R * 1.4, R, (d) => {
      const dd = Math.hypot((d.x - x) / 1.25, (d.y - y) / 0.9);
      if (dd >= R * 1.08) return;
      const t = Math.max(light(dd), d.t0 + 0.4), last = d.lights[d.lights.length - 1];
      if (!last || t - last.t > 10) {
        d.lights.push({ t, app: n });
        if (!Number.isFinite(d.firstLit)) d.firstLit = t;
      }
    });
    const room = CAP - dots.length - (small ? 20 : 60);
    const want = Math.min(room, Math.round((n < FIRST.length ? 34 + 4 * n : 42 + rnd() * 34) * (small ? 0.5 : 1)));
    const lobe = rnd() * TAU, appReg = { ...reg, x0: Math.min(reg.x0, x - R * 1.4) };
    for (let tries = 0, got = 0; got < want && tries < want * 40; tries++) {
      const an = rnd() * TAU, rr = R * Math.sqrt(rnd()) * (0.82 + 0.26 * Math.sin(an * 3 + lobe));
      const px = x + Math.cos(an) * rr * 1.25, py = y + Math.sin(an) * rr * 0.9;
      if (rnd() > (1 - 0.5 * (rr / R) ** 2) * (0.25 + 0.75 * edge(px, py, appReg)) || !clear(px, py, appReg) || Math.hypot(px - x, py - y) < r + 5 * k || near(px, py, (small ? 3.6 : 4.6) * k)) continue;
      const t = light(rr);
      add(person(px, py, { t0: t - 0.05, lights: [{ t, app: n }], bright: rnd() < 0.16 }));
      got++;
    }
    apps.push(app);
    if (apps.length > WINDOW) { apps.shift(); appBase++; }
    // And the crowd beyond keeps growing with each, reaching further as it goes.
    const far = 1 - 0.3 * spread(n);
    scatter(Math.round((n < FIRST.length ? 40 : 34) * (small ? 0.3 : 1)), (small ? 7 : 8) * k * far, () => app.T + 0.3 + rnd() * 1.8, reg,
      (px, py) => apps.some((a) => a.i > n - 4 && Math.hypot((px - a.x) / 1.25, (py - a.y) / 0.9) < a.R * 1.1), far);
    return app;
  };
  const ensure = (t) => { if (!core) return; while (launchAt(appBase + apps.length) <= t + 0.05) makeApp(appBase + apps.length); };

  const layout = () => {
    const b = root.getBoundingClientRect();
    if (!b.width || !b.height) return false;
    W = b.width; H = b.height;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    small = W <= 760;
    k = small ? clamp(W / 430, 0.72, 1) : clamp(Math.min(W / 1440, H / 900), 0.6, 1.3);
    LW = Math.max(0.75, Math.min(1.15, k * 1.1));
    cell = small ? 2 : Math.max(2, Math.round(3 * k));
    // At most this many people: enough for a full field, few enough to draw cheaply every frame.
    CAP = Math.round(clamp((W * H) / (1440 * 900), 0.3, 1.6) * 4200);
    seed = 20261016;
    noiseGrid = Array.from({ length: NX * NY }, () => rnd());
    // The text, top left.
    const rel = (r) => ({ l: r.left - b.left, t: r.top - b.top, r: r.right - b.left, b: r.bottom - b.top });
    const h1 = slide.querySelector('h1'), num = slide.querySelector('.num');
    const th = rel(h1.getBoundingClientRect()), tn = rel(num.getBoundingClientRect());
    textBox = { l: Math.min(th.l, tn.l), t: Math.min(th.t, tn.t), r: Math.max(th.r, tn.r), b: th.b };
    // The counter's size, to stack Astrid and it under the text.
    count.style.fontSize = `${(small ? 13 : 16 * k).toFixed(1)}px`;
    const ch = count.offsetHeight;
    coreLabel.style.fontSize = `${Math.max(small ? 13 : 14, 21 * k).toFixed(1)}px`;
    const lh = coreLabel.offsetHeight;
    const bottom = small ? H - 100 : H - 78 * k; // on a phone, clear of the deck's footer (name, progress, titles)
    if (!small) {
      // Astrid's column: its name, the lens, then the counter, in the space under the text.
      let h = 176 * k;
      const top = textBox.b + 34 * k, need = lh + 10 * k + h + 26 * k + ch, slack = bottom - top - need;
      if (slack < 0) h = Math.max(100 * k, h + slack);
      const y0 = top + Math.max(0, slack) * 0.5 + lh + 10 * k;
      core = { x: textBox.l + Math.max(countL.offsetWidth / 2, 62 * k), y: y0 + h / 2, w: h * 0.62, h };
      countBox = put(count, core.x, core.y + h / 2 + 26 * k, 0.5, 0);
      field = { x0: core.x + core.w / 2 + 120 * k, x1: W - 140 * k, y0: 92 * k, y1: H - 232 * k };
    } else {
      const h = clamp((H - textBox.b) * 0.2, 86, 120);
      core = { x: 16 + h * 0.31 + 4, y: textBox.b + (bottom - ch - 30 - textBox.b) * 0.45, w: h * 0.62, h };
      countBox = put(count, W / 2, bottom - ch, 0.5, 0);
      field = { x0: core.x + core.w / 2 + 40, x1: W - 44, y0: textBox.b + 50, y1: countBox.t - 50 };
    }
    put(coreLabel, core.x, core.y - core.h / 2 - 10 * k, 0.5, 1);
    // Margins: nothing of the crowd within ~48 px of the right edge, and it stays well above the deck's footer.
    lim = small ? { r: W - 14, t: textBox.b + 18, b: countBox.t - 18 } : { r: W - 48 * k, t: 34 * k, b: H - 158 * k };
    coreBox = { l: core.x - core.w / 2, r: core.x + core.w / 2, t: core.y - core.h / 2 - lh - 12 * k, b: core.y + core.h / 2 };
    S = { x: core.x + core.w / 2, y: core.y }; // the door the apps leave by
    measure.style.fontSize = `${(small ? 12.5 : Math.max(13, 16.5 * k)).toFixed(1)}px`;
    measure.textContent = 'Ag';
    labelH = measure.offsetHeight;
    widths = new Map();
    pool.forEach((p) => { p.el.style.fontSize = measure.style.fontSize; p.text = ''; p.o = -1; p.el.style.opacity = '0'; });
    // The world before any app reaches it: sparse, fading in from Astrid outwards.
    apps = []; appBase = 0; dots = []; grid = new Map(); sp = small ? 5 : 6 * k;
    const reg0 = regionOf(0), span = W - field.x0;
    scatter(small ? 200 : 520, (small ? 9 : 10) * k, (x) => 0.1 + clamp((x - field.x0) / span) * 0.9 + rnd() * 0.3, reg0);
    return true;
  };

  // ---- Drawing -------------------------------------------------------------------------------------------------
  const lensPts = (c, w, h, side, n, inset) => {
    const hw = w / 2 - inset, hh = h / 2 - inset * 0.6, cc = (hw * hw - hh * hh) / (2 * hw), R = hw - cc;
    return Array.from({ length: n + 1 }, (_, i) => { const y = -hh + (2 * hh * i) / n; return [c.x + side * (cc + Math.sqrt(Math.max(0, R * R - y * y))), c.y + y]; });
  };
  const drawCore = (c, w, h, q, cellNow, a = 1, pose = 'profile', mo = { x: 3 * k, y: 6 * k }) => {
    if (q <= 0) return;
    const kk = h / 176;
    halo(c.x, c.y, h * 0.6, 0.14 * q * a);
    [[0, 1.2, 0.95], [6 * kk, 0.9, 0.55], [-4 * kk, 0.8, 0.35]].forEach(([inset, lw, al]) => {
      for (const side of [-1, 1]) {
        const ln = line(lensPts(c, w, h, side, 40, inset)), mid = ln.total / 2, half = mid * q;
        stroke(ln, mid - half, mid + half, lw * LW, THREAD, al * a);
      }
    });
    node(c.x, c.y - h / 2, 1, q * a); node(c.x, c.y + h / 2, 1, q * a);
    // The mink, crisp, at a whole number of pixels per art pixel.
    const P2 = M.POSES[pose] || M.POSES.profile, u = cellNow, mw = P2[0].length * u, mh = P2.length * u;
    const x0 = Math.round(c.x + mo.x - mw / 2), y0 = Math.round(c.y + mo.y - mh / 2); // slide 9 expects (3k, 6k)
    g.globalAlpha = smooth(clamp(q * 1.6 - 0.4)) * a;
    for (let j = 0; j < P2.length; j++) for (let i = 0; i < P2[0].length; i++) {
      const ch = P2[j][i];
      if (ch === '.') continue;
      g.fillStyle = M.COLORS[ch];
      g.fillRect(x0 + i * u, y0 + j * u, u, u);
    }
    g.globalAlpha = 1;
  };
  // Through-the-middle arc helper: from angle a0 to a1 round the side that passes through angle mid.
  const arcVia = (cx, cy, r, a0, a1, mid) => {
    const n = (t) => ((t % TAU) + TAU) % TAU;
    g.arc(cx, cy, r, a0, a1, !(n(mid - a0) < n(a1 - a0)));
  };
  const glyph = (a, x, y, r, q, lit) => {
    if (q <= 0 || r <= 0.5) return;
    const s = r / 19;
    halo(x, y, r * (1.7 + 0.8 * lit), (0.1 + 0.4 * lit) * q);
    g.fillStyle = `rgba(${BG},${(0.85 * q).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.lineWidth = 1.2 * LW;
    g.strokeStyle = `rgba(${THREAD},${(0.92 * q).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    g.lineWidth = 1.1 * LW;
    g.strokeStyle = `rgba(${CORE},${(0.9 * q).toFixed(3)})`;
    g.beginPath();
    const L = (x0, y0, x1, y1) => { g.moveTo(x + x0 * s, y + y0 * s); g.lineTo(x + x1 * s, y + y1 * s); };
    const O = (cx, cy, rr) => { g.moveTo(x + (cx + rr) * s, y + cy * s); g.arc(x + cx * s, y + cy * s, rr * s, 0, TAU); };
    switch (a.glyph) {
      case 'anime': O(0, 0, 10); O(-4, -2, 3); O(4, -2, 3); L(-3, 5, 3, 5); break;
      case 'columns': L(-11, -4, 0, -11); L(0, -11, 11, -4); L(-11, -4, 11, -4); L(-7, -4, -7, 7); L(0, -4, 0, 7); L(7, -4, 7, 7); L(-11, 8, 11, 8); break;
      case 'book': L(0, -8, 0, 9); L(0, -8, -10, -10); L(-10, -10, -10, 7); L(-10, 7, 0, 9); L(0, -8, 10, -10); L(10, -10, 10, 7); L(10, 7, 0, 9); break;
      case 'bars': [-8, -4, 0, 4, 8].forEach((bx, j) => { const hh = [4, 9, 12, 7, 3][j]; L(bx, hh, bx, -hh); }); break;
      case 'note': L(-4, 8, -4, -9); L(-4, -9, 8, -12); L(8, -12, 8, 5); O(-7, 8, 3); O(5, 5, 3); break;
      case 'die': {
        const hx = [0, 1, 2, 3, 4, 5].map((n) => [Math.cos(-Math.PI / 2 + n * Math.PI / 3) * 11, Math.sin(-Math.PI / 2 + n * Math.PI / 3) * 11]);
        hx.forEach((p, n) => L(p[0], p[1], hx[(n + 1) % 6][0], hx[(n + 1) % 6][1]));
        L(0, -5, 5, 3.5); L(5, 3.5, -5, 3.5); L(-5, 3.5, 0, -5); L(0, -5, 0, -11); L(5, 3.5, hx[2][0], hx[2][1]); L(-5, 3.5, hx[4][0], hx[4][1]);
        break;
      }
      case 'reel': O(0, 0, 10); [0, 1, 2, 3, 4].forEach((j) => { const an = (j / 5) * TAU - Math.PI / 2; O(Math.cos(an) * 6, Math.sin(an) * 6, 2); }); break;
      case 'bulb': O(0, -3, 7); L(-3, 5, 3, 5); L(-3, 8, 3, 8); break;
      case 'pad': g.roundRect(x - 12 * s, y - 6 * s, 24 * s, 12 * s, 5 * s); L(-7, -3, -7, 3); L(-10, 0, -4, 0); O(6, -2, 1); O(8, 2, 1); break;
      case 'bubble': g.roundRect(x - 11 * s, y - 9 * s, 22 * s, 14 * s, 4 * s); L(-5, 5, -8, 11); L(-8, 11, 1, 5); break;
      case 'tag': g.moveTo(x - 9 * s, y - 9 * s); g.lineTo(x + 2 * s, y - 9 * s); g.lineTo(x + 10 * s, y); g.lineTo(x + 1 * s, y + 9 * s); g.lineTo(x - 9 * s, y + 9 * s); g.closePath(); O(-5, -4, 2); break;
      case 'moon': { // a crescent: the outer circle's far side, the inner circle's near side
        const c0 = [-1, 1], r0 = 10, c1 = [4, -3], r1 = 8.5, dx = c1[0] - c0[0], dy = c1[1] - c0[1], d = Math.hypot(dx, dy);
        const aa = (r0 * r0 - r1 * r1 + d * d) / (2 * d), hh = Math.sqrt(r0 * r0 - aa * aa), mx = c0[0] + (aa * dx) / d, my = c0[1] + (aa * dy) / d;
        const p = [mx + (hh * dy) / d, my - (hh * dx) / d], p2 = [mx - (hh * dy) / d, my + (hh * dx) / d];
        const A = (c, pt) => Math.atan2(pt[1] - c[1], pt[0] - c[0]), away = Math.atan2(-dy, -dx);
        g.moveTo(x + p[0] * s, y + p[1] * s);
        arcVia(x + c0[0] * s, y + c0[1] * s, r0 * s, A(c0, p), A(c0, p2), away);
        arcVia(x + c1[0] * s, y + c1[1] * s, r1 * s, A(c1, p2), A(c1, p), away);
        O(7, 5, 0.9);
        break;
      }
      case 'rings': O(-4.5, 1, 6.5); O(4.5, 1, 6.5); L(-1, -9, 1, -11); L(1, -11, 3, -9); break;
      case 'hanger': g.moveTo(x - 3 * s, y - 8 * s); g.arc(x, y - 8 * s, 3 * s, Math.PI, Math.PI * 2.5); L(0, -5, 0, -3); L(0, -3, -11, 7); L(-11, 7, 11, 7); L(11, 7, 0, -3); break;
      case 'phones': g.moveTo(x - 9 * s, y + 2 * s); g.arc(x, y + 2 * s, 9 * s, Math.PI, TAU); g.moveTo(x - 7 * s, y + 1 * s); g.roundRect(x - 12 * s, y + 1 * s, 5 * s, 9 * s, 2 * s); g.moveTo(x + 12 * s, y + 1 * s); g.roundRect(x + 7 * s, y + 1 * s, 5 * s, 9 * s, 2 * s); break;
      case 'mic': g.roundRect(x - 4 * s, y - 11 * s, 8 * s, 13 * s, 4 * s); g.moveTo(x + 7 * s, y - 3 * s); g.arc(x, y - 3 * s, 7 * s, 0, Math.PI); L(0, 4, 0, 9); L(-5, 9, 5, 9); break;
      case 'house': L(-11, -1, 0, -10); L(0, -10, 11, -1); L(-7, -4, -7, 9); L(7, -4, 7, 9); L(-7, 9, 7, 9); L(-2, 9, -2, 3); L(-2, 3, 2, 3); L(2, 3, 2, 9); break;
      case 'bowl': g.moveTo(x + 10 * s, y - 1 * s); g.arc(x, y - 1 * s, 10 * s, 0, Math.PI); L(-11, -1, 11, -1); L(-4, -4, -3, -9); L(1, -4, 2, -9); L(6, -4, 7, -8); break;
      case 'frame': g.rect(x - 10 * s, y - 9 * s, 20 * s, 18 * s); g.rect(x - 6 * s, y - 5 * s, 12 * s, 10 * s); L(-6, 5, -1, -1); L(-1, -1, 2, 2); L(2, 2, 4, 0); L(4, 0, 6, 3); break;
      case 'ball': {
        O(0, 0, 10);
        const pg = [0, 1, 2, 3, 4].map((j) => -Math.PI / 2 + (j * TAU) / 5);
        pg.forEach((an, j) => { const bn = pg[(j + 1) % 5]; L(Math.cos(an) * 4, Math.sin(an) * 4, Math.cos(bn) * 4, Math.sin(bn) * 4); L(Math.cos(an) * 4, Math.sin(an) * 4, Math.cos(an) * 10, Math.sin(an) * 10); });
        break;
      }
      default: break;
    }
    g.stroke();
  };

  // ---- Time ----------------------------------------------------------------------------------------------------
  const END = 2.2;
  let ta = 0, off = 0, running = false, raf = 0, last = 0, armed = false, timers = [], from = null, handed = false, counted = '';
  const k01 = (t0, d) => clamp((ta - t0) / d);
  // The apps and the crowd run on their own clock, which starts a little later when slide 7's picture is carried on.
  let tc = 0;
  const c01 = (t0, d) => clamp((tc - t0) / d);
  const LEV = 24, lvDim = Array.from({ length: LEV + 1 }, () => []), lvLit = Array.from({ length: LEV + 1 }, () => []);
  const flush = (lv, color) => {
    for (let l = 1; l <= LEV; l++) {
      const b = lv[l];
      if (!b.length) continue;
      g.fillStyle = `rgba(${color},${(l / LEV).toFixed(3)})`;
      g.beginPath();
      for (let j = 0; j < b.length; j += 3) { g.moveTo(b[j] + b[j + 2], b[j + 1]); g.arc(b[j], b[j + 1], b[j + 2], 0, TAU); }
      g.fill();
      b.length = 0;
    }
  };
  const pos = (d) => [d.x + Math.sin(ta * d.f * 0.6 + d.ph) * d.w, d.y + Math.cos(ta * d.f * 0.5 + d.ph) * d.w * 0.6];
  // The count so far: each app's reach rolls in as it lands.
  const reach = () => {
    let n = apps.length - 1;
    while (n >= 0 && apps[n].T > tc) n--;
    if (n < 0) return 0;
    let v = 0, i = n;
    for (; i >= 0 && tc - apps[i].T < 1.5; i--) {
      const index = apps[i].i;
      v += (reachOf(index) - reachOf(index - 1)) * ease(c01(apps[i].T, 1.5));
    }
    return v + reachOf(i >= 0 ? apps[i].i : appBase - 1);
  };
  const sig2 = (x) => { if (x <= 0) return 0; const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };
  const fmt = (v) => { // two significant figures, then the unit: 720,000 · 7.5 million · 140 million · 1.5 billion
    const r = sig2(v), one = (x) => x.toFixed(1).replace(/\.0$/, '');
    if (r < 1e6) return [Math.round(r).toLocaleString('en-US'), ''];
    if (r < 1e9) return [r < 1e7 ? one(r / 1e6) : String(Math.round(r / 1e6)), 'million'];
    return [one(r / 1e9), 'billion'];
  };
  const showCount = () => {
    const [n, u] = fmt(reach()), s = `${n} ${u}`;
    if (s === counted) return;
    counted = s; countV.textContent = n; countU.textContent = u;
  };
  // A name shows as its app lands (fading in over the last of the flight) and fades a moment later.
  const labelAt = (a) => {
    const u = c01(a.L, a.F);
    if (u <= 0 || tc > a.T + HOLD + 1) return null;
    let x = a.box.l, y = a.box.t;
    if (u < 1) { const p = at(a.thread, a.thread.total * fly(u)); x = p.x + a.r * fly(u) + a.off.x; y = p.y + a.off.y; }
    const o = smooth(clamp((u - 0.55) / 0.4)) * smooth(clamp((x - (S.x + 14 * k)) / (70 * k))) * (1 - smooth(c01(a.T + HOLD, 0.9)));
    return o > 0.004 ? { x, y, o } : null;
  };

  const draw = () => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!core) return;
    tc = ta - off;
    ensure(tc);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const n0 = Math.max(0, apps.length - WINDOW);
    // The threads, behind everything: drawn out as each app flies, settling to a fine trace that fades with age.
    for (let i = n0; i < apps.length; i++) {
      const a = apps[i], q = fly(c01(a.L, a.F));
      if (q <= 0) continue;
      const age = Math.max(0, tc - a.T), rank = apps.length - 1 - i;
      const al = lerp(0.62, 0.2, smooth(c01(a.T, 2.4))) * Math.exp(-age / 34) * (1 - smooth(clamp((rank - (WINDOW - 16)) / 12)));
      if (al < 0.012) continue;
      stroke(a.thread, 0, a.thread.total * q, 0.9 * LW, THREAD, al);
      if (q >= 1 && age < 30) { const m = at(a.thread, a.thread.total * 0.55); node(m.x, m.y, 0.55, 0.7 * smooth(c01(a.T, 0.5)) * (1 - age / 30)); }
    }
    // The crowd: grey where not yet reached, cream where reached, brightest just after an app lands.
    const hk = Math.max(0.7, k);
    for (const d of dots) {
      if (handed && d.handed) continue; // handed on to slide 9, which draws these itself
      let x, y, qa, srcLit = 0;
      if (d.src) {
        const q = easeIO(clamp((ta - d.src.d) / 1.4)), [hx, hy] = pos(d);
        x = lerp(d.src.x, hx, q); y = lerp(d.src.y, hy, q); qa = 1; srcLit = 1 - q;
      } else {
        qa = smooth(c01(d.t0, 0.6));
        if (qa <= 0) continue;
        [x, y] = pos(d);
      }
      if (d.lights.length > 8) {
        let lastPast = -1;
        for (let j = 0; j < d.lights.length; j++) if (d.lights[j].t <= tc) lastPast = j;
        if (lastPast > 0) d.lights.splice(0, lastPast);
      }
      const Lt = d.lights.length ? lightAt(d, tc) : null, first = d.firstLit;
      const lit = Lt ? smooth(clamp((tc - first) / 0.4)) : 0, since = Lt ? tc - Lt.t : Infinity, fl = since < 3 ? Math.exp(-since * 2.6) : 0;
      const tw = 0.78 + 0.22 * Math.sin(ta * d.f * 1.7 + d.ph);
      // Fresh, then warm for a while, then a quieter cream long after, so the newest communities stand out.
      const rest = lerp(d.bright ? 0.72 : 0.6, d.bright ? 0.56 : 0.44, smooth(clamp((since - 18) / 30)));
      const warm = lerp(rest, d.bright ? 1 : 0.82, Math.exp(-since / 9));
      const aDim = qa * d.a0 * tw * (1 - lit) * (1 - srcLit);
      const aLit = qa * Math.max(lit * warm * (0.86 + 0.14 * tw) + 0.35 * fl, srcLit * (d.bright ? 0.9 : 0.62));
      const r = d.r * (1 + 0.45 * Math.max(lit, srcLit) + 0.7 * fl);
      if (aDim > 0.02) lvDim[Math.min(LEV, Math.round(aDim * LEV))].push(x, y, r);
      if (aLit > 0.02) lvLit[Math.min(LEV, Math.round(Math.min(1, aLit) * LEV))].push(x, y, r);
      if (fl > 0.05) halo(x, y, 7 * hk * (1 + fl), 0.45 * fl * qa);
      else if (d.bright && since < 6) halo(x, y, 5 * hk, 0.22 * aLit * (1 - since / 6));
    }
    flush(lvDim, CROWD); flush(lvLit, CORE);
    // Slide 7's leftover people, fading where they are.
    if (from && from.rest.length && ta < 1.2) { const a = 1 - k01(0.05, 0.9); for (const p of from.rest) dot(p.x, p.y + 20 * k * (1 - a), p.r, CORE, 0.55 * a); }
    // Ripples where each lands.
    for (let i = Math.max(0, apps.length - 6); i < apps.length; i++) {
      const a = apps[i], u = c01(a.T, 1.3);
      if (u <= 0 || u >= 1) continue;
      g.lineWidth = 0.8 * LW; g.strokeStyle = `rgba(${THREAD},${(0.24 * (1 - u) * smooth(clamp(u * 5))).toFixed(3)})`;
      g.beginPath(); g.ellipse(a.x, a.y, a.R * 1.3 * ease(u), a.R * 0.95 * ease(u), 0, 0, TAU); g.stroke();
    }
    // A soft scrim of night under each name that shows, so the crowd and the threads sit behind its words.
    g.save();
    g.shadowColor = `rgb(${BG})`; g.shadowBlur = 10 * k;
    for (let i = Math.max(0, apps.length - POOL); i < apps.length; i++) {
      const l = labelAt(apps[i]);
      if (!l) continue;
      const a = apps[i];
      g.fillStyle = `rgba(${BG},${(0.82 * l.o).toFixed(3)})`;
      g.beginPath(); g.roundRect(l.x - 4 * k, l.y + 1 * k, a.w + 8 * k, a.h - 2 * k, 6 * k); g.fill();
    }
    g.restore();
    // The core: from slide 7's place, or tracing itself. The builders' machines fold into it. Now and then, as an
    // app fires, the mink's eye glints.
    let pose = 'profile';
    for (let i = Math.max(0, apps.length - 3); i < apps.length; i++) if (apps[i].i % 4 === 0 && tc >= apps[i].L - 0.05 && tc < apps[i].L + 0.22) pose = 'glint';
    if (from) {
      const q = easeIO(k01(0, 1.1));
      const c = { x: lerp(from.core.x, core.x, q), y: lerp(from.core.y, core.y, q) };
      const mo = { x: lerp(from.mink.x, 3 * k, q), y: lerp(from.mink.y, 6 * k, q) };
      drawCore(c, lerp(from.core.w, core.w, q), lerp(from.core.h, core.h, q), 1, q < 0.5 ? from.core.cell : cell, 1, pose, mo);
      from.machines.forEach((m, i) => {
        const qm = easeIO(k01(0.1 + i * 0.08, 0.9)), a = 1 - qm;
        if (a <= 0) return;
        const x = lerp(m.x, c.x, qm), y = lerp(m.y, c.y, qm), r = Math.max(0.1, lerp(m.r, core.w * 0.12, ease(qm)));
        g.lineWidth = 1.4 * LW; g.strokeStyle = `rgba(${THREAD},${(0.9 * a).toFixed(3)})`;
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
      });
    } else drawCore(core, core.w, core.h, ease(k01(0, 0.8)), cell, 1, pose);
    // The door the apps leave by, on the core's right side; it flares as each one fires.
    const qS = from ? smooth(k01(0.8, 0.4)) : ease(k01(0.3, 0.5));
    let flare = 0;
    for (let i = Math.max(0, apps.length - 3); i < apps.length; i++) { const u = tc - apps[i].L; if (u > -0.1 && u < 0.6) flare = Math.max(flare, Math.exp(-Math.max(0, u) * 5)); }
    node(S.x, S.y, 0.8 + 0.4 * flare, qS);
    halo(S.x, S.y, 16 * k, 0.5 * flare * qS);
    // The apps: in flight along their threads; landed, with their glyph while the name shows; then a small node at
    // the heart of their community, the oldest fading away.
    for (let i = n0; i < apps.length; i++) {
      const a = apps[i], u = c01(a.L, a.F);
      if (u <= 0) continue;
      if (u < 1) {
        const p = at(a.thread, a.thread.total * fly(u)), sc = 0.5 + 0.5 * ease(clamp(u * 3));
        halo(p.x, p.y, 12 * k, 0.55);
        glyph(a, p.x + a.r * fly(u), p.y, a.r * sc, smooth(clamp(u * 4)), 0.4);
        continue;
      }
      const shrink = smooth(c01(a.T + HOLD + 0.2, 0.8)), rank = apps.length - 1 - i;
      const keep = 1 - smooth(clamp((rank - (WINDOW - 16)) / 12));
      if (shrink > 0) node(a.x, a.y, 0.6, 0.8 * smooth(clamp((shrink - 0.4) / 0.6)) * keep);
      if (shrink < 1) glyph(a, a.x, a.y, a.r * (1 - 0.75 * shrink), 1 - shrink, Math.exp(-(tc - a.T) * 2));
    }
  };
  const labels = () => {
    tc = ta - off;
    const using = new Array(POOL).fill(null);
    for (let i = Math.max(0, apps.length - POOL); i < apps.length; i++) { const l = labelAt(apps[i]); if (l) using[apps[i].i % POOL] = { a: apps[i], ...l }; }
    pool.forEach((p, j) => {
      const u = using[j];
      if (!u) { if (p.o !== 0) { p.el.style.opacity = '0'; p.o = 0; } return; }
      if (p.text !== u.a.name) { p.el.textContent = u.a.name; p.text = u.a.name; }
      if (!(Math.abs(p.x - u.x) <= 0.05 && Math.abs(p.y - u.y) <= 0.05)) { p.el.style.transform = `translate(${u.x.toFixed(1)}px, ${u.y.toFixed(1)}px)`; p.x = u.x; p.y = u.y; }
      if (!(Math.abs(p.o - u.o) <= 0.004)) { p.el.style.opacity = u.o.toFixed(3); p.o = u.o; }
    });
    showCount();
    if (apps.length && tc >= apps[0].T + 0.05) root.classList.add('is-counting'); // fades in as the first reach rolls up
  };

  const advance = (dt) => { ta += dt; };

  // ---- Coming and going ----------------------------------------------------------------------------------------
  const tick = (now) => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    advance(dt);
    draw(); labels();
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (running || still) return; running = true; last = 0; raf = requestAnimationFrame(tick); };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  const reset = () => {
    gen++;
    timers.forEach(clearTimeout); timers = [];
    ta = 0; off = 0; from = null; handed = false; counted = '';
    root.classList.remove('is-labelled', 'is-counting');
    dots.forEach((d) => { delete d.src; delete d.handed; });
    canvas.style.transition = ''; canvas.style.opacity = '';
    pool.forEach((p) => { p.el.style.transition = ''; p.el.style.opacity = '0'; p.o = 0; });
    coreLabel.style.opacity = ''; count.style.opacity = '';
    countV.textContent = '0'; countU.textContent = '';
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  };
  // Start once the fonts are in (everything is measured from the text) and, on a first load, once the Mycelial mark
  // has landed and the slide shows. A visit that has since ended (gen moved on) never starts.
  let waiting = null, gen = 0;
  const whenOpen = (fn) => {
    const my = gen, go = () => document.fonts.ready.then(() => { if (my === gen && slide.classList.contains('on')) fn(); });
    if (!html.classList.contains('dt-intro')) { go(); return; }
    if (waiting) waiting.disconnect();
    waiting = new MutationObserver(() => { if (!html.classList.contains('dt-intro')) { waiting.disconnect(); waiting = null; go(); } });
    waiting.observe(html, { attributes: true, attributeFilter: ['class'] });
  };
  const quiet = () => timers.push(setTimeout(() => { if (slide.classList.contains('on')) html.classList.add('fl-quiet'); }, 120));
  const begin = () => {
    if (!layout()) return;
    if (still || window.deckNav?.rest) { ta = 40; root.classList.add('is-labelled'); draw(); labels(); if (!still) { html.classList.add('fl-quiet'); start(); } return; }
    ta = -0.15;
    timers.push(setTimeout(() => root.classList.add('is-labelled'), 900));
    quiet();
    start();
  };
  // From slide 7: carry its picture on.
  const handoff = (snap) => {
    if (!layout()) return;
    const b = root.getBoundingClientRect(), v = (p) => ({ ...p, x: p.x - b.left, y: p.y - b.top });
    off = 0.9;
    // Slide 7 gives its mink's centre (else paints her at its lens centre + (4, 8) × its k); she eases to (3, 6) × k.
    const sk = snap.k || k, mink = snap.mink ? { x: snap.mink.x - snap.core.x, y: snap.mink.y - snap.core.y } : { x: 4 * sk, y: 8 * sk };
    from = { core: v(snap.core), machines: (snap.machines || []).map(v), mink, rest: [] };
    // Its people drift out to the nearest places in the crowd, the rest fade; the crowd's own people come in after.
    const free = new Set(dots.filter((d) => d.t0 < 1.4));
    (snap.people || []).map(v).forEach((p, i) => {
      let best = null, bd = Infinity;
      for (const d of free) { const dd = Math.hypot(d.x - p.x, d.y - p.y); if (dd < bd) { bd = dd; best = d; } }
      if (best) { free.delete(best); best.src = { x: p.x, y: p.y, d: 0.2 + (i % 17) * 0.035 }; } else from.rest.push(p);
    });
    window.AstridPays.hide();
    ta = 0;
    html.classList.add('fl-quiet');
    timers.push(setTimeout(() => root.classList.add('is-labelled'), 1400));
    start();
  };
  const paysHost = document.querySelector('[data-astrid-pays]');
  const paysSlide = paysHost && paysHost.closest('.slide');
  slide.addEventListener('dt-arrive', () => { if (armed && slide.classList.contains('on')) { armed = false; whenOpen(begin); } });
  let wasOn = false;
  const watch = new MutationObserver((records) => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    if (on) {
      reset();
      if (window.deckNav?.rest) { whenOpen(begin); return; }
      const fromPays = !still && paysSlide && !paysSlide.classList.contains('on') && records.some((r) => r.target === paysSlide);
      const snap = fromPays && window.AstridPays && window.AstridPays.snapshot();
      if (snap) { handoff(snap); return; }
      layout(); draw(); armed = true;
      timers.push(setTimeout(() => { if (armed) { armed = false; whenOpen(begin); } }, 1500));
    } else {
      armed = false; gen++; stop(); html.classList.remove('fl-quiet');
      if (waiting) { waiting.disconnect(); waiting = null; }
      timers.push(setTimeout(() => { if (!slide.classList.contains('on')) reset(); }, 700));
    }
  });
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (paysSlide) watch.observe(paysSlide, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : slide.classList.contains('on') && ta > 0 && start()));
  window.deckOnResize(() => {
    if (!slide.classList.contains('on')) return;
    // layout rebuilds the crowd in the new geometry. Keep its clock: draw()
    // deterministically recreates every app already due at that phase.
    if (armed || from || ta < END) {
      gen++;
      if (waiting) { waiting.disconnect(); waiting = null; }
      armed = false;
      timers.forEach(clearTimeout); timers = [];
      from = null; off = 0;
      ta = Math.max(ta, END + 0.2);
      root.classList.add('is-labelled');
      html.classList.add('fl-quiet');
    }
    if (layout()) { draw(); labels(); start(); }
  });

  // For slide 9: the core and the visible communities' people, in viewport pixels, so the wheel can grow out of them.
  // The most recent communities go first, then an even sample of the rest, at most HAND people in all.
  const HAND = 900;
  window.AstridFlowers = {
    snapshot() {
      if (!core || ta - off < END) return null;
      tc = ta - off;
      const b = root.getBoundingClientRect(), v = (x, y) => ({ x: b.left + x, y: b.top + y });
      const recent = apps.length ? apps[Math.max(0, apps.length - 12)].i : 0, fresh = [], rest = [];
      for (const d of dots) {
        if (!d.lights.length || tc < d.firstLit + 0.2 || tc < d.t0 + 0.3) continue;
        const Lt = lightAt(d, tc);
        (Lt.app >= recent ? fresh : rest).push([d, Lt.app]);
      }
      const room = Math.max(0, HAND - fresh.length), step = rest.length / Math.max(1, room);
      const chosen = fresh.slice(0, HAND).concat(room ? rest.filter((_, i) => Math.floor(i % step) === 0).slice(0, room) : []);
      const people = chosen.map(([d, app]) => { d.handed = true; const [x, y] = pos(d); return { ...v(x, y), r: d.r * 1.45, bright: d.bright, app }; });
      return { core: { ...v(core.x, core.y), w: core.w, h: core.h, cell }, apps: apps.filter((a) => tc >= a.T).slice(-12).map((a) => ({ ...v(a.x, a.y), r: a.r })), people, k, lw: LW };
    },
    hide() { // fade out as the next slide's picture takes over; its people are drawn there from now on
      handed = true; draw();
      canvas.style.transition = 'opacity .5s ease'; canvas.style.opacity = '0';
      pool.forEach((p) => { p.el.style.transition = 'opacity .4s ease'; p.el.style.opacity = '0'; p.o = 0; });
      coreLabel.style.opacity = '0'; count.style.opacity = '0';
    },
  };

  if (slide.classList.contains('on')) { wasOn = true; layout(); whenOpen(begin); }
})();
