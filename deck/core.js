// Version F, slide 4: Astrid, as an abstract picture. Two thin gold rings
// overlap above the headline: the agent on the left, a constellation of
// nodes on curved threads; the interface on the right, three small panels
// drawn in thread. Where they overlap, the lens is the core: a lattice
// radiating from one bright node. Extensions hang on threads below each ring
// (round constellation glyphs for the agent, panel glyphs for the interface),
// each side with one empty dashed socket. A faint dotted orbit, the
// community, encloses it all and feeds in down its lower arcs: every few
// seconds a mote runs round it into a side and fills the socket, and a new
// socket appears next in line; now and then an extension is used and a pulse
// runs up into the core. Slide 4's own network node feeds the lens from below.
// Arriving from slide 3, the empty "Nothing here — yet" ring flies up and
// becomes the core's bright node. Hovering (or tapping) an extension names it.
(() => {
  const root = document.querySelector('[data-astrid-core]');
  if (!root) return;
  const slide = root.closest('.slide');
  const canvas = root.querySelector('.ac-canvas');
  let g = canvas.getContext('2d'); // let: slide 5 borrows the drawing to take this picture's layers
  const html = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gapRoot = document.querySelector('[data-gap]');
  const gapSlide = gapRoot && gapRoot.closest('.slide');
  const ring = gapRoot && gapRoot.querySelector('.gp-empty i');
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const smooth = (k) => k * k * (3 - 2 * k);
  const THREAD = '240,200,119', NODE = '255,217,145', CORE = '255,241,214', LINE = '246,226,190';
  const TAU = Math.PI * 2, DEG = Math.PI / 180;

  // Illustrative community-made extensions, in the order they fill.
  const NAMES = [
    ['Film grain look', 'Lip-sync', 'Style LoRA', 'Upscaler', 'Depth map', 'Beat detection'],
    ['Storyboard view', 'Shot list', 'Mask brush', 'Keyframe curves', 'Compare wipe', 'Grade wheels'],
  ];

  // ---- Labels and the card ------------------------------------------------
  const tag = (text, cls) => {
    const el = document.createElement('span');
    el.className = `ac-ax ${cls}`;
    el.textContent = text;
    root.appendChild(el);
    return el;
  };
  const labels = { agent: tag('agent', 'ac-lobe'), face: tag('interface', 'ac-lobe'), com: tag('community', 'ac-com') };
  const card = document.createElement('div');
  card.className = 'ac-card';
  card.setAttribute('aria-hidden', 'true');
  card.innerHTML = '<span class="ac-where"></span><span class="ac-name"></span>';
  root.appendChild(card);

  // A soft light, drawn once and stamped wherever something glows.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 128;
  {
    const sg = glow.getContext('2d');
    const rg = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, `rgba(${NODE},1)`);
    rg.addColorStop(0.35, `rgba(${NODE},0.35)`);
    rg.addColorStop(1, `rgba(${NODE},0)`);
    sg.fillStyle = rg;
    sg.fillRect(0, 0, 128, 128);
  }
  const halo = (x, y, r, a) => {
    if (a <= 0.003 || r <= 0) return;
    g.globalAlpha = Math.min(1, a);
    g.drawImage(glow, x - r, y - r, r * 2, r * 2);
    g.globalAlpha = 1;
  };

  // ---- Paths ------------------------------------------------------------------
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
  const trace = (h, d0, d1) => {
    if (d1 <= d0) return;
    const a = at(h, d0), b = at(h, d1);
    g.moveTo(a.x, a.y);
    for (let i = a.i; i < b.i; i++) g.lineTo(h.pts[i][0], h.pts[i][1]);
    g.lineTo(b.x, b.y);
  };
  const bez = (p0, c0, c1, p1, n = 24) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x,
      u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y];
  });
  // A thread from a to b that bows sideways by `bend` of its length.
  const bow = (a, b, bend, n = 24) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const nx = -dy * bend, ny = dx * bend;
    return line(bez(a, { x: a.x + dx / 3 + nx, y: a.y + dy / 3 + ny }, { x: a.x + (2 * dx) / 3 + nx, y: a.y + (2 * dy) / 3 + ny }, b, n));
  };
  const join = (...hs) => line(hs.flatMap((h, i) => (i ? h.pts.slice(1) : h.pts)));
  const rev = (h) => line(h.pts.slice().reverse());

  // ---- Geometry ---------------------------------------------------------------
  // Drawn in the reference picture's own units (1672 × 941, the core at
  // 836, 290), then scaled by k about the middle of the slide.
  let W = 0, H = 0, dpr = 1, k = 1, ox = 0, oy = 0, small = false;
  const X = (rx) => ox + (rx - 836) * k, Y = (ry) => oy + (ry - 290) * k;
  const P = (rx, ry) => ({ x: X(rx), y: Y(ry) });

  const RR = 188, DX = 100, LH = Math.sqrt(RR * RR - DX * DX); // ring radius, half the gap between centres, lens half-height
  const TM = Math.atan2(LH, DX); // where the rings meet, as an angle on the left ring
  // Each ring is a few slightly irregular strands, like hand-drawn thread.
  const STRANDS = [
    [{ dr: 0, amp: 1.6, n: 2, ph: 0.4, cx: 0, cy: 0, a: 0.78, w: 1 }, { dr: -3.2, amp: 2.4, n: 3, ph: 2.1, cx: 1.2, cy: -0.8, a: 0.42, w: 0.8 },
      { dr: 3.4, amp: 2.0, n: 5, ph: 4.0, cx: -1.4, cy: 1.1, a: 0.26, w: 0.7 }],
    [{ dr: 0, amp: 1.5, n: 2, ph: 1.7, cx: 0, cy: 0, a: 0.78, w: 1 }, { dr: 3.0, amp: 2.2, n: 3, ph: 5.2, cx: -1.0, cy: 1.0, a: 0.42, w: 0.8 },
      { dr: -3.4, amp: 2.1, n: 4, ph: 0.9, cx: 1.5, cy: -1.2, a: 0.26, w: 0.7 }],
  ];
  // Positions on the rings (left ring's angles; the right ring mirrors them).
  const RIM = { ul: 222.5 * DEG, ll: 150 * DEG, bot: 103 * DEG };
  // How far round its arc the tracing has to get to reach an angle on the left ring's outer side.
  const reachRim = (th) => (th <= Math.PI ? (th - TM) : (TAU - TM - th)) / (Math.PI - TM);

  // Extension places, in fill order: [centre x, centre y, rim it hangs from, glyph].
  const SLOTS = [
    [[462, 525, 'll', 'tri'], [548, 532, 'll', 'line'], [632, 540, 'll', 'diamond'], [716, 543, 'bot', 'fork'], [378, 506, 'll', 'zig'], [302, 470, 'll', 'arc']],
    [[956, 543, 'bot', 'grid'], [1040, 542, 'll', 'list'], [1123, 535, 'll', 'frame'], [1208, 521, 'll', 'curve'], [1290, 500, 'll', 'split'], [1368, 470, 'll', 'wheel']],
  ];
  const START = 4; // places shown on arrival: three filled and one empty socket
  const CAP = 5; // most a side grows to
  const ER = 31; // extension circle radius

  const ORB = { cx: 836, cy: 322, a: 507, b: 265, from: 148 * DEG, to: 392 * DEG };
  const orbAt = (phi, da = 0, db = 0) => P(ORB.cx + (ORB.a + da) * Math.cos(phi), ORB.cy + (ORB.b + db) * Math.sin(phi));

  // Built by layout().
  let C0, rings = [], lens = null, cons = null, panels = null, sides = [], orbit = [], feed = null, nodeAt = null;
  let seed = 1;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;

  const put = (el, x, y, size) => {
    el.style.fontSize = `${size.toFixed(1)}px`;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px)`;
  };

  // A point on a ring strand at angle th (left-ring angles; mirrored for the right).
  const ringPt = (side, st, th) => {
    const r = rings[side], a = side ? Math.PI - th : th;
    const rr = (RR + st.dr + st.amp * Math.sin(st.n * th + st.ph)) * k;
    return [r.c.x + st.cx * k + Math.cos(a) * rr, r.c.y + st.cy * k + Math.sin(a) * rr];
  };
  const ringArc = (side, st, t0, t1) => {
    const n = Math.max(2, Math.ceil(Math.abs(t1 - t0) / (2.5 * DEG)));
    return Array.from({ length: n + 1 }, (_, i) => ringPt(side, st, t0 + ((t1 - t0) * i) / n));
  };

  const glyphPts = (type) => {
    switch (type) {
      case 'tri': return { nodes: [[0, -15], [-14, 8], [14, 8]], edges: [[0, 1], [1, 2], [2, 0]] };
      case 'line': return { nodes: [[-14, 8], [0, 0], [14, -8]], edges: [[0, 1], [1, 2]] };
      case 'diamond': return { nodes: [[-2, -13], [13, -1], [2, 14], [-13, 3]], edges: [[0, 1], [1, 2], [2, 3], [3, 0]] };
      case 'fork': return { nodes: [[0, 2], [0, -14], [-13, 11], [13, 11]], edges: [[0, 1], [0, 2], [0, 3]] };
      case 'zig': return { nodes: [[-15, 6], [-5, -8], [5, 8], [15, -6]], edges: [[0, 1], [1, 2], [2, 3]] };
      case 'arc': return { nodes: [[-14, 6], [-7, -6], [7, -6], [14, 6]], edges: [[0, 1], [1, 2], [2, 3]] };
      default: return null;
    }
  };

  const layout = () => {
    const b = root.getBoundingClientRect();
    if (!b.width || !b.height) return false;
    W = b.width; H = b.height;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    small = W <= 760 && (H >= W || H > 500); // a phone held upright (one on its side takes the wide layout)
    const num = slide.querySelector('.num');
    const nb = num.getBoundingClientRect();
        const top = nb.top - b.top; // the label's top: the picture sits above it
    if (small) {
      // Upright, the picture and the words are one group (the phone CSS centres the words under the picture's room):
      // the picture hangs 34 px above the label, never higher than 40 px from the top.
      k = Math.min((W / 2 - 4) / 520, (top - 74) / 560);
      oy = Math.max(40, top - 34 - (590 - 30) * k) + (290 - 30) * k;
    } else {
      k = Math.min(1.25, (W / 2 - 14) / 560, (top - 26) / (612 - 34));
      oy = top + (290 - 612) * k;
    }
    ox = W / 2;
    seed = 20261015;
    const lw = Math.max(0.75, Math.min(1.15, k * 1.1)); // base line width

    C0 = P(836, 290);
    rings = [{ c: P(836 - DX, 290) }, { c: P(836 + DX, 290) }];
    rings.forEach((r, side) => {
      r.rim = {};
      for (const [key, th] of Object.entries(RIM)) {
        const [x, y] = ringPt(side, STRANDS[side][0], th);
        r.rim[key] = { x, y, th };
      }
    });

    // The lens is the core: in it, the Astrid mink drawn in one thread, its neck rising from the bottom left.
    const top0 = P(836, 290 - LH), bot0 = P(836, 290 + LH);
    const M = window.AstridMink, MS = 9.0; // reference units per pixel of the icon
    const mp = ([px, py]) => P(836 + (px - M.BOX.cx) * MS - 5, 290 + (py - M.BOX.cy) * MS + 6);
    const onOutline = (px, py) => mp([px, py]);
    lens = {
      top: top0, bot: bot0,
      outline: line(M.smooth(M.OUTLINE, 10).map((q) => { const v = mp(q); return [v.x, v.y]; })),
      throat: line(M.smooth(M.THROAT, 10).map((q) => { const v = mp(q); return [v.x, v.y]; })),
      eye: mp(M.EYE), nose: mp(M.NOSE), ear: mp(M.EAR), mark: mp(M.EARMARK),
    };
    // The outline traces up both sides from the neck and meets on top of the head.
    let hi = 0;
    lens.outline.pts.forEach((q, i) => { if (q[1] < lens.outline.pts[hi][1]) hi = i; });
    lens.crown = lens.outline.len[hi];
        // The agent: a constellation on curved threads, flowing right into the core.
    const N = {
      ul: rings[0].rim.ul, n1: P(629, 207), n2: P(702, 247), n3: P(622, 276), n4: P(579, 298), n5: P(686, 296),
      n6: P(632, 353), n7: P(719, 353), n8: P(673, 373), n9: P(681, 411), bot: rings[0].rim.bot,
      ear: lens.ear, back: onOutline(3.45, 8.4), low: onOutline(2.4, 11.6),
    };
    const E = [['ear', 'n2', 0.12], ['back', 'n5', -0.06], ['low', 'n7', -0.1], ['n2', 'n1', 0.12], ['n5', 'n3', 0.16], ['n2', 'n5', -0.12],
      ['n1', 'ul', -0.16], ['n3', 'n1', -0.1], ['n3', 'n4', 0.12], ['n4', 'n6', 0.16], ['n7', 'n8', -0.1], ['n6', 'n8', -0.1],
      ['n8', 'n9', 0.06], ['n9', 'bot', -0.08]];
    // Growth runs outward from the core: each thread starts when its first end is reached.
    const when = { ear: 0, back: 0, low: 0 };
    cons = { nodes: [], edges: [] };
    for (const [a, z, bend] of E) {
      const h = bow(N[a], N[z], bend, 20);
      const t0 = when[a] ?? 0;
      const dur = clamp(h.total / (190 * k), 0.25, 0.6);
      when[z] = Math.min(when[z] ?? 9, t0 + dur);
      cons.edges.push({ h, t0, dur, a: 0.46 });
      if (a === 'ear' || a === 'back' || a === 'low') { // the flows into the core are bundles of two or three strands
        cons.edges.push({ h: bow(N[a], N[z], bend + 0.07, 20), t0: t0 + 0.05, dur, a: 0.24 });
        cons.edges.push({ h: bow(N[a], N[z], bend - 0.06, 20), t0: t0 + 0.1, dur, a: 0.18 });
      }
    }
    for (const key of ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9']) {
      cons.nodes.push({ ...N[key], r: key === 'n1' || key === 'n2' || key === 'n4' || key === 'n9' || key === 'n6' ? 1.15 : 0.95, t0: when[key] ?? 1 });
    }

    // The interface: three panels drawn in thread, each tied to the core.
    const pan = (l, t, r, bm, extra) => ({ l: X(l), t: Y(t), r: X(r), b: Y(bm), mid: P(l, (t + bm) / 2), extra });
    panels = [
      pan(962, 188, 1043, 238, 'split'),
      pan(1016, 267, 1095, 321, 'list'),
      pan(963, 354, 1043, 402, 'media'),
    ];
    panels.forEach((p, i) => {
      const from = [lens.nose, onOutline(12.6, 8.3), onOutline(10.45, 12.2)][i];
      p.links = [bow(from, p.mid, [-0.1, 0.06, 0.12][i], 20), bow(from, p.mid, [-0.04, 0.12, 0.06][i], 20)];
      p.t0 = 0.08 * i;
      // The frame, drawn from its left middle node both ways round.
      p.up = line([[p.l, p.mid.y], [p.l, p.t], [p.r, p.t], [p.r, p.mid.y]]);
      p.down = line([[p.l, p.mid.y], [p.l, p.b], [p.r, p.b], [p.r, p.mid.y]]);
      p.corners = [[p.l, p.t], [p.r, p.t], [p.l, p.b], [p.r, p.b], [p.l, p.mid.y]];
    });
    panels[0].out = bow(P(1043, 213), rings[1].rim.ul, 0.22, 20);

    // Extensions on threads below each ring.
    sides = [0, 1].map((side) => {
      const sd = { side, slots: [], n: 0, filled: 0 };
      SLOTS[side].forEach(([rx, ry, rim, glyph], i) => {
        const c = P(rx, ry), node = P(rx, ry - ER - 4), from = rings[side].rim[rim];
        const dx = node.x - from.x, dy = node.y - from.y;
        const h = line(bez(from, { x: from.x + dx * 0.12, y: from.y + dy * 0.6 }, { x: node.x - dx * 0.08, y: node.y - dy * 0.55 }, node, 24));
        const h2 = line(bez(from, { x: from.x + dx * 0.3, y: from.y + dy * 0.45 }, { x: node.x - dx * 0.2, y: node.y - dy * 0.6 }, node, 24));
        sd.slots.push({
          side, i, x: c.x, y: c.y, node, from, rimKey: rim, glyph, h, h2, hr: rev(h), name: NAMES[side][i],
          state: i < START - 1 ? 'full' : i < START ? 'socket' : 'none', // none → socket → full
          shown: i < START ? 0 : null, filledAt: i < START - 1 ? 0 : null, flash: 0,
        });
      });
      sd.n = START;
      return sd;
    });

    // The community: a dotted orbit round everything, open at the bottom, with a few brighter motes on it.
    orbit = [];
    const gapX = 92;
    for (let phi = ORB.from; phi <= ORB.to; phi += 0.0125) {
      const p = orbAt(phi), rx = ORB.cx + ORB.a * Math.cos(phi);
      if (Math.abs(rx - 836) < gapX && Math.sin(phi) < 0) continue; // the break for the label
      const endFade = smooth(clamp(Math.min(phi - ORB.from, ORB.to - phi) / 0.12));
      const nearGap = smooth(clamp((Math.abs(rx - 836) - gapX) / 60));
      const bright = rnd() < 0.06;
      orbit.push({ ...p, phi, a: (bright ? 0.9 : 0.5) * endFade * (0.55 + 0.45 * nearGap), r: bright ? 1.45 : 0.9, bright,
        t0: T.orbit + 0.6 * (Math.abs(phi - 270 * DEG) / (122 * DEG)) });
    }

    // Slide 4's own node feeds the core: one fine thread from above the label up into the lens's bottom point.
    const tr = num.querySelector('.act') ? num : num;
    const range = document.createRange();
    range.selectNodeContents(tr);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    const lineR = rects.filter((r) => Math.abs(r.top - rects[0].top) < 6);
    const nx = lineR.length ? (Math.min(...lineR.map((r) => r.left)) + Math.max(...lineR.map((r) => r.right))) / 2 - b.left : W / 2;
    const ny = (rects.length ? rects[0].top : nb.top) - 13 - b.top;
    nodeAt = { x: nx, y: ny };
    const up = bot0.y - ny;
    feed = line(bez({ x: nx, y: ny - 3 }, { x: nx + 9 * k, y: ny + up * 0.35 }, { x: bot0.x - 8 * k, y: bot0.y - up * 0.6 }, { x: bot0.x, y: bot0.y }, 32));

    // Labels.
    const ls = small ? Math.max(11, 21 * k) : clamp(W * 0.014, 13, 26);
    put(labels.agent, X(692), Y(143), ls);
    put(labels.face, X(980), Y(143), ls);
    put(labels.com, X(836), orbAt(270 * DEG).y, ls);
    root.style.setProperty('--ac-lw', lw);
    LW = lw;
    return true;
  };
  let LW = 1;

  // ---- Time -------------------------------------------------------------------
  // One clock, ta, in seconds from the moment the network reaches the slide's node.
  const T = { rings: 0.05, ringDur: 1.1, core: 0.6, feed: 1.1, cons: 1.0, panels: 1.05, drop: 1.8, orbit: 2.2, end: 3.4 };
  const AMBIENT = 4.0;
  let ta = 0, pace = 1, visits = 0, running = false, loop = 0, frameRaf = 0, last = 0, timers = [];
  let gifts = [], pend = [], plan = 0, pulses = [], flare = 0, nextGift = 0, nextUse = 0;
  let hot = null, pinned = null, touched = false, seedEl = null, labelled = 0;

  const k01 = (t0, dur) => clamp((ta - t0) / dur);
  const isFull = (x) => x.state === 'full';

  // ---- Ambient: the community grows the sides, and the extensions get used ------
  // A contribution: a mote brightens on the orbit, a thread draws ahead of it to the side's empty
  // socket, the mote follows it in with a confident ease and lands with a small bloom, and the socket
  // fills. Two per side, taking turns, then the picture rests.
  const PLAN = [0, 1, 0, 1], GAP = 3.2, LIFT = 0.35;
  const easeIO = (q) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
  const giftPath = (x) => {
    const side = x.side, s = side ? -1 : 1; // written for the left; the right mirrors it
    const o = orbAt((side ? 12 : 168) * DEG);
    let pts;
    if (Math.hypot(x.x - o.x, x.y - o.y) > 260 * k) { // along the row: pass under it and rise into the socket
      const low = { x: x.x, y: x.y + ER * k };
      pts = bez(o, { x: o.x + s * 40 * k, y: o.y + 210 * k }, { x: low.x - s * 140 * k, y: low.y + 46 * k }, low, 44);
    } else { // close by: drop in through the socket's node
      pts = bez(o, { x: o.x + s * 8 * k, y: o.y + 60 * k }, { x: x.node.x - s * 36 * k, y: x.node.y - 46 * k }, x.node, 32);
    }
    return { o, h: line(pts) }; // it lands on the ring's bottom, or on the socket's node
  };
  const give = () => {
    while (plan < PLAN.length) {
      const sd = sides[PLAN[plan++]];
      const x = sd.slots.find((v) => v.state === 'socket' && v.shown !== null && v.shown <= ta);
      if (!x) continue;
      const { o, h } = giftPath(x);
      gifts.push({ x, o, h, t0: ta, D: clamp(h.total / (420 * k), 1.2, 1.6) });
      return;
    }
  };
  const fill = (x) => {
    x.state = 'full';
    x.filledAt = ta;
    const sd = sides[x.side];
    const next = sd.slots.find((o) => o.state === 'none');
    if (next && sd.slots.filter(isFull).length < CAP) pend.push({ at: ta + 1.1, f: () => { if (next.state === 'none') { next.state = 'socket'; next.shown = ta; } } });
    pend.push({ at: ta + 1.5, f: () => use(x) });
  };
  // A pulse: from an extension up its thread, round its ring to where the rings meet below, and up into the core.
  const homeOf = (x) => {
    const side = x.side, st = STRANDS[side][0];
    const arc = ringArc(side, st, x.from.th, TM);
    const E = lens.eye;
    const lift = line([[lens.bot.x, lens.bot.y], ...bez(lens.bot, { x: lens.bot.x + 6 * k, y: lens.bot.y - LH * 0.5 * k }, { x: E.x - 30 * k, y: E.y + 40 * k }, E, 16).slice(1)]);
    return join(line([[x.x, x.y], [x.node.x, x.node.y]]), rev(x.h), line(arc), lift);
  };
  const use = (x) => {
    if (!x) { const all = sides.flatMap((o) => o.slots.filter(isFull)); x = all[Math.floor(Math.random() * all.length)]; }
    if (!x || pulses.length > 1) return;
    x.flash = 1;
    pulses.push({ h: homeOf(x), t0: ta });
  };

  const advance = (dt) => {
    ta += ta < T.end ? dt / pace : dt;
    if (ta >= T.end) window.deckEntryDone?.(slide);
    flare *= Math.exp(-dt / 0.9);
    if (labelled < 1 && ta >= 0.8) { labelled = 1; root.classList.add('is-labelled'); }
    if (labelled < 2 && ta >= T.orbit + 0.3) { labelled = 2; root.classList.add('is-community'); }
    if (seedEl && ta >= 0) { seedEl.remove(); seedEl = null; if (ring) ring.style.visibility = ''; }
    sides.forEach((sd) => sd.slots.forEach((x) => { if (x.flash) x.flash = Math.max(0, x.flash - dt / 1.2); }));
    if (ta < AMBIENT) return;
    if (plan < PLAN.length && ta >= nextGift) { give(); nextGift = ta + GAP; }
    if (ta >= nextUse) { use(); nextUse = ta + 7 + Math.random() * 3; }
    pend = pend.filter((p) => { if (ta < p.at) return true; p.f(); return false; });
    gifts = gifts.filter((m) => {
      const land = m.t0 + LIFT + m.D;
      if (!m.landed && ta >= land) { m.landed = true; if (m.x.state === 'socket') { const e = m.h.pts[m.h.pts.length - 1]; m.x.landAt = { x: e[0], y: e[1] }; fill(m.x); } }
      return ta < land + 1.0;
    });
    pulses = pulses.filter((pl) => {
      if ((ta - pl.t0) * 320 * k < pl.h.total) return true;
      flare = 1;
      return false;
    });
  };

  // ---- Drawing ------------------------------------------------------------------
  const stroke = (h, d0, d1, width, color, a) => {
    if (a <= 0.003 || d1 <= d0) return;
    g.lineWidth = width;
    g.strokeStyle = `rgba(${color},${Math.min(1, a).toFixed(3)})`;
    g.beginPath(); trace(h, d0, d1); g.stroke();
  };
  // A stroke between d0 and d1 whose alpha ramps up over the line's first f0 and down over its last f1.
  const fadeStroke = (h, d0, d1, width, color, a, f0, f1) => {
    const body0 = Math.max(d0, f0), body1 = Math.min(d1, h.total - f1);
    stroke(h, body0, body1, width, color, a);
    const n = 7;
    for (let j = 0; j < n; j++) {
      const f = (j + 0.5) / n;
      if (f0 > 0) { const s0 = (f0 * j) / n, s1 = (f0 * (j + 1)) / n; stroke(h, Math.max(d0, s0), Math.min(d1, s1), width, color, a * f); }
      if (f1 > 0) { const s1 = h.total - (f1 * j) / n, s0 = h.total - (f1 * (j + 1)) / n; stroke(h, Math.max(d0, s0), Math.min(d1, s1), width, color, a * f); }
    }
  };
  const poly = (pts, width, color, a) => {
    if (a <= 0.003 || pts.length < 2) return;
    g.lineWidth = width;
    g.strokeStyle = `rgba(${color},${Math.min(1, a).toFixed(3)})`;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  };
  const dot = (x, y, r, color, a) => {
    if (a <= 0.003 || r <= 0) return;
    g.fillStyle = `rgba(${color},${Math.min(1, a).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  };
  // A node: a warm-white bead with a soft gold glow; `pop` swells it in.
  const node = (x, y, size, a, pop = 1) => {
    if (a <= 0.003 || pop <= 0) return;
    const r = 3 * size * Math.max(0.7, k) * pop;
    halo(x, y, r * 4.4, 0.45 * a);
    dot(x, y, r, NODE, 0.95 * a);
    dot(x - r * 0.15, y - r * 0.2, r * 0.62, CORE, 0.9 * a);
  };
  const popIn = (t0, dur = 0.35) => { const q = clamp((ta - t0) / dur); return q <= 0 ? 0 : 1 + 0.25 * Math.sin(Math.PI * q) * (1 - q); };
  // A thread drawn from its start, its growing tip lit.
  const grow = (h, t0, dur, width, a, color = THREAD) => {
    const q = clamp((ta - t0) / dur);
    if (q <= 0) return 0;
    const d = h.total * ease(q);
    stroke(h, 0, d, width, color, a);
    if (q < 1) { const p = at(h, d); halo(p.x, p.y, 7 * k, 0.55 * (1 - q * 0.5)); }
    return q;
  };

  const drawRings = () => {
    const q = ease(k01(T.rings, T.ringDur / pace));
    if (q <= 0) return;
    const span = (Math.PI - TM) * q, inner = TM * q;
    for (const side of [0, 1]) {
      // A faint wide glow under the main strand.
      const st0 = STRANDS[side][0];
      const arcs = (st) => [ringArc(side, st, TM, TM + span), ringArc(side, st, TAU - TM, TAU - TM - span), ringArc(side, st, -TM, -TM + inner), ringArc(side, st, TM, TM - inner)];
      g.lineCap = 'round';
      for (const pts of arcs(st0)) poly(pts, 6 * LW, THREAD, 0.06);
      for (const st of STRANDS[side]) for (const pts of arcs(st)) poly(pts, st.w * LW, THREAD, st.a * (1 + 0.25 * flare));
      if (q < 1) {
        for (const th of [TM + span, TAU - TM - span, -TM + inner, TM - inner]) { const [x, y] = ringPt(side, st0, th); halo(x, y, 9 * k, 0.6); }
      }
      // The rim nodes light as the tracing passes them.
      for (const [key, r] of Object.entries(rings[side].rim)) {
        const at0 = T.rings + (T.ringDur / pace) * clamp(reachRim(r.th)) * 0.7;
        node(r.x, r.y, key === 'ul' ? 1.25 : 1.05, 1, popIn(at0));
      }
    }
    // Where the rings meet.
    node(lens.top.x, lens.top.y, 1, 1, popIn(T.rings + 0.05));
    node(lens.bot.x, lens.bot.y, 1, 1, popIn(T.rings + 0.05));
  };

  const drawCore = () => {
    const q = ease(k01(T.core, 1.1 / pace));
    const breath = Math.sin(ta * 1.1);
    const E = lens.eye;
    // The eye is the seed: lit first, and what slide 3's empty ring becomes.
    const seedA = clamp((ta + 0.25) / 0.35);
    halo(C0.x, C0.y, (70 + 5 * breath + 20 * flare) * k, (0.1 + 0.06 * q + 0.12 * flare) * seedA);
    halo(E.x, E.y, (13 + 6 * flare) * k, (0.7 + 0.25 * flare) * seedA);
    dot(E.x, E.y, 3.4 * Math.max(0.7, k), NODE, seedA);
    dot(E.x, E.y, 2.2 * Math.max(0.7, k), '255,250,236', seedA);
    if (q <= 0) return;
    // The outline: up both sides from the neck, meeting on the head.
    const o = lens.outline, up = lens.crown * q, down = (o.total - lens.crown) * q;
    const lit = 1 + 0.5 * flare;
    const fadeLen = 34 * k; // the neck's two ends fade out where it rises from below
    for (const [w, a, col] of [[5 * LW, 0.06, THREAD], [1.15 * LW, 0.85, NODE]]) {
      fadeStroke(o, 0, up, w, col, a * lit, fadeLen, fadeLen);
      fadeStroke(o, o.total - down, o.total, w, col, a * lit, fadeLen, fadeLen);
    }
    if (q < 1) { for (const d of [up, o.total - down]) { const p = at(o, d); halo(p.x, p.y, 8 * k, 0.6); } }
    // Its ends fade where the neck leaves the lens.
    const qt = ease(k01(T.core + 0.6 / pace, 0.9 / pace));
    if (qt > 0) fadeStroke(lens.throat, 0, lens.throat.total * qt, 0.8 * LW, THREAD, 0.45 * lit, 0, 40 * k);
    node(lens.nose.x, lens.nose.y, 0.85, 1, popIn(T.core + 0.75 / pace));
    node(lens.ear.x, lens.ear.y, 0.85, 1, popIn(T.core + 0.55 / pace));
    dot(lens.mark.x, lens.mark.y, 1.3 * Math.max(0.7, k), NODE, 0.5 * smooth(k01(T.core + 0.9 / pace, 0.4)));
  };

  const drawAgent = () => {
    for (const e of cons.edges) grow(e.h, T.cons + e.t0 / pace, e.dur / pace, 0.85 * LW, e.a);
    for (const n of cons.nodes) node(n.x, n.y, n.r, 1, popIn(T.cons + n.t0 / pace));
  };

  const drawFace = () => {
    for (const p of panels) {
      const t0 = T.panels + p.t0 / pace;
      p.links.forEach((h, i) => grow(h, t0 + i * 0.06, 0.45 / pace, 0.8 * LW, i ? 0.22 : 0.42));
      const tf = t0 + 0.4 / pace, qf = ease(k01(tf, 0.55 / pace));
      if (qf <= 0) continue;
      g.lineCap = 'round';
      stroke(p.up, 0, p.up.total * qf, 1.1 * LW, LINE, 0.8);
      stroke(p.down, 0, p.down.total * qf, 1.1 * LW, LINE, 0.8);
      const qc = smooth(k01(tf + 0.35 / pace, 0.45 / pace));
      if (qc > 0) {
        const xm = (p.l + p.r) / 2, w = p.r - p.l, hh = p.b - p.t;
        g.lineWidth = 1 * LW;
        g.strokeStyle = `rgba(${LINE},${(0.75 * qc).toFixed(3)})`;
        g.beginPath();
        if (p.extra === 'split') {
          const vx = p.l + w * 0.65;
          g.moveTo(vx, p.t); g.lineTo(vx, p.t + hh * qc);
          g.moveTo(vx, p.mid.y); g.lineTo(vx + (p.r - vx) * qc, p.mid.y);
        } else if (p.extra === 'media') {
          const vx = p.l + w * 0.48;
          g.moveTo(vx, p.t); g.lineTo(vx, p.t + hh * qc);
        }
        g.stroke();
        if (p.extra === 'list') {
          for (let i = 0; i < 3; i++) {
            const y = p.t + hh * (0.28 + 0.22 * i), x0 = p.l + w * 0.22;
            dot(x0, y, 2 * Math.max(0.7, k), CORE, 0.85 * qc);
            const grad = g.createLinearGradient(x0 + 6 * k, 0, p.l + w * 0.82, 0);
            grad.addColorStop(0, `rgba(${LINE},${(0.7 * qc).toFixed(3)})`);
            grad.addColorStop(1, `rgba(${LINE},0)`);
            g.strokeStyle = grad;
            g.beginPath(); g.moveTo(x0 + 7 * k, y); g.lineTo(p.l + w * 0.86, y); g.stroke();
          }
        }
        if (p.extra === 'media') {
          g.strokeStyle = `rgba(${LINE},${(0.6 * qc).toFixed(3)})`;
          g.beginPath(); g.arc(p.l + w * 0.74, p.mid.y, 8 * k, 0, TAU); g.stroke();
        }
      }
      for (const [x, y] of p.corners) node(x, y, 0.8, 1, popIn(tf + 0.1 / pace, 0.3));
    }
    if (panels[0].out) grow(panels[0].out, T.panels + 0.9 / pace, 0.5 / pace, 0.75 * LW, 0.34);
  };

  // A glyph draws itself: the agent's constellations thread node to node; the interface's icons snap in.
  const drawGlyph = (x, type, cx, cy, q) => {
    if (q <= 0) return;
    const gp = glyphPts(type);
    if (gp) {
      const e = ease(q), n = gp.edges.length;
      g.lineWidth = 0.8 * LW;
      g.strokeStyle = `rgba(${LINE},0.6)`;
      g.beginPath();
      gp.edges.forEach(([a, b], i) => {
        const f = clamp(e * n - i);
        if (f <= 0) return;
        const [ax, ay] = gp.nodes[a], [bx, by] = gp.nodes[b];
        g.moveTo(cx + ax * k, cy + ay * k); g.lineTo(cx + (ax + (bx - ax) * f) * k, cy + (ay + (by - ay) * f) * k);
      });
      g.stroke();
      gp.nodes.forEach(([nx, ny], j) => node(cx + nx * k, cy + ny * k, 0.72, 1, clamp((q * 1.4 - (j / gp.nodes.length) * 0.9) * 3)));
      return;
    }
    const a = clamp(q * 3), s = k * (0.86 + 0.14 * ease(clamp(q * 2)));
    g.lineWidth = 1 * LW;
    g.strokeStyle = `rgba(${LINE},${(0.8 * a).toFixed(3)})`;
    g.beginPath();
    const sq = (w) => g.rect(cx - (w / 2) * s, cy - (w / 2) * s, w * s, w * s);
    if (type === 'grid') { sq(24); g.moveTo(cx, cy - 12 * s); g.lineTo(cx, cy + 12 * s); g.moveTo(cx - 12 * s, cy); g.lineTo(cx + 12 * s, cy); }
    if (type === 'frame') { sq(25); g.moveTo(cx + 6 * s, cy); g.arc(cx, cy, 6 * s, 0, TAU); }
    if (type === 'split') { g.rect(cx - 14 * s, cy - 10 * s, 28 * s, 20 * s); g.moveTo(cx + 2 * s, cy - 10 * s); g.lineTo(cx + 2 * s, cy + 10 * s); }
    if (type === 'wheel') { g.moveTo(cx + 12 * s, cy); g.arc(cx, cy, 12 * s, 0, TAU); g.moveTo(cx + 3 * s, cy); g.arc(cx, cy, 3 * s, 0, TAU); }
    if (type === 'curve') { sq(24); g.moveTo(cx - 12 * s, cy + 8 * s); g.bezierCurveTo(cx - 2 * s, cy + 8 * s, cx + 2 * s, cy - 8 * s, cx + 12 * s, cy - 8 * s); }
    if (type === 'list') for (let i = -1; i <= 1; i++) { g.moveTo(cx - 6 * s, cy + i * 9 * s); g.lineTo(cx + 15 * s, cy + i * 9 * s); }
    g.stroke();
    const r = 2 * Math.max(0.7, k);
    if (type === 'list') for (let i = -1; i <= 1; i++) dot(cx - 12 * s, cy + i * 9 * s, r, CORE, 0.9 * a);
    if (type === 'curve') { dot(cx - 12 * s, cy + 8 * s, r * 0.9, CORE, 0.9 * a); dot(cx + 12 * s, cy - 8 * s, r * 0.9, CORE, 0.9 * a); }
  };

  const drawSides = () => {
    const shown = pinned || hot;
    for (const sd of sides) {
      sd.slots.forEach((x, i) => {
        if (x.state === 'none') return;
        // On arrival they come in order out from the middle; later ones when the community adds them.
        const t0 = x.shown === 0 ? T.drop + (sd.side ? i : START - 1 - i) * 0.12 / pace : x.shown;
        const lit = 1 + 0.6 * x.flash + (x === shown ? 0.5 : 0);
        const r = ER * k;
        if (x.state === 'socket') {
          // A fine thread down to an empty socket, then its dashed ring closing round from the top.
          const q = grow(x.h, t0, 0.5 / pace, 0.7 * LW, 0.34 * lit);
          if (q >= 1) node(x.node.x, x.node.y, 0.7, 0.85, popIn(t0 + 0.5 / pace));
          const qs = ease(k01(t0 + 0.4 / pace, 0.35));
          for (let j = 0; j < 28; j++) {
            const th = -Math.PI / 2 + (j / 28) * TAU, from = Math.min(j, 28 - j) / 14; // 0 at the top, 1 at the bottom
            if (from > qs) continue;
            dot(x.x + Math.cos(th) * r, x.y + Math.sin(th) * r, 0.85 * Math.max(0.75, k), NODE, (0.42 + 0.2 * from) * lit);
          }
          return;
        }
        // A full place: its threads, its circle (open at the top), its node and glyph.
        const tf = x.filledAt > 0 ? x.filledAt : t0;
        const fresh = x.filledAt > 0;
        if (fresh) { // filled by the community: the ring closes, the glyph draws, then a bright thread runs up to the ring
          stroke(x.h, 0, x.h.total, 0.7 * LW, THREAD, 0.34);
          grow(x.hr, tf + 0.35, 0.5, 0.85 * LW, 0.55 * lit);
          if (ta >= tf + 0.85) stroke(x.h2, 0, x.h2.total, 0.6 * LW, THREAD, 0.2 * smooth(k01(tf + 0.85, 0.3)));
          const qd = 1 - k01(tf, 0.2); // the dashes give way to the solid ring
          if (qd > 0) for (let j = 0; j < 28; j++) { const th = (j / 28) * TAU; dot(x.x + Math.cos(th) * r, x.y + Math.sin(th) * r, 0.85 * Math.max(0.75, k), NODE, 0.5 * qd); }
        } else {
          grow(x.h, tf, 0.6 / pace, 0.85 * LW, 0.5 * lit);
          grow(x.h2, tf + 0.08, 0.65 / pace, 0.6 * LW, 0.2 * lit);
        }
        const qc = ease(k01(tf + (fresh ? 0 : 0.45 / pace), fresh ? 0.3 : 0.45 / pace));
        if (qc > 0) {
          const g0 = -90 * DEG + 32 * DEG, g1 = 270 * DEG - 32 * DEG, segs = 36;
          for (let j = 0; j < segs; j++) {
            const a0 = g0 + ((g1 - g0) * j) / segs, a1 = a0 + (g1 - g0) / segs, mid = (a0 + a1) / 2;
            // drawn from the bottom outwards both ways
            if (Math.abs(mid - 90 * DEG) > (180 * DEG - 32 * DEG) * qc) continue;
            const a = (0.36 + 0.5 * Math.max(0, Math.sin(mid))) * lit;
            g.lineWidth = 1.05 * LW;
            g.strokeStyle = `rgba(${THREAD},${Math.min(1, a).toFixed(3)})`;
            g.beginPath(); g.arc(x.x, x.y, r, a0, a1 + 0.004); g.stroke();
          }
          g.lineWidth = 0.7 * LW; g.strokeStyle = `rgba(${THREAD},${(0.08 * qc).toFixed(3)})`;
          g.beginPath(); g.arc(x.x, x.y, r, 0, TAU); g.stroke();
          halo(x.x, x.y + r * 0.6, r * 1.1, 0.05 * qc * lit);
          if (fresh && ta - tf < 0.5) { // the landing: a small bloom where the mote touched, and a brief glow in the ring
            const b = (ta - tf) / 0.5, L = x.landAt || x;
            halo(L.x, L.y, (8 + 22 * ease(b)) * k, 0.8 * (1 - b));
            halo(x.x, x.y, r * 0.9, 0.22 * (1 - b));
          }
        }
        node(x.node.x, x.node.y, 1.05, 1, popIn(tf + (fresh ? 0.25 : 0.55 / pace), 0.25));
        if (x.flash) halo(x.x, x.y, r * 1.4, 0.3 * x.flash);
        drawGlyph(x, x.glyph, x.x, x.y + 2 * k, k01(tf + (fresh ? 0.12 : 0.7 / pace), 0.4));
        if (x === shown) { g.lineWidth = 0.8; g.strokeStyle = `rgba(${NODE},0.5)`; g.beginPath(); g.arc(x.x, x.y, r + 5 * k, 0, TAU); g.stroke(); }
      });
    }
    // A hovered socket shows its ring a little brighter.
    if (shown && shown.state === 'socket') { g.lineWidth = 0.8; g.strokeStyle = `rgba(${NODE},0.35)`; g.beginPath(); g.arc(shown.x, shown.y, ER * k + 5 * k, 0, TAU); g.stroke(); }
  };

  const drawOrbit = () => {
    if (ta < T.orbit) return;
    for (const o of orbit) {
      const q = smooth(k01(o.t0, 0.25));
      if (q <= 0) continue;
      if (o.bright) halo(o.x, o.y, 6 * k, 0.3 * q * o.a);
      dot(o.x, o.y, o.r * Math.max(0.8, k), NODE, o.a * q);
    }
  };

  const draw = () => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!rings.length) return;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (ta > -0.4) drawCore();
    if (ta <= 0) return;
    drawRings();
    // The network feeds in: slide 4's node to the lens's bottom point.
    grow(feed, T.feed, 0.75 / pace, 0.7 * LW, 0.38);
    drawAgent();
    drawFace();
    drawSides();
    drawOrbit();
    for (const m of gifts) {
      const t = ta - m.t0, land = LIFT + m.D;
      // The mote brightens where it sits on the orbit.
      const b = clamp(t / LIFT);
      if (t < land) { halo(m.o.x, m.o.y, (6 + 8 * b) * k, 0.75 * b * (t < LIFT ? 1 : 1 - clamp((t - LIFT) / 0.4))); }
      // Its thread draws ahead of it, holds while it travels, and fades once it has landed.
      const qt = ease(clamp((t - 0.2) / (m.D * 0.55)));
      const fade = t < land ? 1 : 1 - clamp((t - land - 0.2) / 0.8);
      if (qt > 0) {
        stroke(m.h, 0, m.h.total * qt, 0.8 * LW, THREAD, 0.5 * fade);
        if (qt < 1) { const p = at(m.h, m.h.total * qt); halo(p.x, p.y, 6 * k, 0.45); }
      }
      // The mote itself, with a short bright tail.
      if (t >= LIFT * 0.5 && t < land) {
        const d = m.h.total * easeIO(clamp((t - LIFT) / m.D));
        stroke(m.h, Math.max(0, d - 34 * k), d, 1.1 * LW, NODE, 0.6);
        const p = at(m.h, d);
        halo(p.x, p.y, 11 * k, 0.8);
        dot(p.x, p.y, 2 * Math.max(0.8, k), CORE, 1);
      }
    }
    for (const pl of pulses) {
      const d = (ta - pl.t0) * 320 * k;
      stroke(pl.h, Math.max(0, d - 46 * k), d, 1.1 * LW, NODE, 0.6);
      const p = at(pl.h, d);
      halo(p.x, p.y, 8 * k, 0.6);
    }
  };

  // ---- Coming and going -----------------------------------------------------------
  const frameLoop = (id) => {
    const tick = (now) => {
      frameRaf = 0;
      if (id !== loop || !running) return;
      frameRaf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - (last || now)) / 1000) * (window.deckPace?.() || 1);
      last = now;
      advance(dt);
      draw();
    };
    frameRaf = requestAnimationFrame(tick);
  };
  const start = () => {
    if (document.hidden || document.getElementById('overview')?.classList.contains('on')) return;
    if (running || still || waiting || document.hidden || !slide.classList.contains('on') || !rings.length) return;
    running = true; last = 0;
    frameLoop(++loop);
  };
  const stop = () => { running = false; loop++; if (frameRaf) cancelAnimationFrame(frameRaf); frameRaf = 0; };

  const dropSeed = () => {
    if (seedEl) { seedEl.remove(); seedEl = null; }
    if (ring) ring.style.visibility = '';
  };
  // From slide 3: the empty ring lifts off the chart and flies up to become the core's bright node.
  const FLIGHT = 1.1;
  let launchAt = 0;
  const launch = () => {
    if (!ring) return false;
    const r = ring.getBoundingClientRect(), b = root.getBoundingClientRect();
    if (!r.width) return false;
    const from = { x: r.left + r.width / 2, y: r.top + r.height / 2 }, to = { x: b.left + lens.eye.x, y: b.top + lens.eye.y };
    const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const c = { x: (from.x + to.x) / 2 + ((to.y - from.y) / d) * d * 0.2, y: (from.y + to.y) / 2 - ((to.x - from.x) / d) * d * 0.2 };
    seedEl = document.createElement('div');
    seedEl.className = 'ac-seed';
    seedEl.setAttribute('aria-hidden', 'true');
    seedEl.innerHTML = '<i></i><b></b>';
    document.body.appendChild(seedEl);
    launchAt = performance.now();
    ring.style.visibility = 'hidden';
    const steps = 24;
    seedEl.animate(Array.from({ length: steps + 1 }, (_, i) => {
      const t = smooth(i / steps), u = 1 - t;
      const x = u * u * from.x + 2 * u * t * c.x + t * t * to.x, y = u * u * from.y + 2 * u * t * c.y + t * t * to.y;
      return { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` };
    }), { duration: FLIGHT * 1000, fill: 'forwards' });
    seedEl.querySelector('i').animate([
      { transform: 'scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'scale(.5) rotate(50deg)', opacity: 0.9, offset: 0.6 },
      { transform: 'scale(.1) rotate(90deg)', opacity: 0 },
    ], { duration: FLIGHT * 1000, easing: 'ease-in', fill: 'forwards' });
    seedEl.querySelector('b').animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(.6)', offset: 0.45 }, { opacity: 1, transform: 'scale(1.3)' }],
      { duration: FLIGHT * 1000, fill: 'forwards' });
    return true;
  };

  const reset = () => {
    timers.forEach(window.deckCancelLater);
    timers = [];
    if (!slide.classList.contains('on')) html.classList.remove('ac-quiet');
    dropSeed();
    gifts = []; pend = []; plan = 0; pulses = []; flare = 0;
    labelled = 0;
    root.classList.remove('is-labelled', 'is-community');
    hot = pinned = null;
    card.classList.remove('is-on');
    slide.style.cursor = '';
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.opacity = '';
  };
  // Everything grown at once: for reduced motion, and after a resize.
  const settle = (states) => {
    ta = Math.max(ta, AMBIENT);
    sides.forEach((sd, i) => {
      if (states) sd.slots.forEach((x, j) => { x.state = states[i][j]; });
      sd.slots.forEach((x) => { if (x.state !== 'none') x.shown = -50; if (x.filledAt > 0 || x.state === 'full') x.filledAt = -50; });
    });
    gifts = []; pend = []; plan = PLAN.length; pulses = [];
    labelled = 2;
    root.classList.add('is-labelled', 'is-community');
  };

  let waiting = null, armed = false;
  const prepare = (fromGap) => {
    reset();
    if (!layout()) return false;
    visits++;
    if (still || window.deckNav?.rest) { ta = 0; settle(); draw(); window.deckEntryDone?.(slide); if (!still) { html.classList.add('ac-quiet'); start(); } return false; }
    pace = visits > 1 ? 0.7 : 1;
    ta = -9; // dark until the network arrives
    if (fromGap && launch()) pace = 1;
    draw();
    armed = true;
    if (!fromGap && performance.now() - lastArrive < 400) { arrive(); return true; } // the network got here first (a jump)
    // If the network never says it has arrived (e.g. it was interrupted), grow anyway.
    timers.push(window.deckLater(() => arrive(), fromGap ? 1700 : 1500));
    return true;
  };
  const arrive = () => {
    if (!armed || !slide.classList.contains('on')) return;
    armed = false;
    const seedAge = seedEl?.getAnimations()[0]?.currentTime;
    ta = seedEl ? -Math.max(0.15, FLIGHT - (typeof seedAge === 'number' ? seedAge : performance.now() - launchAt) / 1000) : -0.3; // the seed lands on the eye at 0
    nextGift = AMBIENT + 0.2; nextUse = AMBIENT + PLAN.length * GAP + 4; plan = 0;
    // The network that brought us here steps back so the picture reads.
    timers.push(window.deckLater(() => { if (slide.classList.contains('on')) html.classList.add('ac-quiet'); }, 150));
    start();
  };
  let lastArrive = -1e9;
  slide.addEventListener('dt-arrive', () => { lastArrive = performance.now(); arrive(); });
  const enter = (fromGap) => {
    // On a first load the Mycelial mark plays first; grow once it has landed.
    if (html.classList.contains('dt-intro')) {
      if (waiting) return;
      waiting = new MutationObserver(() => {
        if (html.classList.contains('dt-intro')) return;
        waiting.disconnect(); waiting = null;
        if (slide.classList.contains('on') && prepare(false)) arrive();
      });
      waiting.observe(html, { attributes: true, attributeFilter: ['class'] });
      return;
    }
    // Labels and the text are measured, so lay out once the fonts are in (the ring cannot wait).
    if (document.fonts && document.fonts.status !== 'loaded' && !fromGap) {
      document.fonts.ready.then(() => { if (slide.classList.contains('on') && !running && prepare(false)) arrive(); });
      return;
    }
    prepare(fromGap);
  };
  const leave = () => {
    stop();
    armed = false;
    html.classList.remove('ac-quiet');
    dropSeed();
    if (waiting) { waiting.disconnect(); waiting = null; }
    hot = pinned = null;
    card.classList.remove('is-on');
    slide.style.cursor = '';
    // The stage fades with the slide's other content; clear it once out of sight.
    timers.push(window.deckLater(() => { if (!slide.classList.contains('on')) reset(); }, 700));
  };

  // ---- Going back to slide 3 -------------------------------------------------------------
  // A step back: the arrival played backwards. The picture ungrows in reverse order (the orbit, the extensions, the
  // panels and the constellation, the outline, the rings) down to the bright node in the lens; then the node lifts
  // off as the empty ring and flies back to its corner of the chart, which fades back in to meet it.
  const unpace = () => window.deckPace?.() || 1;
  let unbuilding = null;
  const unbuild = () => {
    const signal = window.deckNav?.signal;
    stop();
    timers.forEach(window.deckCancelLater); timers = [];
    armed = false;
    if (waiting) { waiting.disconnect(); waiting = null; }
    gifts = []; pend = []; pulses = []; flare = 0; plan = PLAN.length;
    hot = pinned = null; card.classList.remove('is-on'); slide.style.cursor = '';
    // Whatever the community added since goes back the way the first places came: in order, from the middle out.
    sides.forEach((sd) => sd.slots.forEach((x) => { if (x.state !== 'none') { x.shown = 0; if (x.state === 'full') x.filledAt = 0; } x.flash = 0; }));
    pace = 0.7; // the pace of a second visit
    ta = Math.min(ta, T.orbit + 0.85); // the last of the orbit is in by here
    slide.classList.add('dt-rewind');
    gapSlide.classList.add('dt-return', 'dt-await');
    window.deckRewinding?.(gapSlide);
    unbuilding = { last: 0, raf: 0, seeded: false, shown: false, at: 0 };
    signal?.addEventListener('abort', endUnbuild, { once: true });
    unbuilding.raf = requestAnimationFrame(unstep);
  };
  const unstep = (now) => {
    const u = unbuilding;
    if (!u) return;
    u.raf = 0;
    const dt = Math.min(0.05, (now - (u.last || now)) / 1000) * unpace();
    u.last = now;
    ta -= dt / pace;
    if (labelled > 1 && ta < T.orbit + 0.3) { labelled = 1; root.classList.remove('is-community'); }
    if (labelled > 0 && ta < 0.8) { labelled = 0; root.classList.remove('is-labelled'); }
    if (!u.seeded && ta <= 0) { // the node lifts off as the ring, the arrival's flight played backwards
      u.seeded = true;
      html.classList.remove('ac-quiet');
      slide.classList.replace('dt-rewind', 'dt-rewound');
      if (launch()) seedEl.getAnimations({ subtree: true }).forEach((a) => a.reverse());
    }
    if (u.seeded) {
      u.at += dt;
      if (!u.shown && u.at >= FLIGHT - 0.6) { u.shown = true; gapSlide.classList.remove('dt-await'); } // the chart fades in as it arrives
      const flying = seedEl ? seedEl.getAnimations({ subtree: true }) : []; // the engine hurries the seed with the turn
      if (u.at >= FLIGHT + 0.05 && flying.every((a) => a.playState === 'finished')) { endUnbuild(); return; }
    }
    if (ta > -0.4) draw();
    u.raf = requestAnimationFrame(unstep);
  };
  const endUnbuild = () => {
    const u = unbuilding;
    if (!u) return;
    unbuilding = null;
    if (u.raf) cancelAnimationFrame(u.raf);
    slide.classList.replace('dt-rewind', 'dt-rewound');
    gapSlide.classList.remove('dt-return', 'dt-await');
    html.classList.remove('ac-quiet');
    dropSeed();
    if (!slide.classList.contains('on')) reset();
    window.deckRewound?.(gapSlide);
  };

  let wasOn = false;
  const watch = new MutationObserver((records) => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    if (unbuilding) endUnbuild();
    if (!on) {
      const toGap = gapSlide && gapSlide.classList.contains('on') && ring && window.deckNav?.back && !still && running && rings.length && ta >= T.end;
      if (toGap) { unbuild(); return; }
      leave();
      return;
    }
    const fromGap = !still && gapSlide && !gapSlide.classList.contains('on') && records.some((r) => r.target === gapSlide);
    enter(!!fromGap);
  });
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (gapSlide) watch.observe(gapSlide, { attributes: true, attributeFilter: ['class'] });
  const syncMotion = () => {
    if (document.hidden || document.getElementById('overview')?.classList.contains('on')) stop();
    else if (slide.classList.contains('on')) start();
  };
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('deck-overview', syncMotion);

  window.deckOnResize(() => {
    if (!slide.classList.contains('on') || !rings.length) return;
    const interrupted = armed || ta < T.end || !!seedEl;
    const state = sides.map((sd) => sd.slots.map((x) => ({ state: x.state, shown: x.shown, filledAt: x.filledAt, flash: x.flash })));
    // A contribution in flight lands at its own socket; the rest of the
    // community keeps its existing clock and filled slots.
    for (const gift of gifts) Object.assign(state[gift.x.side][gift.x.i], { state: 'full', filledAt: ta - 2 });
    dropSeed();
    if (!layout()) return;
    sides.forEach((sd, i) => sd.slots.forEach((x, j) => Object.assign(x, state[i][j])));
    gifts = []; pend = []; pulses = [];
    sides.forEach((sd) => {
      if (sd.slots.filter(isFull).length >= CAP || sd.slots.some((x) => x.state === 'socket')) return;
      const next = sd.slots.find((x) => x.state === 'none');
      if (next) { next.state = 'socket'; next.shown = ta - 1; }
    });
    if (interrupted) {
      settle(state.map((sd) => sd.map((x) => x.state)));
      armed = false;
      timers.forEach(window.deckCancelLater); timers = [];
    }
    hot = pinned = null;
    card.classList.remove('is-on');
    draw();
    start();
  });

  // ---- Hovering ---------------------------------------------------------------------
  const local = (e) => { const b = root.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  const pick = (p, pad) => {
    let best = null, bd = (ER * k + pad) ** 2;
    for (const sd of sides) {
      for (const x of sd.slots) {
        if (x.state === 'none' || (x.shown !== null && x.shown > ta)) continue;
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
    if (still || !running) draw();
    if (!x) return;
    const empty = x.state === 'socket';
    card.querySelector('.ac-where').textContent = empty ? '' : 'community-made';
    card.querySelector('.ac-name').textContent = empty ? 'next: built by the community' : x.name;
    card.classList.toggle('is-empty', empty);
    card.style.setProperty('--c', x.side ? '#f3d9a8' : '#e0ab5e');
    // Below the place, clear of the picture.
    card.style.transform = `translate(${x.x.toFixed(1)}px, ${(x.y + ER * k + 10).toFixed(1)}px) translate(-50%, 0)`;
  };
  slide.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || !rings.length || !slide.classList.contains('on')) return;
    const h = pick(local(e), 4);
    if (h !== hot) { hot = h; show(); }
  });
  slide.addEventListener('pointerleave', () => { if (hot) { hot = null; show(); } });
  slide.addEventListener('pointerdown', (e) => { touched = e.pointerType === 'touch'; });
  // Clicks and taps on the picture stay here; they never turn the slide.
  slide.addEventListener('click', (e) => {
    if (!rings.length) return;
    const p = local(e);
    const x = pick(p, touched ? 22 : 4);
    if (x) { e.stopPropagation(); pinned = pinned === x ? null : x; show(); return; }
    const inRings = rings.some((r) => Math.hypot(p.x - r.c.x, p.y - r.c.y) < RR * k);
    if (inRings) { e.stopPropagation(); if (!still && ta > T.end) use(); return; }
    if (pinned) { e.stopPropagation(); pinned = null; show(); }
  });

  // ---- For slide 5 ---------------------------------------------------------------------
  // Going on to slide 5, this picture turns into the real product: slide 5 takes its geometry
  // and its layers (painted on their own canvases) and carries them into its panels.
  const paintLayer = (which) => {
    const off = document.createElement('canvas');
    off.width = canvas.width; off.height = canvas.height;
    const keep = g;
    g = off.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineCap = 'round'; g.lineJoin = 'round';
    try {
      if (which === 'agent') drawAgent();
      else if (which === 'face') drawFace();
      else { drawSides(); drawOrbit(); grow(feed, T.feed, 0.75 / pace, 0.7 * LW, 0.38); }
    } finally { g = keep; }
    return off;
  };
  const strandPts = (side, n) => STRANDS[side].map((st) => Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * TAU; // clockwise from the top, on screen
    return ringPt(side, st, side ? Math.PI - a : a);
  }));
  window.AstridCore = {
    snapshot() {
      if (!rings.length || ta < T.end) return null; // only a picture that has finished growing is carried on
      const b = root.getBoundingClientRect();
      return {
        left: b.left, top: b.top, W, H, dpr, k, lw: LW,
        rings: [0, 1].map((side) => ({ x: rings[side].c.x, y: rings[side].c.y, r: RR * k, strands: strandPts(side, 180), alpha: STRANDS[side].map((st) => st.a), width: STRANDS[side].map((st) => st.w) })),
        outline: lens.outline.pts, throat: lens.throat.pts, eye: lens.eye,
        slots: sides.flatMap((sd) => sd.slots.filter((x) => x.state !== 'none').map((x) => ({ x: x.x, y: x.y, side: x.side }))),
        orbit: orbit.filter((_, i) => i % 3 === 0).map((o) => ({ x: o.x, y: o.y })),
        layers: { agent: paintLayer('agent'), face: paintLayer('face'), outer: paintLayer('outer') },
      };
    },
    hide() { canvas.style.opacity = '0'; },
    show() { canvas.style.opacity = ''; }, // slide 5 folding back into this picture: it is whole again
  };

  if (slide.classList.contains('on')) { wasOn = true; enter(false); }
})();
