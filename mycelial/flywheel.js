// Version F, slides 9–11: the community's flywheel, one picture evolving across three slides.
// 9, "The community": the artists on the left, everyone else (model trainers, workflow and infrastructure
// builders, toolmakers) on the right, joined by a gold ring that turns round Astrid (the lens with the mink).
// Bright motes fly from the artists over the top of the ring to all the others (inspire), and from the
// others back under it to the artists and down between each other (equip): a calm, clockwise circulation.
// 10, "How we accelerate it": the artists and the groups go into the circle, the lens folds into a quiet
// glowing core while the mink flies out to her own card, the circle contracts a little and then opens out
// bigger, and six cards come out round it as small versions of the homepage's cards (Arca Gidan, ArtCompute,
// Astrid above; Banodoco, 2RP, ADOS below), each plugging energy into the ring. 11, "The raise": the ring opens
// into a halo round the text in the middle, and the six shrink into icons on it, three above and three below;
// hovering, focusing or tapping an icon opens it back into its card.
// The picture lives on one fixed layer under the slides so it can carry across them; it shows only while
// one of these slides is on, and draws only then.
(() => {
  const hosts = [...document.querySelectorAll('.fw-host')];
  const M = window.AstridMink;
  if (hosts.length !== 3 || !M) return;
  const html = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const ease = (q) => 1 - Math.pow(1 - q, 3);
  const easeIO = (q) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
  const smooth = (q) => q * q * (3 - 2 * q);
  const lerp = (a, b, f) => a + (b - a) * f;
  const THREAD = '240,200,119', NODE = '255,217,145', CORE = '255,241,214';
  const TAU = Math.PI * 2, RAD = Math.PI / 180;

  // ---- The layer -------------------------------------------------------------------------
  const root = document.createElement('div');
  root.className = 'fw';
  root.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'fw-canvas';
  root.appendChild(canvas);
  document.body.appendChild(root);
  const g = canvas.getContext('2d');

  const tag = (cls, html_) => { const el = document.createElement('div'); el.className = `fw-ax ${cls}`; el.innerHTML = html_; root.appendChild(el); return el; };
  const labels = {
    astrid: tag('fw-core', 'Astrid'),
    artists: tag('fw-who', 'artists'),
    g0: tag('fw-who fw-l', 'model trainers'),
    g1: tag('fw-who fw-l', 'workflow &amp;<br>infrastructure builders'),
    g2: tag('fw-who fw-l', 'toolmakers'),
    inspire: tag('fw-verb', 'inspire'),
    equip: tag('fw-verb', 'equip'),
  };
  // Our four initiatives, as small versions of the homepage's cards: its own words, links and real images
  // (content/content.js, assets/cards/). They sit on a layer of their own above the slides so their links can
  // be clicked; clicks there never reach the deck, so they never turn the slide.
  const cardsRoot = document.createElement('div');
  cardsRoot.className = 'fw-cards';
  cardsRoot.inert = true;
  document.body.appendChild(cardsRoot);
  const AV = (n) => `<img src="../assets/cards/artcompute/${n}.jpg" alt="">`;
  const STRIP = (n) => `<i style="background-image:url(../assets/astrid/${n}-strip.jpg)"></i>`;
  // The small card's seat is a canvas; the fuller card's shows the same pose as a picture (painted on a canvas kept off
  // the page, seatPaint), so the page holds one seat canvas however often slide 10 is visited.
  const SEAT = (cls = '', full = false) => `<span class="fw-astrid${cls}"><img src="../assets/astrid/first-light-anchor.jpg" alt=""><span class="fw-tl">${STRIP('first-light')}${STRIP('passing-shapes')}${STRIP('quiet-finish')}<b></b></span>${full ? '<img class="fw-seat" alt="">' : '<canvas class="fw-seat"></canvas>'}</span>`;
  // Astrid's logo, the app's 16 × 16 pixel mink (mink.js GRID, astrid-favicon.svg), as crisp SVG at any scale.
  const LOGO = (() => {
    let d = '';
    M.GRID.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') d += `<rect x="${x}" y="${y}" width="1" height="1" fill="${M.COLORS[ch]}"/>`; }));
    return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${d}</svg>`;
  })();
  // The order is fixed by the code that reads it (the Astrid card is [1]); `crop` is its icon in its picture:
  // the centre (as fractions of the picture's width and height) and the size (a fraction of its height).
  // `face` is what the icon shows instead of that crop, where a logo or an image reads better in a circle;
  // `full` is the fuller card it grows into on slide 10, the homepage's own (journey/cards/, content/content.js).
  const CARDS = [
    { name: 'Arca Gidan', line: 'The Arca Gidan Prize is an open source AI art competition.', href: 'https://arcagidan.com/', crop: [0.5, 0.5, 1],
      media: '<img src="../assets/cards/arca/poster-2.jpg" alt="">',
      full: { name: 'Arca Gidan Prize', line: 'The Arca Gidan Prize is an open source AI art competition. We wish to provide a reason for people to push themselves and open models to their limits.',
        door: 'See the winners →', href: 'https://arcagidan.com/winners/edition-2',
        stage: `<span class="fw-ag">${[1, 2, 3, 4].map((n) => `<i><img src="../assets/cards/arca/poster-${n}.jpg" alt=""></i>`).join('')}<b>ARCA GIDAN</b></span><span class="fw-ag-band"><span><b>198</b>entries</span><span><b>7,287</b>votes</span><span><b>$56.8K</b>prizes</span></span>` } },
    // Astrid: a still of slide 5's editor (its preview over its timeline), and the seat the mink flies into from slide 9.
    { name: 'Astrid', line: 'A new kind of video editor: describe what you want, and the agent reaches for everything the community has built.', href: 'https://astrid.haus/', label: 'Try Astrid →', crop: [0.17, 0.74, 0.86],
      media: SEAT(), face: `<span class="fw-face fw-face-mink">${LOGO}</span>`,
      full: { name: 'Astrid', line: 'A new kind of video editor: describe what you want, and the agent reaches for everything the community has built.',
        door: 'Try Astrid →', href: 'https://astrid.haus/', stage: SEAT(' fw-astrid-full', true) } },
    // Banodoco: the homepage's card, its live Discord digest (the captured snapshot, assets/cards/discord/fallback.json);
    // its icon is the Banodoco logo, the site's own B (assets/brand/mark-b-mask-96.png, as in the header's .logo .mark).
    { name: 'Banodoco', line: 'Banodoco is where the community actually lives, day to day.', href: 'https://discord.gg/NnFxGvx94b', label: 'Join →', crop: [0.17, 0.83, 0.42], focus: '.fw-dc-p .fw-avs',
      media: `<span class="fw-dc"><span class="fw-dc-ch"># daily_summaries</span><span class="fw-dc-t">H3 Tooling Week: Timeline Director, Studio Node Pack, and a Training Adapter Land</span><span class="fw-dc-p"><span class="fw-avs">${AV('persoon')}${AV('loreweavr')}${AV('ashmotv')}</span><b>20,000+</b> people</span></span>`,
      face: '<span class="fw-face fw-face-b"><i></i></span>',
      full: { name: 'Banodoco', line: 'Banodoco is where the community actually lives, day to day. Artists, engineers, and knowledge sharers, in one room — it is where the work gets shown, argued over, and picked up by someone else.',
        door: 'Join the Discord →', href: 'https://discord.gg/NnFxGvx94b',
        stage: `<span class="fw-dc fw-dc-full"><span class="fw-dc-ch"># daily_summaries · 2026-08-17</span><span class="fw-dc-t">H3 Tooling Week: Timeline Director, Studio Node Pack, and a Training Adapter Land</span><span class="fw-dc-x">seesee75-commits dropped ComfyUI-MiniMaxH3-Director, a proper timeline editor for MiniMax H3 inside ComfyUI — storyboard prompts, first/last keyframes, image/video/audio references, joint audio, live sampling preview, retakes, and shot chaining.</span><span class="fw-dc-p"><span class="fw-avs">${AV('persoon')}${AV('loreweavr')}${AV('ashmotv')}</span><b>20,000+</b> people</span></span>` } },
    // ADOS: its icon keeps its poster, with the events' own wordmark (Pilowlava, ados.events) over it.
    { name: 'ADOS', line: 'ADOS events bring the community together in the real world.', href: 'https://ados.events/', crop: [0.6, 0.5, 1],
      media: '<img src="../assets/cards/ados/la-2025-thumb.jpg" alt="">', face: '<span class="fw-face fw-face-ados"><b>ADOS</b></span>',
      full: { name: 'ADOS', line: 'ADOS events bring the community together in the real world. We gather our community with people from the extended creative world to look at art, eat nice food, and create things.',
        door: 'See events →', href: 'https://ados.events/',
        stage: '<span class="fw-ad"><img src="../assets/cards/ados/la-2025-thumb.jpg" alt=""><span><small>Los Angeles — 7 November 2025</small><b>ADOS</b></span></span>' } },
    // ArtCompute: its own terminal stat band (artcompute.org's figures, verified 2026-08-17) and three grantees; its
    // icon is the picture artcompute.org shows for itself (its share image, a frame of its background reel).
    { name: 'ArtCompute', line: 'ArtCompute gives micro-grants to those pushing open AI models, approved by AI.', href: 'https://artcompute.org/', crop: [0.5, 0.3, 0.6],
      media: `<span class="fw-ac"><span class="fw-ac-stats"><span><b>11</b>grants</span><span><b class="g">473</b>GPU hours</span><span><b class="v">AUTO</b>approval</span></span><span class="fw-ac-l">latest grants</span><span class="fw-avs">${AV('persoon')}${AV('loreweavr')}${AV('ashmotv')}</span></span>`,
      face: '<span class="fw-face fw-face-ac"></span>',
      full: { name: 'ArtCompute', line: 'ArtCompute gives micro-grants to those pushing open AI models, approved by AI. It is practical compute for people whose ambition has outrun their hardware.',
        door: 'Request compute →', href: 'https://artcompute.org/',
        stage: `<span class="fw-ac fw-ac-full"><span class="fw-ac-stats"><span><b>11</b>grants</span><span><b class="g">473</b>GPU hours</span><span><b class="v">AUTO</b>approval</span></span><span class="fw-ac-l">latest grants</span>${[['loreweavr', 'Loreweavr — Dual-LoRA Composition · 50h'], ['ashmotv', 'AshmoTV — Multi-angle IC-LoRA, LTX 2.3 · 50h'], ['persoon', 'Persoon — Obscura Remova IC-LoRA · 40h']].map(([a, t]) => `<span class="fw-ac-row">${AV(a)}<span>${t}</span><i>PAID</i></span>`).join('')}</span>` } },
    // 2RP: no link, as on the homepage (content.js): the publication is coming soon.
    { name: '2RP', line: '2RP is an art and tech publication that aims to highlight the best of the ecosystem.', soon: 'Coming soon', crop: [0.5, 0.45, 1],
      media: '<img src="../assets/cards/tworp/cover.jpg" alt="">',
      full: { name: '2RP', line: '2RP is an art and tech publication that aims to highlight the best of the ecosystem. Open work, open models, and the people making both.',
        soon: 'Coming soon', stage: '<span class="fw-rp"><img src="../assets/cards/tworp/cover.jpg" alt=""><b>2RP</b></span>' } },
  ];
  const chips = CARDS.map((c) => {
    const el = document.createElement('div');
    el.className = 'fw-card';
    const tail = c.href ? `<a href="${c.href}" target="_blank" rel="noopener">${c.label || 'Learn more →'}</a>` : `<em>${c.soon}</em>`;
    el.innerHTML = `<div class="fw-media">${c.media}${c.face || ''}</div><div class="fw-cbody"><b>${c.name}</b><span>${c.line}</span>${tail}</div>`;
    cardsRoot.appendChild(el);
    return el;
  });
  const vids = chips.map((el) => el.querySelector('video'));
  const faces = chips.map((el) => el.querySelector('.fw-face'));
  // The fuller cards slide 10's grow into: built once the wheel first shows, from slide 9 on (so their pictures are
  // fetched and decoded by the time anyone hovers), on top of everything else on the layer. They copy the small cards' links, so they stay out of
  // the tab order and the accessibility tree; the small card is the one a keyboard or a reader reaches.
  const fulls = [];
  const buildFulls = () => {
    if (fulls.length) return;
    CARDS.forEach((c, i) => {
      const f = c.full, el = document.createElement('div');
      el.className = 'fw-full';
      el.setAttribute('aria-hidden', 'true');
      const door = f.href ? `<a class="fw-door" href="${f.href}" target="_blank" rel="noopener" tabindex="-1">${f.door}</a>` : `<em class="fw-door">${f.soon}</em>`;
      el.innerHTML = `<div class="fw-fstage">${f.stage}</div><div class="fw-cbody"><b>${f.name}</b><span>${f.line}</span></div>${door}`;
      el.style.visibility = 'hidden';
      cardsRoot.appendChild(el);
      el.querySelectorAll('img').forEach((im) => { im.decoding = 'async'; im.decode?.().catch(() => {}); }); // ready before anyone hovers
      fulls.push(el);
      wire(el, i, true);
    });
    fullSeat = fulls[1].querySelector('.fw-seat');
    fullW = 0;
    paintSeat();
  };
  // The mink's seat in the Astrid card (she sits there once she's landed, part of her card), and a small canvas
  // above the cards she flies on from slide 9.
  const seat = chips[1].querySelector('.fw-seat');
  let fullSeat = null;
  const fly = document.createElement('canvas');
  fly.className = 'fw-fly';
  cardsRoot.appendChild(fly);
  const cardH = chips.map(() => 0), media = chips.map((el) => el.querySelector('.fw-media'));
  // Each card's visible box last frame (its icon or its whole card), and how open it is: 1 a card, 0 an icon.
  const vis = chips.map(() => null), hov = chips.map(() => 0), hoT = chips.map(() => 0);
  // How far each has grown into its fuller card (slide 10), and the size that card stands at, whole.
  const gro = chips.map(() => 0), grT = chips.map(() => 0), fullH = chips.map(() => 0), fullSH = chips.map(() => 0);
  let fullW = 0, fullS = 1;
  new MutationObserver(() => cardsRoot.classList.toggle('is-on', root.classList.contains('is-on'))).observe(root, { attributes: true, attributeFilter: ['class'] });

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
  let k = 1, LW = 1;
  const node = (x, y, size, a) => { if (a <= 0.003) return; const r = 2.6 * size * Math.max(0.6, k); halo(x, y, r * 4.4, 0.45 * a); dot(x, y, r, NODE, 0.95 * a); dot(x - r * 0.15, y - r * 0.2, r * 0.62, CORE, 0.9 * a); };

  // ---- Paths ------------------------------------------------------------------------------
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
    if (a <= 0.003 || d1 <= d0 || !h.total) return;
    const p = at(h, d0), q = at(h, d1);
    g.lineWidth = w; g.strokeStyle = `rgba(${color},${Math.min(1, a).toFixed(3)})`;
    g.beginPath(); g.moveTo(p.x, p.y);
    for (let i = p.i; i < q.i; i++) g.lineTo(h.pts[i][0], h.pts[i][1]);
    g.lineTo(q.x, q.y); g.stroke();
  };
  const bez = (p0, c0, c1, p1, n = 28) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x, u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y];
  });

  // ---- The picture, as data -----------------------------------------------------------------
  // Positions are in reference units (a 1672 x 941 frame), one set per slide: [9, 10, 11]. Everything moves
  // by interpolating between neighbouring sets, so 9 → 10 → 11 is one picture opening out.
  // On 10 and 11 the artists and the groups have gone into the circle (their positions there are its centre) and
  // the lens has folded into the core. On 10 six cards stand round a wide ring, three above and three below; on
  // 11 they sit on the halo as icons ('ring': placed on it at their angle, once the halo is measured).
  const WIDE = {
    ring: [[835, 360, 237, 237], [835, 471, 300, 118], [835, 455, 545, 292]], // cx, cy, rx, ry
    lens: [[835, 367, 112, 176], [835, 471, 30, 48], [835, 455, 30, 48]], // cx, cy, w, h
    artR: [39, 10, 10],
    artists: [ // brush, camera, pencil, film, palette, picture, music: two staggered columns, clear of each other
      [[205, 180], [335, 240], [205, 300], [335, 360], [205, 420], [335, 480], [205, 540]],
      Array(7).fill([835, 471]),
      Array(7).fill([835, 455]),
    ],
    grpR: [40, 10, 10],
    groups: [[[1316, 182], [1348, 366], [1316, 550]], Array(3).fill([835, 471]), Array(3).fill([835, 455])],
    artistsLabel: [[270, 122], [835, 471], [835, 455]],
    inspire: [[835, 74], [835, 471], [835, 455]],
    equip: [[835, 640], [835, 471], [835, 455]],
    // The six cards: centre, and where each plugs into the ring (degrees, clockwise from 3 o'clock).
    cards: [
      { at: [[835, 360], [302, 262], 'ring'], th: [205, 205, 232] }, // Arca Gidan: top-left
      { at: [[835, 360], [835, 228], 'ring'], th: [270, 270, 270] }, // Astrid: top-centre
      { at: [[835, 360], [302, 680], 'ring'], th: [155, 155, 128] }, // Banodoco: bottom-left
      { at: [[835, 360], [1368, 680], 'ring'], th: [25, 25, 52] }, // ADOS: bottom-right
      { at: [[835, 360], [1368, 262], 'ring'], th: [335, 335, 308] }, // ArtCompute: top-right
      { at: [[835, 360], [835, 714], 'ring'], th: [90, 90, 90] }, // 2RP: bottom-centre
    ],
    cw: [90, 220, 220], // card widths
    // What each slide's picture spans (reference units), to fit it on screen: x0, x1, y0, y1.
    span: [[150, 1625, 52, 652], [190, 1480, 122, 820], [258, 1412, 128, 782]],
  };
  // On a phone the same picture stands upright: artists along the top, everyone else along the bottom,
  // so inspire runs down the right of the ring and equip back up its left.
  const TALL = {
    ring: [[200, 330, 118, 118], [200, 410, 118, 150], [200, 402, 132, 250]],
    lens: [[200, 334, 60, 94], [200, 410, 16, 26], [200, 402, 16, 26]],
    artR: [19, 6, 6],
    artists: [ // two staggered rows along the top, the first on the right (where its thread meets the ring)
      [[350, 82], [300, 132], [250, 82], [200, 132], [150, 82], [100, 132], [50, 82]],
      Array(7).fill([200, 400]),
      Array(7).fill([200, 410]),
    ],
    grpR: [22, 6, 6],
    groups: [[[312, 548], [200, 572], [88, 548]], Array(3).fill([200, 400]), Array(3).fill([200, 410])],
    artistsLabel: [[200, 38], [200, 400], [200, 410]],
    inspire: [[350, 330], [200, 400], [200, 410]],
    equip: [[52, 330], [200, 400], [200, 410]],
    cards: [ // on a phone they are icons on 10 too, tapped open
      { at: [[200, 330], 'ring', 'ring'], th: [232, 232, 240] },
      { at: [[200, 330], 'ring', 'ring'], th: [270, 270, 270] },
      { at: [[200, 330], 'ring', 'ring'], th: [128, 128, 120] },
      { at: [[200, 330], 'ring', 'ring'], th: [52, 52, 60] },
      { at: [[200, 330], 'ring', 'ring'], th: [308, 308, 300] },
      { at: [[200, 330], 'ring', 'ring'], th: [90, 90, 90] },
    ],
    cw: [40, 170, 170],
    span: [[8, 392, 20, 640], [56, 344, 236, 584], [44, 356, 128, 676]],
  };
  // Where the artists' threads meet the ring, and the others' (degrees); a phone turns them a quarter.
  const ENTRY = [189, 186, 183, 180, 177, 174, 171], EXIT = [-14, 0, 14];
  // A phone on its side: too short for cards above and below, so on 10 and 11 they sit on the ring as icons, three
  // a side (tapped open), and the picture spans only the ring.
  const SIDE = [[230, 270, 130, 50, 310, 0], [215, 270, 145, 35, 325, 0]]; // 10's ring is flatter, so its icons spread wider
  const SHORT = { ...WIDE,
    cards: WIDE.cards.map((c, i) => ({ at: [c.at[0], 'ring', 'ring'], th: [c.th[0], SIDE[0][i], SIDE[1][i]] })),
    artistsLabel: [[270, 96], ...WIDE.artistsLabel.slice(1)], // clear of the first artist at this small scale
    span: [WIDE.span[0], [500, 1170, 330, 612], [258, 1412, 80, 757]] };

  // ---- Layout ---------------------------------------------------------------------------------
  let W = 0, H = 0, dpr = 1, tall = false, short = false, R = WIDE, cell = 3;
  let stages = [null, null, null]; // per slide: the picture in viewport pixels
  let lastPlaceKey = null, layoutVersion = 0, lastPlacedM = null;
  const colOf = (s) => s.querySelector(':scope > .split > :first-child');
  const fit = (s) => {
    const c = colOf(hosts[s]).getBoundingClientRect();
    const [x0, x1, y0, y1] = R.span[s];
    const mx = tall ? 12 : Math.max(24, Math.min(64, W * 0.045));
    let kk, ox, oy, cxRef = R.ring[s][0], cyRef;
    if (s < 2) {
      // Text at the bottom (9): the picture sits above it, clear of the network's node over the label.
      // Text at the very top (10): the picture sits below it, clear of the deck's chrome at the foot.
      const atTop = hosts[s].classList.contains('fw-top');
      const top = atTop ? c.bottom + (tall ? 20 : 34) : tall ? 46 : Math.max(26, H * 0.035);
      const bottom = atTop ? H - (tall ? 64 : 70) : c.top - (tall ? 26 : 56);
      const kh = Math.min((W / 2 - mx) / Math.max(cxRef - x0, x1 - cxRef), 1.15);
      const kv = (bottom - top) / (y1 - y0);
      kk = Math.min(kh, kv);
      ox = W / 2; cyRef = (y0 + y1) / 2; oy = (top + bottom) / 2;
    } else {
      const cy = short ? (c.top - 75 + c.bottom) / 2 : c.top + c.height / 2; // on its side, round the mark and the words together
      const kh = Math.min((W / 2 - mx) / Math.max(cxRef - x0, x1 - cxRef), 1.15);
      cyRef = R.ring[2][1];
      const kv = Math.min((cy - (tall ? 20 : short ? 8 : 24)) / (cyRef - y0), (H - (tall ? 56 : short ? 74 : 64) - cy) / (y1 - cyRef));
      kk = Math.min(kh, kv);
      ox = W / 2; oy = cy;
    }
    if (s === 1) kk = Math.min(kk, tall ? 1.15 : 1.0); // 10's picture stays a calm size (upright, it fills more of the room under the words)
    // Labels and chip captions are type, not picture: keep their measured widths inside the right margin.
    for (const [rx_, px] of rightOf(s)) if (rx_ > cxRef) kk = Math.min(kk, (W - mx - px - ox) / (rx_ - cxRef));
    return { k: kk, X: (rx) => ox + (rx - cxRef) * kk, Y: (ry) => oy + (ry - cyRef) * kk };
  };
  const rightOf = (s) => {
    const out = [];
    if (!tall && s === 0) R.groups[s].forEach(([x], j) => out.push([x + R.grpR[s] + 16, labels[`g${j}`].offsetWidth + 6]));
    return out;
  };
  const build = (s, f) => {
    const { k: kk, X, Y } = f, P = ([x, y]) => [X(x), Y(y)];
    const [rcx, rcy, rrx, rry] = R.ring[s], [lx, ly, lw, lh] = R.lens[s];
    return {
      k: kk,
      ring: [X(rcx), Y(rcy), rrx * kk, rry * kk],
      lens: [X(lx), Y(ly), lw * kk, lh * kk],
      artR: R.artR[s] * kk,
      artists: R.artists[s].map(P),
      grpR: R.grpR[s] * kk,
      groups: R.groups[s].map(P),
      artistsLabel: P(R.artistsLabel[s]),
      inspire: P(R.inspire[s]),
      equip: P(R.equip[s]),
      cards: R.cards.map((c) => (c.at[s] === 'ring' ? [0, 0, c.th[s]] : [...P(c.at[s]), c.th[s]])),
      cw: short ? Math.max(170, R.cw[s] * kk) : R.cw[s] * kk, // an icon opens to a readable card
    };
  };
  const mixed = (a, b, f) => {
    if (typeof a === 'number') return lerp(a, b, f);
    if (Array.isArray(a)) return a.map((v, i) => mixed(v, b[i], f));
    const o = {};
    for (const key in a) o[key] = mixed(a[key], b[key], f);
    return o;
  };
  // Group clouds and the inner ring's beads are fixed patterns, made once.
  let seed = 1;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  seed = 20261015;
  const clouds = [0, 1, 2].map(() => {
    const rim = Array.from({ length: 15 }, (_, i) => ({ a: (i / 15) * TAU + rnd() * 0.15, r: 1 + (rnd() - 0.5) * 0.06, s: 0.8 + rnd() * 0.5 }));
    const core = Array.from({ length: 10 }, () => { const a = rnd() * TAU, d = Math.sqrt(rnd()) * 0.66; return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 0.8 + rnd() * 0.6, b: rnd() < 0.25 }; });
    return { rim, core };
  });

  const layout = () => {
    W = innerWidth; H = innerHeight;
    if (!W || !H) return false;
    lastPlaceKey = null;
    lastPlacedM = null;
    layoutVersion++;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    tall = W <= 760 && H > W;
    short = !tall && H <= 500;
    R = tall ? TALL : short ? SHORT : WIDE;
    // Type first (it sets the labels' widths), from the room there is; then the picture round it.
    const kBase = tall ? Math.min((W - 24) / 400, (H * 0.6) / 640) : Math.min((W / 2 - 64) / 795, (H * 0.64) / 600);
    root.style.fontSize = `${clamp(22 * (tall ? kBase * 0.55 : kBase), tall ? 10.5 : 12.5, 22).toFixed(1)}px`;
    for (const key of ['g0', 'g1', 'g2']) labels[key].classList.toggle('fw-c', tall);
    for (const key in labels) lsz.set(labels[key], [labels[key].offsetWidth, labels[key].offsetHeight]);
    dirty.fill(true); fullW = 0; // the cards are measured again, at the new size
    wordsBottom = colOf(hosts[1]).getBoundingClientRect().bottom;
    // Each slide fits its own picture: 10's is the bigger one, the wheel grown with the initiatives round it.
    stages = [build(0, fit(0)), build(1, fit(1)), build(2, fit(2))];
    // On 11 the halo opens tall enough to pass well above the label's node (the room the deck's small Mycelial mark
    // once took there; the mark now forms large and faint behind the words, inside the halo).
    const lab = hosts[2].querySelector('.num');
    if (lab) { const r = stages[2].ring, need = r[1] - (lab.getBoundingClientRect().top - 13 - 36 - 34 - (short ? 0 : iconR()) - (tall ? 8 : 10)); if (r[3] < need) r[3] = need; }
    // On its side the halo is held by the height, with room either side: it opens wider, so the icons below the
    // words stand clear of them.
    if (short) { const r = stages[2].ring; r[2] = Math.max(r[2], Math.min(r[2] * 1.2, W / 2 - Math.max(24, Math.min(64, W * 0.045)) - iconR() - 6)); }
    // Cards that sit on the ring (the icons) take their places on it now its size is known.
    stages.forEach((st, s) => st.cards.forEach((c, i) => {
      if (R.cards[i].at[s] !== 'ring') return;
      const t = c[2] * RAD, [cx, cy, rx, ry] = st.ring;
      c[0] = cx + rx * Math.cos(t); c[1] = cy + ry * Math.sin(t);
      if (short && s === 2 && i === 1 && W < 700) c[1] += 14; // keep Astrid's top-centre icon clear of the short viewport edge
    }));
    paintSeat();
    return true;
  };

  // ---- Time and state ----------------------------------------------------------------------------
  // ta: seconds since the picture began; m: where it stands between the slides (0 = 9, 1 = 10, 2 = 11).
  let ta = 0, m = 0, morph = null, begun = false, running = false, raf = 0, last = 0, armed = false, timers = [];
  let attach = { dir: 0, t0: 0 }, boost = 0, spin = 0, motes = [], nextMote = 0, flashes = { art: [0, 0, 0, 0, 0, 0, 0], grp: [0, 0, 0], ring: 0 };
  let cur = null, lastM = -1, pulsed = chips.map(() => false);
  const T_FRESH = { lens: 0.05, ring: 0.25, art: 0.35, artT: 0.75, grpT: 1.05, grp: 1.3, link: 1.8, labels: 1.5, motes: 2.0, chips: 2.3 };
  // From slide 8 the core is already there: it glides up into the hub, the apps' communities drift out to become the
  // artists and the builders' groups, and the ring draws round the core as they arrive.
  const T_HAND = { lens: 0, ring: 0.85, art: 1.15, artT: 1.5, grpT: 1.55, grp: 1.4, link: 2.0, labels: 1.8, motes: 2.4, chips: 2.6 };
  let T = T_FRESH, hand = null, minkAt = null; // minkAt: where she was last painted in the lens, where her flight leaves from
  const k01 = (t0, d) => clamp((ta - t0) / d);
  const stageOf = () => hosts.findIndex((s) => s.classList.contains('on'));
  // How far each card has come out (it follows the move from 9; drawing fresh on 10 or 11, it comes last).
  const cardOut = () => smooth(clamp((m - 0.42) / 0.58));
  const chipQ = (i) => (m >= 1 ? 1 : smooth(clamp((m - 0.42 - i * 0.04) / 0.5))) * smooth(k01(T.chips + i * 0.15, 0.6));
  // The artists and the groups, with "inspire" and "equip", belong to 9: they go into the circle on the way to 10.
  const nine = () => 1 - smooth(clamp((m - 0.08) / 0.42));
  // The lens folds into the core as the mink leaves it for her card; she flies from 9's centre to the Astrid card.
  const lensA = () => 1 - smooth(clamp((m - 0.25) / 0.4));
  // She sets off for her card as the stage starts to change, and flies with it, into her seat as her card comes whole.
  // Timed on the morph's own progress, not on m, whose ease starts slowly and kept her waiting in the middle (and as a
  // function of m alone, 10→9 plays it back: she leaves her seat as the cards go in and lands as the lens closes round her).
  const unease = (v) => (v < 0.5 ? Math.cbrt(v / 4) : 1 - Math.cbrt(2 * (1 - v)) / 2); // easeIO's inverse
  const flightQ = () => (m >= 1 ? 1 : m <= 0 ? 0 : smooth(clamp(unease(m) / 0.7)));
  const seatCell = () => (tall || short ? 1 : 2);
  const lensCell = () => (tall ? 1 : Math.max(short ? 1 : 2, Math.round(2.45 * stages[0].k))); // her cell in the lens on 9 (as settleCur's)
  // A card's own openness: whole on 10, an icon on 11 (and on a phone); hovered, focused or tapped, it opens again.
  const iconR = () => (tall ? 23 : short ? 22 : 32);
  const openBase = () => (tall || short ? 0 : m <= 1 ? 1 : 1 - smooth(clamp((m - 1) / 0.8)));
  // The quiet core of the ecosystem at the centre on 10, once the lens has folded into it.
  const coreQ = () => smooth(clamp((m - 0.3) / 0.5)) * (1 - smooth(clamp((m - 1.1) / 0.4)));

  // ---- Geometry helpers on the current picture -------------------------------------------------------------
  const ell = (th, off = 0) => { const [cx, cy, rx, ry] = cur.ring; return [cx + (rx + off) * Math.cos(th), cy + (ry + off) * Math.sin(th)]; };
  const arc = (th0, th1, off) => { // clockwise from th0 to th1 (radians), off: a lane inside the ring
    const n = Math.max(8, Math.ceil(Math.abs(th1 - th0) / 0.05));
    return Array.from({ length: n + 1 }, (_, i) => { const u = i / n, th = lerp(th0, th1, u), o = off * smooth(clamp(u / 0.12)) * smooth(clamp((1 - u) / 0.12)); return ell(th, o); });
  };
  const upright = () => (tall ? 1 - smooth(clamp(m - 1)) : 0); // a phone stands the wheel up on 9 and 10: artists on top
  const turn = () => upright() * 90 * RAD;
  const lane = () => (tall ? 9 : 15) * k; // the inner strand: equip's lane
  const entryTh = (i) => ENTRY[i] * RAD + turn();
  const exitTh = (j) => EXIT[j] * RAD + turn();
  // Threads leave sideways on a wide screen and downwards on an upright phone; between, they blend.
  const edge = (x, y, r, sx, sy) => { const f = upright(), dx = (1 - f) * sx, dy = f * sy, n = Math.hypot(dx, dy) || 1; return { x: x + (r * dx) / n, y: y + (r * dy) / n }; };
  const flow = (p0, p1) => { const f = upright(), dx = (p1.x - p0.x) * 0.45 * (1 - f), dy = (p1.y - p0.y) * 0.45 * f; return line(bez(p0, { x: p0.x + dx, y: p0.y + dy }, { x: p1.x - dx, y: p1.y - dy }, p1)); };
  const artThread = (i) => { // from the artist to its point on the ring
    const [x, y] = cur.artists[i], [ex, ey] = ell(entryTh(i));
    return flow(edge(x, y, cur.artR, 1, 1), { x: ex, y: ey });
  };
  const grpThread = (j) => { // from the ring out to the group
    const [x, y] = cur.groups[j], [ex, ey] = ell(exitTh(j));
    return flow({ x: ex, y: ey }, edge(x, y, cur.grpR, -1, -1));
  };
  const linkThread = (j) => { // from one group on to the next, clockwise
    const [x0, y0] = cur.groups[j], [x1, y1] = cur.groups[j + 1], r = cur.grpR;
    if (upright() > 0.5) { const sx = Math.sign(x1 - x0) || 1, q0 = { x: x0 + sx * r, y: y0 }, q1 = { x: x1 - sx * r, y: y1 }, dx = q1.x - q0.x; return line(bez(q0, { x: q0.x + dx * 0.4, y: q0.y + 18 * k }, { x: q1.x - dx * 0.4, y: q1.y + 18 * k }, q1)); }
    const p0 = { x: x0, y: y0 + r }, p1 = { x: x1, y: y1 - r }, dy = p1.y - p0.y;
    return line(bez(p0, { x: p0.x + 26 * k, y: p0.y + dy * 0.4 }, { x: p1.x + 26 * k, y: p1.y - dy * 0.4 }, p1));
  };
  const cardThread = (i) => { // from the ring out to the card's nearest edge
    const v = vis[i], thDeg = cur.cards[i][2], x = v ? v.x : cur.cards[i][0], y = v ? v.y : cur.cards[i][1];
    const w = v ? v.w : cur.cw, h = v ? v.h : cardH[i] || cur.cw * 0.9;
    const th_ = thDeg * RAD, [ax, ay] = ell(th_);
    const dx = ax - x, dy = ay - y;
    if (Math.hypot(dx, dy) < Math.max(w, h) / 2 + 2) return line([[ax, ay], [ax + Math.cos(th_), ay + Math.sin(th_)]]); // an icon on the ring
    const t = Math.min(Math.abs((w / 2 + 4) / (dx || 1e-6)), Math.abs((h / 2 + 4) / (dy || 1e-6)));
    const end = { x: x + dx * t, y: y + dy * t };
    const out = { x: Math.cos(th_), y: Math.sin(th_) }, reach = Math.hypot(end.x - ax, end.y - ay) * 0.42, n = Math.hypot(dx, dy) || 1;
    return line(bez({ x: ax, y: ay }, { x: ax + out.x * reach, y: ay + out.y * reach }, { x: end.x + (dx / n) * reach * 0.6, y: end.y + (dy / n) * reach * 0.6 }, end));
  };
  const join = (...hs) => line(hs.flatMap((h, i) => (i ? h.pts.slice(1) : h.pts)));
  const rev = (h) => line([...h.pts].reverse());
  // A mote's whole route, reused while the picture geometry holds.
  const route = (mo) => {
    if (mo.kind === 'in') { // an artist, round the top, out to a group
      const a = entryTh(mo.a), b = exitTh(mo.b) + TAU;
      return join(artThread(mo.a), line(arc(a, b, 0)), grpThread(mo.b));
    }
    if (mo.kind === 'eq') { // a group, round the bottom on the inner lane, back to an artist
      const a = exitTh(mo.b), b = entryTh(mo.a);
      return join(rev(grpThread(mo.b)), line(arc(a, b < a ? b + TAU : b, -lane())), rev(artThread(mo.a)));
    }
    if (mo.kind === 'hop') return linkThread(mo.b);
    // An initiative plugging energy in: from its card down its thread, into the ring and on round it.
    const at_ = cur.cards[mo.c][2] * RAD;
    return join(rev(cardThread(mo.c)), line(arc(at_, at_ + mo.span, 0)));
  };
  const routeFor = (mo) => {
    if (mo.pathM !== m || mo.pathVersion !== layoutVersion) {
      mo.path = route(mo);
      mo.pathM = m;
      mo.pathVersion = layoutVersion;
    }
    return mo.path;
  };

  // Where a drifting dot from slide 8 is headed: a point on an artist's circle, or one of a group's dots.
  const target = (t) => {
    if (t.kind === 'art') { const [x, y] = cur.artists[t.i], r = cur.artR; return [x + Math.cos(t.a) * r, y + Math.sin(t.a) * r]; }
    const [x, y] = cur.groups[t.j], r = cur.grpR, cl = clouds[t.j];
    if (t.rim !== undefined) { const d = cl.rim[t.rim]; return [x + Math.cos(d.a) * r * d.r, y + Math.sin(d.a) * r * d.r]; }
    const d = cl.core[t.core]; return [x + d.x * r, y + d.y * r];
  };
  const assign = (people, cx) => { // the nearest of the apps' people, side by side, go to each artist and each group
    const tg = [];
    cur.artists.forEach((_, i) => { for (let n = 0; n < 9; n++) tg.push({ kind: 'art', i, a: -Math.PI / 2 + (n / 9) * TAU, side: -1 }); });
    clouds.forEach((cl, j) => { cl.rim.forEach((_, n) => tg.push({ kind: 'grp', j, rim: n, side: 1 })); cl.core.forEach((_, n) => tg.push({ kind: 'grp', j, core: n, side: 1 })); });
    const pool = people.map((p) => ({ ...p, side: p.x < cx ? -1 : 1, tgt: null }));
    for (const t of tg) {
      const [tx, ty] = target(t);
      let best = null, bd = Infinity;
      for (const p of pool) { if (p.tgt || (!tall && p.side !== t.side)) continue; const d = Math.hypot(p.x - tx, p.y - ty); if (d < bd) { bd = d; best = p; } }
      if (best) best.tgt = t;
    }
    return pool.map((p) => ({ x: p.x, y: p.y, r: p.r, bright: p.bright, tgt: p.tgt, d: 0.1 + Math.random() * 0.35, swing: (Math.random() - 0.5) * 60 }));
  };

  // ---- Drawing ----------------------------------------------------------------------------------
  const lensPts = (lens, side, n, inset) => {
    const [cx, cy, w, h] = lens, hw = w / 2 - inset, hh = h / 2 - inset * 0.6, c = (hw * hw - hh * hh) / (2 * hw), Rr = hw - c;
    return Array.from({ length: n + 1 }, (_, i) => { const y = -hh + (2 * hh * i) / n; return [cx + side * (c + Math.sqrt(Math.max(0, Rr * Rr - y * y))), cy + y]; });
  };
  const paintMink = (x, y, a, u) => {
    if (a <= 0) return;
    const P2 = M.POSES.profile, w = P2[0].length * u, h = P2.length * u;
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
  const glyph = (i, x, y, r, a) => { // the artist's own small line drawing
    const s = r / 39;
    g.lineWidth = Math.max(0.9, 1.35 * LW * Math.min(1, s * 1.2));
    g.strokeStyle = `rgba(${CORE},${(0.85 * a).toFixed(3)})`;
    g.beginPath();
    const L_ = (pts) => pts.forEach(([px, py], n) => (n ? g.lineTo(x + px * s, y + py * s) : g.moveTo(x + px * s, y + py * s)));
    if (i === 0) { // brush
      L_([[11, -13], [0, 1]]); L_([[2, -2], [-3, 3]]);
      g.moveTo(x - 1 * s, y + 2 * s); g.quadraticCurveTo(x - 10 * s, y + 3 * s, x - 12 * s, y + 13 * s); g.quadraticCurveTo(x - 3 * s, y + 12 * s, x + 1 * s, y + 4 * s);
    } else if (i === 1) { // camera
      g.roundRect(x - 14 * s, y - 8 * s, 28 * s, 19 * s, 3 * s); L_([[-6, -8], [-4, -12], [4, -12], [6, -8]]);
      g.moveTo(x + 6 * s, y + 1.5 * s); g.arc(x, y + 1.5 * s, 6 * s, 0, TAU);
    } else if (i === 2) { // pencil
      L_([[-9, 13], [-13, 9], [7, -11], [11, -7], [-9, 13], [-14, 14], [-13, 9]]); L_([[4, -8], [8, -4]]);
    } else if (i === 3) { // film
      g.rect(x - 11 * s, y - 13 * s, 22 * s, 26 * s); L_([[-6, -13], [-6, 13]]); L_([[6, -13], [6, 13]]); L_([[-6, 0], [6, 0]]);
      for (let n = -1; n <= 1; n++) { g.moveTo(x - 8.5 * s, y + (n * 8 - 1) * s); g.lineTo(x - 8.5 * s, y + (n * 8 + 1) * s); g.moveTo(x + 8.5 * s, y + (n * 8 - 1) * s); g.lineTo(x + 8.5 * s, y + (n * 8 + 1) * s); }
    } else if (i === 4) { // palette
      g.moveTo(x + 2 * s, y + 12 * s);
      g.bezierCurveTo(x - 14 * s, y + 12 * s, x - 15 * s, y - 12 * s, x + 1 * s, y - 12 * s); g.bezierCurveTo(x + 14 * s, y - 12 * s, x + 15 * s, y + 2 * s, x + 6 * s, y + 2 * s);
      g.bezierCurveTo(x + 1 * s, y + 2 * s, x + 6 * s, y + 12 * s, x + 2 * s, y + 12 * s);
    } else if (i === 5) { // picture
      g.rect(x - 13 * s, y - 10 * s, 26 * s, 20 * s); L_([[-11, 8], [-3, -1], [3, 4], [7, 0], [11, 5]]);
      g.moveTo(x + 7.5 * s, y - 4.5 * s); g.arc(x + 5 * s, y - 4.5 * s, 2.5 * s, 0, TAU);
    } else { // music
      L_([[-3, 7], [-3, -11], [9, -13], [9, 5]]); L_([[-3, -6], [9, -8]]);
      g.moveTo(x - 3 * s, y + 8 * s); g.ellipse(x - 6.5 * s, y + 8 * s, 3.6 * s, 2.8 * s, -0.4, 0, TAU);
      g.moveTo(x + 9 * s, y + 6 * s); g.ellipse(x + 5.5 * s, y + 6 * s, 3.6 * s, 2.8 * s, -0.4, 0, TAU);
    }
    g.stroke();
  };

  const draw = () => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!cur || !begun) return;
    k = cur.k; LW = Math.max(0.75, Math.min(1.15, k * 1.2));
    g.lineCap = 'round'; g.lineJoin = 'round';
    const bright = 1 + 0.35 * boost;
    const [cx, cy, rx, ry] = cur.ring;
    const spokes = 1 - smooth(clamp(m / 0.3)); // the lens's own threads, gone as she leaves the centre for her corner
    const pa = nine();

    // The ring: two strands traced from the artists' side round both ways; beads on the inner one turn with it.
    const qr = ease(k01(T.ring, 1.1));
    if (qr > 0) {
      const a0 = Math.PI + turn();
      [[0, 1.1, 0.62], [-lane(), 0.7, 0.34]].forEach(([off, w, al]) => {
        for (const dir of [1, -1]) {
          const h = line(arc(a0, a0 + dir * Math.PI * qr, 0).map(([x, y]) => [cx + (x - cx) * (rx + off) / rx, cy + (y - cy) * (ry + off) / ry]));
          stroke(h, 0, h.total, w * LW, THREAD, al * (0.85 + 0.25 * boost + 0.4 * flashes.ring));
        }
      });
      halo(cx, cy, Math.max(rx, ry) * 1.15, 0.035 * qr * bright);
      const nb = Math.round(Math.PI * (rx + ry) / (14 * Math.max(0.6, k)));
      for (let i = 0; i < nb; i++) {
        const th = (i / nb) * TAU + spin, rel = (((th - a0) % TAU) + TAU) % TAU, reach = Math.min(rel, TAU - rel) / Math.PI;
        if (reach > qr) continue;
        const [x, y] = ell(th, -lane());
        dot(x, y, 0.9 * Math.max(0.7, k), NODE, (i % 6 === 0 ? 0.7 : 0.32) * bright);
      }
    }

    // Astrid at the hub: the lens traces from its tips, the mink inside; faint spokes out to the ring.
    const hq = hand ? easeIO(clamp(ta / 1.25)) : 1;
    const ql = hand ? 1 : ease(k01(T.lens, 1.0));
    const lens = hq < 1 ? [lerp(hand.core.x, cur.lens[0], hq), lerp(hand.core.y, cur.lens[1], hq), lerp(hand.core.w, cur.lens[2], hq), lerp(hand.core.h, cur.lens[3], hq)] : cur.lens;
    const la = lensA(), fq = flightQ(); // the same on every path, however 9 was reached (the 8→9 hand-off included)
    if (ql > 0 && la > 0.003) {
      halo(lens[0], lens[1], lens[3] * 0.55, 0.12 * ql * bright * la);
      const ks = lens[2] / 112; // the lens's own scale: she shrinks into her corner
      [[0, 1.2, 0.95], [5 * ks, 0.9, 0.55], [-3.5 * ks, 0.8, 0.35]].forEach(([inset, w, a]) => {
        for (const side of [-1, 1]) { const h = line(lensPts(lens, side, 36, inset)), mid = h.total / 2, half = mid * ql; stroke(h, mid - half, mid + half, w * LW, THREAD, a * la); }
      });
      node(lens[0], lens[1] - lens[3] / 2, Math.min(1, ks * 1.2), ql * la); node(lens[0], lens[1] + lens[3] / 2, Math.min(1, ks * 1.2), ql * la);
      if (spokes > 0 && qr > 0.9) { // once the ring has closed
        const sa = 0.2 * spokes * clamp((qr - 0.9) * 10);
        for (const side of [-1, 1]) {
          const lp = [lens[0] + side * lens[2] / 2, lens[1]];
          const ths = side < 0 ? [entryTh(1), entryTh(3), entryTh(5)] : [exitTh(0), exitTh(1), exitTh(2)];
          ths.forEach((th, n) => { const [ex, ey] = ell(th); const h = line(bez({ x: lp[0], y: lp[1] + (n - 1) * 6 * k }, { x: lerp(lp[0], ex, 0.5), y: lp[1] + (n - 1) * 6 * k }, { x: lerp(lp[0], ex, 0.5), y: ey }, { x: ex, y: ey }, 16)); stroke(h, 0, h.total, 0.6 * LW, THREAD, sa); });
          node(lp[0], lp[1], 0.55, spokes * ql);
        }
      }
      const u = hq < 0.5 ? hand.core.cell : cell;
      const mx = lerp(hand ? hand.mo.x : M.LENS.x * cell, M.LENS.x * cell, hq), my = lerp(hand ? hand.mo.y : M.LENS.y * cell, M.LENS.y * cell, hq);
      if (fq <= 0.001) { paintMink(lens[0] + mx, lens[1] + my, hand ? 1 : smooth(k01(T.lens + 0.45, 0.5)), u); minkAt = [lens[0] + mx, lens[1] + my]; } // once she's off, she flies above the cards
    }

    // The core of the ecosystem, where Astrid was: a soft light with a few motes turning round it, and fine
    // threads out to where each initiative plugs into the ring.
    const cq = coreQ() * qr;
    if (cq > 0.003) {
      const br = 1 + 0.12 * Math.sin(ta * 1.4) + 0.5 * flashes.ring;
      halo(cx, cy, 90 * k * br, 0.2 * cq);
      halo(cx, cy, 34 * k, 0.5 * cq * br);
      for (let n = 0; n < 9; n++) { const a = (n / 9) * TAU + spin * 3, r = (22 + (n % 3) * 9) * k; dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92, (n % 3 ? 1.1 : 1.6) * Math.max(0.7, k), CORE, (n % 3 ? 0.5 : 0.85) * cq); }
      node(cx, cy, 1.5, cq);
      cur.cards.forEach((c) => { const [ex, ey] = ell(c[2] * RAD); const h = line(bez({ x: cx, y: cy }, { x: lerp(cx, ex, 0.4), y: lerp(cy, ey, 0.4) }, { x: lerp(cx, ex, 0.7), y: lerp(cy, ey, 0.7) }, { x: ex, y: ey }, 12)); stroke(h, 0, h.total, 0.6 * LW, THREAD, 0.16 * cq); });
    }

    // The artists: their circles and glyphs, and threads into the ring.
    if (pa > 0.003) cur.artists.forEach(([x, y], i) => {
      const q = ease(k01(T.art + i * 0.07, 0.6)) * pa;
      if (q <= 0) return;
      const r = cur.artR, f = flashes.art[i];
      halo(x, y, r * 1.6, (0.06 + 0.22 * f) * q * bright);
      g.lineWidth = 1.3 * LW; g.strokeStyle = `rgba(${THREAD},${(0.9 * q).toFixed(3)})`;
      g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * q); g.stroke();
      glyph(i, x, y, r, q);
      const qt = ease(k01(T.artT + i * 0.05, 0.7));
      if (qt > 0) {
        const h = artThread(i);
        stroke(h, 0, h.total * qt, 0.85 * LW, THREAD, 0.5 * bright * pa);
        node(h.pts[0][0], h.pts[0][1], 0.75, q);
        if (qt > 0.5) node(at(h, h.total * 0.5).x, at(h, h.total * 0.5).y, 0.6, smooth(clamp((qt - 0.5) * 4)) * pa);
        if (qt >= 1) node(h.pts[h.pts.length - 1][0], h.pts[h.pts.length - 1][1], 0.55, pa);
      }
    });

    // Everyone else: threads out of the ring, clouds of people, and the links between the groups.
    if (pa > 0.003) cur.groups.forEach(([x, y], j) => {
      const qt = ease(k01(T.grpT + j * 0.1, 0.7));
      if (qt > 0) { const h = grpThread(j); stroke(h, 0, h.total * qt, 0.85 * LW, THREAD, 0.5 * bright * pa); node(h.pts[0][0], h.pts[0][1], 0.6, pa); if (qt > 0.5) node(at(h, h.total * 0.5).x, at(h, h.total * 0.5).y, 0.6, smooth(clamp((qt - 0.5) * 4)) * pa); }
      const q = k01(T.grp + j * 0.12, 0.6) * pa;
      if (q <= 0) return;
      const r = cur.grpR, f = flashes.grp[j], cl = clouds[j];
      halo(x, y, r * 1.5, (0.07 + 0.25 * f) * q * bright);
      cl.rim.forEach((d, n) => { const qq = clamp(q * 2.2 - n / cl.rim.length); if (qq > 0) { const px = x + Math.cos(d.a) * r * d.r, py = y + Math.sin(d.a) * r * d.r; halo(px, py, 4.5 * Math.max(0.6, k), 0.3 * qq); dot(px, py, 1.45 * d.s * Math.max(0.65, k), NODE, (0.8 + 0.2 * f) * qq * bright); } });
      cl.core.forEach((d) => { const px = x + d.x * r, py = y + d.y * r; if (d.b) halo(px, py, 6 * Math.max(0.6, k), 0.45 * q); dot(px, py, 1.6 * d.s * Math.max(0.65, k), CORE, (0.85 + 0.15 * f) * q * bright); });
    });
    const qk = ease(k01(T.link, 0.6));
    if (qk > 0 && pa > 0.003) for (let j = 0; j < 2; j++) { const h = linkThread(j); stroke(h, 0, h.total * qk, 0.7 * LW, THREAD, 0.4 * pa); if (qk >= 1) node(at(h, h.total / 2).x, at(h, h.total / 2).y, 0.7, pa); }

    // From slide 8: the apps' communities drifting out to become the artists and the groups.
    if (hand && !hand.done) {
      let live = 0;
      for (const d of hand.dots) {
        const q = easeIO(clamp((ta - d.d) / 1.1));
        let x, y, a;
        if (d.tgt) {
          const [tx, ty] = target(d.tgt), sw = Math.sin(Math.PI * q) * d.swing * k;
          x = lerp(d.x, tx, q) - sw * (ty - d.y) / (Math.hypot(tx - d.x, ty - d.y) || 1);
          y = lerp(d.y, ty, q) + sw * (tx - d.x) / (Math.hypot(tx - d.x, ty - d.y) || 1);
          a = (d.bright ? 1 : 0.75) * (1 - smooth(clamp((ta - d.d - 1.1) / 0.4)));
        } else { x = d.x; y = d.y - 14 * k * q; a = (d.bright ? 0.9 : 0.6) * (1 - smooth(clamp((ta - 0.1) / 0.7))); }
        if (a <= 0.003) continue;
        live++;
        if (d.bright) halo(x, y, 6 * Math.max(0.6, k), 0.3 * a);
        dot(x, y, d.r, CORE, a);
      }
      if (!live && ta > 1 && !unhanding) hand.done = true;
    }

    // The initiatives: a thread from the ring out to each card, where it plugs in.
    cur.cards.forEach((c, i) => {
      const q = chipQ(i);
      if (q <= 0.003) return;
      const h = cardThread(i), v = vis[i];
      if (h.total > 3) {
        stroke(h, 0, h.total * ease(q), 0.95 * LW, THREAD, 0.6 * q);
        node(h.pts[0][0], h.pts[0][1], 0.9, q);
        node(h.pts[h.pts.length - 1][0], h.pts[h.pts.length - 1][1], 0.6, q);
      }
      if (v && v.o < 0.6) { // an icon: a fine gold ring round it, a bead on the halo
        const a = q * (1 - v.o / 0.6), r = Math.min(v.w, v.h) / 2 + 3;
        halo(v.x, v.y, r * 1.7, 0.14 * a);
        g.lineWidth = 1.2 * LW; g.strokeStyle = `rgba(${THREAD},${(0.85 * a).toFixed(3)})`;
        g.beginPath(); g.arc(v.x, v.y, r, 0, TAU); g.stroke();
      }
    });

    // Motes in flight, each with a short tail; where one lands, its node lights.
    for (const mo of motes) {
      const h = routeFor(mo), u = clamp((ta - mo.t0) / mo.dur), d = (0.8 * u + 0.2 * smooth(u)) * h.total;
      const tail = 64 * Math.max(0.6, k) * (1 + 0.3 * boost);
      const plug = mo.kind === 'plug', fade = smooth(clamp(u / 0.06)) * smooth(clamp((1 - u) / (plug ? 0.25 : 0.04)));
      const a = (mo.kind === 'eq' || mo.kind === 'hop' ? 0.8 : 1) * fade * (0.85 + 0.25 * boost) * (plug ? chipQ(mo.c) : pa) * (unhanding ? 1 - unhanding.fade : 1);
      if (a <= 0.003) continue;
      for (let s = 0; s < 4; s++) stroke(h, Math.max(0, d - tail * (1 - s / 4)), d, (0.6 + s * 0.35) * LW, NODE, a * (0.18 + s * 0.16));
      const p = at(h, d);
      halo(p.x, p.y, 15 * Math.max(0.6, k) * (1 + 0.25 * boost), 0.85 * a);
      dot(p.x, p.y, 2.6 * Math.max(0.7, k), CORE, a);
    }
  };

  // DOM: the labels and the chips follow the picture.
  // DOM: the labels and the chips follow the picture. Each frame writes every card's sizing first, then reads what it
  // needs back (only for a card whose width, type or layout changed), then sets every transform, clip and opacity:
  // at most one layout a frame, and none while the picture holds still. The labels' sizes are measured in layout().
  const lsz = new Map();
  const put = (el, x, y, alignX, alignY) => { const [w, h] = lsz.get(el) || [0, 0]; el.style.transform = `translate(${(x - w * alignX).toFixed(1)}px, ${(y - h * alignY).toFixed(1)}px)`; };
  const setOp = (el, v) => { const s = v.toFixed(2); if (el.style.opacity !== s) el.style.opacity = s; };
  const mediaH = chips.map(() => 0), dirty = chips.map(() => true);
  let layW = 0; // the width the cards are laid out at
  let seatIn = null, seatAt = null; // the mink's seat: its middle in her card (unscaled), and on screen this frame
  // A face that arrives late changes the type's size: measure again then.
  document.fonts?.addEventListener?.('loadingdone', () => {
    for (const key in labels) lsz.set(labels[key], [labels[key].offsetWidth, labels[key].offsetHeight]);
    dirty.fill(true); fullW = 0; lastPlaceKey = null;
    if (!running && begun && cur) frame();
  });
  const inCard = (el, card) => { // an element's middle in its card's own coordinates (borders included, transforms not)
    let x = el.offsetWidth / 2, y = el.offsetHeight / 2;
    for (let n = el; n && n !== card; n = n.offsetParent) { x += n.offsetLeft + (n.offsetParent ? n.offsetParent.clientLeft : 0); y += n.offsetTop + (n.offsetParent ? n.offsetParent.clientTop : 0); }
    return [x, y];
  };
  const place = () => {
    const key = [W, H, m, k01(T.labels, 0.6), cardOut(), openBase(), ...chips.map((_, i) => chipQ(i)), ...hov, ...gro, root.classList.contains('is-on')].join('|');
    if (key === lastPlaceKey) return;
    const mChanged = m !== lastPlacedM;
    lastPlaceKey = key;
    lastPlacedM = m;
    if (!mChanged || !morph) layoutVersion++;
    const ql = k01(T.labels, 0.6);
    const lens = cur.lens;
    put(labels.astrid, lens[0] + M.LENS.x * cell * (1 - clamp(m)), lens[1] - lens[3] / 2 - lerp(22 * k, 13, clamp(m)), 0.5, 0.5); // over the lens, wherever she sits
    put(labels.artists, cur.artistsLabel[0], cur.artistsLabel[1], 0.5, 0.5);
    cur.groups.forEach(([x, y], j) => {
      if (tall) put(labels[`g${j}`], x, y + cur.grpR + 5, 0.5, 0);
      else put(labels[`g${j}`], x + cur.grpR + 16 * k, y, 0, 0.5);
    });
    put(labels.inspire, cur.inspire[0], cur.inspire[1], 0.5, 0.5);
    put(labels.equip, cur.equip[0], cur.equip[1], 0.5, 0.5);
    const pa = nine();
    for (const key in labels) setOp(labels[key], key === 'astrid' ? smooth(k01(T.lens + 0.6, 0.5)) * lensA() : ql * pa);
    // The cards: sized from the picture's scale, coming out of the ring on the way from 9; on 11 (and on a
    // phone) each is clipped down to an icon of its picture, opening back into the whole card when asked.
    const out = m < 1 ? cardOut() : 1, ob = openBase(), S = iconR() * 2;
    // While the picture morphs, the cards are laid out at a width that moves in steps (6%), and scaled the rest of
    // the way; once it rests they are laid out at the true width. Their type is sized with their width, so a step
    // wraps much as the true width would, and a morph costs a handful of layouts rather than one every frame.
    const cw = cur.cw;
    if (!morph || Math.abs(cw - layW) > cw * 0.06) layW = cw;
    const w = layW, ls = cw / w, ws = `${w.toFixed(1)}px`, fs = `${Math.max(tall ? 10.5 : 11.5, (w / 250) * 15.5).toFixed(2)}px`, compact = !tall && w < 176;
    chips.forEach((el, i) => { // 1. sizing
      if (el.style.width !== ws) { el.style.width = ws; el.style.fontSize = fs; dirty[i] = true; }
      if (el.classList.contains('is-compact') !== compact) { el.classList.toggle('is-compact', compact); dirty[i] = true; }
    });
    chips.forEach((el, i) => { // 2. measuring, where the sizing changed
      if (!dirty[i]) return;
      dirty[i] = false;
      cardH[i] = el.offsetHeight; mediaH[i] = media[i].offsetHeight || w * 0.54;
      const f = CARDS[i].focus && el.querySelector(CARDS[i].focus); // an icon centred on a part of its picture
      if (f) { const mr = media[i].getBoundingClientRect(), fr = f.getBoundingClientRect(); if (mr.width && fr.width) CARDS[i].crop = [(fr.left + fr.width / 2 - mr.left) / mr.width, (fr.top + fr.height / 2 - mr.top) / mr.height, Math.min(1, (fr.width * 1.15) / mr.height)]; }
      if (i === 1) seatIn = inCard(seat, el);
    });
    let live = root.classList.contains('is-on');
    const fq = flightQ(), arrive = smooth(clamp((fq - 0.9) / 0.1)); // she becomes her icon's logo only as she gets there
    cur.cards.forEach(([x, y], i) => { // 3. placing
      const el = chips[i], q = chipQ(i), h = cardH[i], mh = mediaH[i];
      const [fx, fy, fz] = CARDS[i].crop, o = Math.max(ob, hov[i]), c = Math.min(mh, w) * fz;
      const cx0 = clamp(fx * w - c / 2, 0, w - c), cy0 = clamp(fy * mh - c / 2, 0, mh - c);
      const ins = [cy0, w - cx0 - c, h - cy0 - c, cx0].map((v) => v * (1 - o));
      const sc = lerp(S / c, ls, o) * lerp(0.55, 1, out);
      const ax = lerp(cx0 + c / 2, w / 2, o), ay = lerp(cy0 + c / 2, h / 2, o);
      const [px, py] = ell(cur.cards[i][2] * RAD); // each comes out of the point where it plugs into the ring
      let sx = m < 1 ? lerp(px, x, out) : x, sy = m < 1 ? lerp(py, y, out) : y;
      if (o > 0.01 && o < 0.999 || hov[i] > 0) { // an opened icon stays on screen
        const l = sx - ax * sc, t = sy - ay * sc, r = l + w * sc, b = t + h * sc;
        sx += (Math.max(0, 10 - l) - Math.max(0, r - (W - 10))) * o;
        sy += (Math.max(0, 10 - t) - Math.max(0, b - (H - (tall ? 64 : 58)))) * o; // clear of the chrome bar
      }
      el.style.transformOrigin = `${ax.toFixed(1)}px ${ay.toFixed(1)}px`;
      el.style.transform = `translate(${(sx - ax).toFixed(1)}px, ${(sy - ay).toFixed(1)}px) scale(${sc.toFixed(4)})`;
      el.style.clipPath = o >= 0.999 ? '' : `inset(${ins.map((v) => `${v.toFixed(1)}px`).join(' ')} round ${lerp(c / 2, 7, o).toFixed(1)}px)`;
      el.classList.toggle('is-icon', o < 0.5);
      setOp(el.lastChild, smooth(clamp((o - 0.5) / 0.4))); // the words go first as a card closes, and come last as it opens
      const fc = faces[i];
      if (fc) { // the icon's own face over its crop: it goes first as the icon opens, and comes back last as it closes
        const fk = `${cx0.toFixed(1)},${cy0.toFixed(1)},${c.toFixed(1)}`;
        if (fc.dataset.k !== fk) { fc.dataset.k = fk; Object.assign(fc.style, { left: `${(cx0 - 1).toFixed(1)}px`, top: `${(cy0 - 1).toFixed(1)}px`, width: `${(c + 2).toFixed(1)}px`, height: `${(c + 2).toFixed(1)}px`, fontSize: `${(c / 10).toFixed(2)}px` }); } // a pixel over the crop's edge, so none of the picture shows round it
        setOp(fc, (1 - smooth(clamp((o - 0.04) / 0.36))) * (i === 1 ? arrive : 1));
      }
      el.style.zIndex = hov[i] > 0.02 || gro[i] > 0.02 ? '3' : '';
      setOp(el, q * (1 - smooth(clamp((gro[i] - 0.25) / 0.2)))); // under its fuller card, once that has come in, it steps out
      if (q < 0.9) live = false;
      const iw = w - ins[1] - ins[3], ih = h - ins[0] - ins[2];
      vis[i] = { x: sx + (ins[3] + iw / 2 - ax) * sc, y: sy + (ins[0] + ih / 2 - ay) * sc, w: iw * sc, h: ih * sc, o };
      if (i === 1 && seatIn) seatAt = [sx + (seatIn[0] - ax) * sc, sy + (seatIn[1] - ay) * sc];
    });
    if (cardsRoot.inert === live) cardsRoot.inert = !live;
    cardsRoot.classList.toggle('is-live', live);
    placeFulls();
    // The mink: from the lens on 9 she flies up and out into her card, crisp all the way. Once she has landed she
    // is part of her card, in its seat: she opens, closes and stacks with it, so a neighbour opened over her covers
    // her like the rest of her card (she used to ride a layer above every card, and had to hide whenever any other
    // card opened, which left her icon an empty corner of the editor). On 11, and on a phone, her icon is her logo.
    const landed = fq >= 0.999;
    setOp(seat, landed ? 1 : 0);
    if (fq > 0.001 && !landed && begun && vis[1] && seatAt) {
      const L0 = stages[0].lens, v = vis[1];
      const tx = lerp(v.x, seatAt[0], v.o), ty = lerp(v.y, seatAt[1], v.o);
      const c0 = lensCell();
      const sx = minkAt ? minkAt[0] : L0[0] + M.LENS.x * c0, sy = minkAt ? minkAt[1] : L0[1] + M.LENS.y * c0;
      const u = fq < 0.55 ? c0 : seatCell(); // she leaves the lens at the size she had in it
      const other = Math.max(0, ...hov.filter((_, j) => j !== 1), ...gro.filter((_, j) => j !== 1)); // never over a neighbour opened above her
      const into = (1 - v.o) * arrive; // flying into her icon, she becomes its logo
      // As she becomes the logo she is drawn onto its middle, so the two never stand apart.
      paintFly(lerp(lerp(sx, tx, fq), tx, into), lerp(lerp(sy, ty, fq) - Math.sin(Math.PI * fq) * 60 * k, ty, into), u, (1 - into) * (1 - other));
    } else if (fly.style.opacity !== '0') fly.style.opacity = '0';
  };
  // Slide 10's cards grow into their fuller cards, from the small card's box (or its icon's, on a phone) to the
  // whole card, kept on screen; the small card steps out beneath. Each fuller card is sized (from slide 10's own card
  // width) and measured once a layout.
  let wordsBottom = 0;
  const placeFulls = () => {
    if (!fulls.length) return;
    const wide = short; // a phone on its side: the fuller card lies on its side too
    const fw = tall ? Math.min(W - 24, 340) : wide ? Math.min(W - 48, 540) : clamp(stages[1].cw * 1.6, 290, 360);
    if (Math.abs(fw - fullW) > 0.5) {
      fullW = fw;
      fulls.forEach((el) => {
        el.style.width = `${fw.toFixed(1)}px`;
        el.style.fontSize = `${((wide ? fw / 1.7 : fw) / 320 * 15).toFixed(2)}px`;
        el.classList.toggle('is-wide', wide);
      });
      fulls.forEach((el, i) => { fullH[i] = el.offsetHeight; fullSH[i] = el.firstChild.offsetHeight; });
    }
    // Whole, it fits the screen above the deck's chrome, and below slide 10's words where there's room for it there.
    const bottom = H - 72, m_ = 10, words = wordsBottom + 14;
    fulls.forEach((el, i) => {
      const g = gro[i], v = vis[i];
      if (g <= 0.002 || !v) {
        if (el.style.visibility !== 'hidden') { el.style.visibility = 'hidden'; el.style.pointerEvents = 'none'; }
        return;
      }
      const FH = fullH[i], fits = Math.min(1, (W - 2 * m_) / fullW), roomy = (bottom - words) / FH >= fits * 0.9;
      const top_ = roomy ? words : m_, s1 = Math.min(fits, (bottom - top_) / FH);
      const s0 = Math.min(v.w / fullW, s1), icon = v.o < 0.5;
      // It starts at the small card's width, its picture over the small card's (an icon's middle over its picture's),
      // and grows to the whole card where it fits. Transform and opacity only, so a grow repaints nothing.
      const a0 = icon ? fullSH[i] / 2 : (v.h / s0) / 2, s = lerp(s0, s1, g);
      const hw = (fullW * s1) / 2, hh = (FH * s1) / 2;
      const tx = clamp(v.x, m_ + hw, W - m_ - hw), ty = clamp(v.y, top_ + hh, bottom - hh);
      const cx = lerp(v.x, tx, g), cy = lerp(v.y, ty, g), ax = fullW / 2, ay = lerp(a0, FH / 2, g);
      if (el.style.visibility) el.style.visibility = '';
      el.style.pointerEvents = grT[i] ? 'auto' : 'none';
      el.style.transform = `translate(${(cx - ax * s).toFixed(1)}px, ${(cy - ay * s).toFixed(1)}px) scale(${s.toFixed(4)})`;
      setOp(el, smooth(clamp(g / 0.35)) * chipQ(i));
    });
  };
  const drawPose = (cx2, u, d) => { // the profile pose at u CSS px per art pixel, d device px per CSS px
    const P2 = M.POSES.profile;
    cx2.clearRect(0, 0, cx2.canvas.width, cx2.canvas.height);
    for (let j = 0; j < P2.length; j++) for (let i = 0; i < P2[0].length; i++) {
      const ch = P2[j][i];
      if (ch === '.') continue;
      cx2.fillStyle = M.COLORS[ch];
      cx2.fillRect(i * u * d, j * u * d, u * d, u * d);
    }
  };
  const seatPaint = document.createElement('canvas'); // off the page: the fuller card's seat is painted here
  const paintSeat = () => {
    [[seat, seatCell()], [fullSeat, tall || short ? 2 : 3]].forEach(([el, u]) => {
      if (!el) return;
      const w = 23 * u, h = 20 * u, cv = el === seat ? seat : seatPaint;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      el.style.width = `${w}px`; el.style.height = `${h}px`;
      drawPose(cv.getContext('2d'), u, dpr);
      if (cv === seatPaint) el.src = seatPaint.toDataURL();
    });
  };
  let flyCell = 0;
  const paintFly = (x, y, u, a) => {
    const w = 23 * u, h = 20 * u;
    if (flyCell !== u) {
      flyCell = u;
      fly.width = Math.round(w * dpr); fly.height = Math.round(h * dpr);
      fly.style.width = `${w}px`; fly.style.height = `${h}px`;
      drawPose(fly.getContext('2d'), u, dpr);
    }
    fly.style.transform = `translate(${Math.round(x - w / 2)}px, ${Math.round(y - h / 2)}px)`;
    setOp(fly, a);
  };

  // ---- Motion -------------------------------------------------------------------------------------
  const spawn = () => {
    const r = Math.random(), a = Math.floor(Math.random() * 7), b = Math.floor(Math.random() * 3);
    // On 9 the community circulates; from 10 on, the initiatives plug energy into the ring.
    const mo = m >= 0.5 ? { kind: 'plug', c: Math.floor(Math.random() * chips.length), span: (0.55 + Math.random() * 0.9) * Math.PI }
      : r < 0.5 ? { kind: 'in', a, b } : r < 0.84 ? { kind: 'eq', a, b } : { kind: 'hop', b: Math.floor(Math.random() * 2) };
    mo.t0 = ta;
    const len = routeFor(mo).total;
    mo.dur = clamp(len / ((150 + 70 * boost) * Math.max(0.5, k)), 1.4, 7);
    motes.push(mo);
  };
  const land = (mo) => {
    if (mo.kind === 'in') flashes.grp[mo.b] = 1;
    else if (mo.kind === 'eq') flashes.art[mo.a] = 1;
    else if (mo.kind === 'hop') flashes.grp[mo.b + 1] = 1;
    else flashes.ring = 1;
  };
  const advance = (dt) => {
    ta += dt;
    // The morph between slides.
    if (morph) {
      const q = clamp((ta - morph.t0) / morph.dur);
      m = lerp(morph.from, morph.to, easeIO(q));
      if (q >= 1) { m = morph.to; morph = null; }
    }
    if (!morph && begun && ta >= T.chips) window.deckEntryDone?.(hosts[stageOf()]);
    // Once the initiatives are on, the wheel turns a little faster and brighter; on 11, gently again.
    const target = m >= 0.9 ? (m > 1.5 ? 0.6 : 1) : 0;
    boost += (target - boost) * (1 - Math.exp(-dt / 0.9));
    spin += dt * (0.05 + 0.05 * boost);
    for (const key of ['art', 'grp']) flashes[key] = flashes[key].map((f) => f * Math.exp(-dt / 0.5));
    flashes.ring *= Math.exp(-dt / 0.6);
    // Each initiative, once out, sends its first pulse of energy down its thread into the ring.
    chips.forEach((_, i) => { if (!pulsed[i] && m >= 0.9 && chipQ(i) >= 1) { pulsed[i] = true; const mo = { kind: 'plug', c: i, span: 0.8 * Math.PI, t0: ta }; mo.dur = clamp(routeFor(mo).total / (220 * Math.max(0.5, k)), 1.2, 4); motes.push(mo); } });
    if (m < 0.5) pulsed = chips.map(() => false);
    hoT.forEach((t, i) => { hov[i] += (t - hov[i]) * (1 - Math.exp(-dt / 0.11)); if (Math.abs(t - hov[i]) < 0.002) hov[i] = t; });
    grT.forEach((t, i) => { gro[i] += (t - gro[i]) * (1 - Math.exp(-dt / 0.13)); if (Math.abs(t - gro[i]) < 0.002) gro[i] = t; });
    // Motes: a calm, continuous circulation once the wheel is drawn.
    if (ta >= T.motes) {
      if (ta >= nextMote) { spawn(); nextMote = ta + (0.75 + Math.random() * 0.6) / (1 + 0.8 * boost); }
      motes = motes.filter((mo) => mo.kind !== 'plug' || m >= 0.3); // back on 9, the energy goes with the cards
      motes = motes.filter((mo) => { if (ta - mo.t0 >= mo.dur) { land(mo); return false; } return true; });
    }
  };
  const settleCur = () => {
    const a = Math.floor(clamp(m, 0, 2)), b = Math.min(2, a + 1), f = m - a;
    cur = f < 1e-4 ? stages[a] : mixed(stages[a], stages[b], f);
    // On the way from 9 to 10 the circle contracts a little before it opens out bigger.
    if (m > 0 && m < 0.6) { const c = 1 - 0.14 * Math.sin(Math.PI * m / 0.6); cur = { ...cur, ring: [cur.ring[0], cur.ring[1], cur.ring[2] * c, cur.ring[3] * c] }; }
    // The lens waits for the artists and the groups to go into the circle, then folds into the core.
    if (m > 0 && m < 1) { const q = smooth(clamp((m - 0.3) / 0.7)); cur = { ...cur, lens: stages[0].lens.map((v, i) => lerp(v, stages[1].lens[i], q)) }; }
    cell = tall ? 1 : Math.max(short ? 1 : 2, Math.round(2.45 * cur.k));
  };
  const frame = () => {
    if (m !== lastM || !cur) { settleCur(); lastM = m; }
    draw();
    place();
    if (m >= 1) window.AstridMark?.follow(Math.min(1, m - 1)); // the deck's mark grows with the halo on the way to 11 (and back)
  };

  // ---- Coming and going ------------------------------------------------------------------------------
  const tick = (now) => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000) * (window.deckPace?.() || 1);
    last = now;
    if (unhanding) { if (!unstep(dt)) return; } else advance(dt);
    frame();
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (running || still || document.hidden || document.getElementById('overview')?.classList.contains('on') || window.deckStill?.()) return; running = true; last = 0; raf = requestAnimationFrame(tick); };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  const reset = () => {
    timers.forEach(window.deckCancelLater); timers = [];
    if (waiting) { waiting.disconnect(); waiting = null; }
    stop();
    begun = false; armed = false; morph = null; motes = []; ta = 0; boost = 0; attach = { dir: 0, t0: 0 }; lastM = -1; pulsed = chips.map(() => false);
    hov.fill(0); hoT.fill(0); gro.fill(0); grT.fill(0); vis.fill(null);
    fulls.forEach((el) => { el.style.visibility = 'hidden'; el.style.pointerEvents = 'none'; });
    vids.forEach((v) => v && !v.paused && v.pause()); cardsRoot.inert = true; cardsRoot.classList.remove('is-live'); fly.style.opacity = '0';
    T = T_FRESH; hand = null; minkAt = null;
    flashes = { art: [0, 0, 0, 0, 0, 0, 0], grp: [0, 0, 0], ring: 0 };
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
    for (const key in labels) labels[key].style.opacity = '0';
    chips.forEach((c) => { c.style.opacity = '0'; });
  };
  // Draw the picture in, from nothing: lens and ring, artists, everyone else, then the motes (and, on 10 or 11, the initiatives).
  const begin = () => {
    if (stageOf() < 0 || !layout()) return;
    begun = true;
    m = Math.max(0, stageOf());
    lastM = -1;
    if (still) {
      ta = 30; attach = m >= 1 ? { dir: 1, t0: 0 } : { dir: 0, t0: 0 }; boost = m >= 1 ? 1 : 0; pulsed = [true, true, true];
      motes = [];
      if (m >= 1) [[0, 0.5], [1, 0.3], [2, 0.6], [3, 0.4], [4, 0.45], [5, 0.35]].forEach(([c, u]) => motes.push({ kind: 'plug', c, span: Math.PI, t0: 30 - u, dur: 1 }));
      else [['in', 1, 0, 0.42], ['in', 4, 1, 0.66], ['in', 6, 2, 0.3], ['eq', 2, 2, 0.5], ['eq', 5, 0, 0.72], ['hop', 0, 0, 0.5]].forEach(([kind, a, b, u]) => motes.push({ kind, a, b, t0: 30 - u, dur: 1 }));
      frame();
      window.deckEntryDone?.(hosts[stageOf()]);
      return;
    }
    ta = -0.15; nextMote = T.motes;
    if (m >= 1) attach = { dir: 1, t0: T.chips };
    start();
  };
  let waiting = null;
  const whenOpen = (fn) => { // on a first load, wait for the Mycelial mark to land
    if (!html.classList.contains('dt-intro')) { fn(); return; }
    waiting = new MutationObserver(() => { if (!html.classList.contains('dt-intro')) { waiting.disconnect(); waiting = null; fn(); } });
    waiting.observe(html, { attributes: true, attributeFilter: ['class'] });
  };
  const arm = () => {
    const on = hosts[stageOf()];
    if (on && arrived.s === on && performance.now() - arrived.t < 80) { whenOpen(begin); return; } // already there (a settle, or reduced motion)
    armed = true;
    timers.push(window.deckLater(() => { if (armed) { armed = false; whenOpen(begin); } }, 1500));
  };
  let arrived = { s: null, t: -1e9 };
  hosts.forEach((s) => s.addEventListener('dt-arrive', () => {
    arrived = { s, t: performance.now() };
    if (!s.classList.contains('on')) return;
    if (armed) { armed = false; whenOpen(begin); }
  }));

  // Slide 8 hands its core and its communities on (window.AstridFlowers), as slide 7 hands its own to slide 8.
  const flHost = document.querySelector('[data-astrid-flowers]'), flSlide = flHost && flHost.closest('.slide');
  // Where slide 8's mink stands in its lens, from the lens's centre (as slide 8 gives it; before, (3, 6) × its k).
  const minkIn = (snap) => (snap.mink ? { x: snap.mink.x - snap.core.x, y: snap.mink.y - snap.core.y } : { x: 3 * snap.k, y: 6 * snap.k });
  const handoff = (snap) => {
    begun = true; T = T_HAND; ta = 0; nextMote = T.motes; lastM = -1;
    hand = { core: snap.core, k: snap.k, mo: minkIn(snap), dots: [], done: false };
    settleCur();
    hand.dots = assign(snap.people, snap.core.x);
    window.AstridFlowers.hide();
    root.style.transition = 'none'; root.classList.add('is-on'); void root.offsetWidth; root.style.transition = ''; // at full strength at once
    frame();
    start();
  };
  // ---- Going back to slide 8 ----------------------------------------------------------------------
  // A step back: the hand-off from slide 8 played backwards. The circulation dies away, the links, the groups and
  // the artists draw back in, the ring closes up, and slide 8's people (now drawn here) drift back out of the
  // circles into their places in the crowd while the lens glides back to the core; slide 8 fades in beneath.
  const HAND_END = 2.6; // everything of the hand-off is in by here
  let unhanding = null;
  const unhand = () => {
    const signal = window.deckNav?.signal;
    timers.forEach(window.deckCancelLater); timers = [];
    armed = false; hov.fill(0); hoT.fill(0);
    T = T_HAND; ta = Math.min(ta, HAND_END);
    unhanding = { snapped: false, shown: false, fade: 0 };
    window.AstridFlowers.holdCore?.(true); // the core is drawn here until it has landed in slide 8's lens
    flSlide.classList.add('dt-return', 'dt-await');
    window.deckRewinding?.(flSlide);
    signal?.addEventListener('abort', endUnhand, { once: true });
    start();
  };
  const unstep = (dt) => {
    const u = unhanding;
    if (!u.snapped) { // slide 8 has settled its crowd by now: its people, where they stand, are where these go back to
      const snap = window.AstridFlowers.snapshot();
      if (!snap) { endUnhand(); return false; }
      u.snapped = true;
      hand = { core: snap.core, k: snap.k, mo: minkIn(snap), dots: assign(snap.people, snap.core.x), done: false };
    }
    ta -= dt; // the tick's dt runs at the turn's pace
    spin += dt * 0.05;
    setOp(labels.astrid, smooth(k01(T.lens + 0.6, 0.5))); // its fade back out (place() only redraws on a change of layout)
    u.fade = Math.min(1, u.fade + dt / 0.3);
    if (!u.shown && ta <= 0.5) { u.shown = true; flSlide.classList.remove('dt-await'); } // slide 8's crowd, under its people
    if (ta <= 0) { endUnhand(); return false; }
    return true;
  };
  const endUnhand = () => {
    if (!unhanding) return;
    unhanding = null;
    // Slide 8 takes its core back in this frame, and this layer lets go of its own (everything else here is gone by
    // now, or stands where slide 8's own crowd stands), so there is never a second mink.
    window.AstridFlowers?.holdCore?.(false);
    if (stageOf() < 0) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); }
    flSlide.classList.remove('dt-return', 'dt-await');
    window.deckRewound?.(flSlide);
    if (stageOf() >= 0) return;
    root.classList.remove('is-on');
    html.classList.remove('fw-quiet');
    stop(); armed = false;
    timers.push(setTimeout(() => { if (stageOf() < 0) reset(); }, 700));
  };

  // Slide 10's glow (the quiet core at the middle of the wheel), for the deck's mark to grow out of on the way to 11
  // and to fold back into on the way back: its middle and reach on a stage (1 = slide 10), in viewport pixels.
  window.AstridFlywheel = { glow: (s) => { const st = stages[s]; return st && { x: st.ring[0], y: st.ring[1], r: 40 * st.k }; } };

  let shown = -1;
  const follow = (records) => {
    const now = stageOf();
    if (now === shown) return;
    const was = shown;
    shown = now;
    endUnhand();
    if (now < 0) { // left the three slides
      const to8 = was === 0 && flSlide && flSlide.classList.contains('on') && window.deckNav?.back && !still && begun && !morph && m === 0 && running && window.AstridFlowers;
      if (to8) { unhand(); return; }
      root.classList.remove('is-on');
      html.classList.remove('fw-quiet');
      stop(); armed = false;
      timers.push(window.deckLater(() => { if (stageOf() < 0) reset(); }, 700));
      return;
    }
    html.classList.toggle('fw-quiet', now < 2); // not on 11, where the deck's Mycelial mark forms
    buildFulls();
    if (now !== 1) { grT.fill(0); if (still) gro.fill(0); } // only slide 10's cards grow; leaving it, they go back
    if (was < 0 || !begun) { // arriving from elsewhere: draw in once the network reaches the node (from slide 8, carry its picture on)
      reset();
      layout(); m = now; settleCur();
      const fromFlowers = now === 0 && was < 0 && !still && flSlide && !flSlide.classList.contains('on') && (records || []).some((r) => r.target === flSlide);
      const snap = fromFlowers && window.AstridFlowers && window.AstridFlowers.snapshot();
      if (snap) { handoff(snap); return; }
      root.classList.add('is-on');
      draw();
      arm();
      return;
    }
    root.classList.add('is-on');
    // From one of these slides to another: the same picture moves.
    if (still) { m = now; attach = now >= 1 ? { dir: 1, t0: ta - 9 } : { dir: 0, t0: 0 }; boost = now >= 1 ? 1 : 0; lastM = -1; frame(); return; }
    morph = { from: m, to: now, t0: ta, dur: 1.15 + 0.45 * Math.abs(now - m) };
    if (now >= 1 && attach.dir <= 0) attach = { dir: 1, t0: Math.max(ta + 0.9, T.chips) };
    if (now === 0 && attach.dir > 0) { attach = { dir: -1, t0: ta, from: chips.map((_, i) => chipQ(i)) }; pulsed = [false, false, false]; }
    start();
  };
  const watch = new MutationObserver(follow);
  [...hosts, flSlide].filter(Boolean).forEach((s) => watch.observe(s, { attributes: true, attributeFilter: ['class'] }));
  const syncMotion = () => {
    if (document.hidden || document.getElementById('overview')?.classList.contains('on') || window.deckStill?.()) { endUnhand(); stop(); }
    else if (stageOf() >= 0 && begun) start();
  };
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('deck-overview', syncMotion);
  window.addEventListener('deck-motion', syncMotion);
  window.deckOnResize(() => {
    endUnhand();
    const target = stageOf();
    if (target < 0 || !layout()) return;
    if (armed || hand || morph || !begun) {
      timers.forEach(window.deckCancelLater); timers = [];
      if (waiting) { waiting.disconnect(); waiting = null; }
      armed = false; begun = true; hand = null; morph = null;
      m = target;
      ta = Math.max(ta, T.chips + 1);
      if (m >= 1) { attach = { dir: 1, t0: ta - T.chips - 1 }; boost = 1; pulsed = chips.map(() => true); }
    }
    lastM = -1; minkAt = null; flyCell = 0;
    frame(); start();
  });

  // An icon opens into its card while it's hovered or focused; a tap opens it (and closes the others). On slide 10
  // a card grows into its fuller card the same way (straight from its icon, on a phone), and the fuller card keeps
  // itself open while the pointer is on it. With reduced motion they open and close at once.
  // The browser hit-tests each card's rounded clip path, including the icon's
  // radius. Only those interactive pixels retain clicks; the decorative canvas
  // and the space around it pass through to the deck's normal click-thirds.
  const grows = () => stageOf() === 1;
  const wire = (el, i, full) => {
    const mate = () => (full ? chips[i] : fulls[i]);
    const set = (on) => {
      (full || grows() ? grT : hoT)[i] = on ? 1 : 0;
      if (still) { hoT.forEach((t, j) => { hov[j] = t; }); grT.forEach((t, j) => { gro[j] = t; }); }
      if (!running && begun) frame();
    };
    let pointerType = '';
    el.addEventListener('pointerdown', (e) => { pointerType = e.pointerType; });
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') set(true); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !mate()?.contains(e.relatedTarget)) set(false); });
    if (!full) { el.addEventListener('focusin', () => set(true)); el.addEventListener('focusout', () => set(false)); }
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const source = pointerType || e.pointerType;
      pointerType = '';
      if (e.target.closest('a') || source === 'mouse') return;
      const on = !full && !(grows() ? grT : hoT)[i]; // a tap on an open fuller card closes it
      hoT.fill(0); grT.fill(0);
      set(on);
    });
  };
  chips.forEach((el, i) => wire(el, i, false));
  // Links on the slides (the Discord line on 9) open in a new tab and never turn the slide.
  hosts.forEach((s) => s.querySelectorAll('a[href]').forEach((a) => a.addEventListener('click', (e) => e.stopPropagation())));

  // Loaded straight onto one of these slides: the network is already at the node (or the mark is about to land there).
  if (stageOf() >= 0) { follow(); if (armed) { armed = false; whenOpen(begin); } }
})();
