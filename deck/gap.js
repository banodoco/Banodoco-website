// Version F, slide 3: where today's creative AI tools sit, hard ↔ easy to use
// against limited ↔ powerful, with the powerful-and-easy corner empty.
// Arriving from slide 2, the field's own dots fly into place as the tools
// (changing colour as they land), its dust settles where the axes will run,
// and then the axes draw through it. Hovering a tool extends it into its name
// and what it is; hovering the empty corner raises a few question marks.
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

  // ---- Hovering ---------------------------------------------------------
  // Taps (and clicks) open a tool the way hovering does, and never turn the slide.
  root.addEventListener('click', (e) => {
    const hit = e.target.closest('.gp-dot, .gp-empty');
    if (!hit) return;
    e.stopPropagation();
    const open = !hit.classList.contains('is-open');
    root.querySelectorAll('.is-open').forEach((el) => el.classList.remove('is-open'));
    hit.classList.toggle('is-open', open);
    if (hit === empty && open) ask();
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
  const sky = document.createElement('canvas');
  sky.className = 'gp-flight';
  sky.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sky);
  const g = sky.getContext('2d');
  let flights = [], flying = false, began = 0, timers = [];

  const reset = () => {
    timers.forEach(clearTimeout);
    timers = [];
    flights = [];
    root.classList.remove('is-drawn', 'is-labelled');
    tools.forEach((el) => { el.classList.remove('is-in', 'is-open'); el.style.transitionDelay = ''; });
    empty.classList.remove('is-open');
  };
  const later = (ms, f) => timers.push(setTimeout(f, ms));

  // Without the field to fly from: the axes draw, then the tools come up one by one.
  const enter = () => {
    reset();
    if (still) { root.classList.add('is-drawn', 'is-labelled'); tools.forEach((el) => el.classList.add('is-in')); return; }
    later(150, () => root.classList.add('is-drawn'));
    tools.forEach((el, i) => { el.style.transitionDelay = `${0.45 + i * 0.03}s`; el.classList.add('is-in'); });
    later(900, () => root.classList.add('is-labelled'));
  };

  // From the field: its dots become the tools, its dust becomes the axes.
  const arrive = () => {
    reset();
    const snap = field && field.snapshot ? field.snapshot() : null;
    if (!snap || still) { enter(); return; }
    const dpr = Math.min(2, devicePixelRatio || 1);
    sky.width = Math.round(innerWidth * dpr);
    sky.height = Math.round(innerHeight * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sources = snap.named.slice().sort((a, b) => b.p - a.p);
    const spare = snap.dust.slice();
    const curve = (x0, y0, x1, y1) => {
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, d = Math.hypot(x1 - x0, y1 - y0);
      const bend = (rnd() < 0.5 ? -1 : 1) * d * (0.12 + rnd() * 0.25);
      return { cx: mx + ((y0 - y1) / (d || 1)) * bend, cy: my + ((x1 - x0) / (d || 1)) * bend };
    };
    tools.forEach((el, i) => {
      const r = el.querySelector('i').getBoundingClientRect();
      const x1 = r.left + r.width / 2, y1 = r.top + r.height / 2;
      const src = sources[i] || spare.pop() || { x: rnd() * innerWidth, y: rnd() * innerHeight, color: '#e0ab5e', r: 2 };
      flights.push({
        el, x0: src.x, y0: src.y, x1, y1, ...curve(src.x, src.y, x1, y1),
        r0: Math.max(1.2, src.r || 2), r1: 10, c0: rgb(src.color), c1: rgb(getComputedStyle(el).getPropertyValue('--c').trim() || '#e0ab5e'),
        delay: i * 0.025 + rnd() * 0.15, dur: 0.95 + rnd() * 0.35, dot: true,
      });
    });
    // Dust settles along the two axes.
    const box = root.querySelector('.gp-axes').getBoundingClientRect();
    const along = (k) => (k < 0.5
      ? { x: box.left + box.width * (0.04 + 0.92 * (k * 2)), y: box.top + box.height / 2 }
      : { x: box.left + box.width / 2, y: box.top + box.height * (0.04 + 0.92 * ((k - 0.5) * 2)) });
    spare.slice(0, 150).forEach((d, i, all) => {
      const p = along((i + rnd() * 0.6) / all.length);
      flights.push({
        x0: d.x, y0: d.y, x1: p.x, y1: p.y, ...curve(d.x, d.y, p.x, p.y),
        r0: 1.1, r1: 1.1, c0: rgb(d.color), c1: [224, 171, 94], delay: rnd() * 0.25, dur: 0.75 + rnd() * 0.35, dot: false,
      });
    });
    later(950, () => root.classList.add('is-drawn'));
    later(1500, () => root.classList.add('is-labelled'));
    began = performance.now();
    if (!flying) { flying = true; requestAnimationFrame(fly); }
  };

  const fly = (now) => {
    const t = (now - began) / 1000;
    g.clearRect(0, 0, innerWidth, innerHeight);
    const drawn = t > 0.95; // once the axes start drawing, the settled dust fades into them
    flights = flights.filter((f) => {
      const k = clamp((t - f.delay) / f.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      if (f.dot && k >= 1) { f.el.classList.add('is-in'); return false; }
      const u = 1 - e;
      const x = u * u * f.x0 + 2 * u * e * f.cx + e * e * f.x1;
      const y = u * u * f.y0 + 2 * u * e * f.cy + e * e * f.y1;
      const r = f.r0 + (f.r1 - f.r0) * e;
      const c = f.c0.map((v, j) => Math.round(v + (f.c1[j] - v) * e));
      let a = f.dot ? 0.9 : 0.75;
      if (!f.dot && drawn) a *= clamp(1 - (t - 0.95) / 0.7);
      if (a <= 0.01) return false;
      if (f.dot) {
        const halo = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
        halo.addColorStop(0, `rgba(${c},${(a * 0.35).toFixed(3)})`);
        halo.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = halo;
        g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill();
      }
      g.fillStyle = `rgba(${c},${a.toFixed(3)})`;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
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
      flights = flights.filter((f) => !f.dot);
      later(700, () => { if (!slide.classList.contains('on')) reset(); });
      return;
    }
    const fromField = fieldSlide && !fieldSlide.classList.contains('on') && records.some((r) => r.target === fieldSlide);
    fromField ? arrive() : enter();
  });
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (fieldSlide) watch.observe(fieldSlide, { attributes: true, attributeFilter: ['class'] });
  if (slide.classList.contains('on')) enter();
})();
