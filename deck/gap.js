// Version F, slide 3: where today's creative AI tools sit, hard ↔ easy to use
// against limited ↔ powerful, with the powerful-and-easy corner empty.
// Each tool is a small disc with its own logo, ringed in its group's colour.
// Arriving from slide 2, the field's own dots fly into place as the tools
// (changing colour as they land, then opening into their logos), its dust
// settles where the axes will run, and then the axes draw through it.
// Hovering a tool lifts it and extends it into its name and what it is, and
// eases its neighbours aside; hovering the empty corner raises a few question
// marks.
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
  // of its way.
  let focused = null;
  const pct = (el, k) => parseFloat(el.style[k]) / 100;
  const focus = (el) => {
    if (el === focused) return;
    focused = el;
    const w = root.clientWidth, h = root.clientHeight;
    if (!el) {
      tools.forEach((t) => { t.style.removeProperty('--nx'); t.style.removeProperty('--ny'); });
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
  };
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
  let flights = [], flying = false, timers = [];
  const MORPH = 0.5; // seconds from landing to the settled logo

  const reset = () => {
    timers.forEach(window.deckCancelLater);
    timers = [];
    flights = [];
    root.classList.remove('is-drawn', 'is-labelled');
    tools.forEach((el) => { el.classList.remove('is-in', 'is-open'); el.style.removeProperty('--m'); });
    empty.classList.remove('is-open');
    focus(null);
  };
  const later = (ms, f) => timers.push(window.deckLater(f, ms));
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
  let flightTime = 0, flightLast = 0;
  const fire = () => { flightTime = 0; flightLast = 0; if (!flying) { flying = true; requestAnimationFrame(fly); } };

  // Without the field to fly from: the axes draw, then the tools bloom one by one.
  const enter = (lead = 0) => {
    reset();
    size();
    if (still || window.deckNav?.rest) { root.classList.add('is-drawn', 'is-labelled'); tools.forEach((el) => el.classList.add('is-in')); window.deckEntryDone?.(slide); return; }
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
  // Where a flight is a fraction k of the way: its curve, eased in and out; a tool's orb takes its size and colour as it lands.
  const along = (f, k) => {
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const u = 1 - e;
    const x = u * u * f.x0 + 2 * u * e * f.cx + e * e * f.x1;
    const y = u * u * f.y0 + 2 * u * e * f.cy + e * e * f.y1;
    const w = smooth(clamp((k - 0.35) / 0.65)); // size and colour come in as it lands
    const r = f.r0 + (f.r1 - f.r0) * (f.dot ? w : e);
    const c = f.c0.map((v, j) => Math.round(v + (f.c1[j] - v) * (f.dot ? w : e)));
    return { x, y, r, c };
  };
  const fly = (now) => {
    flightTime += Math.min(0.05, (now - (flightLast || now)) / 1000) * (window.deckPace?.() || 1);
    flightLast = now;
    const t = flightTime;
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
      const { x, y, r, c } = along(f, k);
      let a = f.dot ? 0.92 * Math.min(1, k * 6) : 0.75;
      if (!f.dot && drawn) a *= clamp(1 - (t - 0.95) / 0.7);
      if (!f.dot && a <= 0.01) return false;
      orb(x, y, r, c, a, f.dot ? a * 0.35 : 0);
      return true;
    });
    if (flights.length) requestAnimationFrame(fly);
    else { g.clearRect(0, 0, innerWidth, innerHeight); flying = false; window.deckEntryDone?.(slide); }
  };

  // ---- Going back ----------------------------------------------------------
  // A step back to slide 2: the arrival from the field, played backwards. Each logo melts back into its orb, which
  // flies back along a curve to one of the field's dots, shrinking and taking on its colour as it goes; the dust
  // lifts off the axes as they fade and flies back out into the field, which waits, still, for its dots.
  const pace = () => window.deckPace?.() || 1;
  let backs = [], backT = 0, backLast = 0, backRaf = 0;
  const unfly = (now) => {
    backRaf = 0;
    const dt = Math.min(0.05, (now - (backLast || now)) / 1000);
    backLast = now;
    backT += dt * pace();
    g.clearRect(0, 0, innerWidth, innerHeight);
    backs = backs.filter((f) => {
      const t = f.end - backT; // the arrival's own clock, running backwards
      if (f.dot) {
        const m = clamp((t - f.delay - f.dur) / MORPH);
        if (m > 0) { // still landed: the logo resolving back into the orb
          f.el.style.setProperty('--m', smooth(m).toFixed(3));
          orb(f.x1, f.y1, f.r1, f.c1, 0.92 * (1 - smooth(clamp(m / 0.8))), 0.35 * (1 - smooth(m)));
          return true;
        }
      }
      const k = clamp((t - f.delay) / f.dur);
      if (k <= 0) return false; // back where it came from
      const { x, y, r, c } = along(f, k);
      let a = f.dot ? 0.92 * Math.min(1, k * 6) : 0.75 * clamp(1 - (t - 0.95) / 0.7) * smooth(clamp(k * 5));
      orb(x, y, r, c, a, f.dot ? a * 0.35 : 0);
      return true;
    });
    if (backs.length) backRaf = requestAnimationFrame(unfly);
    else endDepart();
  };
  const endDepart = () => {
    if (backRaf) cancelAnimationFrame(backRaf);
    backRaf = 0; backs = [];
    g.clearRect(0, 0, innerWidth, innerHeight);
    if (!flying) { sky.width = 0; sky.height = 0; } // the flight layer is only needed in flight (size() brings it back)
    if (!slide.classList.contains('on')) reset();
    if (fieldSlide) window.deckRewound?.(fieldSlide);
  };
  const depart = () => {
    const signal = window.deckNav?.signal;
    window.deckRewinding?.(fieldSlide);
    signal?.addEventListener('abort', endDepart, { once: true });
    field.hold?.(2.2);
    // Once the field has drawn a frame, its dots are where they will be met.
    requestAnimationFrame(() => {
      if (signal?.aborted || slide.classList.contains('on') || !fieldSlide.classList.contains('on')) return;
      const snap = field.snapshot();
      size();
      const targets = snap.named.slice().sort((a, b) => b.p - a.p), spare = snap.dust.slice();
      const curve = (x0, y0, x1, y1) => {
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, d = Math.hypot(x1 - x0, y1 - y0);
        const bend = (rnd() < 0.5 ? -1 : 1) * d * (0.12 + rnd() * 0.25);
        return { cx: mx + ((y0 - y1) / (d || 1)) * bend, cy: my + ((x1 - x0) / (d || 1)) * bend };
      };
      backs = [];
      tools.forEach((el, i) => {
        const p = disc(el, 0);
        const src = targets[i] || spare.pop() || { x: rnd() * innerWidth, y: innerHeight * (0.6 + 0.3 * rnd()), color: '#e0ab5e', r: 2 };
        const f = { el, x0: src.x, y0: src.y, ...p, ...curve(src.x, src.y, p.x1, p.y1), r0: Math.max(1.2, src.r || 2), c0: rgb(src.color), c1: tint(el), delay: 0, dur: 0.95 + rnd() * 0.35, dot: true };
        f.end = f.dur + MORPH; // every logo starts turning back at once, as the chart fades
        backs.push(f);
      });
      const box = root.querySelector('.gp-axes').getBoundingClientRect();
      const along_ = (k) => (k < 0.5
        ? { x: box.left + box.width * (0.04 + 0.92 * (k * 2)), y: box.top + box.height / 2 }
        : { x: box.left + box.width / 2, y: box.top + box.height * (0.04 + 0.92 * ((k - 0.5) * 2)) });
      spare.slice(0, 150).forEach((d, i, all) => {
        const p = along_((i + rnd() * 0.6) / all.length);
        backs.push({ x0: d.x, y0: d.y, x1: p.x, y1: p.y, ...curve(d.x, d.y, p.x, p.y), r0: 1.1, r1: 1.1, c0: rgb(d.color), c1: [224, 171, 94],
          delay: rnd() * 0.25, dur: 0.75 + rnd() * 0.35, dot: false, end: 1.65 });
      });
      backT = 0; backLast = 0;
      backRaf = requestAnimationFrame(unfly);
    });
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
      const toField = fieldSlide && fieldSlide.classList.contains('on') && field.snapshot && window.deckNav?.back && !still && tools.every((el) => el.classList.contains('is-in'));
      if (toField) { timers.forEach(window.deckCancelLater); timers = []; flights = []; depart(); return; }
      flights = flights.filter((f) => !f.dot);
      later(700, () => { if (!slide.classList.contains('on')) reset(); });
      return;
    }
    if (backs.length || backRaf) endDepart();
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
    timers.forEach(window.deckCancelLater); timers = [];
    flights = []; flying = false;
    g.clearRect(0, 0, innerWidth, innerHeight);
    root.classList.add('is-drawn', 'is-labelled');
    tools.forEach((el) => { el.classList.add('is-in'); el.style.removeProperty('--m'); });
  });
})();
