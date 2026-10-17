// Version F, slide 6: where it goes. Slide 5's product taken apart into one exploded stack of thin
// floating planes on the left, the text on the right, top to bottom: rendering, editing, effects, the agent's tools,
// and the models and runtime at the foundation, rooted by gold mycelium into the network. The mink
// perches on the top plane.
// Each layer has a named flag sticking out to the left on a fine gold leader. Hovering, focusing or
// tapping a flag (or its plane) unfolds it into a small card: what can be customised there, in a line,
// and a few real examples. A guide, a mote of light in the deck's own language, tours the layers on its
// own: it rides the planes' left edges from flag to flag, and each layer's card opens as it arrives and closes
// as it leaves, so all five are seen without a touch. Hover takes over; leaving hands back to the tour
// after a short pause. The layer being explained lifts a little and its rim glows.
// From slide 5 the product itself becomes the stack: the top planes begin as exact copies of slide 5's
// preview, timeline and chat, the chat folding under into the agent's plane; the planes part, effects and
// runtime come up into place, then the threads, flags and roots draw in. Any other arrival builds from the
// foundation up. Hovering the mink flashes her eye; clicking her turns her to face you, as on slide 5.
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
  // Keep absolute animation timestamps on the same clock across a pause.
  let paused = false, pausedAt = 0, pausedTime = 0;
  let pendingStart = null, pausedVideos = [];
  const motionBlocked = () => document.hidden || document.getElementById('overview')?.classList.contains('on') || window.deckStill?.();
  let paceOffset = 0, paceAt = performance.now();
  const now = () => {
    const real = (paused ? pausedAt : performance.now()) - pausedTime;
    paceOffset += Math.max(0, real - paceAt) * ((window.deckPace?.() || 1) - 1);
    paceAt = real;
    return real + paceOffset;
  };
  const RAD = Math.PI / 180;

  // ---- The scene -----------------------------------------------------------------------------
  // Laid out in scene px (the concept's own frame) and fitted to the screen beside the text. Every plane
  // lies at the same tilt, turned a little about its normal, under one perspective whose origin sits to
  // the right; the planes are stacked down the scene with the same clear air between each pair.
  // The stack stands on the left of the slide and opens toward the text on the right: its perspective is
  // seen from the left and every plane is turned a little the other way (a mirror of the first layout).
  const PERSP = 2600, PO = { x: 210, y: 420 };
  const TILT = 58, TURN = -4.5, GAP = 34, ROOTS = 100, HEADROOM = 18;
  const PL = [ // top to bottom; centre x and flat size in scene px (centre y is stacked in layout); kind: what the plane shows
    { id: 'render', kind: 'preview', cx: 1062, cy: 150, w: 780, h: 340 },
    { id: 'timeline', kind: 'timeline', cx: 1058, cy: 0, w: 780, h: 250 },
    { id: 'effects', kind: 'tools', cx: 1054, cy: 0, w: 780, h: 240 },
    { id: 'agent', kind: 'agent', cx: 1052, cy: 0, w: 780, h: 340 },
    { id: 'models', kind: 'models', cx: 1048, cy: 0, w: 780, h: 230 },
  ];
  // What each layer is for, in a line, and a few real examples (projects named as they name themselves).
  const TAGS = [
    { name: 'Rendering', short: 'Rendering', line: 'What turns the timeline into frames. Swap it and the same edit becomes a new kind of film.',
      ex: [['Remotion', 'video as React code'], ['Three.js', 'live 3D scenes'], ['HyperFrames by HeyGen', 'HTML to video'], ['HTML, CSS &amp; canvas', 'the web’s own tools']],
      foot: 'or plug in a renderer of your own' },
    { name: 'Editing', short: 'Editing', line: 'Ways to shape the cut itself: find the moment, trim it, time it to the music.',
      ex: [['Transcript view', 'edit by editing the words'], ['Beat markers', 'cuts that land on the beat'], ['Shot lists &amp; storyboards', 'plan, then fill in'], ['Captions', 'timed, styled text']],
      foot: 'or build an editing tool of your own' },
    { name: 'Effects', short: 'Effects', line: 'Looks and graphics over the footage, made and shared by the community.',
      ex: [['<code>type-on</code> · <code>text-card</code>', 'self-writing titles'], ['<code>audio-reactive-colour</code>', 'colour on the beat'], ['Shader looks &amp; film grain', 'texture for a whole film'], ['Motion graphics', 'animated type and shapes']],
      foot: 'community-made, or make your own' },
    { name: 'Agent tools', short: 'Agent tools', line: 'What the agent reaches for when you ask. Each new tool widens what it can do.',
      ex: [['<code>qwen_image</code> → <code>animated_video</code>', 'stills, then motion'], ['Editing tools', 'trim, retime, rearrange'], ['Timeline visualisers', 'show what it finds'], ['Effect tools', 'apply a look, then tune it']],
      foot: 'give the agent new tools' },
    { name: 'Models / runtime', short: 'Models', line: 'Where the work runs: open models, on your own GPU or in the cloud.',
      ex: [['ComfyUI workflows', 'graphs the community shares'], ['Wan2GP', 'video models on modest GPUs'], ['Diffusers', 'Hugging Face’s model library'], ['ai-toolkit', 'train a LoRA on your style']],
      more: 'Wan · LTX-Video · Qwen Image · local GPU or cloud', foot: '…and many more' },
  ];

  const svg = (w, body, o = '') => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"${o}>${body}</svg>`;
  const I = {
    back: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
    fx: svg(16, '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>'),
    film: svg(16, '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
    check: svg(16, '<path d="M5 12.4 9.6 17 19 7.5"/>', ' stroke-width="2.2"'),
    send: svg(17, '<path d="M12 19V5M5 12l7-7 7 7"/>', ' stroke-width="2.4"'),
    beat: svg(44, '<path d="M2 13c2.2 0 2.6-6 4.6-6s2.2 10 4.4 10 2.4-12 4.6-12 2.2 8 4.4 8H22"/>', ' stroke-width="1.3"'),
    grain: '<svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><circle cx="12" cy="4.5" r="1.1"/><circle cx="6" cy="8" r=".9"/><circle cx="17.5" cy="8.5" r="1.2"/><circle cx="11" cy="11" r=".8"/><circle cx="4.5" cy="14" r="1.1"/><circle cx="15" cy="13.5" r=".9"/><circle cx="20" cy="15" r=".8"/><circle cx="9" cy="17" r="1.2"/><circle cx="13.5" cy="19.5" r=".9"/></svg>',
    typeon: svg(40, '<path d="M4 6h11M9.5 6v13M18.5 7.5v11"/>', ' stroke-width="1.4"'),
    card: svg(40, '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M7 10.5h10M7 14h6"/>', ' stroke-width="1.3"'),
    cube: svg(30, '<path d="M12 2.8 20 7.2v9.6L12 21.2 4 16.8V7.2z"/><path d="M4 7.2l8 4.4 8-4.4M12 11.6v9.6"/>', ' stroke-width="1.3"'),
    cloud: svg(30, '<path d="M7.5 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.4 4.3 4.3 0 0 0 7.5 18z"/>', ' stroke-width="1.3"'),
  };
  const SPAN = 30;
  const span = (at, len) => `left:calc(${(at / SPAN) * 100}% + 1px);width:calc(${(len / SPAN) * 100}% - 2px)`;
  const CLIPS = [['first-light', 0, 8], ['passing-shapes', 8, 12], ['quiet-finish', 20, 8]];
  const CONTENT = {
    preview: `<div class="st-screen"><div class="st-pic"><video data-src="../assets/astrid/first-light.mp4?v=e9ac50e" poster="../assets/astrid/first-light-anchor.jpg?v=e9ac50e" muted loop playsinline preload="none"></video><span>A quiet light study</span></div></div>
      <div class="st-transport"><b class="st-btn">${I.back}</b><b class="st-btn is-play">${I.pause}</b><span class="st-time">0:02 / 0:28</span><span class="st-pill">1280×720</span></div>`,
    timeline: `<div class="st-th"></div><div class="st-ruler">${[0, 5, 10, 15, 20, 25].map((t) => `<span style="left:${(t / SPAN) * 100}%">0:${String(t).padStart(2, '0')}</span>`).join('')}${Array.from({ length: 24 }, (_, n) => `<i class="st-beat" style="left:${(((n + 0.5) * 1.2) / SPAN * 100).toFixed(2)}%"></i>`).join('')}</div>
      <div class="st-th">${I.fx}<span>V2</span><em>Effects</em></div><div class="st-lane"><span class="st-fx" style="${span(0, 8)}">✦ type-on <em>community-made</em></span><span class="st-fx" style="${span(8, 20)}">✦ audio-reactive-colour <em>community-made</em></span></div>
      <div class="st-th">${I.film}<span>V1</span><em>Video</em></div><div class="st-lane">${CLIPS.map(([n, at, len]) => `<span class="st-clip" style="${span(at, len)};background-image:url(../assets/astrid/${n}-strip.jpg?v=e9ac50e)"><img src="../assets/astrid/${n}-anchor.jpg?v=e9ac50e" alt=""><b>${n}</b><i>video</i></span>`).join('')}<i class="st-head"></i></div>`,
    agent: `<header class="st-chat-head"><span class="st-avatar"><img src="../assets/astrid/mink-profile.png?v=e9ac50e" alt=""></span>Astrid</header>
      <div class="st-rows"><div><span class="st-msg">Generate three anchor images.</span><span class="st-step">${I.check}<span>Generating three anchor images</span><code><b>qwen_image</b> × 3</code></span></div>
        <div><span class="st-msg">Animate them.</span><span class="st-step">${I.check}<span>Animating the anchors</span><code><b>animated_video</b> × 3</code></span></div></div>
      <div class="st-composer"><span class="st-field">Ask Astrid to edit your project…<b>${I.send}</b></span></div>`,
    tools: `<span class="st-tile">${I.typeon}type-on</span><span class="st-tile">${I.card}text-card</span><span class="st-tile">${I.beat}<span>audio-reactive-<br>colour</span></span><span class="st-tile">${I.grain}film grain</span><span class="st-tag">community-made</span>`,
    models: `<span class="st-comfy">ComfyUI workflows</span><span class="st-mod">${I.cube}Wan</span><i class="st-link"></i><span class="st-mod">${I.cube}LTX-Video</span><i class="st-link"></i><span class="st-mod">${I.cube}Qwen Image</span><span class="st-gpu">${I.cloud}local GPU or cloud</span>`,
  };

  // In Chromium the world is laid out at its size on screen (CSS zoom) rather than at the scene's size and scaled down:
  // a plane under the perspective is rasterized at its laid-out size, so scale(k) had each rasterized at up to 1/k its
  // pixels on screen. Every length in the world scales by k, its perspective included, so the picture is the same.
  // WebKit lays a zoomed world out differently on a phone (its smallest type is held up, and the planes shift), so
  // there, and in other engines, the world is still scaled.
  const ZOOM = /\bChrome\//.test(navigator.userAgent);
  const world = document.createElement('div');
  world.className = 'st-world';
  world.style.perspective = `${PERSP}px`;
  world.style.perspectiveOrigin = `${PO.x}px ${PO.y}px`;
  const planes = PL.map((p, i) => {
    p.i = i;
    const el = document.createElement('div');
    el.className = 'st-plane';
    const inner = document.createElement('div'); // the content at its settled size, scaled as one unit to fit the plane
    inner.className = `st-in st-${p.kind}`;
    inner.style.width = `${p.w - 2}px`; inner.style.height = `${p.h - 2}px`;
    inner.innerHTML = CONTENT[p.kind];
    el.appendChild(inner);
    return el;
  });
  const inners = planes.map((el) => el.firstChild);
  // Ghosts: arriving from slide 5, the rendering, timeline and agent planes first carry exact copies of its panels.
  const SRC = { 0: '.as-player', 1: '.as-timeline', 3: '.as-chat' };
  const ghosts = PL.map((_, i) => { if (!SRC[i]) return null; const el = document.createElement('div'); el.className = 'st-ghost'; return el; });
  [...planes].reverse().forEach((el, j) => { world.appendChild(el); const i = 4 - j; if (ghosts[i]) world.appendChild(ghosts[i]); }); // the upper planes paint over the lower
  const cv = document.createElement('canvas');
  cv.className = 'st-threads';
  const g = cv.getContext('2d');
  const minkCv = document.createElement('canvas');
  minkCv.className = 'st-mink';
  const mg = minkCv.getContext('2d');
  // The flags (buttons, so keyboard users can reach them) and the cards they unfold into.
  const flags = TAGS.map((t, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'st-flag'; b.tabIndex = -1;
    b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', `st-card-${i}`);
    b.innerHTML = `<i></i><span class="st-long">${t.name}</span><span class="st-short">${t.short}</span>`;
    return b;
  });
  const cards = TAGS.map((t, i) => {
    const c = document.createElement('div');
    c.className = 'st-card'; c.id = `st-card-${i}`; c.setAttribute('role', 'note');
    c.innerHTML = `<b class="st-ch">${t.name}</b><p>${t.line}</p><ul>${t.ex.map(([n, d]) => `<li><b>${n}</b> <span>${d}</span></li>`).join('')}</ul>${t.more ? `<div class="st-more">${t.more}</div>` : ''}<em>${t.foot}</em>`;
    return c;
  });
  // An unseen hit area over the whole picture (flags column, planes, mink, roots): the stack sits in the left third,
  // where a stray click would otherwise turn the deck back.
  const hit = document.createElement('div');
  hit.className = 'st-hit';
  root.append(hit, world, cv, ...flags, ...cards, minkCv);
  const video = planes[0].querySelector('video');
  const timeEl = planes[0].querySelector('.st-time');
  const head = planes[1].querySelector('.st-head');

  // ---- Plane state and the projection ----------------------------------------------------------
  const MW = 23, MH = 20;
  const settledOf = (p) => ({ x: p.cx, y: p.cy, w: p.w, h: p.h, rx: TILT, rz: TURN, o: 1, c: 1, g: 0 });
  const st = PL.map(settledOf);
  const shown = PL.map(() => ({}));
  const box = (el, s) => {
    el.style.width = `${s.w.toFixed(1)}px`; el.style.height = `${s.h.toFixed(1)}px`;
    el.style.left = `${(s.x - s.w / 2).toFixed(1)}px`; el.style.top = `${(s.y - s.h / 2).toFixed(1)}px`;
  };
  // Fit content of natural size (nw, nh) inside a (w, h) box without changing its shape: scale as one unit, centred.
  const fit = (el, w, h, nw, nh) => {
    const k = Math.min(w / nw, h / nh);
    el.style.transform = `translate(${((w - k * nw) / 2).toFixed(2)}px, ${((h - k * nh) / 2).toFixed(2)}px) scale(${k.toFixed(5)})`;
  };
  const apply = () => st.forEach((s, i) => {
    const el = planes[i], was = shown[i], p = PL[i];
    const moved = was.x !== s.x || was.y !== s.y || was.w !== s.w || was.h !== s.h, turned = was.rx !== s.rx || was.rz !== s.rz;
    if (moved) { box(el, s); fit(inners[i], s.w - 2, s.h - 2, p.w - 2, p.h - 2); }
    if (turned) el.style.transform = `rotateX(${s.rx.toFixed(2)}deg) rotateZ(${s.rz.toFixed(2)}deg)`;
    if (was.o !== s.o) el.style.opacity = s.o.toFixed(3);
    if (was.c !== s.c) inners[i].style.opacity = s.c.toFixed(3);
    const gh = ghosts[i];
    if (gh && (was.g !== s.g || (s.g > 0 && (moved || turned)))) {
      gh.style.display = s.g > 0 && gh.firstChild ? 'block' : 'none';
      if (s.g > 0 && gh.firstChild) {
        box(gh, s); gh.style.transform = el.style.transform; gh.style.opacity = s.g.toFixed(3);
        fit(gh.firstChild, s.w, s.h, gh.dataset.w, gh.dataset.h);
      }
    }
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
  const CARDW = 300, CARDW_L = 240, FLAGW_M = 92, FLAG_PITCH = 40;
  let flagY = [];
  // A polyline with its running lengths, and a point a fraction q of the way along it.
  const polyline = (pts) => { const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, len, total: len.at(-1) }; };
  const along = (w, q) => {
    const d = clamp(q) * w.total; let i = 1;
    while (i < w.pts.length - 1 && w.len[i] < d) i++;
    const a = w.pts[i - 1], b = w.pts[i], f = (d - w.len[i - 1]) / ((w.len[i] - w.len[i - 1]) || 1);
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
  };
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const layout = () => {
    const W = innerWidth, H = innerHeight;
    view.mobile = W <= 760 && (H >= W || H > 500); // a phone held upright (one on its side takes the wide layout)
    stackUp();
    // The whole picture's extent in scene px: labels to callouts, the mink's head to the roots' ends.
    const S = PL.map(settledOf);
    const cw = S.map((s) => ({
      nl: projW(s, -s.w / 2 + 3, s.h / 2 - 3), nr: projW(s, s.w / 2 - 3, s.h / 2 - 3), fr: projW(s, s.w / 2 - 3, -s.h / 2 + 3), fl: projW(s, -s.w / 2 + 3, -s.h / 2 + 3),
      lm: projW(s, -s.w / 2, 0), rm: projW(s, s.w / 2, 0),
    }));
    const callXw = Math.min(...cw.map((c) => c.lm.x)) - 40; // the flags' column, left of the stack (flags hang to its left)
    const perchW = projW(S[0], S[0].w / 2 - 0.2 * S[0].w, -S[0].h / 2 + 2);
    const h1 = slide.querySelector('h1').getBoundingClientRect();
    // On a desktop the cards open in a column beside the flags; on a phone, in a slot between the text and the stack.
    // On a phone on its side the column is narrower and a card opens over the flags, which keep their places.
    const low = !view.mobile && H <= 500;
    const cw0 = view.mobile ? W - 32 : low ? CARDW_L : CARDW;
    cards.forEach((c) => { c.style.width = `${cw0}px`; });
    const ch = cards.map((c) => c.offsetHeight);
    const slotT = h1.bottom + 12, slotH = view.mobile ? Math.max(...ch) : 0;
    const Rg = view.mobile ? { l: 10 + FLAGW_M, r: W - 8, t: slotT + slotH + 12, b: H - 70 }
      : low ? { l: 12 + CARDW_L - 6, r: h1.left - 20, t: 14, b: H - 76 } : { l: 48 + CARDW - 6, r: h1.left - 28, t: 22, b: H - 66 };
    const box = { l: callXw, r: Math.max(...cw.map((c) => Math.max(c.fr.x, c.nr.x))) + 12, t: perchW.y - MH * 3.6 - HEADROOM, b: Math.max(cw[4].nl.y, cw[4].nr.y) + ROOTS };
    const k = Math.min((Rg.r - Rg.l) / (box.r - box.l), (Rg.b - Rg.t) / (box.b - box.t));
    view.k = k;
    view.ox = (Rg.l + Rg.r) / 2 - ((box.l + box.r) / 2) * k;
    view.oy = (Rg.t + Rg.b) / 2 - ((box.t + box.b) / 2) * k;
    if (ZOOM) {
      const kz = +k.toFixed(4);
      world.style.zoom = String(kz);
      world.style.transform = `translate(${(+view.ox.toFixed(1) / kz).toFixed(4)}px, ${(+view.oy.toFixed(1) / kz).toFixed(4)}px)`;
    } else world.style.transform = `translate(${view.ox.toFixed(1)}px, ${view.oy.toFixed(1)}px) scale(${k.toFixed(4)})`;
    dpr = Math.min(2, devicePixelRatio || 1);
    const pixelW = Math.round(W * dpr), pixelH = Math.round(H * dpr);
    if (cv.width !== pixelW || cv.height !== pixelH) { cv.width = pixelW; cv.height = pixelH; }
    cell = Math.max(1, Math.round(k * 3.4));
    // Settled geometry, in screen px: the corners the threads tie together, the flags' places, the roots.
    const corners = cw.map((c) => Object.fromEntries(Object.entries(c).map(([key, p]) => [key, toS(p)])));
    const callX = toS({ x: callXw, y: 0 }).x;
    flags.forEach((el) => { el.style.left = `${callX.toFixed(1)}px`; });
    cards.forEach((c, i) => {
      if (view.mobile) { c.style.left = '16px'; c.style.top = `${slotT.toFixed(1)}px`; return; }
      c.style.left = `${Math.max(8, callX + 4 - cw0).toFixed(1)}px`;
    });
    // The guide's ways between the flags: back along a leader, down the plane's left edge, across to the
    // next plane, along its edge and out to its flag; from the foundation it climbs the far-left thread home.
    const A = corners.map((c) => [callX + 3, c.lm.y]), Lr = corners.map((c) => [c.lm.x - 8 * k, c.lm.y]);
    const xy = (p) => [p.x, p.y];
    const ways = corners.map((c, i) => polyline(i < corners.length - 1
      ? [A[i], Lr[i], xy(c.nl), xy(corners[i + 1].fl), Lr[i + 1], A[i + 1]]
      : [A[i], Lr[i], xy(c.fl), ...corners.slice(0, i).reverse().map((d) => xy(d.fl)), Lr[0], A[0]]));
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
    geo = { corners, callX, roots, ways, anchors: A, base: corners.map((c) => c.lm.y), ch, H };
    const pts = corners.flatMap((c) => [c.nl, c.nr, c.fl, c.fr]), flagW = Math.max(...flags.map((f) => f.offsetWidth));
    const hx0 = callX - flagW - 10, hx1 = Math.max(...pts.map((p) => p.x)) + 12;
    const hy0 = Math.min(...pts.map((p) => p.y)) - MH * cell - 12, hy1 = Math.max(...pts.map((p) => p.y)) + ROOTS * k;
    Object.assign(hit.style, { left: `${hx0.toFixed(0)}px`, top: `${hy0.toFixed(0)}px`, width: `${(hx1 - hx0).toFixed(0)}px`, height: `${(hy1 - hy0).toFixed(0)}px` });
    // An open card opens where its flag was; the flags above and below it slide apart to make room (an accordion),
    // so every flag stays in reach. Near the foot of the screen the card rides up instead of pushing a flag off.
    geo.place = cards.map((_, j) => {
      const B = geo.base, T = B.slice(), lo = H - 58;
      if (low) return { top: Math.max(12, clamp(B[j] - ch[j] / 2, 12, H - 76 - ch[j])), flags: T }; // never above the top
      let top = clamp(B[j] - 22, 14, H - 72 - ch[j]);
      for (let pass = 0; pass < 2; pass++) {
        const bot = top + ch[j];
        for (let i = j - 1; i >= 0; i--) T[i] = Math.min(B[i], i === j - 1 ? top - 24 : T[i + 1] - FLAG_PITCH);
        for (let i = j + 1; i < B.length; i++) T[i] = Math.max(B[i], i === j + 1 ? bot + 24 : T[i - 1] + FLAG_PITCH);
        const over = T.at(-1) - lo;
        if (over > 0 && j < B.length - 1) top = Math.max(14, top - over); else break;
      }
      T[j] = B[j];
      return { top, flags: T };
    });
    flagY = (openI >= 0 && !view.mobile ? geo.place[openI].flags : geo.base).slice();
    flags.forEach((el, i) => { el.style.top = `${flagY[i].toFixed(1)}px`; });
    if (openI >= 0 && !view.mobile) cards[openI].style.top = `${geo.place[openI].top.toFixed(1)}px`;
  };

  // ---- The mink ----------------------------------------------------------------------------------
  // Poses as on slide 5: profile, glint (her eye flash), facing, focus (eyes lit); lift raises her a cell or two.
  const mk = { pose: 'profile', lift: 0, glint: 0, seq: null, hover: null, at: null };
  const paintMink = (x, y, c, upto = 1) => {
    const u = c * dpr;
    if (minkCv.width !== MW * u) { minkCv.width = MW * u; minkCv.height = MH * u; minkCv.style.width = `${MW * c}px`; minkCv.style.height = `${MH * c}px`; }
    const P = M.POSES[mk.pose];
    mg.clearRect(0, 0, minkCv.width, minkCv.height);
    const fill = (rows, only) => {
      for (let r = 0; r < MH; r++) for (let q = 0; q < MW; q++) {
        const ch = rows[r][q];
        if (ch === '.' || (only && ch === P[r][q]) || (r + (22 - q) * 0.35) / (19 + 22 * 0.35) > upto) continue; // from the head down the neck
        mg.fillStyle = M.COLORS[ch];
        mg.fillRect(q * u, r * u, u, u);
      }
    };
    fill(P);
    if (mk.glint > 0 && mk.pose === 'profile') { mg.globalAlpha = mk.glint; fill(M.POSES.glint, true); mg.globalAlpha = 1; }
    minkCv.style.transform = `translate(${Math.round(x)}px, ${Math.round(y - mk.lift * c)}px)`;
    mk.at = { x, y, c, upto };
  };
  // Her click, as on slide 5 (and the homepage): she turns to face you with a little hop, her eyes light half
  // a second later and she floats a cell or two, then she hops round and turns back.
  const TURNS = [[0, 'facing'], [500, 'focus'], [1900, 'facing'], [2400, 'profile']];
  const stepMink = (t) => {
    if (!mk.at) return;
    let pose = 'profile', lift = 0, glint = 0;
    if (mk.seq) {
      const e = Math.max(0, t - mk.seq), cur = TURNS.filter(([at]) => e >= at).pop();
      pose = cur[1];
      const since = e - cur[0];
      lift = pose === 'facing' ? (since < 130 ? 1 : 0) : pose === 'focus' ? ((since % 1100) < 550 ? 1 : 2) : 0;
      if (e >= 2400) mk.seq = null;
    }
    if (mk.hover !== null) { // the glint: up and back over 2.6 s
      const e = Math.max(0, t - mk.hover) / 2600;
      glint = e >= 1 ? 0 : Math.sin(Math.PI * e) ** 2;
      if (e >= 1) mk.hover = null;
    }
    if (pose !== mk.pose || lift !== mk.lift || Math.abs(glint - mk.glint) > 0.01) {
      Object.assign(mk, { pose, lift, glint });
      paintMink(mk.at.x, mk.at.y, mk.at.c, mk.at.upto);
    }
  };
  const restMink = () => Object.assign(mk, { pose: 'profile', lift: 0, glint: 0, seq: null, hover: null });
  // Her place on the top plane's far edge, as the plane stands now (or settled).
  const perchOf = (s = settledOf(PL[0])) => {
    const p = project(s, s.w / 2 - 0.2 * s.w, -s.h / 2 + 2);
    return { x: p.x - Math.round(MW * cell * 0.42), y: p.y - MH * cell + Math.round(cell * 0.5), c: cell };
  };

  // ---- Drawing the threads -----------------------------------------------------------------------
  // sh: how far the registration threads have drawn (top down); lb: the labels' leaders, per plane;
  // rt: the roots' growth.
  const vis = { sh: 1, lb: PL.map(() => 1), rt: 1 };
  const GOLD = (a) => `rgba(240,200,119,${a.toFixed(3)})`;
  // Each bead's glow is stamped from one sprite (the same radial light, .55 at its heart to nothing at 4r, faded by its
  // alpha), not built as a new gradient for every bead in every frame.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 128;
  {
    const sg = glow.getContext('2d'), rg = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,226,170,0.55)'); rg.addColorStop(1, 'rgba(255,217,145,0)');
    sg.fillStyle = rg; sg.fillRect(0, 0, 128, 128);
  }
  const dot = (x, y, r, a) => {
    if (a <= 0.01) return;
    g.globalAlpha = a; g.drawImage(glow, x - r * 4, y - r * 4, r * 8, r * 8); g.globalAlpha = 1;
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
  const RUNS = ['nr', 'nl', 'fl'];
  const draw = () => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    if (!geo) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const { corners: C, roots } = geo, k = view.k;
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
    }
    // Registration threads, corner to corner down the stack, drawn from the top.
    if (vis.sh > 0) {
      g.lineWidth = 0.8; g.setLineDash([1.6, 3.4]);
      const segs = C.length - 1;
      for (const key of RUNS) {
        g.strokeStyle = GOLD(key === 'fl' ? 0.38 : 0.55);
        for (let i = 0; i < segs; i++) {
          const q = clamp(vis.sh * segs - i);
          if (q <= 0) break;
          const a = C[i][key], b = C[i + 1][key];
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(lerp(a.x, b.x, q), lerp(a.y, b.y, q)); g.stroke();
        }
      }
      g.setLineDash([]);
      C.forEach((c, i) => { const a = clamp(vis.sh * segs - i + 1); RUNS.forEach((key) => dot(c[key].x, c[key].y, 1.9, a * (key === 'fl' ? 0.75 : 1))); dot(c.fr.x, c.fr.y, 1.4, a * 0.55); });
    }
    // Flag leaders: from each plane's left edge out to its flag; the layer being explained burns brighter.
    vis.lb.forEach((q, i) => {
      if (q <= 0) return;
      const m = C[i].lm, x0 = m.x - 8 * k, x1 = geo.callX + 3, y1 = flagY[i] ?? m.y, l = lit[i];
      g.lineWidth = 0.8 + 0.5 * l; g.strokeStyle = GOLD((0.5 + 0.4 * l) * q);
      if (Math.abs(y1 - m.y) < 0.5) { g.beginPath(); g.moveTo(x0, m.y); g.lineTo(lerp(x0, x1, ease(q)), m.y); g.stroke(); }
      else { // a gentle S from the plane's edge to where its flag has moved
        const pts = [];
        for (let n = 0; n <= 16; n++) { const u = n / 16, a = 1 - u, cx0 = x0 + (x1 - x0) * 0.55, cx1 = x0 + (x1 - x0) * 0.45;
          pts.push([a * a * a * x0 + 3 * a * a * u * cx0 + 3 * a * u * u * cx1 + u * u * u * x1, a * a * a * m.y + 3 * a * a * u * m.y + 3 * a * u * u * y1 + u * u * u * y1]); }
        partial(pts, ease(q));
      }
      dot(x0, m.y, 1.5, q * (0.7 + 0.3 * l));
      flags[i].style.setProperty('--in', (q * q).toFixed(3));
    });
    // The guide: a bead of light with a short tail along its way, breathing while it waits at a flag.
    if (guide.a > 0.01 && guide.pos) {
      const [x, y] = guide.pos;
      if (guide.tail) {
        const [tx, ty] = guide.tail, tl = g.createLinearGradient(tx, ty, x, y);
        tl.addColorStop(0, GOLD(0)); tl.addColorStop(1, GOLD(0.8 * guide.a));
        g.lineWidth = 1.3; g.strokeStyle = tl; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke();
      }
      dot(x, y, 2.3 + 0.5 * guide.breath, guide.a);
    }
  };

  // ---- States ------------------------------------------------------------------------------------
  const clearGhosts = () => ghosts.forEach((gh) => { if (gh) { gh.replaceChildren(); gh.style.display = 'none'; } });
  const hideAll = () => {
    clearGhosts();
    st.forEach((s, i) => Object.assign(s, settledOf(PL[i]), { o: 0 }));
    apply();
    vis.sh = 0; vis.lb = PL.map(() => 0); vis.rt = 0;
    flags.forEach((el) => el.style.setProperty('--in', '0'));
    show(-1);
    minkCv.style.opacity = '0';
    draw();
  };
  const settleAll = () => {
    st.forEach((s, i) => Object.assign(s, settledOf(PL[i])));
    apply();
    clearGhosts();
    vis.sh = 1; vis.lb = PL.map(() => 1); vis.rt = 1;
    const m = perchOf(); paintMink(m.x, m.y, m.c); minkCv.style.opacity = '1';
    draw();
  };

  // ---- Arriving ----------------------------------------------------------------------------------
  // build: { t0, from5, src } while the stack is assembling; ambient afterwards.
  let build = null, amb = null;
  // From slide 5: a = each copied panel's fold (rendering, timeline, agent); low = effects and the runtime rising into place.
  // card: the top layer has landed, and its card opens as the words arrive, so the landing is never without one.
  // open: every plane is in place, so the tour takes over while the threads, leaders and roots finish.
  const FROM5 = { a: { 0: [0.05, 1.3], 1: [0.12, 1.42], 3: [0.2, 1.62] }, spread: [1.0, 2.1], low: { 2: [1.25, 2.15], 4: [1.5, 2.4] }, fade: [0.25, 0.45, 0.72, 0.56, 0.86],
    mink: [0.15, 1.35], sh: [1.9, 2.9], lb: 2.05, lbGap: 0.1, lbDur: 0.55, rt: [2.0, 3.4], card: 1.2, open: 2.4, end: 3.4 };
  const QUICK = { rise: 0.12, dur: 0.75, mink: [1.0, 0.45], sh: [0.95, 1.75], lb: 1.05, lbGap: 0.07, lbDur: 0.45, rt: [1.0, 2.25], card: 0.9, open: 1.45, end: 2.25 };
  const demo = document.querySelector('[data-astrid-demo]');
  const slide5 = demo && demo.closest('.slide');
  const snapFrom5 = () => {
    const q = (sel) => { const el = demo.querySelector(sel); const r = el && el.getBoundingClientRect(); return r && r.width > 4 && r.height > 4 ? r : null; };
    const at = Object.keys(SRC).map(Number), rects = at.map((i) => q(SRC[i]));
    if (rects.some((r) => !r)) return null;
    // Each panel exactly as it stands: a deep copy styled by slide 5's own rules (its root's classes and
    // custom properties), its canvas pixels copied, its entry animations not replayed.
    at.forEach((i, j) => {
      const src = demo.querySelector(SRC[i]), r = rects[j], gh = ghosts[i];
      const wrap = document.createElement('div');
      wrap.className = demo.className;
      wrap.style.cssText = `position:absolute;left:0;top:0;margin:0;flex:none;transform-origin:0 0;width:${r.width}px;height:${r.height}px`;
      const c = src.cloneNode(true);
      c.style.width = `${r.width}px`; c.style.height = `${r.height}px`;
      c.querySelectorAll('.as-in').forEach((n) => n.classList.remove('as-in'));
      const from = src.querySelectorAll('canvas'), to = c.querySelectorAll('canvas');
      from.forEach((cs, j) => { to[j].width = cs.width; to[j].height = cs.height; try { to[j].getContext('2d').drawImage(cs, 0, 0); } catch (e) { /* empty */ } });
      wrap.appendChild(c);
      gh.replaceChildren(wrap);
      gh.dataset.w = r.width; gh.dataset.h = r.height;
    });
    const mr = q('.as-mink');
    const c5 = mr ? Math.max(1, Math.round(mr.width / MW)) : cell;
    return { planes: Object.fromEntries(at.map((i, j) => [i, toWorld(rects[j])])), mink: mr ? { x: mr.left, y: mr.top + 3 * c5, c: c5 } : null }; // slide 5 keeps 3 spare rows above her
  };
  const begin = (from5) => {
    layout();
    const t0 = now();
    if (from5) {
      hideAll();
      const src = snapFrom5();
      if (src) {
        demo.classList.add('is-minkless'); // the captured mink is handed to this slide in the same frame
        build = { t0, from5: true, src };
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
    const e = (t - build.t0) / 1000, T0 = build.from5 ? FROM5 : QUICK;
    // The card and the tour come only on the way in, and not while the entry is hurried on to the next slide
    // (no card opens just as the slide leaves); folding back to slide 5 runs this clock backwards without them.
    const fwd = !build.back && !(window.deckPace?.() > 1);
    if (fwd && !amb && openI < 0 && e >= T0.card) { show(0); arrangeFlags(0); } // its flags (not yet in) make room at once
    if (fwd && !amb && e >= T0.open) { // every plane is in place: the tour takes them over (it lifts the open layer, and paints)
      st.forEach((s, i) => Object.assign(s, settledOf(PL[i])));
      clearGhosts();
      amb = { t }; tourFrom(0, t);
    }
    if (amb) { // only the threads, the leaders and the roots are still drawing
      vis.sh = k01(e, T0.sh); vis.rt = k01(e, T0.rt);
      vis.lb = PL.map((_, i) => clamp((e - T0.lb - i * T0.lbGap) / T0.lbDur));
    } else if (build.from5) {
      const T = FROM5, src = build.src.planes, sp = easeIO(k01(e, T.spread)), mid = PL[2].cy;
      for (const i of [0, 1, 3]) { // rendering, timeline, agent: from slide 5's panels, tilting into the stack
        const p = PL[i], s = st[i], qa = easeIO(k01(e, T.a[i])), f = src[i];
        const ty = lerp(mid + (p.cy - mid) * 0.72, p.cy, sp);
        s.x = lerp(f.x, p.cx, qa); s.y = lerp(f.y, ty, qa); s.w = lerp(f.w, p.w, qa); s.h = lerp(f.h, p.h, qa);
        s.rx = TILT * qa; s.rz = TURN * qa - (i === 3 ? Math.sign(TURN) * 16 * Math.sin(Math.PI * qa) : 0);
        // Slide 5's own panel (the ghost) holds while the plane's frame fades in beneath it; then it dissolves
        // away as the plane's content comes in, overlapping only briefly so the two layouts never stack up.
        const [f0, f1, g1, c0, c1] = T.fade;
        s.o = seep(clamp((qa - f0) / (f1 - f0)));
        s.g = 1 - seep(clamp((qa - f1) / (g1 - f1)));
        s.c = seep(clamp((qa - c0) / (c1 - c0)));
      }
      for (const i of [2, 4]) { // effects comes up between the timeline and the agent as they part; the runtime beneath
        const p = PL[i], s = st[i], q = ease(k01(e, T.low[i]));
        Object.assign(s, settledOf(p), { y: p.cy + 50 * (1 - q), rx: TILT + 12 * (1 - q), o: seep(q) });
      }
      if (build.src.mink) {
        const a = build.src.mink, b = perchOf(st[0]), q = easeIO(k01(e, T.mink));
        const c = Math.round(lerp(a.c, b.c, q)), lift = Math.sin(Math.PI * q) * 40 * view.k;
        paintMink(lerp(a.x, b.x, q), lerp(a.y, b.y, q) - lift, c);
      } else if (e >= T.mink[1]) { const m = perchOf(st[0]); paintMink(m.x, m.y, m.c); }
      minkCv.style.opacity = '1';
      vis.sh = k01(e, T.sh); vis.rt = k01(e, T.rt);
      vis.lb = PL.map((_, i) => clamp((e - T.lb - i * T.lbGap) / T.lbDur));
    } else {
      const T = QUICK;
      for (let i = 0; i < 5; i++) { // from the foundation up
        const p = PL[i], q = ease(clamp((e - (4 - i) * T.rise) / T.dur));
        Object.assign(st[i], settledOf(p), { y: p.cy + 46 * (1 - q), rx: TILT + 10 * (1 - q), o: seep(q) });
      }
      const qm = (e - T.mink[0]) / T.mink[1];
      if (qm > 0) { const m = perchOf(st[0]); paintMink(m.x, m.y, m.c, clamp(qm)); minkCv.style.opacity = '1'; }
      vis.sh = k01(e, T.sh); vis.rt = k01(e, T.rt);
      vis.lb = PL.map((_, i) => clamp((e - T.lb - i * T.lbGap) / T.lbDur));
    }
    if (!amb) { apply(); draw(); }
    if (!build.back && e >= T0.end) {
      build = null;
      if (amb) { vis.sh = 1; vis.lb = PL.map(() => 1); vis.rt = 1; } else { settleAll(); amb = { t }; tourFrom(0, t + 1100); }
      window.deckEntryDone?.(slide);
    }
  };

  // ---- The tour, and hover ------------------------------------------------------------------------
  // openI: the layer whose card is open. The guide dwells at a flag (that layer's card open), then travels
  // its way to the next; hover, focus or a pin take over, and the tour resumes from there once let go.
  const DWELL = 3.3, MOVE = 1.15, BACK = 2.2, REST = 0.8, RESUME = 2.2;
  let openI = -1;
  const lit = PL.map(() => 0);
  const hold = { hover: -1, focus: -1, pin: -1 };
  const guide = { on: false, i: 0, mode: 'dwell', t0: 0, way: null, a: 0, pos: null, tail: null, breath: 0, paused: false, resumeAt: 0, last: 0 };
  let closing = { i: -1, until: 0 }; // a card that has just closed keeps its flags apart until it has faded
  const show = (i) => {
    if (i === openI) return;
    if (openI >= 0 && i < 0) closing = { i: openI, until: now() + 300 };
    if (openI >= 0) { cards[openI].classList.remove('is-open'); flags[openI].classList.remove('is-on'); flags[openI].setAttribute('aria-expanded', 'false'); planes[openI].classList.remove('is-lit'); }
    openI = i;
    if (i >= 0 && geo && !view.mobile) cards[i].style.top = `${geo.place[i].top.toFixed(1)}px`;
    if (i >= 0) { cards[i].classList.add('is-open'); flags[i].classList.add('is-on'); flags[i].setAttribute('aria-expanded', 'true'); planes[i].classList.add('is-lit'); }
    root.classList.toggle('has-card', i >= 0);
  };
  const held = () => (hold.hover >= 0 ? hold.hover : hold.pin >= 0 ? hold.pin : hold.focus);
  const tourFrom = (i, at) => Object.assign(guide, { on: !still, i, mode: 'dwell', t0: at, way: null, paused: false, resumeAt: 0, pos: geo && geo.anchors[i], tail: null });
  const stepTour = (t) => {
    const dt = Math.min(0.05, (t - (guide.last || t)) / 1000);
    guide.last = t;
    const h = held();
    let want = -1;
    if (h >= 0) { want = h; guide.paused = true; guide.i = h; guide.resumeAt = 0; guide.pos = geo.anchors[h]; guide.tail = null; }
    else if (guide.paused) {
      if (!guide.resumeAt) guide.resumeAt = t + RESUME * 1000;
      if (t >= guide.resumeAt) { guide.paused = false; Object.assign(guide, { mode: 'go', t0: t, way: geo.ways[guide.i] }); }
    }
    if (guide.on && !guide.paused) {
      const e = (t - guide.t0) / 1000;
      if (guide.mode === 'rest' && e >= REST) Object.assign(guide, { mode: 'dwell', t0: t });
      if (guide.mode === 'dwell') {
        guide.pos = geo.anchors[guide.i]; guide.tail = null;
        if (e >= 0) want = guide.i;
        if (e >= DWELL) Object.assign(guide, { mode: 'go', t0: t, way: geo.ways[guide.i] });
      } else if (guide.mode === 'go') {
        const back = guide.i === PL.length - 1, dur = back ? BACK : MOVE, q = easeIO(clamp(e / dur));
        guide.pos = along(guide.way, q); guide.tail = along(guide.way, q - 26 / guide.way.total);
        if (q >= 1) Object.assign(guide, { i: back ? 0 : guide.i + 1, mode: back ? 'rest' : 'dwell', t0: t, tail: null });
      }
    }
    show(want);
    guide.a += ((guide.on && !guide.paused ? 1 : 0) - guide.a) * (1 - Math.exp(-dt / 0.2));
    guide.breath = guide.mode === 'dwell' ? 0.5 + 0.5 * Math.sin(t / 420) : 0;
    arrangeFlags(dt);
    // The layer being explained lifts a little (the mink rides the top one).
    let moved = false;
    lit.forEach((l, i) => {
      const nl = l + ((i === openI ? 1 : 0) - l) * (1 - Math.exp(-dt / 0.22));
      if (Math.abs(nl - l) > 1e-4) { lit[i] = nl; st[i].y = PL[i].cy - 6 * nl; moved = true; }
    });
    if (moved) { apply(); if (lit[0] > 1e-3 || st[0].y !== PL[0].cy) { const m = perchOf(st[0]); paintMink(m.x, m.y, m.c); } }
    draw();
  };
  const arrangeFlags = (dt) => { // dt = 0: jump there
    if (!geo) return;
    const j = openI >= 0 ? openI : closing.i >= 0 && now() < closing.until ? closing.i : -1;
    const T = j >= 0 && !view.mobile ? geo.place[j].flags : geo.base;
    flags.forEach((el, i) => {
      const y = dt ? flagY[i] + (T[i] - flagY[i]) * (1 - Math.exp(-dt / 0.16)) : T[i];
      if (Math.abs(y - flagY[i]) > 0.01) { flagY[i] = y; el.style.top = `${y.toFixed(1)}px`; }
    });
  };
  // With reduced motion there is no clock: hover and taps open the cards directly.
  const react = () => { if (still) { show(held()); arrangeFlags(0); draw(); } else wake(); };
  let leaving = 0;
  const enter = (i) => { clearTimeout(leaving); hold.hover = i; react(); };
  const leave = () => { clearTimeout(leaving); leaving = setTimeout(() => { hold.hover = -1; react(); }, 260); };
  const pinTo = (i) => { hold.pin = hold.pin === i ? -1 : i; hold.hover = -1; react(); };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let shownSec = -1;
  // The playhead moves by transform on its own layer, so a frame neither lays out nor repaints the timeline plane: the
  // same place as left: f%, from its lane's width as last laid out (kept by a ResizeObserver). Until its first step it
  // stands where the stylesheet puts it, as before.
  const lane = head.parentElement;
  let laneW = parseFloat(getComputedStyle(lane).width) || 0, headF = null, headX = '';
  const placeHead = () => {
    if (headF === null) return;
    const x = `translateX(${(laneW * headF / 100).toFixed(3)}px)`;
    if (x !== headX) { headX = x; head.style.transform = x; }
  };
  new ResizeObserver((es) => { for (const e of es) { laneW = e.contentRect.width; placeHead(); } }).observe(lane);
  const stepHead = () => {
    const tt = video.currentTime || 0;
    headF = +((tt / SPAN) * 100).toFixed(3);
    placeHead();
    const sec = Math.floor(tt);
    if (sec !== shownSec) { shownSec = sec; timeEl.textContent = `${fmt(sec)} / 0:28`; }
  };

  // ---- Clock ---------------------------------------------------------------------------------------
  let running = false, raf = 0;
  const step = (t) => {
    if (build) stepBuild(t);
    if (amb) stepTour(t);
    if (!build) stepMink(t);
    stepHead();
  };
  const tick = () => {
    raf = 0;
    if (!running || paused) return;
    const t = now();
    if (build && build.back) { if (!unfold(t)) return; } else step(t);
    raf = requestAnimationFrame(tick);
  };
  const wake = () => { if (running && !paused && !raf) raf = requestAnimationFrame(tick); };
  const play = () => { if (!still && running && !paused && !build?.back) video.play().catch(() => {}); }; // not while folding back

  // As on slide 5, the network stays visible behind; only where its threads pass behind the text are they softened.
  // Only ever clear a mask this slide set, so a neighbour that set its own (slide 5) keeps it.
  const net = document.querySelector('.dt-net');
  let netMask = '';
  const softenNet = (on) => {
    if (!net) return;
    if (!on) { if (netMask && net.style.maskImage === netMask) { net.style.maskImage = net.style.webkitMaskImage = ''; net.style.maskMode = ''; } netMask = ''; return; }
    const b = slide.querySelector('.split > :first-child').getBoundingClientRect(), W = innerWidth, H = innerHeight, pad = 14;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><filter id='f'><feGaussianBlur stdDeviation='12'/></filter><rect width='${W}' height='${H}' fill='white'/><rect x='${Math.round(b.left - pad)}' y='${Math.round(b.top - pad)}' width='${Math.round(b.width + 2 * pad)}' height='${Math.round(b.height + 2 * pad)}' rx='18' fill='black' fill-opacity='.75' filter='url(%23f)'/></svg>`;
    net.style.maskImage = net.style.webkitMaskImage = `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
    net.style.maskMode = 'luminance';
    net.style.maskSize = '100% 100%';
    netMask = net.style.maskImage;
  };

  let waitArrive = null, timers = [], pendingBuild = false;
  const beginWhenReady = () => {
    if (!running || build || amb) return;
    if (paused) { pendingBuild = true; return; }
    pendingBuild = false;
    begin(false); play(); wake();
  };
  const clearTimers = () => { timers.forEach(window.deckCancelLater); timers = []; if (waitArrive) { waitArrive.disconnect(); waitArrive = null; } };
  const start = (from5) => {
    if (motionBlocked()) { pendingStart = from5; return; }
    window.warmDeckMedia?.(slide);
    pendingStart = null;
    running = true;
    layout();
    slide.classList.remove('st-arrive');
    softenNet(true);
    flags.forEach((f) => { f.tabIndex = 0; });
    if (still || window.deckNav?.rest) {
      layout(); settleAll(); stepHead();
      window.deckEntryDone?.(slide);
      if (!still) { amb = { t: now() }; tourFrom(0, now()); play(); wake(); } // landing at rest: the first card is open as it lands
      return;
    }
    if (from5) { // the product moves at once; the slide must not fade in under it
      slide.classList.add('st-arrive');
      timers.push(window.deckLater(() => slide.classList.remove('st-arrive'), 900));
      try { video.currentTime = 2; } catch (e) { /* not loaded */ }
      begin(true); play(); wake();
      return;
    }
    hideAll();
    const go = beginWhenReady;
    if (html.classList.contains('dt-intro')) { // a first load: the Mycelial mark plays first
      waitArrive = new MutationObserver(() => { if (!html.classList.contains('dt-intro')) { waitArrive.disconnect(); waitArrive = null; timers.push(window.deckLater(go, 250)); } });
      waitArrive.observe(html, { attributes: true, attributeFilter: ['class'] });
      return;
    }
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => timers.push(window.deckLater(go, 1300))); // if the network never says it has arrived
  };
  slide.addEventListener('dt-arrive', () => { if (running && !build && !amb && !still && !window.deckNav?.rest && !html.classList.contains('dt-intro')) { clearTimers(); beginWhenReady(); } });
  const stop = () => {
    running = false;
    paused = false; pausedTime = 0; pendingStart = null; pausedVideos = [];
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clearTimers();
    pendingBuild = false;
    build = null; amb = null;
    restMink();
    clearTimeout(leaving); Object.assign(hold, { hover: -1, focus: -1, pin: -1 }); guide.on = false; guide.a = 0; guide.last = 0;
    show(-1); lit.fill(0);
    flags.forEach((f) => { f.tabIndex = -1; });
    slide.classList.remove('st-arrive');
    softenNet(false);
    video.pause();
  };

  // ---- Going back to slide 5 ------------------------------------------------------------------
  // A step back: the arrival from slide 5 played backwards. The roots draw back in, the threads and the flags go, the
  // effects and the runtime sink away, and the rendering, timeline and agent planes untilt and fold back into exact
  // copies of slide 5's panels, the mink flying back to her seat; slide 5 fades in beneath them and the stack goes.
  const pace = () => window.deckPace?.() || 1;
  const fold = () => {
    const signal = window.deckNav?.signal;
    clearTimers();
    clearTimeout(leaving); Object.assign(hold, { hover: -1, focus: -1, pin: -1 }); guide.on = false; guide.a = 0;
    show(-1); lit.fill(0);
    flags.forEach((f) => { f.tabIndex = -1; });
    restMink();
    slide.classList.add('dt-rewind');
    slide5.classList.add('dt-return', 'dt-await');
    window.deckRewinding?.(slide5);
    // From the settled stack, the arrival's clock runs back from its end.
    amb = null; // the tour is over: the planes are the build's again
    video.pause(); // its film holds its frame as the plane folds back into slide 5's preview
    build = { back: true, from5: true, src: null, t0: 0, e: FROM5.end - 1e-3, last: 0, shown: false };
    signal?.addEventListener('abort', endFold, { once: true });
    wake();
  };
  const unfold = (t) => {
    const b = build;
    if (!b.src) { // slide 5 has drawn its settled editor by now: copy its panels as they stand
      b.src = snapFrom5();
      if (!b.src) { endFold(); return false; }
    }
    // Just before the copies show, their pictures are taken again: slide 5's preview may only now have caught up.
    if (!b.fresh && b.e <= 1.1) { b.fresh = true; repaintGhosts(); }
    const d = Math.min(0.05 * pace(), (t - (b.last || t)) / 1000); // now() runs at the turn's pace
    b.last = t;
    b.e = Math.max(0, b.e - d);
    if (b.shown) b.since += d;
    // Slide 5 fades in under the copies as they settle onto its panels; once it is whole, the copies go.
    if (!b.shown && b.e <= 0.3) { b.shown = true; b.since = 0; slide5.classList.remove('dt-await'); }
    if (b.e <= 0 && b.since >= 0.65) { endFold(); return false; }
    b.t0 = t - b.e * 1000;
    stepBuild(t);
    stepHead();
    return true;
  };
  const repaintGhosts = () => Object.keys(SRC).forEach((i) => {
    const from = demo.querySelector(SRC[i])?.querySelectorAll('canvas') || [], to = ghosts[i].querySelectorAll('canvas');
    from.forEach((cs, j) => { const c = to[j]; if (!c || c.width !== cs.width || c.height !== cs.height) return; try { const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.drawImage(cs, 0, 0); } catch (e) { /* empty */ } });
  });
  const endFold = () => {
    if (!build || !build.back) return;
    build = null;
    clearGhosts(); // slide 5's own panels stand exactly where their copies were
    slide.classList.replace('dt-rewind', 'dt-rewound');
    slide5?.classList.remove('dt-return', 'dt-await');
    if (slide5) window.deckRewound?.(slide5);
    if (slide.classList.contains('on')) return;
    stop();
    timers.push(setTimeout(() => { if (!slide.classList.contains('on')) hideAll(); }, 700));
  };

  let wasOn = false;
  const watch = new MutationObserver((records) => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    endFold();
    if (!on) {
      const to5 = !!slide5 && slide5.classList.contains('on') && window.deckNav?.back && !still && running && !paused && amb && !build;
      if (to5) { fold(); return; }
      stop(); timers.push(window.deckLater(() => { if (!slide.classList.contains('on')) hideAll(); }, 700)); return;
    }
    const from5 = !still && !!slide5 && !slide5.classList.contains('on') && records.some((r) => r.target === slide5);
    start(from5);
  });
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (slide5) watch.observe(slide5, { attributes: true, attributeFilter: ['class'] });
  const syncMotion = () => {
    if (motionBlocked() && build?.back) endFold(); // a reverse never waits behind the overview
    if (motionBlocked()) {
      if (!running || paused) return;
      pausedAt = performance.now(); paused = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      pausedVideos = [video].filter((v) => v && !v.paused);
      pausedVideos.forEach((v) => v.pause());
    } else if (slide.classList.contains('on')) {
      // An entry deferred behind the overview has no scene to resume yet.
      if (pendingStart !== null) { start(pendingStart); return; }
      if (!paused) return;
      pausedTime += performance.now() - pausedAt;
      paused = false;
      guide.last = 0;
      if (pendingBuild) beginWhenReady();
      pausedVideos.forEach((v) => v.play().catch(() => {}));
      pausedVideos = [];
      if (!still) wake();
    }
  };
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('deck-overview', syncMotion);
  window.addEventListener('deck-motion', syncMotion);
  window.deckOnResize(() => {
    endFold();
    if (!slide.classList.contains('on')) return;
    const interrupted = !amb && (!!build || !still); // once the tour has begun (even as the build finishes), it carries on
    layout();
    softenNet(true);
    if (interrupted) {
      clearTimers();
      build = null;
      amb = { t: now() };
      settleAll();
      tourFrom(guide.i, now() + 1100);
    } else {
      st.forEach((s, i) => Object.assign(s, settledOf(PL[i]), { y: PL[i].cy - 6 * lit[i] }));
      apply();
      guide.way = guide.mode === 'go' ? geo.ways[guide.i] : null;
      if (amb) stepTour(now());
      else { const m = perchOf(st[0]); paintMink(m.x, m.y, m.c); draw(); }
    }
    if (!document.hidden && !document.getElementById('overview')?.classList.contains('on') && !window.deckStill?.()) wake();
  });
  // Clicks on the stack stay here; they never turn the slide.
  root.addEventListener('click', (e) => { if (e.target.closest('.st-plane, .st-mink, .st-flag, .st-card, .st-hit')) e.stopPropagation(); });
  // Flags: hover (a mouse) or keyboard focus shows a layer's card; a click or tap pins it (again to let go).
  flags.forEach((f, i) => {
    f.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') enter(i); });
    f.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') leave(); });
    // The focused flag sits under its own card, so the card carries the focus ring.
    f.addEventListener('focus', () => { if (f.matches(':focus-visible')) { hold.focus = i; cards[i].classList.add('is-focus'); react(); } });
    f.addEventListener('blur', () => { cards[i].classList.remove('is-focus'); if (hold.focus === i) { hold.focus = -1; react(); } });
    f.addEventListener('click', () => pinTo(i));
  });
  cards.forEach((c, i) => {
    c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && openI === i) enter(i); });
    c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') leave(); });
  });
  // A plane is a bigger target for the same thing: hovering its layer's flag or tapping the plane itself.
  planes.forEach((pl, i) => pl.addEventListener('click', () => pinTo(i)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && hold.pin >= 0 && slide.classList.contains('on')) { hold.pin = -1; react(); } });
  // The mink, as on slide 5: hovering flashes her eye; clicking turns her to face you and back.
  minkCv.addEventListener('pointerenter', () => { if (still || build || mk.seq || mk.pose !== 'profile') return; mk.hover = now(); });
  minkCv.addEventListener('click', (e) => { e.stopPropagation(); if (!still && !build && !mk.seq) { mk.hover = null; mk.seq = now(); } });
  // Loading resets the film to paused, so one that arrives after the slide has started (a cold load) plays then.
  video.addEventListener('loadeddata', () => { if (still) stepHead(); else play(); });

  layout();
  hideAll();
  if (slide.classList.contains('on')) { wasOn = true; start(false); }
})();
