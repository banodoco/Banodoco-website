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
  document.body.append(net, dot);
  const g = net.getContext('2d');

  // ---- The network ---------------------------------------------------------
  // A hypha is a polyline that grows along its length. Fresh threads glow,
  // then settle to a faint trace; kept ones (a node's tuft) stay faintly,
  // the rest fade away.
  const THREAD = '240,200,119', NODE = '255,217,145';
  let hyphae = [], blooms = [], nodes = [], netOn = false, netLast = 0, dpr = 1;

  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    net.width = Math.round(innerWidth * dpr);
    net.height = Math.round(innerHeight * dpr);
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
    const h = {
      pts, len, total: len[len.length - 1], grown: 0, age: -(o.delay || 0), after: 0, done: false,
      width: o.width || 0.8, alpha: o.alpha || 0.45, speed: o.speed || 300, duration: o.duration || 0,
      keep: !!o.keep, rest: o.rest ?? 0.38, glow: 1, smooth: !!o.smooth, fade: o.fade || 4.5, branches: o.branches || [], depth: o.depth || 0, onDone: o.onDone || null,
    };
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
    hyphae.forEach((h) => { if (h.keep) { h.keep = false; h.rest = h.rest || 0.38; } });
    nodes.forEach((n) => { if (n.keep) { n.keep = false; n.rest = n.rest || 0.4; } });
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

  const step = (dt) => {
    for (const h of hyphae) {
      h.age += dt;
      if (h.age < 0) continue;
      if (!h.done) {
        const k = clamp(h.age / (h.duration || 1));
        h.grown = h.duration
          ? h.total * (h.smooth ? 0.5 - 0.5 * Math.cos(Math.PI * k) : (1 - Math.pow(1 - k, 2.2)) * clamp(k * 3))
          : Math.min(h.total, h.grown + h.speed * dt);
        for (const b of h.branches) {
          if (b.done || h.grown < b.at) continue;
          b.done = true;
          const p = pointAt(h, b.at);
          nodes.push({ x: p.x, y: p.y, age: 0, keep: h.keep, rest: h.rest });
          const pts = curl(p.x, p.y, p.ang + b.side * (0.5 + rnd() * 0.6), b.length);
          hypha(pts, { width: h.width * 0.7, alpha: h.alpha * 0.8, speed: 140 + rnd() * 90, keep: h.keep, rest: h.rest, depth: h.depth + 1,
            branches: h.depth < 1 && rnd() < 0.55 ? plan(lengths(pts).at(-1), h.depth + 1) : [] });
        }
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
    // Resting threads stay as a trace; passing ones (through the text) go entirely.
    hyphae = hyphae.filter((h) => h.keep || h.rest || h.age < 0 || !h.done || h.after < h.fade);
    nodes = nodes.filter((n) => n.keep || n.rest || n.age < 5);
    blooms = blooms.filter((b) => b.age < 0.9);
  };

  const drawMark = (m) => {
    const k = m.t;
    const S = (m.size * (1 - 0.94 * m.shrink)) / 54; // px per unit; the ring spans 54 units
    const at = (x, y) => [m.x + (x - 32) * S, m.y + (y - 32) * S];
    const fade = 1 - 0.55 * m.shrink;
    const halo = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, 36 * S);
    halo.addColorStop(0, `rgba(${NODE},${(0.1 * clamp(k / 1) * fade).toFixed(3)})`);
    halo.addColorStop(1, `rgba(${NODE},0)`);
    g.fillStyle = halo;
    g.beginPath(); g.arc(m.x, m.y, 36 * S, 0, 7); g.fill();
    g.strokeStyle = `rgba(${THREAD},${(0.8 * fade).toFixed(3)})`;
    g.lineWidth = Math.max(0.6, S * 0.66);
    g.beginPath(); g.arc(m.x, m.y, 27 * S, -Math.PI / 2, -Math.PI / 2 + clamp(k / 0.8) * Math.PI * 2); g.stroke();
    g.lineWidth = Math.max(0.5, S * 0.5);
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
      const [px, py] = at(x, y), rr = Math.max(1, r * S * 0.8);
      const glow = g.createRadialGradient(px, py, 0, px, py, rr * 3);
      glow.addColorStop(0, `rgba(${NODE},${(0.5 * a).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${NODE},0)`);
      g.fillStyle = glow;
      g.beginPath(); g.arc(px, py, rr * 3, 0, 7); g.fill();
      g.fillStyle = `rgba(255,236,190,${a.toFixed(3)})`;
      g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill();
    });
  };

  const draw = () => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const h of hyphae) {
      const glow = h.glow;
      if (glow <= 0.005 || h.grown <= 0) continue;
      const tip = pointAt(h, h.grown);
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
        g.strokeStyle = `rgba(${NODE},${Math.min(1, h.alpha * 1.7).toFixed(3)})`;
        g.lineWidth = h.width + 0.5;
        g.stroke();
        const r = h.depth ? 4 : 9;
        const halo = g.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, r);
        halo.addColorStop(0, `rgba(${NODE},${h.depth ? 0.45 : 0.75})`);
        halo.addColorStop(1, `rgba(${NODE},0)`);
        g.fillStyle = halo;
        g.beginPath(); g.arc(tip.x, tip.y, r, 0, 7); g.fill();
      }
    }
    for (const n of nodes) {
      const a = (n.keep ? 0.35 + 0.35 * Math.exp(-n.age / 0.8)
        : n.rest ? n.rest * 0.6 + 0.4 * Math.exp(-n.age / 1.2) : 0.7 * clamp(1 - n.age / 5)) * clamp(n.age / 0.15);
      g.fillStyle = `rgba(${NODE},${a.toFixed(3)})`;
      g.beginPath(); g.arc(n.x, n.y, 1.25, 0, 7); g.fill();
    }
    for (const b of blooms) {
      const e = clamp(b.age / 0.9);
      const r = 5 + 30 * (1 - Math.pow(1 - e, 3));
      const halo = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      halo.addColorStop(0, `rgba(${NODE},${(0.55 * (1 - e)).toFixed(3)})`);
      halo.addColorStop(1, `rgba(${NODE},0)`);
      g.fillStyle = halo;
      g.beginPath(); g.arc(b.x, b.y, r, 0, 7); g.fill();
    }
    if (mark) drawMark(mark);
  };

  // Runs only while something is growing, glowing or fading.
  const moving = () => (mark && (mark.trail || mark.folding !== undefined || mark.t < 1.6)) || blooms.length || nodes.some((n) => (n.keep || n.rest ? n.age < 3 : true))
    || hyphae.some((h) => h.age < 0 || !h.done || Math.abs(h.glow - target(h)) > 0.004 || !(h.keep || h.rest || h.after >= h.fade));
  const tick = (now) => {
    const dt = Math.min(0.05, (now - (netLast || now)) / 1000);
    netLast = now;
    step(dt);
    draw();
    if (moving()) requestAnimationFrame(tick);
    else { netOn = false; netLast = 0; }
  };
  function wake() { if (!netOn) { netOn = true; netLast = 0; requestAnimationFrame(tick); } }
  const clearNet = () => { hyphae = []; nodes = []; blooms = []; mark = null; draw(); };

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
    const p = new Promise((r) => { resolve = r; });
    let t0 = null;
    const tick = (now) => {
      if (stopped) return;
      if (t0 === null) t0 = now + delay;
      const k = clamp((now - t0) / duration);
      if (now >= t0) step(ease(k));
      if (k < 1) raf = requestAnimationFrame(tick); else resolve(true);
    };
    raf = requestAnimationFrame(tick);
    p.stop = () => { stopped = true; cancelAnimationFrame(raf); resolve(false); };
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
  let drift = { x: 0, y: 0 }, trail = { x: 0, y: 0 }, t = 0, last = 0;
  const clearText = (s) => s && textOf(s).forEach((el) => { el.style.transform = ''; unmask(el); });

  // Idle: the node wanders a pixel or two; the text follows a beat behind.
  const idle = (now) => {
    requestAnimationFrame(idle);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!active() || turning || !anchor || still) return;
    t += dt;
    drift = { x: 1.8 * Math.sin(t * 0.45), y: 1.3 * Math.sin(t * 0.31 + 1) };
    const k = 1 - Math.exp(-1.6 * dt);
    trail.x += (drift.x * 0.7 - trail.x) * k;
    trail.y += (drift.y * 0.7 - trail.y) * k;
    place({ x: anchor.x + drift.x, y: anchor.y + drift.y });
    textOf(current).forEach((el) => { el.style.transform = `translate(${trail.x.toFixed(2)}px, ${trail.y.toFixed(2)}px)`; });
  };
  requestAnimationFrame(idle);

  const pulse = (k) => core.animate([{ transform: 'scale(1)' }, { transform: `scale(${k})` }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });

  // ---- The name, the opening and the ending ----------------------------------
  // The site's wordmark. On first load it sits beneath the mark, then settles
  // small into the bottom-left corner, like the site's own signature.
  const name = document.createElement('div');
  name.className = 'dt-name';
  name.textContent = 'Mycelial';
  name.setAttribute('aria-hidden', 'true');
  document.body.appendChild(name);
  const nameAt = (x, y, k) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%) scale(${k})`;
  const nameCorner = () => nameAt(Math.max(16, innerWidth * 0.024), innerHeight - 62, 0.58);
  const nameRest = () => {
    name.getAnimations().forEach((a) => a.cancel());
    name.style.transform = nameCorner();
    name.classList.add('is-resting');
    name.classList.toggle('is-on', active());
  };

  // The last slide: the node grows back into the mark, and folds away again on leaving.
  const lastSlide = () => slides.filter((sl) => (sl.dataset.v || '').split(' ').includes(VER)).at(-1);
  const crown = (at, now) => {
    mark = { x: at.x, y: at.y - 36, t: now ? 2 : 0, size: 68, shrink: 0, trail: null, shed: 0, crown: true };
    dot.classList.add('is-moving');
    wake();
  };
  const uncrown = () => { if (mark && mark.crown) { mark.folding = 0; wake(); } };

  // First load: the mark draws itself in the middle of the screen over its
  // name, then rides a growing thread out to the slide's node, shrinking and
  // shedding its nodes into the network; the name settles into the corner;
  // where the mark lands the text is revealed and the slide fades in.
  let opening = null;
  const endOpening = () => {
    if (!opening) return;
    opening.timers.forEach(clearTimeout);
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
      if (current === lastSlide()) crown(anchor);
      else { dot.classList.remove('is-moving'); pulse(1.8); bloom(anchor); }
      reveal(current, anchor, 60);
    };
    opening.timers.push(setTimeout(() => {
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

  const settle = (grow) => {
    if (turning) turning.cancel();
    if (active()) adopt(); else restore();
    slides.forEach((sl) => sl.classList.remove('dt-leaving', 'dt-release', 'dt-entering'));
    slides.forEach(clearText);
    trail = { x: 0, y: 0 };
    anchor = current ? anchorOf(current) : null;
    const on = active() && !!anchor;
    dot.classList.toggle('is-on', on);
    net.classList.toggle('is-on', on);
    dot.classList.remove('is-moving');
    clearNet();
    nameRest();
    if (!on) return;
    place(anchor);
    if (still) return;
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
    turning = {
      cancel() {
        if (done) return;
        done = true;
        timers.forEach(clearTimeout);
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
    const from = { x: (anchor ? anchor.x : 0) + drift.x, y: (anchor ? anchor.y : 0) + drift.y };
    clearText(prev);
    uncrown();

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
      if (next === lastSlide()) { blooms.push({ x: to.x, y: to.y - 36, age: 0 }); crown(to); }
      else { dot.classList.remove('is-moving'); anims.push(pulse(1.8)); bloom(to); }
      const shown = reveal(next, to, 60);
      tweens.push(...shown);
      prev.classList.add('dt-release'); // the old slide may fade now; its parts stay hidden
      timers.push(setTimeout(() => {
        prev.classList.remove('dt-leaving', 'dt-release');
        clearText(prev);
      }, 700));
      Promise.all(shown).then(finish);
    };

    // 2. The network grows across to the next node, or simply re-blooms in place.
    timers.push(setTimeout(() => {
      if (done) return;
      release();
      const far = Math.hypot(to.x - from.x, to.y - from.y) > 6;
      if (!far) { arrive(); return; }
      dot.classList.add('is-moving');
      const pts = wander(from, to);
      const total = lengths(pts).at(-1);
      hypha(pts, { width: 1.05, alpha: 0.55, duration: clamp(total / 950, 0.45, 1.05), branches: plan(total, 0), onDone: arrive });
    }, 340));
  };

  // Follow the deck: every change of the active slide goes through here.
  const follow = new MutationObserver(() => {
    const next = slides.find((sl) => sl.classList.contains('on')) || null;
    if (next === current) return;
    const prev = current;
    current = next;
    endOpening();
    if (!active() || still || !prev || !next || prev.classList.contains('out')) { settle(true); if (active() && current && anchor && !still) reveal(current, anchor, 200); return; }
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
    settle(true);
    if (now && current && anchor && !still) reveal(current, anchor, 250);
  }).observe(html, { attributes: true, attributeFilter: ['data-ver'] });

  addEventListener('resize', () => { size(); if (!turning && !opening) settle(false); });
  settle(true);
  if (!open()) {
    html.classList.remove('dt-intro'); // hidden before first paint, but there is no opening to play
    if (active() && current && anchor && !still) reveal(current, anchor, 350);
  }
})();
