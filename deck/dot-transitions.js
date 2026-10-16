// Version F: each slide's text hangs from a small node of mycelium, seen from
// above, in the main site's own language: fine gold threads, short curling
// side-branches, tiny bright nodes. Turning the slide, the text is drawn into
// its node; a hypha grows across to where the next slide's text begins, its
// tip lit as it travels and side-branches sprouting behind it; where it
// arrives the node blooms, grows a small tuft, and threads run down into the
// text: the words appear where the network reaches, spreading from the node.
// Leaving, threads reach across the text and draw it back in.
// Old threads fade to about half and stay, so the network builds up across
// the deck; on first load the Mycelial mark draws itself in the middle of the
// screen and travels out to become the first node. Between turns
// the node drifts a little and the text trails it. Other versions untouched.
(() => {
  const VER = 'f';
  const html = document.documentElement;
  const slides = [...document.querySelectorAll('.slide')];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const active = () => html.dataset.ver === VER;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const rnd = Math.random;

  const dot = document.createElement('div');
  dot.className = 'dt-dot';
  dot.setAttribute('aria-hidden', 'true');
  const core = document.createElement('i'); // the visible node; pulses without moving its anchor
  dot.appendChild(core);
  const net = document.createElement('canvas');
  net.className = 'dt-net';
  net.setAttribute('aria-hidden', 'true');
  // The Mycelial mark (the opening, and the crown on the last slide) has a small canvas of its own, so whatever
  // quiets the network behind a slide's picture never fades the mark.
  const markCv = document.createElement('canvas');
  markCv.className = 'dt-mark';
  markCv.setAttribute('aria-hidden', 'true');
  document.body.append(net, markCv, dot);
  const g = net.getContext('2d'), mg = markCv.getContext('2d');
  // Settled threads are drawn once into an offscreen layer and leave the frame loop, so the network can spread
  // across the whole screen while each frame only draws what is still growing or glowing.
  const ground = document.createElement('canvas'), gg = ground.getContext('2d');

  // ---- The network ---------------------------------------------------------
  // A hypha is a polyline that grows along its length. Fresh threads glow,
  // then settle to a faint trace; kept ones (a node's tuft) stay faintly,
  // the rest fade away.
  const THREAD = '240,200,119', NODE = '255,217,145';
  const REST = 0.42; // what a lasting thread settles to, as a share of its fresh glow
  let hyphae = [], blooms = [], nodes = [], netOn = false, netRaf = 0, netLast = 0, dpr = 1;
  let vw = innerWidth, vh = innerHeight;
  // The settled network as geometry, so a resize can redraw it in place: { pts, w, a } threads and { x, y, a } nodes.
  let baked = [];
  const CAP = 6000; // past this the network is full: new threads still glow on their way, then fade instead of staying

  const bakeLine = (pts, w, a) => {
    gg.strokeStyle = `rgba(${THREAD},${a.toFixed(3)})`;
    gg.lineWidth = w;
    gg.beginPath();
    gg.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) gg.lineTo(pts[i][0], pts[i][1]);
    gg.stroke();
  };
  const bakeDot = (x, y, a) => {
    gg.fillStyle = `rgba(${NODE},${a.toFixed(3)})`;
    gg.beginPath(); gg.arc(x, y, 1.25, 0, 7); gg.fill();
  };
  const rebake = () => {
    gg.setTransform(dpr, 0, 0, dpr, 0, 0);
    gg.clearRect(0, 0, vw, vh);
    gg.lineCap = 'round';
    gg.lineJoin = 'round';
    for (const b of baked) b.pts ? bakeLine(b.pts, b.w, b.a) : bakeDot(b.x, b.y, b.a);
  };

  // How much of the screen the network has reached: thread length per cell of a coarse grid, measured so that
  // the same reading means the same density on any screen (one unit is 90 px of thread per 90 × 90 px), a phone
  // a little fuller.
  const GX = 16, GY = 10;
  let cover = new Float32Array(GX * GY), junctions = [];
  const note = (pts) => {
    const cw = vw / GX, ch = vh / GY, unit = Math.max(32, (cw * ch) / 90);
    for (let i = 1; i < pts.length; i++) {
      const cx = Math.floor((pts[i][0] + pts[i - 1][0]) / 2 / cw), cy = Math.floor((pts[i][1] + pts[i - 1][1]) / 2 / ch);
      if (cx >= 0 && cy >= 0 && cx < GX && cy < GY) cover[cy * GX + cx] += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / unit;
    }
    // Points new threads can set off from (shared with the geometry, so they move with it on a resize).
    for (let i = 0; i < pts.length; i += 7) {
      if (junctions.length < 1600) junctions.push(pts[i]);
      else junctions[Math.floor(rnd() * junctions.length)] = pts[i];
    }
  };

  // How much the settled network is stretched across, against down, from the shape it grew in.
  let warp = 1;
  // A small resize (an address bar coming or going) stretches the network to the new screen, unseen. A change of
  // shape (a phone turned, a window made much wider or narrower) would flatten its threads, so there the network
  // keeps its shape: it is scaled evenly, the slide's node (from, to) or else the middle staying put in it, and
  // size() says so, for the ground it no longer reaches to be grown over.
  const size = (from, to) => {
    dpr = Math.min(2, devicePixelRatio || 1);
    let sx = innerWidth / vw, sy = innerHeight / vh;
    const o = from || { x: vw / 2, y: vh / 2 };
    vw = innerWidth; vh = innerHeight;
    const n = to || { x: vw / 2, y: vh / 2 };
    net.width = ground.width = Math.round(vw * dpr);
    net.height = ground.height = Math.round(vh * dpr);
    const w = warp * sx / sy, even = w > 1.25 || w < 0.8;
    if (even) { const k = Math.sqrt(sx * sy); sx = k / Math.sqrt(warp); sy = k * Math.sqrt(warp); warp = 1; } else warp = w;
    if (sx !== 1 || sy !== 1 || even) {
      const [ox, oy, nx, ny] = even ? [o.x, o.y, n.x, n.y] : [0, 0, 0, 0];
      const seen = new Set();
      for (const b of baked) {
        if (!b.pts) { b.x = nx + (b.x - ox) * sx; b.y = ny + (b.y - oy) * sy; continue; }
        if (seen.has(b.pts)) continue;
        seen.add(b.pts);
        for (const p of b.pts) { p[0] = nx + (p[0] - ox) * sx; p[1] = ny + (p[1] - oy) * sy; }
      }
      if (even) { cover = new Float32Array(GX * GY); junctions = []; seen.forEach(note); }
    }
    rebake();
    return even;
  };
  size();

  const lengths = (pts) => {
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return len;
  };
  // A wandering path from a to b: a random walk that steers harder as it nears.
  const wander = (a, b) => {
    const pts = [[a.x, a.y]];
    let x = a.x, y = a.y;
    let ang = Math.atan2(b.y - a.y, b.x - a.x) + (rnd() - 0.5) * 1.4;
    for (let i = 0; i < 600; i++) {
      const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy);
      if (d < 9) { pts.push([b.x, b.y]); break; }
      const diff = ((Math.atan2(dy, dx) - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      ang += diff * (0.07 + 0.5 * clamp(1 - d / 260)) + (rnd() - 0.5) * 0.45;
      x += Math.cos(ang) * 6; y += Math.sin(ang) * 6;
      pts.push([x, y]);
    }
    return pts;
  };
  // A free side-branch: sets off at an angle and curls as it goes.
  const curl = (x, y, ang, length) => {
    const pts = [[x, y]];
    const bend = (rnd() - 0.5) * 0.12;
    for (let s = 0; s < length; s += 5) {
      ang += bend + (rnd() - 0.5) * 0.3;
      x += Math.cos(ang) * 5; y += Math.sin(ang) * 5;
      pts.push([x, y]);
    }
    return pts;
  };

  const hypha = (pts, o = {}) => {
    const len = lengths(pts);
    const full = baked.length > CAP && !o.keep;
    const h = {
      pts, len, total: len[len.length - 1], grown: 0, age: -(o.delay || 0), after: 0, done: false,
      width: o.width || 0.8, alpha: o.alpha || 0.45, speed: o.speed || 300, duration: o.duration || 0, tip: o.tip ?? 1,
      keep: !!o.keep, rest: full ? 0 : o.rest ?? REST, glow: 1, smooth: !!o.smooth, fade: o.fade || 4.5, branches: o.branches || [], depth: o.depth || 0, onDone: o.onDone || null,
    };
    if (h.keep || h.rest) note(pts);
    hyphae.push(h);
    wake();
    return h;
  };
  // Side-branches to sprout as a thread grows past them.
  const plan = (total, depth) => {
    const out = [];
    for (let at = 25 + rnd() * 30; at < total - 18; at += 32 + rnd() * 55) {
      out.push({ at, side: rnd() < 0.5 ? -1 : 1, length: (depth ? 10 + rnd() * 22 : 18 + rnd() * 60), done: false });
    }
    return out;
  };
  const pointAt = (h, d) => {
    let i = 1;
    while (i < h.len.length - 1 && h.len[i] < d) i++;
    const t = clamp((d - h.len[i - 1]) / ((h.len[i] - h.len[i - 1]) || 1));
    const [x0, y0] = h.pts[i - 1], [x1, y1] = h.pts[i];
    return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, ang: Math.atan2(y1 - y0, x1 - x0), i };
  };
  // A node blooms: a soft flash, and a tuft of short threads that stays.
  const bloom = (p, reach = 1) => {
    blooms.push({ x: p.x, y: p.y, age: 0 });
    // Fanned upward and sideways, away from the text that hangs below.
    const n = 5 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const ang = -Math.PI / 2 + (k / (n - 1) - 0.5) * 2.9 + (rnd() - 0.5) * 0.35;
      hypha(curl(p.x, p.y, ang, (8 + rnd() * 16) * reach), { width: 0.7, alpha: 0.4, speed: 110 + rnd() * 70, keep: true, delay: rnd() * 0.12, depth: 2 });
    }
    wake();
  };
  // The old node's tuft dims to a trace like everything else (the new node grows its own).
  const release = () => {
    hyphae.forEach((h) => { if (h.keep) { h.keep = false; h.rest = h.rest || REST; } });
    nodes.forEach((n) => { if (n.keep) { n.keep = false; n.rest = n.rest || REST; } });
  };

  // How bright a thread should be now: fresh threads glow, then settle to a
  // resting trace (a node's own tuft rests brighter); passing threads fade out.
  const target = (h) => {
    if (h.age < 0) return 0;
    const fresh = h.done ? Math.exp(-h.after / Math.min(0.9, h.fade * 0.5)) : 1;
    if (h.keep) return 0.6 + 0.4 * fresh;
    if (h.rest) return h.rest + (1 - h.rest) * fresh;
    return fresh * clamp(1 - h.after / h.fade);
  };

  // The Mycelial mark, from the site's own favicon (a 64-unit grid centred on 32,32).
  const MARK = {
    nodes: [[14, 24, 3.4], [29, 13, 3], [45, 21, 5], [50, 39, 3.2], [42, 51, 3], [21, 45, 4.6]],
    curves: [[14, 24, 28, 23, 29, 13], [29, 13, 35, 30, 21, 45], [21, 45, 36, 31, 45, 21], [45, 21, 43, 35, 50, 39],
      [50, 39, 36, 37, 42, 51], [42, 51, 35, 38, 21, 45], [21, 45, 25, 33, 14, 24], [14, 24, 33, 25, 42, 51], [21, 45, 30, 32, 45, 21]],
  };
  let mark = null; // { x, y, t, size, shrink, trail, shed }

  // Side-branches sprout where the thread has grown past them.
  const sprout = (h) => {
    for (const b of h.branches) {
      if (b.done || h.grown < b.at) continue;
      b.done = true;
      const p = pointAt(h, b.at);
      nodes.push({ x: p.x, y: p.y, age: 0, keep: h.keep, rest: h.rest });
      const pts = curl(p.x, p.y, p.ang + b.side * (0.5 + rnd() * 0.6), b.length);
      hypha(pts, { width: h.width * 0.7, alpha: h.alpha * 0.8, speed: 140 + rnd() * 90, keep: h.keep, rest: h.rest, depth: h.depth + 1, tip: h.tip,
        branches: h.depth < 1 && rnd() < 0.55 ? plan(lengths(pts).at(-1), h.depth + 1) : [] });
    }
  };
  // A lasting thread that has settled to its trace goes into the ground layer; so does a settled node.
  const settled = (h) => h.done && !h.keep && h.rest > 0 && h.age >= 0 && h.after > 1 && Math.abs(h.glow - h.rest) < 0.02;
  const bake = (h) => {
    const b = { pts: h.pts, w: h.width, a: h.alpha * h.rest };
    baked.push(b);
    bakeLine(b.pts, b.w, b.a);
  };
  const bakeNode = (n) => {
    const b = { x: n.x, y: n.y, a: n.rest * 0.6 };
    baked.push(b);
    bakeDot(b.x, b.y, b.a);
  };
  // Grow everything still growing to its end at once and settle it (a resize, or reduced motion).
  const ripen = () => {
    for (let i = 0; i < hyphae.length; i++) { // branches sprouting here join the end of the list and ripen in turn
      const h = hyphae[i];
      h.onDone = null;
      if (h.age < 0) h.age = 0;
      h.grown = h.total;
      sprout(h);
      h.done = true; h.after = 99; h.glow = target(h);
    }
    nodes.forEach((n) => { n.age = 99; });
    blooms = [];
    hyphae = hyphae.filter((h) => { if (settled(h)) { bake(h); return false; } return h.keep || h.rest > 0; });
    nodes = nodes.filter((n) => { if (n.keep) return true; if (n.rest) bakeNode(n); return false; });
  };

  const step = (dt) => {
    for (const h of hyphae) {
      h.age += dt;
      if (h.age < 0) continue;
      if (!h.done) {
        const k = clamp(h.age / (h.duration || 1));
        h.grown = h.duration
          ? h.total * (h.smooth ? 0.5 - 0.5 * Math.cos(Math.PI * k) : (1 - Math.pow(1 - k, 2.2)) * clamp(k * 3))
          : Math.min(h.total, h.grown + h.speed * dt);
        sprout(h);
        if (h.grown >= h.total - 0.01) {
          h.grown = h.total; h.done = true;
          if (h.onDone) { const f = h.onDone; h.onDone = null; f(); }
        }
      } else h.after += dt;
    }
    for (const h of hyphae) h.glow += (target(h) - h.glow) * (1 - Math.exp(-dt / 0.35));
    for (const n of nodes) n.age += dt;
    for (const b of blooms) b.age += dt;
    // The mark rides the tip of its thread, shrinking, and sheds its nodes along the way.
    if (mark) {
      mark.t += dt;
      if (mark.folding !== undefined) {
        mark.folding += dt / 0.5;
        mark.shrink = clamp(mark.folding);
        if (mark.folding >= 1) mark = null;
      }
      const tr = mark && mark.trail;
      if (tr) {
        const p = pointAt(tr, tr.grown), u = tr.grown / tr.total;
        mark.x = p.x; mark.y = p.y;
        mark.shrink = u * u * (3 - 2 * u);
        if (mark.shed < 4 && u > 0.2 + mark.shed * 0.17) {
          mark.shed++;
          nodes.push({ x: p.x, y: p.y, age: 0, keep: false, rest: 0.5 });
          hypha(curl(p.x, p.y, p.ang + (rnd() < 0.5 ? -1 : 1) * (0.7 + rnd() * 0.6), 14 + rnd() * 30), { width: 0.7, alpha: 0.45, speed: 160, depth: 1 });
        }
      }
    }
    // Resting threads stay as a trace (in the ground layer once settled); passing ones (through the text) go entirely.
    hyphae = hyphae.filter((h) => {
      if (settled(h)) { bake(h); return false; }
      return h.keep || h.rest || h.age < 0 || !h.done || h.after < h.fade;
    });
    nodes = nodes.filter((n) => {
      if (n.keep) return true;
      if (n.rest) { if (n.age > 3) { bakeNode(n); return false; } return true; }
      return n.age < 5;
    });
    blooms = blooms.filter((b) => b.age < 0.9);
    for (const z of zones) {
      if (z.wait > 0) { z.wait -= dt; continue; }
      z.a += (z.to - z.a) * (1 - Math.exp(-dt / 0.3));
    }
    zones = zones.filter((z) => z.to > 0 || z.a > 0.01);
  };

  // The mark, drawn on its own canvas around (cx, cy).
  const drawMark = (g, m, cx, cy) => {
    const k = m.t;
    const S = (m.size * (1 - 0.94 * m.shrink)) / 54; // px per unit; the ring spans 54 units
    const at = (x, y) => [cx + (x - 32) * S, cy + (y - 32) * S];
    const fade = (1 - 0.55 * m.shrink) * (m.faint || 1);
    const fine = m.faint ? 0.55 : 1; // the large faint crown is drawn in a finer hand, so the words over it stay clear
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, 36 * S);
    halo.addColorStop(0, `rgba(${NODE},${(0.1 * clamp(k / 1) * fade).toFixed(3)})`);
    halo.addColorStop(1, `rgba(${NODE},0)`);
    g.fillStyle = halo;
    g.beginPath(); g.arc(cx, cy, 36 * S, 0, 7); g.fill();
    g.strokeStyle = `rgba(${THREAD},${(0.8 * fade).toFixed(3)})`;
    g.lineWidth = Math.max(m.crown ? 1.1 : 0.6, S * 0.66 * fine);
    g.beginPath(); g.arc(cx, cy, 27 * S, -Math.PI / 2, -Math.PI / 2 + clamp(k / 0.8) * Math.PI * 2); g.stroke();
    g.lineWidth = Math.max(m.crown ? 0.9 : 0.5, S * 0.5 * fine);
    MARK.curves.forEach(([x0, y0, qx, qy, x1, y1], i) => {
      const p = clamp((k - 0.2 - i * 0.05) / 0.5);
      if (p <= 0) return;
      g.beginPath();
      for (let s = 0; s <= 20; s++) {
        const t = (s / 20) * p, u = 1 - t;
        const [px, py] = at(u * u * x0 + 2 * u * t * qx + t * t * x1, u * u * y0 + 2 * u * t * qy + t * t * y1);
        s ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
    });
    MARK.nodes.forEach(([x, y, r], i) => {
      const a = clamp((k - 0.15 - i * 0.08) / 0.25) * fade;
      if (a <= 0) return;
      const [px, py] = at(x, y), rr = Math.max(1, r * S * 0.8 * (m.faint ? 0.55 : 1));
      const glow = g.createRadialGradient(px, py, 0, px, py, rr * 3);
      glow.addColorStop(0, `rgba(${NODE},${(0.5 * a * fine).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${NODE},0)`);
      g.fillStyle = glow;
      g.beginPath(); g.arc(px, py, rr * 3, 0, 7); g.fill();
      g.fillStyle = `rgba(255,236,190,${(a * fine * 1.2).toFixed(3)})`;
      g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill();
    });
  };

  // Under the text the network is softened, never removed: a soft-edged shape of the text's lines, cut from the
  // drawn network at CUT strength. Slides that soften the network themselves (an inline mask) keep theirs.
  const CUT = 0.72;
  const zone = (els) => {
    const rs = [];
    const range = document.createRange();
    for (const el of els) {
      range.selectNodeContents(el);
      const trim = el.classList.contains('num') ? 0.3 : 0.18; // the label hugs its glyphs, clear of the node above it
      for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) rs.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, trim });
    }
    if (!rs.length) return null;
    const P = 18;
    const x0 = Math.min(...rs.map((r) => r.left)) - 2 * P, y0 = Math.min(...rs.map((r) => r.top)) - 2 * P;
    const w = Math.max(...rs.map((r) => r.right)) + 2 * P - x0, h = Math.max(...rs.map((r) => r.bottom)) + 2 * P - y0;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    // Safari has no canvas filter: the same blur, as the shadow of the shapes drawn just off the canvas
    // (shadowBlur is twice the blur's deviation, and like the filter it ignores the scale).
    const off = 'filter' in c ? 0 : w + 4 * P;
    if (off) { c.shadowColor = '#000'; c.shadowBlur = 2 * P * 0.55; c.shadowOffsetX = off * dpr; }
    else c.filter = `blur(${P * 0.55}px)`;
    c.fillStyle = '#000';
    for (const r of rs) {
      const py = r.height * r.trim;
      c.beginPath();
      c.roundRect(r.left - x0 - P * 0.6 - off, r.top - y0 + py - P * 0.25, r.width + P * 1.2, r.height - 2 * py + P * 0.5, 10);
      c.fill();
    }
    return { cv, x: x0, y: y0, w, h, a: 0, to: 1 };
  };
  // A soft disc, under the crown, so the mark reads cleanly over a full network.
  const disc = (x, y, r) => {
    const R = r * 1.5, cv = document.createElement('canvas');
    cv.width = cv.height = Math.ceil(2 * R * dpr);
    const c = cv.getContext('2d'), grad = c.createRadialGradient(R * dpr, R * dpr, 0, R * dpr, R * dpr, R * dpr);
    grad.addColorStop(0, '#000');
    grad.addColorStop(0.6, '#000');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, cv.width, cv.height);
    return { cv, x: x - R, y: y - R, w: 2 * R, h: 2 * R, a: 0, to: 1 };
  };
  let zones = [], chrome = null;
  // The text block of a slide: its column, the label included.
  const lines = (s) => textOf(s).flatMap((col) => [...col.children]);
  // The deck's own chrome: the wordmark, the counter and its buttons.
  const chromeEls = () => [name, ...document.querySelectorAll('.chrome #count, .chrome button')];
  const soften = () => {
    const own = !net.style.maskImage;
    g.globalCompositeOperation = 'destination-out';
    for (const z of own ? [chrome, ...zones] : [chrome, ...zones.filter((z) => z.crown)]) {
      if (!z || z.a <= 0.005) continue;
      g.globalAlpha = z.a * CUT;
      g.drawImage(z.cv, z.x, z.y, z.w, z.h);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  };

  // A soft light, drawn once: growing tips and blooms are stamped with it rather than building a gradient each frame.
  const glowDot = document.createElement('canvas');
  glowDot.width = glowDot.height = 64;
  {
    const c = glowDot.getContext('2d'), grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${NODE},1)`);
    grad.addColorStop(1, `rgba(${NODE},0)`);
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
  }
  const stamp = (x, y, r, a) => {
    if (a <= 0.003) return;
    g.globalAlpha = Math.min(1, a);
    g.drawImage(glowDot, x - r, y - r, 2 * r, 2 * r);
    g.globalAlpha = 1;
  };

  const drawThreads = (lasting) => {
    for (const h of hyphae) {
      if (!!(h.keep || h.rest) !== lasting) continue;
      const glow = h.glow;
      if (glow <= 0.005 || h.grown <= 0) continue;
      const end = h.grown >= h.total;
      const tip = end ? { x: h.pts.at(-1)[0], y: h.pts.at(-1)[1], i: h.pts.length - 1 } : pointAt(h, h.grown);
      g.beginPath();
      g.moveTo(h.pts[0][0], h.pts[0][1]);
      for (let i = 1; i < tip.i; i++) g.lineTo(h.pts[i][0], h.pts[i][1]);
      g.lineTo(tip.x, tip.y);
      g.strokeStyle = `rgba(${THREAD},${(h.alpha * glow).toFixed(3)})`;
      g.lineWidth = h.width;
      g.stroke();
      if (!h.done) {
        // The lit stretch just behind a growing tip, and the tip itself.
        const from = pointAt(h, Math.max(0, h.grown - 46));
        g.beginPath();
        g.moveTo(from.x, from.y);
        for (let i = from.i; i < tip.i; i++) g.lineTo(h.pts[i][0], h.pts[i][1]);
        g.lineTo(tip.x, tip.y);
        g.strokeStyle = `rgba(${NODE},${Math.min(1, h.alpha * 1.7 * h.tip).toFixed(3)})`;
        g.lineWidth = h.width + 0.5;
        g.stroke();
        stamp(tip.x, tip.y, h.depth ? 4 : 9, (h.depth ? 0.45 : 0.75) * h.tip);
      }
    }
  };
  const drawNodes = (lasting) => {
    for (const n of nodes) {
      if (!!(n.keep || n.rest) !== lasting) continue;
      const a = (n.keep ? 0.35 + 0.35 * Math.exp(-n.age / 0.8)
        : n.rest ? n.rest * 0.6 + 0.4 * Math.exp(-n.age / 1.2) : 0.7 * clamp(1 - n.age / 5)) * clamp(n.age / 0.15);
      g.fillStyle = `rgba(${NODE},${a.toFixed(3)})`;
      g.beginPath(); g.arc(n.x, n.y, 1.25, 0, 7); g.fill();
    }
  };

  // The mark rides on its own canvas, moved into place. Its art is redrawn only while it changes: the opening mark as
  // it draws itself in and rides out; the large crown behind the last slide's words is drawn once, at its finished art,
  // and comes in and folds away by the canvas's opacity and scale (crown(), uncrown()).
  let markBox = 0, markKey = '';
  const drawMarkLayer = () => {
    if (!mark) {
      if (markBox) { mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, markCv.width, markCv.height); markBox = 0; markKey = ''; }
      return;
    }
    const B = Math.ceil(mark.size * 1.5 + 16);
    const tl = `${(mark.x - B / 2).toFixed(1)}px ${(mark.y - B / 2).toFixed(1)}px`;
    if (markCv.style.translate !== tl) markCv.style.translate = tl;
    // Its own resolution, budgeted by pixels rather than capped like the full-screen network: the small marks (the
    // opening, the thread's tip) are drawn at up to 3x so they stay crisp on a phone; a surface that would pass about
    // 1.5 megapixels there (the large faint crown) is drawn at the network's 2x.
    const md = (B * Math.min(3, devicePixelRatio || 1)) ** 2 > 1.5e6 ? Math.min(2, devicePixelRatio || 1) : Math.min(3, devicePixelRatio || 1);
    const art = mark.crown ? { ...mark, t: 2, shrink: 0 } : mark;
    const key = `${B}|${md}|${mark.x}|${mark.y}|${art.shrink}|${Math.min(art.t, 1.2)}`;
    if (key === markKey) return;
    markKey = key;
    if (B !== markBox || markCv.width !== Math.round(B * md)) {
      markBox = B;
      markCv.width = markCv.height = Math.round(B * md);
      markCv.style.width = markCv.style.height = `${B}px`;
    }
    mg.setTransform(md, 0, 0, md, 0, 0);
    mg.clearRect(0, 0, B, B);
    mg.lineCap = 'round';
    mg.lineJoin = 'round';
    drawMark(mg, art, B / 2, B / 2);
  };

  // The settled ground, then what is still growing on it, softened under the text together; then the passing
  // threads that draw the text in and out, the blooms, and the mark, all at full strength.
  const draw = () => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, net.width, net.height);
    if (baked.length) g.drawImage(ground, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    drawThreads(true);
    drawNodes(true);
    soften();
    drawThreads(false);
    drawNodes(false);
    for (const b of blooms) {
      const e = clamp(b.age / 0.9);
      stamp(b.x, b.y, 5 + 30 * (1 - Math.pow(1 - e, 3)), 0.55 * (1 - e));
    }
    drawMarkLayer();
  };

  // Runs only while something is growing, glowing or fading.
  const moving = () => (mark && (mark.trail || mark.folding !== undefined || mark.t < 1.6)) || blooms.length || nodes.some((n) => (n.keep || n.rest ? n.age < 3 : true))
    || zones.some((z) => Math.abs(z.a - z.to) > 0.01)
    || hyphae.some((h) => h.age < 0 || !h.done || Math.abs(h.glow - target(h)) > 0.004 || !(h.keep || h.rest || h.after >= h.fade));
  const tick = (now) => {
    netRaf = 0;
    if (document.hidden || document.getElementById('overview')?.classList.contains('on')) { netOn = false; netLast = 0; return; }
    const dt = Math.min(0.05, (now - (netLast || now)) / 1000) * (window.deckPace?.() || 1);
    netLast = now;
    step(dt);
    draw();
    if (moving()) netRaf = requestAnimationFrame(tick);
    else { netOn = false; netLast = 0; }
  };
  function wake() {
    if (document.hidden || document.getElementById('overview')?.classList.contains('on')) return;
    if (!netOn) { netOn = true; netLast = 0; netRaf = requestAnimationFrame(tick); }
  }
  const syncNetMotion = () => {
    if (document.hidden || document.getElementById('overview')?.classList.contains('on')) {
      if (netRaf) cancelAnimationFrame(netRaf);
      netRaf = 0; netOn = false; netLast = 0;
    } else if (moving()) wake();
  };
  document.addEventListener('visibilitychange', syncNetMotion);
  window.addEventListener('deck-overview', syncNetMotion);
  const clearNet = () => {
    hyphae = []; nodes = []; blooms = []; mark = null;
    baked = []; junctions = []; cover = new Float32Array(GX * GY); warp = 1;
    rebake();
    draw();
  };

  // ---- Sprawl ----------------------------------------------------------------
  // Besides the thread from node to node, every new slide grows the network out into ground it hasn't reached,
  // the bottom-left first. By slide k it has reached FILL[k] of the screen's cells with at least DEPTH[k] cell
  // widths of thread each. Going into slide 5 that jumps, and the network bursts out across the whole screen;
  // by the last slides it fills it. Going back never takes any away, and once full it stops growing.
  const FILL = [0.1, 0.24, 0.36, 0.48, 0.9, 0.92, 0.94, 0.96, 0.98, 1, 1];
  const DEPTH = [0.7, 0.7, 0.75, 0.8, 0.85, 0.95, 1.05, 1.15, 1.25, 1.4, 1.5];
  const short = (lvl) => {
    let below = 0;
    for (const c of cover) if (c < DEPTH[lvl]) below++;
    return below - Math.floor((1 - FILL[lvl]) * GX * GY);
  };
  // Somewhere the network is thin: weighted towards the emptiest cells and, early on, the bottom-left.
  const pickCell = (lvl) => {
    let sum = 0;
    const w = Array.from(cover, (c, i) => {
      if (c >= DEPTH[lvl]) return 0;
      const x = (i % GX + 0.5) / GX, y = (Math.floor(i / GX) + 0.5) / GY;
      const v = Math.pow(1 - c / DEPTH[lvl], 2) * (lvl < 4 && x < 0.45 && y > 0.5 ? 3.5 : 1);
      sum += v;
      return v;
    });
    let r = rnd() * sum;
    for (let i = 0; i < w.length; i++) if ((r -= w[i]) <= 0 && w[i] > 0) return i;
    return -1;
  };
  // Set off from the nearest part of the network (one of the closest few of a sample).
  const pickStart = (to) => {
    if (!junctions.length) return null;
    const near = [];
    for (let k = 0; k < 70; k++) {
      const p = junctions[Math.floor(rnd() * junctions.length)];
      near.push([Math.hypot(p[0] - to.x, p[1] - to.y), p]);
    }
    near.sort((a, b) => a[0] - b[0]);
    const p = near[Math.floor(rnd() * Math.min(3, near.length))][1];
    return { x: p[0], y: p[1] };
  };
  const sprawl = (lvl, from, delay = 0) => {
    lvl = clamp(lvl, 0, FILL.length - 1);
    const need = short(lvl);
    if (need <= 0) return;
    const burst = need > 40; // a big step (into slide 5, or a jump ahead): many threads at once, fast, from all over
    const most = burst ? 46 : 12;
    const cw = vw / GX, ch = vh / GY;
    for (let n = 0, tries = 0; n < most && tries < most * 3 && short(lvl) > 0; tries++) {
      const cell = pickCell(lvl);
      if (cell < 0) break;
      const to = { x: (cell % GX + 0.15 + 0.7 * rnd()) * cw, y: (Math.floor(cell / GX) + 0.15 + 0.7 * rnd()) * ch };
      const start = (burst && from && rnd() < 0.15) ? from : pickStart(to) || from;
      if (!start) break;
      const pts = wander(start, to);
      const total = lengths(pts).at(-1);
      if (total < 40) { cover[cell] += DEPTH[lvl]; continue; } // already there: count the cell as reached
      hypha(pts, burst
        ? { width: 0.75, alpha: 0.44, speed: 560 + rnd() * 320, delay: delay + rnd() * 0.55, branches: plan(total, 0), tip: 0.8 }
        : { width: 0.75, alpha: 0.42, speed: 190 + rnd() * 110, delay: delay + 0.2 + rnd() * 1.1, branches: plan(total, 0), tip: 0.45 });
      n++;
    }
  };

  // ---- Slides, text and the node --------------------------------------------
  // In F each slide's label sits inside its text column, directly above the
  // headline, so label and text travel as one block under the node.
  const columnOf = (s) => s.querySelector(':scope > .split > :first-child');
  const homes = new Map();
  const adopt = () => slides.forEach((s) => {
    const num = s.querySelector(':scope > .num'), col = columnOf(s);
    if (!num || !col) return;
    homes.set(num, s);
    col.prepend(num);
  });
  const restore = () => homes.forEach((s, num) => s.insertBefore(num, s.querySelector(':scope > .split')));

  const textOf = (s) => [columnOf(s)].filter(Boolean);
  // The node sits just above the start of the label (its end when right-aligned, its middle when centred).
  const anchorOf = (s) => {
    const col = columnOf(s);
    const first = col && (col.querySelector('.num') || col.querySelector('h1'));
    if (!first) return null;
    const range = document.createRange();
    range.selectNodeContents(first);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    if (!rects.length) return null;
    const line = rects.filter((r) => Math.abs(r.top - rects[0].top) < 6);
    const left = Math.min(...line.map((r) => r.left)), right = Math.max(...line.map((r) => r.right));
    const align = getComputedStyle(first).textAlign;
    const x = align === 'center' ? (left + right) / 2 : align === 'right' || align === 'end' ? right - 3 : left + 3;
    return { x, y: rects[0].top - 13 };
  };
  const place = (p) => { dot.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`; };

  // Text shows only inside a soft-edged circle around the node; growing the
  // circle reveals it from the node outward, shrinking it draws it back in.
  const SOFT = 150;
  const mask = (el, at, r) => {
    const b = el.getBoundingClientRect();
    const x = at.x - b.left, y = at.y - b.top;
    const v = r <= 0 ? 'linear-gradient(transparent, transparent)'
      : `radial-gradient(circle at ${x.toFixed(1)}px ${y.toFixed(1)}px, #000 ${Math.max(0, r - SOFT).toFixed(1)}px, transparent ${r.toFixed(1)}px)`;
    el.style.webkitMaskImage = v;
    el.style.maskImage = v;
  };
  const unmask = (el) => { el.style.webkitMaskImage = ''; el.style.maskImage = ''; };
  const reach = (el, at) => {
    const b = el.getBoundingClientRect();
    return Math.max(...[[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]]
      .map(([x, y]) => Math.hypot(x - at.x, y - at.y))) + SOFT;
  };
  // Points spread through a text block, for threads to run to or from.
  const spots = (el, n) => {
    const b = el.getBoundingClientRect();
    return Array.from({ length: n }, (_, i) => ({
      x: b.left + b.width * (0.08 + 0.84 * rnd()),
      y: b.top + b.height * ((i + 0.3 + rnd() * 0.4) / n),
    }));
  };
  const seep = (k) => 0.5 - 0.5 * Math.cos(Math.PI * k); // gentle in, gentle out
  const easeIn = (k) => k * k * (3 - 2 * k) * k;
  const tween = (duration, ease, step, delay = 0) => {
    let raf = 0, stopped = false, resolve;
    const signal = window.deckNav?.signal;
    const p = new Promise((r) => { resolve = r; });
    let elapsed = -delay, last = 0;
    const blocked = () => document.hidden || document.getElementById('overview')?.classList.contains('on');
    const tick = (now) => {
      raf = 0;
      if (stopped || blocked()) return;
      elapsed += (now - (last || now)) * (window.deckPace?.() || 1);
      last = now;
      const k = clamp(elapsed / duration);
      if (elapsed >= 0) step(ease(k));
      if (k < 1) raf = requestAnimationFrame(tick); else { stopped = true; resolve(true); }
    };
    // Text can still be revealing when a slide's build is paused.
    const syncMotion = () => {
      if (stopped) return;
      if (blocked()) { cancelAnimationFrame(raf); raf = 0; last = 0; }
      else if (!raf) raf = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', syncMotion);
    window.addEventListener('deck-overview', syncMotion);
    p.then(() => {
      document.removeEventListener('visibilitychange', syncMotion);
      window.removeEventListener('deck-overview', syncMotion);
    });
    syncMotion();
    p.stop = () => { if (stopped) return; stopped = true; cancelAnimationFrame(raf); resolve(false); };
    if (signal) {
      signal.addEventListener('abort', p.stop, { once: true });
      p.then(() => signal.removeEventListener('abort', p.stop));
      if (signal.aborted) p.stop();
    }
    return p;
  };

  // Threads run from the node down into the text, and the words appear where
  // they reach. The circle's edge keeps pace with the threads' tips.
  const reveal = (s, at, delay = 0) => {
    s.classList.remove('dt-entering');
    const tw = [];
    for (const el of textOf(s)) {
      mask(el, at, 0);
      const far = reach(el, at);
      const duration = clamp(far / 0.62, 1100, 1600);
      if (!still) {
        for (const p of spots(el, 7)) {
          const pts = wander(at, p);
          const d = lengths(pts).at(-1);
          hypha(pts, { width: 0.6, alpha: 0.3, depth: 1, fade: 1.1, rest: 0, smooth: true, delay: delay / 1000, duration: (duration / 1000) * clamp(d / (far - SOFT), 0.3, 1) });
        }
      }
      const run = tween(duration, seep, (k) => mask(el, at, k * far), delay);
      run.then((ok) => { if (ok) unmask(el); });
      tw.push(run);
    }
    return tw;
  };
  // Threads reach across the text and draw it back into the node.
  const gather = (s, at) => {
    const tw = [];
    for (const el of textOf(s)) {
      const far = reach(el, at);
      for (const p of spots(el, 6)) {
        hypha(wander(p, at), { width: 0.6, alpha: 0.3, depth: 1, fade: 0.7, rest: 0, duration: 0.38 });
      }
      tw.push(tween(400, easeIn, (k) => mask(el, at, (1 - k) * far)));
    }
    return tw;
  };

  let current = slides.find((s) => s.classList.contains('on')) || null;
  let anchor = null, turning = null;
  // The thread each slide's node was reached by, from the slide before: a step back runs back along it.
  const trails = new Map();
  const trailBack = (prev, next, from, to) => {
    const t = trails.get(prev);
    if (!t || t.prev !== next) return null;
    const a = t.pts[0], b = t.pts.at(-1);
    if (Math.hypot(a[0] - to.x, a[1] - to.y) > 24 || Math.hypot(b[0] - from.x, b[1] - from.y) > 24) return null; // moved since (a resize)
    return [[from.x, from.y], ...t.pts.slice(1, -1).reverse().map(([x, y]) => [x, y]), [to.x, to.y]];
  };
  let drift = { x: 0, y: 0 }, trail = { x: 0, y: 0 }, t = 0, last = 0;
  const clearText = (s) => s && textOf(s).forEach((el) => { el.style.transform = ''; unmask(el); });

  // Idle: the node wanders a pixel or two; the text follows a beat behind.
  let idleRaf = 0;
  const canDrift = () => active() && !document.hidden && !document.getElementById('overview')?.classList.contains('on') && !still;
  const syncIdle = () => {
    if (!canDrift()) { if (idleRaf) cancelAnimationFrame(idleRaf); idleRaf = 0; last = 0; return; }
    if (!idleRaf) { last = 0; idleRaf = requestAnimationFrame(idle); }
  };
  const idle = (now) => {
    idleRaf = 0;
    if (!canDrift()) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    idleRaf = requestAnimationFrame(idle);
    if (turning || !anchor) return;
    t += dt;
    drift = { x: 1.8 * Math.sin(t * 0.45), y: 1.3 * Math.sin(t * 0.31 + 1) };
    const k = 1 - Math.exp(-1.6 * dt);
    trail.x += (drift.x * 0.7 - trail.x) * k;
    trail.y += (drift.y * 0.7 - trail.y) * k;
    place({ x: anchor.x + drift.x, y: anchor.y + drift.y });
    textOf(current).forEach((el) => { el.style.transform = `translate(${trail.x.toFixed(2)}px, ${trail.y.toFixed(2)}px)`; });
  };
  document.addEventListener('visibilitychange', syncIdle);
  window.addEventListener('deck-overview', syncIdle);
  syncIdle();

  const pulse = (k) => core.animate([{ transform: 'scale(1)' }, { transform: `scale(${k})` }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });

  // ---- The name, the opening and the ending ----------------------------------
  // The site's wordmark. On first load it sits beneath the mark, then settles
  // small into the deck's footer, left of the progress bar, like the site's own
  // signature: onto the footer's invisible copy of it (.chrome .brand).
  const name = document.createElement('div');
  name.className = 'dt-name';
  name.textContent = 'Mycelial';
  name.setAttribute('aria-hidden', 'true');
  document.body.appendChild(name);
  const nameAt = (x, y, k) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%) scale(${k})`;
  const nameSlot = document.querySelector('.chrome .brand');
  const nameCorner = () => {
    const r = nameSlot && nameSlot.getBoundingClientRect();
    if (!r || !r.width) return nameAt(Math.max(16, innerWidth * 0.024), innerHeight - 62, 0.58);
    return nameAt(r.left, r.top + r.height / 2, parseFloat(getComputedStyle(nameSlot).fontSize) / 22);
  };
  const nameRest = () => {
    name.getAnimations().forEach((a) => a.cancel());
    name.style.transform = nameCorner();
    name.classList.add('is-resting');
    name.classList.toggle('is-on', active());
  };

  // The last slide: as its node blooms, the Mycelial mark draws itself in large and faint behind the words, its
  // middle on theirs, and folds away into them again on leaving.
  const deck = () => slides.filter((sl) => (sl.dataset.v || '').split(' ').includes(VER));
  const lastSlide = () => deck().at(-1);
  const levelOf = (s) => Math.max(0, deck().indexOf(s));
  const crownAt = () => {
    const col = columnOf(lastSlide()), r = col && col.getBoundingClientRect();
    if (!r || !r.width) return null;
    const y = r.top + r.height / 2, room = 2 * Math.min(y - 12, innerHeight - 80 - y); // clear of the chrome at the foot
    const across = innerWidth <= 760 && innerHeight > innerWidth ? innerWidth * 0.62 : innerWidth - 24; // inside an upright phone's narrow halo
    const size = clamp(Math.max(r.height * 1.45, r.width * 0.62), 160, Math.min(across, innerHeight * 0.8, room));
    return { x: r.left + r.width / 2, y, size: Math.round(size) };
  };
  const crown = (at, now) => {
    const c = crownAt() || { x: at.x, y: at.y, size: 160 };
    mark = { x: c.x, y: c.y, t: now ? 2 : -0.2, size: c.size, shrink: 0, trail: null, shed: 0, crown: true, faint: 0.3 };
    zones.push(Object.assign(disc(mark.x, mark.y, c.size * 0.42), { crown: true, a: now ? 1 : 0 }));
    markCv.getAnimations().forEach((a) => a.cancel());
    if (!now) markCv.animate([{ opacity: 0, scale: '0.94' }, { opacity: 1, scale: '1' }], { duration: 1300, delay: 150, easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'backwards' });
    wake();
  };
  const uncrown = () => {
    if (!mark || !mark.crown) return;
    mark.folding = 0; // step() times it; the canvas folds into its middle as it fades
    const cs = getComputedStyle(markCv), from = { opacity: cs.opacity, scale: cs.scale === 'none' ? '1' : cs.scale };
    markCv.getAnimations().forEach((a) => a.cancel());
    markCv.animate([from, { opacity: 0, scale: '0.06' }], { duration: 500, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    wake();
  };

  // First load: the mark draws itself in the middle of the screen over its
  // name, then rides a growing thread out to the slide's node, shrinking and
  // shedding its nodes into the network; the name settles into the corner;
  // where the mark lands the text is revealed and the slide fades in.
  let opening = null;
  const endOpening = () => {
    if (!opening) return;
    opening.timers.forEach(window.deckCancelLater);
    if (opening.trail) opening.trail.onDone = null;
    opening = null;
    mark = null;
    html.classList.remove('dt-intro', 'dt-unveil');
    dot.classList.remove('is-moving');
    nameRest();
  };
  const open = () => {
    if (!active() || still || !current || !anchor) return false;
    const c = { x: innerWidth / 2, y: innerHeight / 2 };
    const size = Math.min(innerWidth, innerHeight) * 0.2;
    html.classList.add('dt-intro');
    dot.classList.add('is-moving');
    textOf(current).forEach((el) => mask(el, anchor, 0));
    clearNet();
    mark = { x: c.x, y: c.y, t: 0, size, shrink: 0, trail: null, shed: 0 };
    markCv.getAnimations().forEach((an) => an.cancel());
    wake();
    opening = { timers: [], trail: null };
    name.classList.remove('is-resting');
    name.style.transform = nameAt(c.x - name.offsetWidth / 2, c.y + size * 0.66, 1); // beneath the mark, so the two never cross
    name.style.transitionDelay = '.35s';
    name.classList.add('is-on');
    const land = () => {
      opening = null;
      mark = null;
      html.classList.add('dt-unveil'); // fade in from here on, never out
      html.classList.remove('dt-intro');
      setTimeout(() => html.classList.remove('dt-unveil'), 1300);
      place(anchor);
      dot.classList.remove('is-moving'); pulse(1.8); bloom(anchor);
      if (current === lastSlide()) crown(anchor);
      if (current === slides[0]) window.deckEntryDone?.(current); // slide 1 has no separate picture build
      Promise.all(reveal(current, anchor, 60)).then(() => window.deckTurnDone?.(current));
      sprawl(levelOf(current), anchor, 0.15);
    };
    opening.timers.push(window.deckLater(() => {
      if (!opening) return;
      name.style.transitionDelay = '';
      name.classList.add('is-resting');
      const glide = name.animate([{ transform: name.style.transform }, { transform: nameCorner() }],
        { duration: 1400, easing: 'cubic-bezier(.6,0,.25,1)', fill: 'forwards' });
      glide.finished.then(() => { if (!opening || opening.trail?.done) nameRest(); }).catch(() => {});
      const pts = wander(c, anchor);
      const total = lengths(pts).at(-1);
      opening.trail = mark.trail = hypha(pts, { width: 1.05, alpha: 0.55, duration: clamp(total / 700, 0.9, 1.5), smooth: true, branches: plan(total, 0), onDone: land });
    }, 1700));
    return true;
  };

  // The node's own tuft and anything passing go; whatever else is growing settles where it is.
  const keepGround = () => {
    hyphae = hyphae.filter((h) => !h.keep && h.rest > 0);
    nodes = nodes.filter((n) => !n.keep && n.rest);
    mark = null;
    ripen();
  };
  // wipe: start the network afresh (first load, switching version); otherwise the ground stays (a resize, a jump).
  const settle = (grow, wipe) => {
    if (turning) turning.cancel();
    if (active()) adopt(); else restore();
    slides.forEach((sl) => sl.classList.remove('dt-leaving', 'dt-release', 'dt-entering'));
    slides.forEach(clearText);
    trail = { x: 0, y: 0 };
    anchor = current ? anchorOf(current) : null;
    const on = active() && !!anchor;
    dot.classList.toggle('is-on', on);
    net.classList.toggle('is-on', on);
    markCv.classList.toggle('is-on', on);
    dot.classList.remove('is-moving');
    if (wipe) clearNet(); else keepGround();
    nameRest();
    const ch = zone(chromeEls());
    chrome = ch && Object.assign(ch, { a: 1 });
    const z = on && zone(lines(current));
    zones = z ? [Object.assign(z, { a: 1 })] : [];
    draw();
    if (!on) return;
    place(anchor);
    current.dispatchEvent(new CustomEvent('dt-arrive'));
    if (current === slides[0]) window.deckEntryDone?.(current);
    if (still) window.deckTurnDone?.(current);
    if (still) { // the network at this slide's reach, at once, and the crown already formed on the last slide
      sprawl(levelOf(current), anchor);
      ripen();
      if (current === lastSlide()) crown(anchor, true);
      draw();
      return;
    }
    bloom(anchor);
    if (!grow) { hyphae.forEach((h) => { h.age = 0; h.grown = h.total; h.done = true; h.after = 5; h.glow = target(h); }); blooms = []; }
    if (current === lastSlide()) crown(anchor, !grow);
    draw();
  };

  const turn = (prev, next) => {
    if (turning) turning.cancel();
    const tweens = [], timers = [], anims = [];
    let done = false;
    const finish = () => { if (!done) { done = true; turning = null; } };
    const transition = {
      cancel() {
        if (done) return;
        done = true;
        timers.forEach(window.deckCancelLater);
        tweens.forEach((tw) => tw.stop());
        anims.forEach((a) => a.cancel());
        hyphae.forEach((h) => { h.onDone = null; });
        prev.classList.remove('dt-leaving', 'dt-release');
        next.classList.remove('dt-entering');
        clearText(prev);
        clearText(next);
        dot.classList.remove('is-moving');
        if (anchor) place(anchor);
        turning = null;
      },
    };
    turning = transition;
    window.deckNav?.signal?.addEventListener('abort', () => transition.cancel(), { once: true });
    const from = { x: (anchor ? anchor.x : 0) + drift.x, y: (anchor ? anchor.y : 0) + drift.y };
    clearText(prev);
    uncrown();
    zones.forEach((z) => { z.to = 0; z.wait = z.crown ? 0.2 : 0.45; }); // the old text's softening lifts once it is drawn in
    wake();

    // 1. Threads reach across the old text and draw it back into its node.
    prev.classList.add('dt-leaving');
    tweens.push(...gather(prev, from));
    next.classList.add('dt-entering');
    clearText(next);
    current = next;
    const to = anchorOf(next) || from;
    anchor = to;
    drift = { x: 0, y: 0 }; trail = { x: 0, y: 0 };

    // 3. Arrival: the node blooms (or, on the last slide, becomes the mark) and threads run into the new text.
    const arrive = () => {
      if (done) return;
      place(to);
      dot.classList.remove('is-moving'); anims.push(pulse(1.8)); bloom(to);
      if (next === lastSlide()) crown(to);
      const z = zone(lines(next));
      if (z) zones.push(z);
      next.dispatchEvent(new CustomEvent('dt-arrive')); // for slides that start their own picture once the node is reached
      if (next === slides[0]) window.deckEntryDone?.(next);
      const shown = reveal(next, to, 60);
      tweens.push(...shown);
      prev.classList.add('dt-release'); // the old slide may fade now; its parts stay hidden
      timers.push(window.deckLater(() => {
        prev.classList.remove('dt-leaving', 'dt-release');
        clearText(prev);
      }, 700));
      Promise.all(shown).then(() => { finish(); window.deckTurnDone?.(next); });
    };

    // 2. The network grows across to the next node, or simply re-blooms in place.
    timers.push(window.deckLater(() => {
      if (done) return;
      release();
      sprawl(levelOf(next), from);
      const far = Math.hypot(to.x - from.x, to.y - from.y) > 6;
      if (!far) { arrive(); return; }
      dot.classList.add('is-moving');
      // A step back runs back along the thread it came by, lighting it as it passes; no new thread grows.
      const way = window.deckNav?.back ? trailBack(prev, next, from, to) : null;
      const pts = way || wander(from, to);
      const total = lengths(pts).at(-1);
      hypha(pts, { width: 1.05, alpha: 0.55, duration: clamp(total / 950, 0.45, 1.05), onDone: arrive, ...(way ? { rest: 0, fade: 2.4 } : { branches: plan(total, 0) }) });
      if (!way && (window.deckNav?.dir || 0) > 0) trails.set(next, { prev, pts });
    }, 340));
  };

  // Follow the deck: every change of the active slide goes through here.
  const follow = new MutationObserver(() => {
    const next = slides.find((sl) => sl.classList.contains('on')) || null;
    if (next === current) return;
    const prev = current;
    current = next;
    endOpening();
    if (!active() || still || (window.deckNav?.rest && !window.deckNav?.back) || !prev || !next || prev.classList.contains('out')) {
      settle(true);
      if (active() && current && anchor && !still) {
        Promise.all(reveal(current, anchor, 200)).then(() => window.deckTurnDone?.(current));
        // On a back landing the ground already reaches at least this slide.
        if (!window.deckNav?.rest) sprawl(levelOf(current), anchor, 0.2);
      }
      if (current && still) window.deckTurnDone?.(current);
      return;
    }
    turn(prev, next);
  });
  slides.forEach((sl) => follow.observe(sl, { attributes: true, attributeFilter: ['class'] }));

  // Switching into F grows the node and runs the current slide's text out of it.
  let was = active();
  new MutationObserver(() => {
    const now = active();
    if (now === was) return;
    was = now;
    endOpening();
    settle(true, true);
    syncIdle();
    if (now && current && anchor && !still) { reveal(current, anchor, 250); sprawl(levelOf(current), anchor, 0.25); }
  }).observe(html, { attributes: true, attributeFilter: ['data-ver'] });

  // A resize keeps the network (see size), growing it at once over ground a new shape of screen leaves bare;
  // the node, its tuft and the text's softening find their places.
  window.deckOnResize(() => {
    const busy = turning || opening, tuft = busy ? [] : hyphae.filter((h) => h.keep);
    endOpening();
    keepGround();
    const was = anchor;
    anchor = current ? anchorOf(current) : null;
    if (size(was, anchor) && anchor && active()) { sprawl(levelOf(current), anchor); ripen(); }
    if (busy) { settle(false); return; }
    if (was && anchor) for (const h of tuft) for (const p of h.pts) { p[0] += anchor.x - was.x; p[1] += anchor.y - was.y; }
    hyphae.push(...tuft);
    if (tuft.length) wake();
    if (anchor) place(anchor);
    nameRest();
    const ch = zone(chromeEls());
    chrome = ch && Object.assign(ch, { a: 1 });
    const z = active() && current && zone(lines(current));
    zones = z ? [Object.assign(z, { a: 1 })] : [];
    if (anchor && current === lastSlide()) crown(anchor, true);
    draw();
  });
  // Keep the initial settle (and its dt-arrive event) in its original place.
  // Only the opening waits for the fonts; slide scripts below still initialize
  // after this event and watch dt-intro exactly as before.
  settle(true, true);
  const first = current;
  const startOpening = () => {
    if (window.__deckIntro?.failed) return;
    html.classList.remove('dt-font-wait');
    // A very early click can change the active slide while the fonts load.
    if (current !== first) { if (turning) turning.cancel(); settle(true, true); }
    if (!open()) {
      html.classList.remove('dt-intro'); // hidden before first paint, but there is no opening to play
      if (active() && current && anchor && !still) { reveal(current, anchor, 350); sprawl(levelOf(current), anchor, 0.3); }
    }
  };
  if (window.__deckIntro) window.__deckIntro.initialized = true;
  if (!active() || still || !document.fonts) startOpening();
  else {
    let started = false;
    const launch = () => { if (started) return; started = true; clearTimeout(ceiling); startOpening(); };
    const ceiling = setTimeout(launch, 2500);
    try {
      const fonts = document.fonts;
      const needed = [
        fonts.load('400 22px "DM Sans"', 'MYCELIAL'),
        fonts.load('400 72px "Cormorant Garamond"', 'Mycelial'),
        fonts.load('italic 400 16px "Cormorant Garamond"', '01'),
        fonts.load('italic 500 72px "Cormorant Garamond"', 'Mycelial'),
        fonts.load('400 20px "EB Garamond"', 'Mycelial')
      ];
      Promise.allSettled([...needed, fonts.ready]).then(launch);
    } catch (e) { launch(); }
  }
})();
