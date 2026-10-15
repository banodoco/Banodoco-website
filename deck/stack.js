// Version F, slide 6: where it goes. Slide 5's product taken apart into one exploded stack of thin
// floating planes beside the text: the preview on top, the timeline's effects and video tracks under
// it, the agent in the middle, then the community's tools and effects, and the models and runtime at
// the foundation, rooted by gold mycelium into the network. Fine gold registration threads tie the
// layers together, small gold labels name them, and the mink perches on the top plane.
// From slide 5 the product itself becomes the stack: the preview lifts and tilts into the top plane,
// the timeline follows as the second, and the chat folds and turns under them into the agent plane;
// the planes part, the tools and runtime come up beneath, then the threads, labels and roots draw in.
// Any other arrival builds it quickly from the foundation up. Once settled the preview plays a light
// study and, now and then, a soft pulse runs down a registration thread to the runtime and back.
(() => {
  const root = document.querySelector('[data-astrid-stack]');
  const M = window.AstridMink;
  if (!root || !M) return;
  const slide = root.closest('.slide');
  const html = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, q) => a + (b - a) * q;
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const easeIO = (q) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
  const seep = (k) => 0.5 - 0.5 * Math.cos(Math.PI * k);
  const now = () => performance.now();
  const RAD = Math.PI / 180;

  // ---- The scene -----------------------------------------------------------------------------
  // Laid out in scene px (the concept's own frame) and fitted to the screen beside the text. Every plane
  // lies at the same tilt, turned a little about its normal, under one perspective whose origin sits to
  // the right; the planes are stacked down the scene with the same clear air between each pair.
  const PERSP = 2600, PO = { x: 1900, y: 420 };
  const TILT = 58, TURN = 4.5, GAP = 34, ROOTS = 100, HEADROOM = 18;
  const PL = [ // top to bottom; centre x and flat size in scene px (centre y is stacked in layout)
    { id: 'preview', label: 'Preview', cx: 1062, cy: 150, w: 780, h: 340 },
    { id: 'timeline', label: 'Timeline', cx: 1058, cy: 0, w: 780, h: 250 },
    { id: 'agent', label: 'Agent', cx: 1054, cy: 0, w: 780, h: 340 },
    { id: 'tools', label: 'Tools & effects', cx: 1050, cy: 0, w: 780, h: 240 },
    { id: 'models', label: 'Models / runtime', cx: 1048, cy: 0, w: 780, h: 230 },
  ];
  const CALLS = [{ at: 2, text: 'build your own' }, { at: 3, text: 'community-made' }];

  const svg = (w, body, o = '') => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"${o}>${body}</svg>`;
  const I = {
    back: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
    fx: svg(16, '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>'),
    film: svg(16, '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
    check: svg(16, '<path d="M5 12.4 9.6 17 19 7.5"/>', ' stroke-width="2.2"'),
    send: svg(17, '<path d="M12 19V5M5 12l7-7 7 7"/>', ' stroke-width="2.4"'),
    beat: svg(44, '<path d="M2 13c2.2 0 2.6-6 4.6-6s2.2 10 4.4 10 2.4-12 4.6-12 2.2 8 4.4 8H22"/>', ' stroke-width="1.3"'),
    up: svg(40, '<path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/>', ' stroke-width="1.3"'),
    grain: '<svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><circle cx="12" cy="4.5" r="1.1"/><circle cx="6" cy="8" r=".9"/><circle cx="17.5" cy="8.5" r="1.2"/><circle cx="11" cy="11" r=".8"/><circle cx="4.5" cy="14" r="1.1"/><circle cx="15" cy="13.5" r=".9"/><circle cx="20" cy="15" r=".8"/><circle cx="9" cy="17" r="1.2"/><circle cx="13.5" cy="19.5" r=".9"/></svg>',
    text: svg(40, '<path d="M5 5h14M12 5v15M9 20h6"/>', ' stroke-width="1.4"'),
    cube: svg(30, '<path d="M12 2.8 20 7.2v9.6L12 21.2 4 16.8V7.2z"/><path d="M4 7.2l8 4.4 8-4.4M12 11.6v9.6"/>', ' stroke-width="1.3"'),
    cloud: svg(30, '<path d="M7.5 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.4 4.3 4.3 0 0 0 7.5 18z"/>', ' stroke-width="1.3"'),
  };
  const SPAN = 30;
  const span = (at, len) => `left:calc(${(at / SPAN) * 100}% + 1px);width:calc(${(len / SPAN) * 100}% - 2px)`;
  const CLIPS = [['first-light', 0, 8], ['passing-shapes', 8, 12], ['quiet-finish', 20, 8]];
  const CONTENT = {
    preview: `<div class="st-screen"><div class="st-pic"><video src="../assets/astrid/first-light.mp4" poster="../assets/astrid/first-light-anchor.jpg" muted loop playsinline preload="auto"></video><span>A quiet light study</span></div></div>
      <div class="st-transport"><b class="st-btn">${I.back}</b><b class="st-btn is-play">${I.pause}</b><span class="st-time">0:02 / 0:28</span><span class="st-pill">1280×720</span></div>`,
    timeline: `<div class="st-th"></div><div class="st-ruler">${[0, 5, 10, 15, 20, 25].map((t) => `<span style="left:${(t / SPAN) * 100}%">0:${String(t).padStart(2, '0')}</span>`).join('')}</div>
      <div class="st-th">${I.fx}<span>V2</span><em>Effects</em></div><div class="st-lane"><span class="st-fx" style="${span(0, 8)}">✦ type-on <em>community-made</em></span><span class="st-fx" style="${span(8, 20)}">✦ audio-reactive-colour <em>community-made</em></span></div>
      <div class="st-th">${I.film}<span>V1</span><em>Video</em></div><div class="st-lane">${CLIPS.map(([n, at, len]) => `<span class="st-clip" style="${span(at, len)};background-image:url(../assets/astrid/${n}-strip.jpg)"><img src="../assets/astrid/${n}-anchor.jpg" alt=""><b>${n}</b><i>video</i></span>`).join('')}<i class="st-head"></i></div>`,
    agent: `<header class="st-chat-head"><span class="st-avatar"><img src="../assets/astrid/mink-profile.png" alt=""></span>Astrid</header>
      <div class="st-rows"><div><span class="st-msg">Generate three anchor images.</span><span class="st-step">${I.check}<span>Generating three anchor images</span><code><b>qwen_image</b> × 3</code></span></div>
        <div><span class="st-msg">Animate them.</span><span class="st-step">${I.check}<span>Animating the anchors</span><code><b>animated_video</b> × 3</code></span></div></div>
      <div class="st-composer"><span class="st-field">Ask Astrid to edit your project…<b>${I.send}</b></span></div>`,
    tools: `<span class="st-tile">${I.beat}beat-sync</span><span class="st-tile">${I.up}upscale</span><span class="st-tile">${I.grain}film grain</span><span class="st-tile">${I.text}text-card</span><span class="st-tag">community-made</span>`,
    models: `<span class="st-comfy">ComfyUI workflows</span><span class="st-mod">${I.cube}Wan</span><i class="st-link"></i><span class="st-mod">${I.cube}LTX-Video</span><i class="st-link"></i><span class="st-mod">${I.cube}Qwen Image</span><span class="st-gpu">${I.cloud}local GPU or cloud</span>`,
  };

  const world = document.createElement('div');
  world.className = 'st-world';
  world.style.perspective = `${PERSP}px`;
  world.style.perspectiveOrigin = `${PO.x}px ${PO.y}px`;
  const planes = PL.map((p, i) => {
    p.i = i;
    const el = document.createElement('div');
    el.className = `st-plane st-${p.id}`;
    el.innerHTML = CONTENT[p.id];
    return el;
  });
  [...planes].reverse().forEach((el) => world.appendChild(el)); // the upper planes paint over the lower
  const cv = document.createElement('canvas');
  cv.className = 'st-threads';
  const g = cv.getContext('2d');
  const minkCv = document.createElement('canvas');
  minkCv.className = 'st-mink';
  const mg = minkCv.getContext('2d');
  const labs = PL.map((p) => { const el = document.createElement('span'); el.className = 'st-lab'; el.textContent = p.label; return el; });
  const calls = CALLS.map((c) => { const el = document.createElement('span'); el.className = 'st-call'; el.textContent = c.text; return el; });
  root.append(world, cv, ...labs, ...calls, minkCv);
  const video = planes[0].querySelector('video');
  const timeEl = planes[0].querySelector('.st-time');
  const head = planes[1].querySelector('.st-head');

  // ---- Plane state and the projection ----------------------------------------------------------
  const MW = 23, MH = 20;
  const settledOf = (p) => ({ x: p.cx, y: p.cy, w: p.w, h: p.h, rx: TILT, rz: TURN, o: 1 });
  const st = PL.map(settledOf);
  const shown = PL.map(() => ({}));
  const apply = () => st.forEach((s, i) => {
    const el = planes[i], was = shown[i];
    if (was.w !== s.w || was.h !== s.h) { el.style.width = `${s.w.toFixed(1)}px`; el.style.height = `${s.h.toFixed(1)}px`; }
    if (was.x !== s.x || was.y !== s.y || was.w !== s.w || was.h !== s.h) { el.style.left = `${(s.x - s.w / 2).toFixed(1)}px`; el.style.top = `${(s.y - s.h / 2).toFixed(1)}px`; }
    if (was.rx !== s.rx || was.rz !== s.rz) el.style.transform = `rotateX(${s.rx.toFixed(2)}deg) rotateZ(${s.rz.toFixed(2)}deg)`;
    if (was.o !== s.o) el.style.opacity = s.o.toFixed(3);
    Object.assign(was, s);
  });
  const view = { k: 1, ox: 0, oy: 0, mobile: false };
  // A point (u, v) from a plane's centre, in its own px, into the scene: exactly what CSS does with
  // rotateX(rx) rotateZ(rz) about the centre under the scene's perspective. project() goes on to the screen.
  const projW = (s, u, v) => {
    const a = s.rz * RAD, b = s.rx * RAD;
    const x1 = u * Math.cos(a) - v * Math.sin(a), y1 = u * Math.sin(a) + v * Math.cos(a);
    const X = s.x + x1, Y = s.y + y1 * Math.cos(b), Z = y1 * Math.sin(b);
    const f = PERSP / (PERSP - Z);
    return { x: PO.x + (X - PO.x) * f, y: PO.y + (Y - PO.y) * f };
  };
  const toS = (p) => ({ x: view.ox + view.k * p.x, y: view.oy + view.k * p.y });
  const project = (s, u, v) => toS(projW(s, u, v));
  const toWorld = (r) => ({ x: (r.left + r.width / 2 - view.ox) / view.k, y: (r.top + r.height / 2 - view.oy) / view.k, w: r.width / view.k, h: r.height / view.k });
  // Each plane's far edge sits GAP below the near edge of the one above it.
  const stackUp = () => {
    let near = 0;
    PL.forEach((p, i) => {
      if (i) for (let n = 0; n < 4; n++) p.cy += near + GAP - projW(settledOf(p), 0, -p.h / 2).y;
      near = projW(settledOf(p), 0, p.h / 2).y;
    });
  };

  // ---- Layout ------------------------------------------------------------------------------------
  let dpr = 1, cell = 3, geo = null;
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const layout = () => {
    const W = innerWidth, H = innerHeight;
    view.mobile = W <= 760;
    stackUp();
    // The whole picture's extent in scene px: labels to callouts, the mink's head to the roots' ends.
    const S = PL.map(settledOf);
    const cw = S.map((s) => ({
      nl: projW(s, -s.w / 2 + 3, s.h / 2 - 3), nr: projW(s, s.w / 2 - 3, s.h / 2 - 3), fr: projW(s, s.w / 2 - 3, -s.h / 2 + 3), fl: projW(s, -s.w / 2 + 3, -s.h / 2 + 3),
      lm: projW(s, -s.w / 2, 0), rm: projW(s, s.w / 2, 0),
    }));
    labs.concat(calls).forEach((el) => { el.style.fontSize = '22px'; });
    const labW = Math.max(...labs.map((el) => el.offsetWidth)), callW = Math.max(0, ...calls.map((el) => el.offsetWidth));
    const colXw = Math.min(...cw.map((c) => c.lm.x)) - 64, callXw = Math.max(...cw.map((c) => c.rm.x)) + 46;
    const perchW = projW(S[0], -S[0].w / 2 + 0.16 * S[0].w, -S[0].h / 2 + 2);
    const h1 = slide.querySelector('h1').getBoundingClientRect();
    const Rg = view.mobile ? { l: 8, r: W - 8, t: h1.bottom + 14, b: H - 70 } : { l: h1.right + 28, r: W - 48, t: 22, b: H - 66 };
    const fsOf = (k) => Math.max(view.mobile ? 10 : 12, 22 * k);
    const box = { r: view.mobile ? Math.max(...cw.map((c) => Math.max(c.fr.x, c.nr.x))) + 12 : callXw + 14 + callW,
      t: perchW.y - MH * 3.6 - HEADROOM, b: Math.max(cw[4].nl.y, cw[4].nr.y) + ROOTS };
    let k = 1;
    for (let n = 0; n < 3; n++) { // the labels keep a legible size, so their extent depends on the scale
      box.l = colXw - (12 + labW) * (fsOf(k) / 22) / k;
      k = Math.min((Rg.r - Rg.l) / (box.r - box.l), (Rg.b - Rg.t) / (box.b - box.t));
    }
    view.k = k;
    view.ox = (Rg.l + Rg.r) / 2 - ((box.l + box.r) / 2) * k;
    view.oy = (Rg.t + Rg.b) / 2 - ((box.t + box.b) / 2) * k;
    world.style.transform = `translate(${view.ox.toFixed(1)}px, ${view.oy.toFixed(1)}px) scale(${k.toFixed(4)})`;
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cell = Math.max(1, Math.round(k * 3.4));
    // Settled geometry, in screen px: the corners the threads tie together, the labels' and callouts' places, the roots.
    const corners = cw.map((c) => Object.fromEntries(Object.entries(c).map(([key, p]) => [key, toS(p)])));
    const colX = toS({ x: colXw, y: 0 }).x, callX = toS({ x: callXw, y: 0 }).x;
    const fs = fsOf(k);
    labs.forEach((el, i) => {
      el.style.fontSize = `${fs.toFixed(1)}px`;
      el.style.left = `${(colX - 12 * k).toFixed(1)}px`; el.style.top = `${corners[i].lm.y.toFixed(1)}px`;
    });
    calls.forEach((el, j) => {
      el.style.fontSize = `${fs.toFixed(1)}px`;
      el.style.left = `${(callX + 14 * k).toFixed(1)}px`; el.style.top = `${corners[CALLS[j].at].rm.y.toFixed(1)}px`;
    });
    // Roots: fine threads that wander down from under the foundation, branching now and then.
    const R = rng(7), roots = [], base = corners[4];
    const grow = (x, y, ang, len, depth, delay) => {
      const pts = [[x, y]];
      let a = ang;
      for (let d = 0; d < len; d += 5 * k) {
        a += (R() - 0.5) * 0.45 + (Math.PI / 2 - a) * 0.04;
        x += Math.cos(a) * 5 * k; y += Math.sin(a) * 5 * k;
        pts.push([x, y]);
      }
      roots.push({ pts, depth, delay, w: depth ? 0.6 : 0.9, a: depth ? 0.4 : 0.6, dots: pts.filter((_, n) => n > 3 && R() < 0.06) });
      if (depth < 2) for (let b = 0; b < 2; b++) if (R() < 0.7) {
        const at = Math.floor(pts.length * (0.3 + R() * 0.5)), [bx, by] = pts[at];
        grow(bx, by, a + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.6), len * (0.35 + R() * 0.3), depth + 1, delay + (at / pts.length) * 0.5);
      }
    };
    for (let j = 0; j < 15; j++) {
      const q = (j + 0.5) / 15, x = lerp(base.nl.x, base.nr.x, q) + (R() - 0.5) * 20 * k, y = lerp(base.nl.y, base.nr.y, q) - 4 * k;
      grow(x, y, Math.PI / 2 + (q - 0.5) * 1.5 + (R() - 0.5) * 0.5, (40 + R() * 62) * k, 0, R() * 0.35);
    }
    // A few long threads arc out to the right from the stack's far corners, into the network.
    const arcs = [0, 1, 2, 3, 4].map((i) => {
      const c = corners[i].fr, pts = [];
      const dx = (90 + 60 * R()) * k, dy = (80 + 70 * R()) * k;
      for (let t = 0; t <= 1.0001; t += 0.04) pts.push([c.x + dx * Math.sin(t * Math.PI / 2) * (1 + 0.15 * t), c.y + dy * (1 - Math.cos(t * Math.PI / 2))]);
      return { pts, dots: [0.45 + 0.2 * R(), 0.9 + 0.1 * R()] };
    });
    geo = { corners, colX, callX, roots, arcs };
  };

  // ---- The mink ----------------------------------------------------------------------------------
  const paintMink = (x, y, c, upto = 1) => {
    const u = c * dpr;
    if (minkCv.width !== MW * u) { minkCv.width = MW * u; minkCv.height = MH * u; minkCv.style.width = `${MW * c}px`; minkCv.style.height = `${MH * c}px`; }
    const P = M.POSES.profile;
    mg.clearRect(0, 0, minkCv.width, minkCv.height);
    for (let r = 0; r < MH; r++) for (let q = 0; q < MW; q++) {
      const ch = P[r][q];
      if (ch === '.' || (r + (22 - q) * 0.35) / (19 + 22 * 0.35) > upto) continue; // from the head down the neck
      mg.fillStyle = M.COLORS[ch];
      mg.fillRect(q * u, r * u, u, u);
    }
    minkCv.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };
  // Her place on the top plane's far edge, as the plane stands now (or settled).
  const perchOf = (s = settledOf(PL[0])) => {
    const p = project(s, -s.w / 2 + 0.16 * s.w, -s.h / 2 + 2);
    return { x: p.x - Math.round(MW * cell * 0.42), y: p.y - MH * cell + Math.round(cell * 0.5), c: cell };
  };

  // ---- Drawing the threads -----------------------------------------------------------------------
  // sh: how far the registration threads have drawn (top down); lb: the labels' leaders, per plane;
  // cl: the callouts; rt: the roots' growth; pulse: the ambient bead, if any.
  const vis = { sh: 1, lb: PL.map(() => 1), cl: CALLS.map(() => 1), rt: 1, pulse: null };
  const GOLD = (a) => `rgba(240,200,119,${a.toFixed(3)})`;
  const dot = (x, y, r, a) => {
    if (a <= 0.01) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 4);
    gr.addColorStop(0, `rgba(255,226,170,${(0.55 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,217,145,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(255,236,200,${a.toFixed(3)})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  const partial = (pts, q) => { // a polyline drawn to fraction q of its points
    if (q <= 0) return;
    const n = (pts.length - 1) * q, m = Math.floor(n);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= m; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (m < pts.length - 1) { const f = n - m, a = pts[m], b = pts[m + 1]; g.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); }
    g.stroke();
  };
  const RUNS = ['nl', 'nr', 'fr'];
  const draw = () => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    if (!geo) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const { corners: C, roots, arcs } = geo, k = view.k;
    // Roots under the foundation, and the long threads out to the right.
    if (vis.rt > 0) {
      for (const r of roots) {
        const q = clamp((vis.rt - r.delay) / (1 - r.delay * 0.6));
        if (q <= 0) continue;
        g.lineWidth = r.w; g.strokeStyle = GOLD(r.a * (0.6 + 0.4 * q));
        partial(r.pts, ease(q));
        const tip = clamp((q - 0.85) / 0.15);
        if (tip > 0) { const [x, y] = r.pts.at(-1); dot(x, y, 1, 0.75 * tip); r.dots.forEach(([dx, dy]) => dot(dx, dy, 0.8, 0.5 * tip)); }
      }
      g.lineWidth = 0.6;
      for (const a of arcs) {
        g.strokeStyle = GOLD(0.22); partial(a.pts, ease(vis.rt));
        a.dots.forEach((d) => { if (vis.rt > d) { const p = a.pts[Math.round(d * (a.pts.length - 1))]; dot(p[0], p[1], 1.1, 0.55 * clamp((vis.rt - d) * 5)); } });
      }
    }
    // Registration threads, corner to corner down the stack, drawn from the top.
    if (vis.sh > 0) {
      g.lineWidth = 0.8; g.setLineDash([1.6, 3.4]);
      const segs = C.length - 1;
      for (const key of RUNS) {
        g.strokeStyle = GOLD(key === 'fr' ? 0.38 : 0.55);
        for (let i = 0; i < segs; i++) {
          const q = clamp(vis.sh * segs - i);
          if (q <= 0) break;
          const a = C[i][key], b = C[i + 1][key];
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(lerp(a.x, b.x, q), lerp(a.y, b.y, q)); g.stroke();
        }
      }
      g.setLineDash([]);
      C.forEach((c, i) => { const a = clamp(vis.sh * segs - i + 1); RUNS.forEach((key) => dot(c[key].x, c[key].y, 1.9, a * (key === 'fr' ? 0.75 : 1))); dot(c.fl.x, c.fl.y, 1.4, a * 0.55); });
    }
    // Label leaders: a dot in the label column and a fine line to the plane's left edge.
    vis.lb.forEach((q, i) => {
      if (q <= 0) return;
      const m = C[i].lm, x0 = geo.colX, x1 = m.x - 8 * k;
      g.lineWidth = 0.8; g.strokeStyle = GOLD(0.55 * q);
      g.beginPath(); g.moveTo(x0, m.y); g.lineTo(lerp(x0, x1, ease(q)), m.y); g.stroke();
      dot(x0, m.y, 1.8, q);
      labs[i].style.opacity = (q * q).toFixed(3);
    });
    vis.cl.forEach((q, j) => {
      if (q <= 0 || view.mobile) return; // no callouts on a phone
      const m = C[CALLS[j].at].rm, x0 = m.x + 8 * k, x1 = geo.callX;
      g.lineWidth = 0.8; g.strokeStyle = GOLD(0.5 * q);
      g.beginPath(); g.moveTo(x0, m.y); g.lineTo(lerp(x0, x1, ease(q)), m.y); g.stroke();
      dot(x1, m.y, 1.8, q);
      calls[j].style.opacity = (q * q).toFixed(3);
    });
    // The pulse: a bead of light running down a registration thread to the runtime and back.
    const p = vis.pulse;
    if (p && p.a > 0.01) {
      const segs = C.length - 1 - p.from;
      const along = (q) => { const d = clamp(q) * segs, i = Math.min(segs - 1, Math.floor(d)), a = C[p.from + i][p.key], b = C[p.from + i + 1][p.key]; return [lerp(a.x, b.x, d - i), lerp(a.y, b.y, d - i)]; };
      const [x, y] = along(p.q), [tx, ty] = along(p.q - 0.09 * p.dir / Math.max(1, segs / 2));
      const tail = g.createLinearGradient(tx, ty, x, y);
      tail.addColorStop(0, GOLD(0)); tail.addColorStop(1, GOLD(0.75 * p.a));
      g.lineWidth = 1.3; g.strokeStyle = tail;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke();
      dot(x, y, 2.2, p.a);
      if (p.glow > 0) { const r = C[C.length - 1][p.key]; dot(r.x, r.y, 3, p.glow); }
    }
  };

  // ---- States ------------------------------------------------------------------------------------
  const hideAll = () => {
    st.forEach((s, i) => Object.assign(s, settledOf(PL[i]), { o: 0 }));
    apply();
    vis.sh = 0; vis.lb = PL.map(() => 0); vis.cl = CALLS.map(() => 0); vis.rt = 0; vis.pulse = null;
    labs.concat(calls).forEach((el) => { el.style.opacity = '0'; });
    minkCv.style.opacity = '0';
    draw();
  };
  const settleAll = () => {
    st.forEach((s, i) => Object.assign(s, settledOf(PL[i])));
    apply();
    vis.sh = 1; vis.lb = PL.map(() => 1); vis.cl = CALLS.map(() => 1); vis.rt = 1; vis.pulse = null;
    const m = perchOf(); paintMink(m.x, m.y, m.c); minkCv.style.opacity = '1';
    draw();
  };

  // ---- Arriving ----------------------------------------------------------------------------------
  // build: { t0, from5, src } while the stack is assembling; ambient afterwards.
  let build = null, amb = null;
  const FROM5 = { a: [[0.05, 1.3], [0.12, 1.42], [0.2, 1.62]], spread: [1.0, 2.1], low: [[1.3, 2.2], [1.5, 2.4]], fade: 0.35,
    mink: [0.15, 1.35], sh: [1.9, 2.9], lb: 2.05, cl: 2.55, rt: [2.0, 3.4], end: 3.4 };
  const QUICK = { rise: 0.12, dur: 0.75, mink: [1.0, 0.45], sh: [0.95, 1.75], lb: 1.05, cl: 1.45, rt: [1.0, 2.25], end: 2.25 };
  const demo = document.querySelector('[data-astrid-demo]');
  const slide5 = demo && demo.closest('.slide');
  const snapFrom5 = () => {
    const q = (sel) => { const el = demo.querySelector(sel); const r = el && el.getBoundingClientRect(); return r && r.width > 4 && r.height > 4 ? r : null; };
    const rects = [q('.as-player'), q('.as-timeline'), q('.as-chat')];
    if (rects.some((r) => !r)) return null;
    const mr = q('.as-mink');
    const c5 = mr ? Math.max(1, Math.round(mr.width / MW)) : cell;
    return { planes: rects.map(toWorld), mink: mr ? { x: mr.left, y: mr.top + 3 * c5, c: c5 } : null }; // slide 5 keeps 3 spare rows above her
  };
  const begin = (from5) => {
    layout();
    const t0 = now();
    if (from5) {
      const src = snapFrom5();
      if (src) {
        build = { t0, from5: true, src };
        hideAll();
        step(t0);
        return;
      }
    }
    build = { t0, from5: false };
    hideAll();
    step(t0);
  };
  const k01 = (e, [a, b]) => clamp((e - a) / (b - a));
  const stepBuild = (t) => {
    const e = (t - build.t0) / 1000;
    if (build.from5) {
      const T = FROM5, src = build.src.planes, sp = easeIO(k01(e, T.spread)), mid = PL[2].cy;
      for (let i = 0; i < 3; i++) { // preview, timeline, agent: from slide 5's panels, tilting into the stack
        const p = PL[i], s = st[i], qa = easeIO(k01(e, T.a[i])), f = src[i];
        const ty = lerp(mid + (p.cy - mid) * 0.72, p.cy, sp);
        s.x = lerp(f.x, p.cx, qa); s.y = lerp(f.y, ty, qa); s.w = lerp(f.w, p.w, qa); s.h = lerp(f.h, p.h, qa);
        s.rx = TILT * qa; s.rz = TURN * qa - (i === 2 ? 16 * Math.sin(Math.PI * qa) : 0);
        s.o = seep(clamp((e - T.a[i][0] + 0.05) / T.fade));
      }
      for (let j = 0; j < 2; j++) { // the tools and the runtime come up beneath
        const p = PL[3 + j], s = st[3 + j], q = ease(k01(e, T.low[j]));
        Object.assign(s, settledOf(p), { y: p.cy + 50 * (1 - q), rx: TILT + 12 * (1 - q), o: seep(q) });
      }
      if (build.src.mink) {
        const a = build.src.mink, b = perchOf(st[0]), q = easeIO(k01(e, T.mink));
        const c = Math.round(lerp(a.c, b.c, q)), lift = Math.sin(Math.PI * q) * 40 * view.k;
        paintMink(lerp(a.x, b.x, q), lerp(a.y, b.y, q) - lift, c);
      } else if (e >= T.mink[1]) { const m = perchOf(st[0]); paintMink(m.x, m.y, m.c); }
      minkCv.style.opacity = '1';
      vis.sh = k01(e, T.sh); vis.rt = k01(e, T.rt);
      vis.lb = PL.map((_, i) => clamp((e - T.lb - i * 0.1) / 0.55));
      vis.cl = CALLS.map((_, j) => clamp((e - T.cl - j * 0.15) / 0.55));
    } else {
      const T = QUICK;
      for (let i = 0; i < 5; i++) { // from the foundation up
        const p = PL[i], q = ease(clamp((e - (4 - i) * T.rise) / T.dur));
        Object.assign(st[i], settledOf(p), { y: p.cy + 46 * (1 - q), rx: TILT + 10 * (1 - q), o: seep(q) });
      }
      const qm = (e - T.mink[0]) / T.mink[1];
      if (qm > 0) { const m = perchOf(st[0]); paintMink(m.x, m.y, m.c, clamp(qm)); minkCv.style.opacity = '1'; }
      vis.sh = k01(e, T.sh); vis.rt = k01(e, T.rt);
      vis.lb = PL.map((_, i) => clamp((e - T.lb - i * 0.07) / 0.45));
      vis.cl = CALLS.map((_, j) => clamp((e - T.cl - j * 0.12) / 0.45));
    }
    apply();
    draw();
    if (e >= (build.from5 ? FROM5.end : QUICK.end)) { build = null; settleAll(); amb = { next: t + 1800 }; }
  };

  // ---- Ambient -----------------------------------------------------------------------------------
  // The preview plays its light study; the playhead and clock follow it. Every few seconds a pulse
  // runs down one registration thread from a layer to the runtime, glows there, and runs back.
  let turnOf = 0;
  const DOWN = 1.7, HOLD = 0.6;
  const stepAmbient = (t) => {
    if (!amb) return;
    if (!vis.pulse && t >= amb.next) {
      const from = [0, 2, 1, 3][turnOf % 4], key = turnOf % 2 ? 'nr' : 'nl';
      turnOf++;
      vis.pulse = { t0: t, from, key, q: 0, a: 0, glow: 0, dir: 1 };
    }
    const p = vis.pulse;
    if (p) {
      const e = (t - p.t0) / 1000, dn = DOWN * (4 - p.from) / 4 + 0.5;
      if (e < dn) { p.q = easeIO(e / dn); p.dir = 1; p.glow = 0; } else if (e < dn + HOLD) { p.q = 1; p.glow = Math.sin(Math.PI * (e - dn) / HOLD); } else { p.q = 1 - easeIO(clamp((e - dn - HOLD) / dn)); p.dir = -1; p.glow = 0; }
      p.a = Math.min(clamp(e / 0.3), clamp((2 * dn + HOLD - e) / 0.3)) * 0.85;
      if (e >= 2 * dn + HOLD) { vis.pulse = null; amb.next = t + 5200 + ((turnOf * 1777) % 2600); }
      draw();
    }
  };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let shownSec = -1;
  const stepHead = () => {
    const tt = video.currentTime || 0;
    head.style.left = `${((tt / SPAN) * 100).toFixed(3)}%`;
    const sec = Math.floor(tt);
    if (sec !== shownSec) { shownSec = sec; timeEl.textContent = `${fmt(sec)} / 0:28`; }
  };

  // ---- Clock ---------------------------------------------------------------------------------------
  let running = false, raf = 0;
  const step = (t) => {
    if (build) stepBuild(t);
    else stepAmbient(t);
    stepHead();
  };
  const tick = (t) => {
    raf = 0;
    if (!running) return;
    step(t);
    raf = requestAnimationFrame(tick);
  };
  const wake = () => { if (running && !raf) raf = requestAnimationFrame(tick); };
  const play = () => { if (!still && running) video.play().catch(() => {}); };

  // As on slide 5, the network stays visible behind; only where its threads pass behind the text are they softened.
  // Only ever clear a mask this slide set, so a neighbour that set its own (slide 5) keeps it.
  const net = document.querySelector('.dt-net');
  let netMask = '';
  const softenNet = (on) => {
    if (!net) return;
    if (!on) { if (netMask && net.style.maskImage === netMask) { net.style.maskImage = net.style.webkitMaskImage = ''; net.style.maskMode = ''; } netMask = ''; return; }
    const b = slide.querySelector('.split').getBoundingClientRect(), W = innerWidth, H = innerHeight, pad = 14;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><filter id='f'><feGaussianBlur stdDeviation='12'/></filter><rect width='${W}' height='${H}' fill='white'/><rect x='${Math.round(b.left - pad)}' y='${Math.round(b.top - pad)}' width='${Math.round(b.width + 2 * pad)}' height='${Math.round(b.height + 2 * pad)}' rx='18' fill='black' fill-opacity='.75' filter='url(%23f)'/></svg>`;
    net.style.maskImage = net.style.webkitMaskImage = `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
    net.style.maskMode = 'luminance';
    net.style.maskSize = '100% 100%';
    netMask = net.style.maskImage;
  };

  let waitArrive = null, timers = [];
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; if (waitArrive) { waitArrive.disconnect(); waitArrive = null; } };
  const start = (from5) => {
    running = true;
    slide.classList.remove('st-arrive');
    softenNet(true);
    if (still) { layout(); settleAll(); stepHead(); return; }
    if (from5) { // the product moves at once; the slide must not fade in under it
      slide.classList.add('st-arrive');
      timers.push(setTimeout(() => slide.classList.remove('st-arrive'), 900));
      try { video.currentTime = 2; } catch (e) { /* not loaded */ }
      begin(true); play(); wake();
      return;
    }
    hideAll();
    const go = () => { if (running && !build && !amb) { begin(false); play(); wake(); } };
    if (html.classList.contains('dt-intro')) { // a first load: the Mycelial mark plays first
      waitArrive = new MutationObserver(() => { if (!html.classList.contains('dt-intro')) { waitArrive.disconnect(); waitArrive = null; timers.push(setTimeout(go, 250)); } });
      waitArrive.observe(html, { attributes: true, attributeFilter: ['class'] });
      return;
    }
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => timers.push(setTimeout(go, 1300))); // if the network never says it has arrived
  };
  slide.addEventListener('dt-arrive', () => { if (running && !build && !amb && !still && !html.classList.contains('dt-intro')) { clearTimers(); begin(false); play(); wake(); } });
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clearTimers();
    build = null; amb = null; vis.pulse = null;
    slide.classList.remove('st-arrive');
    softenNet(false);
    video.pause();
  };

  let wasOn = false;
  const watch = new MutationObserver((records) => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    if (!on) { stop(); timers.push(setTimeout(() => { if (!slide.classList.contains('on')) hideAll(); }, 700)); return; }
    const from5 = !still && !!slide5 && !slide5.classList.contains('on') && records.some((r) => r.target === slide5);
    start(from5);
  });
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (slide5) watch.observe(slide5, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else play(); });
  let resizing = 0;
  addEventListener('resize', () => {
    clearTimeout(resizing);
    resizing = setTimeout(() => {
      if (!slide.classList.contains('on')) return;
      layout();
      softenNet(true);
      if (!build) { if (amb || still) settleAll(); }
    }, 100);
  });
  // Clicks on the stack stay here; they never turn the slide.
  root.addEventListener('click', (e) => { if (e.target.closest('.st-plane, .st-mink')) e.stopPropagation(); });
  video.addEventListener('loadeddata', () => { if (still) stepHead(); });

  layout();
  hideAll();
  if (slide.classList.contains('on')) { wasOn = true; start(false); }
})();
