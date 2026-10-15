// Version F, slide 5: Astrid herself. Beneath the text, the homepage's two
// demos side by side, as on slide 4 (the agent left, the interface right):
// the scripted conversation and the video editor, rebuilt in the homepage's
// dusk palette with its own example (three light studies arranged into a
// 28-second sequence). Between them sits the pixel mink, drawn crisp at a
// whole-number scale from the homepage's own poses. Once the slide settles
// the demo plays: the request types into the composer and sends, Astrid
// answers, the editor rearranges the clips and plays the sequence. Hovering
// the mink flashes her eye; clicking her makes her turn to face you, eyes lit,
// and turn back, as the homepage avatar does.
(() => {
  const root = document.querySelector('[data-astrid-demo]');
  const M = window.AstridMink;
  if (!root || !M) return;
  const slide = root.closest('.slide');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const easeIO = (q) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);

  const msgs = root.querySelector('.as-msgs');
  const typed = root.querySelector('.as-typed');
  const videos = [...root.querySelectorAll('.as-screen video')];
  const clips = [...root.querySelectorAll('.as-clip')];
  const ruler = root.querySelector('.as-ruler');
  const playhead = root.querySelector('.as-playhead');
  const timeEl = root.querySelector('.as-time');
  const mid = root.querySelector('.as-mid');
  const minkCv = root.querySelector('.as-mink');
  const mg = minkCv.getContext('2d');

  // The homepage's example (content/light-study-v1), verbatim.
  const USER = 'Arrange these three light studies into a quiet 28-second sequence. Keep the middle scene longer and let the final frame settle.';
  const ASTRID = 'The example uses an 8-second opening, a 12-second middle scene and an 8-second finish. The last frame holds for two seconds.';
  const BEFORE = [[0, 8], [8, 8], [16, 8]], AFTER = [[0, 8], [8, 12], [20, 8]]; // [at, length] in seconds
  const SPAN = 30; // seconds across the timeline

  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  ruler.innerHTML = Array.from({ length: 7 }, (_, i) => `<span style="left:${((i * 5) / SPAN) * 100}%">${fmt(i * 5)}</span>`).join('');
  const layClips = (q) => { // q: 0 = as first dropped in, 1 = arranged
    clips.forEach((el, i) => {
      const at = BEFORE[i][0] + (AFTER[i][0] - BEFORE[i][0]) * q, len = BEFORE[i][1] + (AFTER[i][1] - BEFORE[i][1]) * q;
      el.style.left = `calc(${(at / SPAN) * 100}% + 1px)`;
      el.style.width = `calc(${(len / SPAN) * 100}% - 2px)`;
    });
  };
  const setHead = (t, total) => {
    playhead.style.left = `${(t / SPAN) * 100}%`;
    timeEl.textContent = `${fmt(t)} / ${fmt(total)}`;
  };

  // ---- The mink ----------------------------------------------------------------
  // Poses: profile, glint (her eye flash), facing, focus (eyes lit). She is drawn
  // cell by cell at a whole number of CSS pixels per art pixel, never smoothed.
  const HEAD = 3; // spare rows above her for the hop and the float
  let cell = 4, dpr = 1;
  const mink = { pose: 'profile', lift: 0, glint: 0, seq: null, t: 0, hover: null };
  const paint = (pose, lift, glint) => {
    const P = M.POSES[pose], w = P[0].length, h = P.length, u = cell * dpr;
    mg.clearRect(0, 0, minkCv.width, minkCv.height);
    const fill = (rows, only) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.' || (only && ch === P[y][x])) continue;
        mg.fillStyle = M.COLORS[ch];
        mg.fillRect(x * u, (y + HEAD - lift) * u, u, u);
      }
    };
    fill(P);
    if (glint > 0 && pose === 'profile') { mg.globalAlpha = glint; fill(M.POSES.glint, true); mg.globalAlpha = 1; }
  };
  const sizeMink = () => {
    const b = mid.getBoundingClientRect();
    if (!b.width) return;
    dpr = Math.min(2, Math.round(devicePixelRatio || 1) || 1);
    const small = innerWidth <= 760;
    cell = small ? 2 : clamp(Math.floor(Math.min(b.width * 0.9 / 23, b.height * 0.32 / 20)), 2, 6);
    minkCv.width = 23 * cell * dpr; minkCv.height = (20 + HEAD) * cell * dpr;
    minkCv.style.width = `${23 * cell}px`; minkCv.style.height = `${(20 + HEAD) * cell}px`;
    minkCv.style.transform = `translateX(-${Math.round(23 * cell / 2)}px)`;
    paint(mink.pose, mink.lift, mink.glint);
  };
  // Her click on the homepage: she turns to face you with a little hop, her eyes light
  // half a second later and she floats a pixel or two, then she hops round and turns back.
  const TURN = [[0, 'facing'], [500, 'focus'], [1900, 'facing'], [2400, 'profile']];
  const turn = () => { if (!mink.seq) { mink.seq = { t0: now() }; wake(); } };
  const stepMink = (t) => {
    let { pose, lift, glint } = mink;
    if (mink.seq) {
      const e = t - mink.seq.t0;
      pose = TURN.filter(([at]) => e >= at).pop()[1];
      const since = e - TURN.filter(([at]) => e >= at).pop()[0];
      lift = pose === 'facing' ? (since < 130 ? 1 : 0) : pose === 'focus' ? ((since % 1100) < 550 ? 1 : 2) : 0;
      if (e >= 2400) mink.seq = null;
    }
    if (mink.hover !== null) { // the glint: up and back over 2.6 s
      const e = (t - mink.hover) / 2600;
      glint = e >= 1 ? 0 : Math.sin(Math.PI * e) ** 2;
      if (e >= 1) mink.hover = null;
    } else glint = 0;
    if (pose !== mink.pose || lift !== mink.lift || Math.abs(glint - mink.glint) > 0.01) {
      Object.assign(mink, { pose, lift, glint });
      paint(pose, lift, glint);
    }
    return !!(mink.seq || mink.hover !== null);
  };
  minkCv.addEventListener('pointerenter', () => { if (still || mink.seq || mink.pose !== 'profile') return; mink.hover = now(); wake(); });
  minkCv.addEventListener('click', (e) => { e.stopPropagation(); if (!still) turn(); });

  // ---- The demo ---------------------------------------------------------------------
  const CUE = { type: 0.6, send: 4.9, dots: 5.5, reply: 6.5, arrange: 7.6, result: 8.6, play: 9.0 };
  const CPS = 34; // characters a second as the request types
  let td = -1, played = -1, words = [], astridEl = null, active = -1;
  const reset = () => {
    td = -1; played = -1; words = []; astridEl = null; active = -1;
    msgs.innerHTML = ''; typed.textContent = '';
    root.classList.remove('is-typing', 'has-draft', 'has-result', 'is-playing');
    layClips(0); setHead(0, 24);
    videos.forEach((v, i) => { v.pause(); v.classList.toggle('on', i === 0); try { v.currentTime = 0; } catch (e) { /* not loaded yet */ } });
  };
  const bubble = (who, html) => {
    const el = document.createElement('div');
    el.className = `as-msg is-${who} as-in`;
    el.innerHTML = html;
    msgs.appendChild(el);
    return el;
  };
  const showVideo = (i, t) => {
    if (active !== i) {
      videos.forEach((v, j) => { v.classList.toggle('on', j === i); if (j !== i) v.pause(); });
      active = i;
      try { videos[i].currentTime = t; } catch (e) { /* not loaded yet */ }
    }
    if (videos[i].paused && !still) videos[i].play().catch(() => {});
  };
  const settled = () => { // everything as it ends, for reduced motion
    msgs.innerHTML = '';
    bubble('user', USER).classList.remove('as-in');
    bubble('astrid', ASTRID).classList.remove('as-in');
    root.classList.add('has-result');
    layClips(1); setHead(10, 28);
    videos.forEach((v, j) => v.classList.toggle('on', j === 1));
    try { videos[1].currentTime = 2; } catch (e) { /* not loaded yet */ }
  };
  const stepDemo = (dt) => {
    if (td < 0) return false;
    const was = td;
    td += dt;
    const passed = (c) => was < c && td >= c;
    if (td >= CUE.type && td < CUE.send) {
      root.classList.add('is-typing');
      const n = Math.min(USER.length, Math.floor((td - CUE.type) * CPS));
      if (typed.textContent.length !== n) typed.textContent = USER.slice(0, n);
      root.classList.toggle('has-draft', n > 0);
    }
    if (passed(CUE.send)) {
      typed.textContent = '';
      root.classList.remove('is-typing', 'has-draft');
      bubble('user', USER);
    }
    if (passed(CUE.dots)) astridEl = bubble('astrid', '<span class="as-dots"><i></i><i></i><i></i></span>');
    if (passed(CUE.reply) && astridEl) {
      astridEl.innerHTML = ASTRID.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
      words = [...astridEl.querySelectorAll('.w')];
    }
    if (td >= CUE.reply && words.length) {
      const n = Math.floor(((td - CUE.reply) / 1.3) * words.length);
      words.forEach((w, i) => { if (i <= n) w.classList.add('on'); });
      if (n >= words.length) words = [];
    }
    if (td >= CUE.arrange && td < CUE.arrange + 1.2) {
      const q = easeIO(clamp((td - CUE.arrange) / 0.9));
      layClips(q);
      setHead(0, 24 + 4 * q);
    }
    if (passed(CUE.result)) root.classList.add('has-result');
    if (td >= CUE.play) {
      // The sequence plays through and loops, the last frame held a moment before it starts again.
      const p = (td - CUE.play) % 30, t = Math.min(28, p);
      if (played < 0) { played = 0; root.classList.add('is-playing'); }
      const i = t < 8 ? 0 : t < 20 ? 1 : 2, local = t - AFTER[i][0];
      showVideo(i, local);
      if (p >= 28) videos[i].pause();
      setHead(t, 28);
    }
    return true;
  };

  // ---- Clock ----------------------------------------------------------------------------
  const now = () => performance.now();
  let running = false, raf = 0, last = 0;
  const tick = (t) => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    const busy = stepDemo(dt) | stepMink(t);
    if (busy) raf = requestAnimationFrame(tick);
  };
  const wake = () => { if (running && !raf) { last = 0; raf = requestAnimationFrame(tick); } };
  const start = () => {
    running = true;
    sizeMink();
    if (still) { settled(); paint('profile', 0, 0); return; }
    reset();
    td = 0;
    wake();
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    mink.seq = null; mink.hover = null;
    Object.assign(mink, { pose: 'profile', lift: 0, glint: 0 });
    videos.forEach((v) => v.pause());
  };
  window.AstridDemo = { turn, sizeMink, root };

  let wasOn = false;
  new MutationObserver(() => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    if (on) start(); else { stop(); setTimeout(() => { if (!slide.classList.contains('on')) reset(); }, 700); }
  }).observe(slide, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => { if (document.hidden) videos.forEach((v) => v.pause()); });
  addEventListener('resize', () => { if (slide.classList.contains('on')) sizeMink(); });
  // Clicks on the demos stay here; they never turn the slide.
  root.addEventListener('click', (e) => { if (e.target.closest('.as-panel, .as-mink')) e.stopPropagation(); });

  reset();
  if (slide.classList.contains('on')) { wasOn = true; start(); }
})();
