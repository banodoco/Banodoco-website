// Version F, slide 3: where today's creative AI tools sit, hard ↔ easy to use
// against limited ↔ powerful, with the powerful-and-easy corner empty.
// Each tool is a small disc with its own logo, ringed in its group's colour.
// Arriving from slide 2, the field's own dots fly into place as the tools
// (changing colour as they land, then opening into their logos), its dust
// settles where the axes will run, and then the axes draw through it.
// Hovering a tool lifts it and extends it into its name and what it is, eases
// its neighbours aside and draws a thread to the empty corner; hovering the
// empty corner raises a few question marks.
(() => {
  const root = document.querySelector('[data-gap]');
  if (!root) return;
  const slide = root.closest('.slide');
  const field = document.querySelector('[data-scatter-field]');
  const fieldSlide = field && field.closest('.slide');
  const tools = [...root.querySelectorAll('.gp-dot')];
  const empty = root.querySelector('.gp-empty');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const rnd = Math.random;
  const rgb = (hex) => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

  // ---- Idle ---------------------------------------------------------------
  // Each logo's halo breathes on its own slow clock (CSS, paused off-slide).
  tools.forEach((el) => {
    el.style.setProperty('--bp', `${(6 + rnd() * 3).toFixed(2)}s`);
    el.style.setProperty('--bd', `${(-rnd() * 9).toFixed(2)}s`);
  });

  // ---- Hovering ---------------------------------------------------------
  // The tool in focus lifts and glows (CSS); its neighbours ease a little out
  // of its way, and a faint thread draws from it to the empty corner.
  const thread = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  thread.setAttribute('class', 'gp-thread');
  thread.setAttribute('aria-hidden', 'true');
  thread.innerHTML = '<defs><linearGradient id="gp-thread-ink" gradientUnits="userSpaceOnUse"><stop offset="0"/><stop offset="1"/></linearGradient></defs><path pathLength="1"/>';
  root.insertBefore(thread, root.querySelector('.gp-ax'));
  const ink = thread.querySelector('linearGradient');
  const line = thread.querySelector('path');
  let focused = null;
  const pct = (el, k) => parseFloat(el.style[k]) / 100;
  const focus = (el) => {
    if (el === focused) return;
    focused = el;
    const w = root.clientWidth, h = root.clientHeight;
    empty.classList.remove('is-reached');
    if (!el) {
      tools.forEach((t) => { t.style.removeProperty('--nx'); t.style.removeProperty('--ny'); });
      thread.classList.remove('is-on'); // it fades where it is
      return;
    }
    const d = el.querySelector('i').offsetWidth;
    const x0 = pct(el, 'left') * w, y0 = pct(el, 'top') * h;
    // Neighbours within a third of the chart drift away from it, the nearest most (a few px).
    const reach = w * 0.3, push = d * 0.35;
    tools.forEach((t) => {
      if (t === el || still) { t.style.removeProperty('--nx'); t.style.removeProperty('--ny'); return; }
      const dx = pct(t, 'left') * w - x0, dy = pct(t, 'top') * h - y0, dist = Math.hypot(dx, dy) || 1;
      const k = Math.pow(clamp(1 - dist / reach), 1.2) * push;
      t.style.setProperty('--nx', `${((dx / dist) * k).toFixed(2)}px`);
      t.style.setProperty('--ny', `${((dy / dist) * k).toFixed(2)}px`);
    });
    // The thread: from the disc's rim into the empty ring's, bowing gently, and
    // coming round the side of the ring's label rather than through it.
    const box = root.getBoundingClientRect(), rr = empty.querySelector('i').getBoundingClientRect();
    const tag = empty.querySelector('span').getBoundingClientRect();
    const lab = { l: tag.left - box.left - 8, r: tag.right - box.left + 8, t: tag.top - box.top - 6, b: tag.bottom - box.top + 6 };
    const x2 = rr.left + rr.width / 2 - box.left, y2 = rr.top + rr.height / 2 - box.top, ring = rr.width / 2 + 5;
    const dist = Math.hypot(x0 - x2, y0 - y2) || 1;
    const ux = (x2 - x0) / dist, uy = (y2 - y0) / dist;
    const a = [x0 + ux * (d / 2 + 4), y0 + uy * (d / 2 + 4)];
    const bow = dist * 0.08 * (ux < 0 ? -1 : 1);
    const th0 = Math.atan2(y0 - y2, x0 - x2); // the side of the ring the tool lies on
    const at = (p0, p1, p2, p3, t) => { const u = 1 - t; return [0, 1].map((j) => u * u * u * p0[j] + 3 * u * u * t * p1[j] + 3 * u * t * t * p2[j] + t * t * t * p3[j]); };
    const misses = (c1, c2, b) => {
      for (let i = 1; i < 24; i++) { const [x, y] = at(a, c1, c2, b, i / 24); if (x > lab.l && x < lab.r && y > lab.t && y < lab.b) return false; }
      return true;
    };
    // From below, try arriving ever more level with the ring until the curve misses the label;
    // failing that (a tool right under it, on a small chart), swing out wide and come in level.
    let side = Math.abs(th0) < Math.PI / 2 ? 1 : -1;
    const wide = Math.max(dist * 0.45, (lab.r - lab.l) / 2 + 16);
    if (x2 + side * (ring + wide) < 0 || x2 + side * (ring + wide) > w) side = -side;
    const flat = side > 0 ? 0 : Math.PI;
    const tries = th0 > 0 ? [0, 0.35, 0.7, 1].map((k) => th0 + (flat - th0) * k) : [th0];
    let b, c1, c2;
    for (const th of tries) {
      const ex = Math.cos(th), ey = Math.sin(th);
      b = [x2 + ex * ring, y2 + ey * ring];
      c2 = [b[0] + ex * dist * 0.45, b[1] + ey * dist * 0.45];
      c1 = [a[0] + (c2[0] - a[0]) * 0.35 + uy * bow, a[1] + (c2[1] - a[1]) * 0.35 - ux * bow];
      if (misses(c1, c2, b)) break;
      if (th !== tries[tries.length - 1]) continue;
      b = [x2 + side * ring, y2];
      c2 = [b[0] + side * wide, y2];
      c1 = [c2[0], a[1]];
    }
    const f = (p) => p.map((v) => v.toFixed(1)).join(',');
    thread.setAttribute('viewBox', `0 0 ${w} ${h}`);
    line.setAttribute('d', `M${f(a)}C${f(c1)} ${f(c2)} ${f(b)}`);
    ink.setAttribute('x1', a[0]); ink.setAttribute('y1', a[1]); ink.setAttribute('x2', b[0]); ink.setAttribute('y2', b[1]);
    ink.firstChild.setAttribute('stop-color', getComputedStyle(el).getPropertyValue('--c').trim() || '#e0ab5e');
    thread.style.setProperty('--draw', `${(0.45 + dist / w * 0.5).toFixed(2)}s`);
    thread.classList.remove('is-drawn');
    void thread.getBoundingClientRect(); // restart the draw from this tool
    thread.classList.add('is-on', 'is-drawn');
  };
  line.addEventListener('transitionend', () => { if (thread.classList.contains('is-on')) empty.classList.add('is-reached'); });
  // Mouse hover and keyboard focus; touch goes through the tap below instead.
  tools.forEach((el) => {
    el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') focus(el); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') focus(root.querySelector('.gp-dot.is-open')); });
    el.addEventListener('focus', () => focus(el));
    el.addEventListener('blur', () => focus(root.querySelector('.gp-dot.is-open')));
  });

  // Taps (and clicks) open a tool the way hovering does, and never turn the slide.
  root.addEventListener('click', (e) => {
    let hit = e.target.closest('.gp-dot, .gp-empty');
    if (!hit) return;
    if (hit.matches('.gp-dot')) {
      let nearest = null, nearestDistance = Infinity;
      for (const dot of tools) {
        const box = dot.getBoundingClientRect();
        const icon = dot.querySelector('i').getBoundingClientRect();
        if (e.clientX < box.left - 12 || e.clientX > box.right + 12 || e.clientY < box.top - 12 || e.clientY > box.bottom + 12) continue;
        const distance = Math.hypot(e.clientX - (icon.left + icon.width / 2), e.clientY - (icon.top + icon.height / 2));
        if (distance < nearestDistance) { nearest = dot; nearestDistance = distance; }
      }
      if (nearest) hit = nearest;
    }
    e.stopPropagation();
    const open = !hit.classList.contains('is-open');
    root.querySelectorAll('.is-open').forEach((el) => el.classList.remove('is-open'));
    hit.classList.toggle('is-open', open);
    if (hit === empty && open) ask();
    if (hit !== empty) focus(open ? hit : null);
  });
  // The empty corner: question marks drift up while you look at it.
  let asking = 0;
  const ask = () => {
    const q = document.createElement('b');
    q.className = 'gp-q';
    q.textContent = '?';
    q.style.setProperty('--dx', `${Math.round((rnd() - 0.5) * 52)}px`);
    q.addEventListener('animationend', () => q.remove());
    empty.appendChild(q);
  };
  empty.addEventListener('pointerenter', () => { if (still) return; ask(); clearInterval(asking); asking = setInterval(ask, 420); });
  empty.addEventListener('pointerleave', () => clearInterval(asking));

  // ---- Arriving -----------------------------------------------------------
  // Every tool arrives as an orb that eases up to the disc's size in its
  // group's colour, lands, and then opens into its logo: the orb's fill and
  // glow melt away while the logo inside resolves (--m runs 0 → 1). From the
  // field the orbs are its own dots, flying in; otherwise they bloom in place.
  const sky = document.createElement('canvas');
  sky.className = 'gp-flight';
  sky.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sky);
  const g = sky.getContext('2d');
  let flights = [], flying = false, began = 0, timers = [];
  const MORPH = 0.5; // seconds from landing to the settled logo

  const reset = () => {
    timers.forEach(clearTimeout);
    timers = [];
    flights = [];
    root.classList.remove('is-drawn', 'is-labelled');
    tools.forEach((el) => { el.classList.remove('is-in', 'is-open'); el.style.removeProperty('--m'); });
    empty.classList.remove('is-open');
    focus(null);
  };
  const later = (ms, f) => timers.push(setTimeout(f, ms));
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const width = Math.round(innerWidth * dpr), height = Math.round(innerHeight * dpr);
    if (sky.width !== width || sky.height !== height) {
      sky.width = width; sky.height = height;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  // Where each disc will be once the slide has finished rising into place.
  const lift = () => { const m = getComputedStyle(slide).transform; return m && m !== 'none' ? new DOMMatrixReadOnly(m).f : 0; };
  const disc = (el, dy) => {
    const r = el.querySelector('i').getBoundingClientRect();
    return { x1: r.left + r.width / 2, y1: r.top + r.height / 2 - dy, r1: r.width / 2 + 1.5 }; // the orb covers the ring too
  };
  const tint = (el) => rgb(getComputedStyle(el).getPropertyValue('--c').trim() || '#e0ab5e');
  const fire = () => { began = performance.now(); if (!flying) { flying = true; requestAnimationFrame(fly); } };

  // Without the field to fly from: the axes draw, then the tools bloom one by one.
  const enter = (lead = 0) => {
    reset();
    size();
    if (still || window.deckNav?.rest) { root.classList.add('is-drawn', 'is-labelled'); tools.forEach((el) => el.classList.add('is-in')); return; }
    const dy = lift();
    tools.forEach((el, i) => {
      const p = disc(el, dy);
      flights.push({ el, ...p, x0: p.x1, y0: p.y1, cx: p.x1, cy: p.y1, r0: 1, c0: tint(el), c1: tint(el),
        delay: lead + 0.45 + i * 0.03, dur: 0.42, dot: true });
    });
    later(150, () => root.classList.add('is-drawn'));
    later(900 + lead * 1000, () => root.classList.add('is-labelled'));
    fire();
  };

  // From the field: its dots become the tools, its dust becomes the axes.
  const arrive = () => {
    reset();
    const snap = field && field.snapshot ? field.snapshot() : null;
    if (!snap || still) { enter(); return; }
    size();
    const dy = lift();
    const sources = snap.named.slice().sort((a, b) => b.p - a.p);
    const spare = snap.dust.slice();
    const curve = (x0, y0, x1, y1) => {
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, d = Math.hypot(x1 - x0, y1 - y0);
      const bend = (rnd() < 0.5 ? -1 : 1) * d * (0.12 + rnd() * 0.25);
      return { cx: mx + ((y0 - y1) / (d || 1)) * bend, cy: my + ((x1 - x0) / (d || 1)) * bend };
    };
    tools.forEach((el, i) => {
      const p = disc(el, dy);
      const src = sources[i] || spare.pop() || { x: rnd() * innerWidth, y: rnd() * innerHeight, color: '#e0ab5e', r: 2 };
      flights.push({
        el, x0: src.x, y0: src.y, ...p, ...curve(src.x, src.y, p.x1, p.y1),
        r0: Math.max(1.2, src.r || 2), c0: rgb(src.color), c1: tint(el),
        delay: i * 0.025 + rnd() * 0.15, dur: 0.95 + rnd() * 0.35, dot: true,
      });
    });
    // Dust settles along the two axes.
    const box = root.querySelector('.gp-axes').getBoundingClientRect();
    const along = (k) => (k < 0.5
      ? { x: box.left + box.width * (0.04 + 0.92 * (k * 2)), y: box.top - dy + box.height / 2 }
      : { x: box.left + box.width / 2, y: box.top - dy + box.height * (0.04 + 0.92 * ((k - 0.5) * 2)) });
    spare.slice(0, 150).forEach((d, i, all) => {
      const p = along((i + rnd() * 0.6) / all.length);
      flights.push({
        x0: d.x, y0: d.y, x1: p.x, y1: p.y, ...curve(d.x, d.y, p.x, p.y),
        r0: 1.1, r1: 1.1, c0: rgb(d.color), c1: [224, 171, 94], delay: rnd() * 0.25, dur: 0.75 + rnd() * 0.35, dot: false,
      });
    });
    later(950, () => root.classList.add('is-drawn'));
    later(1500, () => root.classList.add('is-labelled'));
    fire();
  };

  const smooth = (k) => k * k * (3 - 2 * k);
  const orb = (x, y, r, c, a, glow) => {
    if (glow > 0.004) {
      const halo = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
      halo.addColorStop(0, `rgba(${c},${glow.toFixed(3)})`);
      halo.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = halo;
      g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill();
    }
    if (a > 0.004) { g.fillStyle = `rgba(${c},${a.toFixed(3)})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  };
  const fly = (now) => {
    const t = (now - began) / 1000;
    g.clearRect(0, 0, innerWidth, innerHeight);
    const drawn = t > 0.95; // once the axes start drawing, the settled dust fades into them
    flights = flights.filter((f) => {
      const k = clamp((t - f.delay) / f.dur);
      if (k <= 0) return true;
      if (f.dot && k >= 1) {
        // Landed: the disc is there beneath the orb; the orb melts into it as the logo resolves.
        if (!f.el.classList.contains('is-in')) f.el.classList.add('is-in');
        const m = clamp((t - f.delay - f.dur) / MORPH);
        f.el.style.setProperty('--m', smooth(m).toFixed(3));
        if (m >= 1) { f.el.style.removeProperty('--m'); return false; }
        const fade = 1 - smooth(clamp(m / 0.8));
        orb(f.x1, f.y1, f.r1, f.c1, 0.92 * fade, 0.35 * (1 - smooth(m)));
        return true;
      }
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const u = 1 - e;
      const x = u * u * f.x0 + 2 * u * e * f.cx + e * e * f.x1;
      const y = u * u * f.y0 + 2 * u * e * f.cy + e * e * f.y1;
      const w = smooth(clamp((k - 0.35) / 0.65)); // size and colour come in as it lands
      const r = f.r0 + (f.r1 - f.r0) * (f.dot ? w : e);
      const c = f.c0.map((v, j) => Math.round(v + (f.c1[j] - v) * (f.dot ? w : e)));
      let a = f.dot ? 0.92 * Math.min(1, k * 6) : 0.75;
      if (!f.dot && drawn) a *= clamp(1 - (t - 0.95) / 0.7);
      if (!f.dot && a <= 0.01) return false;
      orb(x, y, r, c, a, f.dot ? a * 0.35 : 0);
      return true;
    });
    if (flights.length) requestAnimationFrame(fly);
    else { g.clearRect(0, 0, innerWidth, innerHeight); flying = false; }
  };

  // Act only when the slide itself comes or goes, not on every class change.
  let wasOn = slide.classList.contains('on');
  const watch = new MutationObserver((records) => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    if (!on) {
      clearInterval(asking);
      focus(null);
      flights = flights.filter((f) => !f.dot);
      later(700, () => { if (!slide.classList.contains('on')) reset(); });
      return;
    }
    const fromField = fieldSlide && !fieldSlide.classList.contains('on') && records.some((r) => r.target === fieldSlide);
    if (window.deckNav?.rest) enter();
    else fromField ? arrive() : begin();
  });
  // On a first load the Mycelial mark plays first (dot-transitions.js): the tools bloom once it has landed.
  const html = document.documentElement;
  let waiting = null;
  const begin = () => {
    if (waiting) { waiting.disconnect(); waiting = null; }
    if (!html.classList.contains('dt-intro')) { enter(); return; }
    reset();
    waiting = new MutationObserver(() => {
      if (html.classList.contains('dt-intro')) return;
      waiting.disconnect(); waiting = null;
      if (slide.classList.contains('on')) enter(0.4); // as the chart fades up
    });
    waiting.observe(html, { attributes: true, attributeFilter: ['class'] });
  };
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (fieldSlide) watch.observe(fieldSlide, { attributes: true, attributeFilter: ['class'] });
  if (slide.classList.contains('on')) begin();
  window.deckOnResize(() => {
    size();
    if (!slide.classList.contains('on')) return;
    if (!flying) return;
    // Flight endpoints were measured in the old viewport. Finish at the new
    // chart instead of leaving old pixel coordinates suspended over it.
    timers.forEach(clearTimeout); timers = [];
    flights = []; flying = false;
    g.clearRect(0, 0, innerWidth, innerHeight);
    root.classList.add('is-drawn', 'is-labelled');
    tools.forEach((el) => { el.classList.add('is-in'); el.style.removeProperty('--m'); });
  });
})();
