// Slide 5 demo.
(() => {
  const root = document.querySelector('[data-astrid-demo]');
  const M = window.AstridMink;
  if (!root || !M) return;
  const slide = root.closest('.slide');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const easeIO = (q) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
  // Keep absolute animation timestamps on the same clock across a pause.
  let paused = false, pausedAt = 0, pausedTime = 0;
  let pendingStart = null, pausedVideos = [];
  const motionBlocked = () => document.hidden || document.getElementById('overview')?.classList.contains('on');
  let paceOffset = 0, paceAt = performance.now();
  const now = () => {
    const real = (paused ? pausedAt : performance.now()) - pausedTime;
    paceOffset += Math.max(0, real - paceAt) * ((window.deckPace?.() || 1) - 1);
    paceAt = real;
    return real + paceOffset;
  };

  const msgs = root.querySelector('.as-msgs');
  const typed = root.querySelector('.as-typed');
  const videos = [...root.querySelectorAll('.as-media video')];
  // No twin for clip 0.
  const gradeSources = ['../assets/astrid/passing-shapes-graded.mp4?v=cf2aa05', '../assets/astrid/quiet-finish-graded.mp4?v=cf2aa05'];
  const gradedVideos = [null, ...gradeSources.map((source) => {
    const graded = document.createElement('video');
    graded.dataset.src = source;
    graded.muted = true; graded.playsInline = true; graded.preload = 'none';
    graded.dataset.graded = 'true'; graded.setAttribute('aria-hidden', 'true');
    root.querySelector('.as-media').appendChild(graded);
    return graded;
  })];
  const pic = root.querySelector('.as-pic'), pg = pic.getContext('2d');
  const tl = root.querySelector('.as-tl');
  const timeEl = root.querySelector('.as-time');
  const seat = root.querySelector('.as-seat');
  const minkCv = root.querySelector('.as-mink'), mg = minkCv.getContext('2d');

  // The timeline
  const SPAN = 30;
  const ICON = {
    film: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
    fx: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/></svg>',
  };
  const TRACKS = [
    { id: 'V2', name: 'Effects', icon: 'fx', h: 40 },
    { id: 'V1', name: 'Video', icon: 'film', h: 60 },
  ];
  const CLIPS = [
    { name: 'first-light', at: 0, len: 8 },
    { name: 'passing-shapes', at: 8, len: 12 },
    { name: 'quiet-finish', at: 20, len: 8 },
  ];
  const FX = [ // real Astrid pack elements, the kind the community makes and shares
    { name: 'type-on', sub: '', at: 0, len: 8 }, // a text-card title, typed on
    { name: 'audio-reactive-colour', sub: '', at: 8, len: 20 },
  ];
  const TITLE = 'A quiet light study';
  const lanes = {};
  {
    const fmt = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    let rulerHtml = '';
    for (let t = 0; t <= SPAN; t++) rulerHtml += t % 5 ? `<i style="left:${(t / SPAN) * 100}%"></i>` : `<span style="left:${(t / SPAN) * 100}%">${fmt(t)}</span>`;
    tl.innerHTML = `<div class="as-ruler-h"></div><div class="as-ruler">${rulerHtml}</div>`
      + TRACKS.map((tr) => `<div class="as-th" style="height:${tr.h}px">${ICON[tr.icon]}<span>${tr.id}</span><em>${tr.name}</em></div><div class="as-lane" data-track="${tr.id}" style="height:${tr.h}px"></div>`).join('')
      + '<i class="as-playhead"></i>';
    tl.querySelectorAll('.as-lane').forEach((el) => { lanes[el.dataset.track] = el; });
  }
  const playhead = tl.querySelector('.as-playhead');
  const place = (el, at, len) => { el.style.left = `calc(${(at / SPAN) * 100}% + 1px)`; el.style.width = `calc(${(len / SPAN) * 100}% - 2px)`; };
  const anchorEls = CLIPS.map((c) => {
    const el = document.createElement('div');
    place(el, c.at, c.len);
    el.innerHTML = `<img class="as-still" src="../assets/astrid/${c.name}-anchor.jpg?v=cf2aa05" alt=""><span class="as-film" style="background-image:url(../assets/astrid/${c.name}-strip.jpg?v=cf2aa05)"></span><span class="as-name">${c.name}</span><span class="as-kind">image</span>`;
    lanes.V1.appendChild(el);
    return el;
  });
  const motionEls = anchorEls;
  const kind = (el, k) => { el.querySelector('.as-kind').textContent = k; };
  const fxEls = FX.map((f) => {
    const el = document.createElement('div');
    el.className = 'as-fxclip';
    place(el, f.at, f.len);
    el.innerHTML = `✦ ${f.name}${f.sub ? ` · ${f.sub}` : ''} <em>community-made</em>`;
    lanes.V2.appendChild(el);
    return el;
  });
  const anchors = [...root.querySelectorAll('.as-media img')];

  // The mink
  // Poses: profile, glint (her eye flash), facing, focus (eyes lit). She is drawn
  // cell by cell at a whole number of CSS pixels per art pixel, never smoothed.
  const HEAD = 3; // spare rows above her for the hop and the float
  let cell = 4, dpr = 1;
  const mink = { pose: 'profile', lift: 0, glint: 0, seq: null, hover: null };
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
    dpr = Math.min(2, Math.round(devicePixelRatio || 1) || 1);
    cell = innerWidth <= 760 ? 2 : innerHeight >= 860 ? 4 : innerHeight >= 660 ? 3 : 2;
    root.style.setProperty('--as-cell', `${cell}px`);
    minkCv.width = 23 * cell * dpr; minkCv.height = (20 + HEAD) * cell * dpr;
    minkCv.style.width = `${23 * cell}px`; minkCv.style.height = `${(20 + HEAD) * cell}px`;
    minkCv.style.transform = `translateX(-${Math.round(23 * cell / 2)}px)`;
    paint(mink.pose, mink.lift, mink.glint);
  };
  const TURN = [[0, 'facing'], [500, 'focus'], [1900, 'facing'], [2400, 'profile']];
  const turn = () => { if (!mink.seq) { mink.seq = { t0: now() }; wake(); } };
  const stepMink = (t) => {
    let { pose, lift, glint } = mink;
    if (mink.seq) {
      const e = Math.max(0, t - mink.seq.t0), cur = TURN.filter(([at]) => e >= at).pop();
      pose = cur[1];
      const since = e - cur[0];
      lift = pose === 'facing' ? (since < 130 ? 1 : 0) : pose === 'focus' ? ((since % 1100) < 550 ? 1 : 2) : 0;
      if (e >= 2400) mink.seq = null;
    }
    if (mink.hover !== null) { // the glint: up and back over 2.6 s
      const e = Math.max(0, t - mink.hover) / 2600;
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

  // The preview
  // mode: none | still | play.
  const view = { mode: 'none', i: -1, seq: -1, rate: 1, title: -1, colour: false, sweep: 0 };
  const noise = document.createElement('canvas');
  noise.width = noise.height = 128;
  {
    const n = noise.getContext('2d'), d = n.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 200; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    n.putImageData(d, 0, 0);
  }
  let grain = null, grainAt = 0, gx = 0, gy = 0, pdpr = 1;
  // The preview is redrawn only when what it shows can have changed: a playing film (with its title and colour look)
  // every frame, as before; an empty screen, a still, or a film not yet ready once. Its size on screen comes from a
  // ResizeObserver rather than a layout read every frame.
  let picCW = -1, picCH = -1, picKey = '';
  const sizePic = () => {
    const b = pic.getBoundingClientRect();
    pdpr = Math.min(2, devicePixelRatio || 1);
    pic.width = Math.max(1, Math.round(b.width * pdpr)); pic.height = Math.max(1, Math.round(b.height * pdpr));
    grain = pg.createPattern(noise, 'repeat');
    picKey = ''; // sizing a canvas clears it
  };
  new ResizeObserver((es) => { for (const e of es) { picCW = e.contentRect.width; picCH = e.contentRect.height; } }).observe(pic);
  const drawPic = (t) => {
    const cw = picCW < 0 ? pic.clientWidth : picCW, ch = picCH < 0 ? pic.clientHeight : picCH;
    if (Math.abs(cw * pdpr - pic.width) > 1 || Math.abs(ch * pdpr - pic.height) > 1) sizePic();
    const src = view.mode === 'still' ? anchors[view.i] : view.mode === 'play' ? videos[view.i] : null;
    root.classList.toggle('has-pic', !!src);
    const ready = !!src && (src.tagName === 'VIDEO' ? src.readyState >= 2 : src.complete);
    const key = view.mode === 'play' && ready ? '' : `${view.mode}|${view.i}|${ready}`;
    if (key && key === picKey) return; // the same picture as last frame
    picKey = key;
    const w = pic.width, h = pic.height;
    pg.setTransform(1, 0, 0, 1, 0, 0);
    pg.clearRect(0, 0, w, h);
    if (!ready) return;
    const s = Math.min(w / 16, h / 9) * 0.86, dw = 16 * s, dh = 9 * s, dx = Math.round((w - dw) / 2), dy = Math.round((h - dh) / 2);
    pg.drawImage(src, dx, dy, dw, dh);
    const seqT = view.mode === 'play' ? view.seq : -1;
    // audio-reactive-colour: a colour look over its span, swept on when it first lands.
    if (view.colour && seqT >= 8) {
      const sx = dx + dw * view.sweep, pulse = 0.5 + 0.5 * Math.sin(t / 260);
      pg.save();
      pg.beginPath(); pg.rect(dx, dy, sx - dx, dh); pg.clip();
      const graded = gradedVideos[view.i];
      if (graded && graded.readyState >= 2) pg.drawImage(graded, dx, dy, dw, dh);
      pg.globalCompositeOperation = 'soft-light';
      const cg = pg.createLinearGradient(dx, dy, dx + dw, dy + dh);
      cg.addColorStop(0, `rgba(255,120,60,${(0.42 + 0.12 * pulse).toFixed(3)})`); cg.addColorStop(1, `rgba(120,90,220,${(0.32 + 0.1 * pulse).toFixed(3)})`);
      pg.fillStyle = cg; pg.fillRect(dx, dy, dw, dh);
      if (t - grainAt > 70) { grainAt = t; gx = Math.random() * 128; gy = Math.random() * 128; }
      pg.globalCompositeOperation = 'overlay'; pg.globalAlpha = 0.22;
      pg.translate(-gx, -gy); pg.fillStyle = grain; pg.fillRect(dx + gx, dy + gy, dw, dh); pg.translate(gx, gy);
      pg.restore();
      if (view.sweep < 1) { // the edge of the sweep
        const e = 18 * pdpr, gr = pg.createLinearGradient(sx - e, 0, sx + 2 * pdpr, 0);
        gr.addColorStop(0, 'rgba(255,190,110,0)'); gr.addColorStop(1, 'rgba(255,225,160,.9)');
        pg.fillStyle = gr; pg.fillRect(sx - e, dy, e + 2 * pdpr, dh);
      }
    }
    // text-card, type-on: the title types itself on over its span.
    if (view.title >= 0 && seqT >= 0 && seqT < 8) {
      const n = Math.min(TITLE.length, Math.floor(((t - view.title) / 1000) * 16));
      if (n > 0) {
        const fs = Math.round(dh * 0.11);
        pg.font = `italic 500 ${fs}px "Cormorant Garamond", Georgia, serif`;
        pg.textAlign = 'center'; pg.textBaseline = 'middle';
        pg.shadowColor = 'rgba(0,0,0,.35)'; pg.shadowBlur = 8 * pdpr;
        pg.fillStyle = '#fffaf0';
        const full = pg.measureText(TITLE).width, part = TITLE.slice(0, n);
        pg.textAlign = 'left';
        pg.fillText(part, dx + dw / 2 - full / 2, dy + dh * 0.78);
        pg.shadowBlur = 0;
      }
    }
  };
  const showStill = (i) => { view.mode = 'still'; view.i = i; view.seq = -1; videos.forEach((v) => v.pause()); gradedVideos.forEach((v) => v?.pause()); };
  const playFrom = (seqT, rate) => { view.mode = 'play'; view.seq = seqT; view.rate = rate; view.i = -2; };
  const stepPlay = (dt) => {
    if (view.mode !== 'play') { gradedVideos.forEach((v) => v?.pause()); return; }
    view.seq += dt * view.rate;
    if (view.seq >= 28) view.seq = 0;
    const i = view.seq < 8 ? 0 : view.seq < 20 ? 1 : 2, local = view.seq - CLIPS[i].at;
    if (view.i !== i) {
      videos.forEach((v, j) => { if (j !== i) v.pause(); });
      gradedVideos.forEach((v, j) => { if (v && j !== i) v.pause(); });
      view.i = i;
      const v = videos[i];
      try { v.currentTime = local; } catch (e) { /* not loaded */ }
      v.playbackRate = view.rate;
      const graded = gradedVideos[i];
      if (graded) {
        try { graded.currentTime = local; } catch (e) { /* not loaded */ }
        graded.playbackRate = view.rate;
      }
    }
    if (videos[i].paused) videos[i].play().catch(() => {});
    const graded = gradedVideos[i];
    if (graded) {
      graded.playbackRate = view.rate;
      if (graded.readyState >= 1 && Math.abs(graded.currentTime - videos[i].currentTime) > 0.1) {
        try { graded.currentTime = videos[i].currentTime; } catch (e) { /* not loaded */ }
      }
      if (graded.paused) graded.play().catch(() => {});
    }
    headTo(view.seq, true);
  };

  // The playhead and the clock read-outs
  let headT = 0, headGoal = 0, total = 0;
  const headTo = (t, now_) => { headGoal = t; if (now_) headT = t; };
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  // The playhead moves by transform on its own layer, so a frame neither lays out nor repaints the editor under it: the
  // same place as left: calc(var(--as-hcol) + (100% - var(--as-hcol) - 8px) * f), from the timeline's width and header
  // column as last laid out (kept by a ResizeObserver). The clock's text is only replaced when its reading changes.
  // Until its first step it stands where the stylesheet puts it, as before.
  let tlW = 0, tlL = 0, hcol = 0, headF = null, headX = '', clock = '';
  const measureTl = (w) => { tlW = w ?? parseFloat(getComputedStyle(tl).width); tlL = tl.getBoundingClientRect().left - 1; hcol = parseFloat(getComputedStyle(tl).getPropertyValue('--as-hcol')) || 0; };
  const placeHead = () => {
    if (headF === null) return;
    // Whole device pixels, as the line was snapped when laid out (a layer at a fraction would be resampled, softer).
    const d = devicePixelRatio || 1, at = hcol + (tlW - hcol - 8) * headF;
    const x = `translateX(${((Math.round((tlL + at) * d) - Math.round(tlL * d)) / d).toFixed(4)}px)`;
    if (x !== headX) { headX = x; playhead.style.transform = x; }
  };
  const stepHead = (dt) => {
    headT += (headGoal - headT) * (1 - Math.exp(-dt / 0.12));
    headF = +(headT / SPAN).toFixed(4);
    placeHead();
    const c = `${fmt(headT)} / ${fmt(total)}`;
    if (c !== clock) { clock = c; timeEl.textContent = c; }
  };

  // The three beats
  const BEATS = [
    { at: 0.4, ask: 'Generate three anchor images for a quiet light study.', reply: 'Here are three anchor images.', step: ['Generating three anchor images', 'qwen_image', '× 3'], dur: 2.1 },
    { at: 5.9, ask: 'Animate them.', reply: 'Animating each one from its anchor.', step: ['Animating the anchors', 'animated_video', '× 3'], dur: 3.7 },
    { at: 11.2, ask: 'Add a title and a colour look on top.', reply: 'Layering two community-made effects.', step: ['Adding text-card · type-on and audio-reactive-colour', 'rendering', 'community-made'], dur: 5.2 },
  ];
  const CPS = 30, RESET = 20.6, LOOP = 21.6;
  let td = -1, wait = 0, rows = [];
  const bubble = (cls, html) => {
    const el = document.createElement('div');
    el.className = `${cls} as-in`;
    el.innerHTML = html;
    msgs.appendChild(el);
    while (msgs.children.length > 9) msgs.firstChild.remove();
    return el;
  };
  const clearAll = () => {
    msgs.innerHTML = ''; typed.textContent = ''; rows = [];
    root.classList.remove('is-typing', 'has-draft', 'is-working', 'is-playing', 'is-resetting');
    anchorEls.forEach((el) => { el.className = 'as-clip'; el.style.opacity = '0'; kind(el, 'image'); });
    fxEls.forEach((el) => el.classList.remove('on'));
    view.mode = 'none'; view.i = -1; view.seq = -1; view.title = -1; view.colour = false; view.sweep = 0; total = 0;
    videos.forEach((v) => v.pause());
    gradedVideos.forEach((v) => v?.pause());
    headTo(0, true);
  };
  const beatTimes = (b) => {
    const typeEnd = b.at + b.ask.length / CPS;
    return { typeEnd, send: typeEnd + 0.25, reply: typeEnd + 0.75, act: typeEnd + 0.95, done: typeEnd + 0.95 + b.dur };
  };
  const stepBeats = (dt) => {
    if (td < 0) return false;
    if (wait > 0) { wait -= dt; return true; }
    const was = td;
    td += dt;
    const passed = (c) => was < c && td >= c;
    BEATS.forEach((b, bi) => {
      const T = beatTimes(b);
      if (td >= b.at && td < T.send) {
        root.classList.add('is-typing');
        const n = Math.min(b.ask.length, Math.floor((td - b.at) * CPS));
        if (typed.textContent.length !== n) typed.textContent = b.ask.slice(0, n);
        root.classList.toggle('has-draft', n > 0);
      }
      if (passed(T.send)) {
        typed.textContent = '';
        root.classList.remove('is-typing', 'has-draft');
        root.classList.add('is-working');
        bubble('as-msg is-user', b.ask + (b.att ? `<br><span class="as-att">${b.att}</span>` : ''));
      }
      if (passed(T.reply)) {
        bubble('as-msg is-astrid', b.reply);
        rows[bi] = bubble('as-step is-active', `<i></i><span>${b.step[0]}</span><code><b>${b.step[1]}</b> ${b.step[2]}</code>`);
      }
      if (td >= T.act && td < T.done + 0.5) act(bi, td - T.act, was - T.act);
      if (passed(T.done) && rows[bi]) { rows[bi].classList.remove('is-active'); rows[bi].classList.add('is-done'); root.classList.remove('is-working'); }
    });
    if (passed(RESET)) root.classList.add('is-resetting');
    if (td >= LOOP) { clearAll(); td = 0; }
    stepPlay(dt);
    stepHead(dt);
    return true;
  };
  // What each beat does to the editor, a seconds into its work (p: where it was last frame).
  const act = (bi, a, p) => {
    const at = (x) => p < x && a >= x;
    const touch = (el, on) => el.classList.toggle('is-touched', on);
    if (bi === 0) { // three anchor images shimmer in on V1
      CLIPS.forEach((c, i) => {
        const el = anchorEls[i];
        if (at(i * 0.5)) { el.style.opacity = ''; el.classList.add('is-generating'); touch(el, true); headTo(c.at + 0.5); }
        if (at(0.85 + i * 0.5)) { el.classList.remove('is-generating'); el.classList.add('is-ready'); showStill(i); total = 28; }
        if (at(1.35 + i * 0.5)) touch(el, false);
      });
    }
    if (bi === 1) { // each anchor becomes a moving clip: its filmstrip fills in, and the preview plays it
      CLIPS.forEach((c, i) => {
        const el = motionEls[i];
        if (at(i * 1.2)) { el.classList.add('is-animated'); kind(el, 'video'); touch(el, true); root.classList.add('is-playing'); playFrom(c.at, 1); }
        if (at(i * 1.2 + 1.15)) touch(el, false);
      });
      if (at(3.6)) { view.mode = 'still'; view.i = 2; videos.forEach((v) => v.pause()); root.classList.remove('is-playing'); }
    }
    if (bi === 2) { // effects land on V2, above the clips, and the preview shows each come on
      if (at(0)) { fxEls[0].classList.add('on'); touch(fxEls[0], true); playFrom(0.3, 1); view.title = now() + 450; root.classList.add('is-playing'); }
      if (at(1.9)) { touch(fxEls[0], false); fxEls[1].classList.add('on'); touch(fxEls[1], true); playFrom(9, 1); view.colour = true; view.sweep = 0; }
      if (a >= 2.05) view.sweep = easeIO(clamp((a - 2.05) / 1.6));
      if (at(3.9)) { touch(fxEls[1], false); playFrom(0, 1.5); view.title = now(); }
    }
  };
  const settledState = () => { // everything as it ends, for reduced motion
    clearAll();
    BEATS.forEach((b) => {
      bubble('as-msg is-user', b.ask);
      bubble('as-msg is-astrid', b.reply);
      bubble('as-step is-done', `<i></i><span>${b.step[0]}</span><code><b>${b.step[1]}</b> ${b.step[2]}</code>`);
    });
    msgs.querySelectorAll('.as-in').forEach((el) => el.classList.remove('as-in'));
    anchorEls.forEach((el) => { el.style.opacity = ''; el.classList.add('is-ready', 'is-animated'); kind(el, 'video'); });
    fxEls.forEach((el) => el.classList.add('on'));
    total = 28; view.mode = 'play'; view.i = 1; view.seq = 12; view.colour = true; view.sweep = 1;
    try { videos[1].currentTime = 4; } catch (e) { /* not loaded */ }
    try { gradedVideos[1].currentTime = 4; } catch (e) { /* not loaded */ }
    headTo(12, true); stepHead(0);
  };

  // From slide 4
  const sky = document.createElement('canvas');
  sky.className = 'as-flight';
  sky.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sky);
  const sg = sky.getContext('2d');
  let morph = null;
  const MORPH = { rings: [0.05, 1.15], fly: [0, 1.1], outline: [0.1, 0.9], pixels: [0.85, 0.45], resolve: 1.05, handoff: 1.35, turn: 1.55, end: 1.75, demo: 4.0 };
  // A rounded rectangle as n points spaced evenly round it, clockwise from the top centre.
  const roundRect = (b, rad, n) => {
    const { left: l, top: t, right: r, bottom: bt } = b, pts = [];
    const arc = (cx, cy, a0) => { for (let i = 1; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } };
    const mx = (l + r) / 2;
    pts.push([mx, t], [r - rad, t]); arc(r - rad, t + rad, -Math.PI / 2);
    pts.push([r, bt - rad]); arc(r - rad, bt - rad, 0);
    pts.push([l + rad, bt]); arc(l + rad, bt - rad, Math.PI / 2);
    pts.push([l, t + rad]); arc(l + rad, t + rad, Math.PI);
    pts.push([mx, t]);
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[len.length - 1], out = [];
    for (let k = 0, j = 1; k < n; k++) {
      const d = (k / n) * total;
      while (len[j] < d) j++;
      const f = (d - len[j - 1]) / ((len[j] - len[j - 1]) || 1);
      out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f]);
    }
    return out;
  };
  // The sky is allocated ahead, while slide 4 or 5 is up (allocating it in the press frame added to a full garbage
  // collection there), cleared back to its first state as a morph begins, and let go once both slides are left.
  const skySize = () => [Math.round(innerWidth * Math.min(2, devicePixelRatio || 1)), Math.round(innerHeight * Math.min(2, devicePixelRatio || 1))];
  const freeSky = () => { sky.width = 0; sky.height = 0; };
  const startMorph = (snap, back = false) => {
    const W = innerWidth, H = innerHeight, d = Math.min(2, devicePixelRatio || 1);
    const [sw, sh] = skySize();
    if (sky.width === sw && sky.height === sh && sg.reset) sg.reset(); else { sky.width = sw; sky.height = sh; }
    sky.style.display = 'block';
    if (!back) root.classList.add('is-morphing', 'is-minkless'); // (folding back, the editor is whole as it begins)
    sizeMink();
    const chat = root.querySelector('.as-chat').getBoundingClientRect(), edit = root.querySelector('.as-edit').getBoundingClientRect();
    const mr = minkCv.getBoundingClientRect();
    const origin = { x: mr.left, y: mr.top + HEAD * cell };
    const ox = snap.left, oy = snap.top;
    const N = 180;
    const frames = [roundRect(chat, 12, N), roundRect(edit, 12, N)];
    const rings = snap.rings.map((r, side) => ({ ...r, cx: r.x + ox, cy: r.y + oy, target: frames[side],
      strands: r.strands.map((st) => st.map(([x, y]) => [x + ox, y + oy])) }));
    // Where the mink's outline (in the 16 x 16 icon's units) lies over her pixels (the 23 x 20 profile).
    const sprite = ([fx, fy]) => [origin.x + fx * 1.44 * cell, origin.y + ((fy - 1.5) * 1.345 + 0.5) * cell];
    const outlineTo = M.smooth(M.OUTLINE, 10).map(sprite), throatTo = M.smooth(M.THROAT, 10).map(sprite);
    const P = M.POSES.profile, cells = [];
    P.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') cells.push({ x, y, ch, at: 0 }); }));
    cells.forEach((c) => { c.at = (c.y + (22 - c.x) * 0.35) / (19 + 22 * 0.35); }); // from the head down the neck
    const motes = [];
    const rnd = Math.random;
    snap.slots.forEach((sl) => {
      const box = sl.side ? edit : chat;
      for (let i = 0; i < 5; i++) motes.push({ x: sl.x + ox + (rnd() - 0.5) * 30 * snap.k, y: sl.y + oy + (rnd() - 0.5) * 30 * snap.k,
        tx: box.left + box.width * (0.15 + 0.7 * rnd()), ty: box.bottom - box.height * (0.05 + 0.3 * rnd()), d: 0.1 + rnd() * 0.3, r: 1 + rnd() * 1.2 });
    });
    snap.orbit.forEach((o) => {
      const dx = o.x - snap.W / 2, dy = o.y - snap.H * 0.4, n = Math.hypot(dx, dy) || 1;
      motes.push({ x: o.x + ox, y: o.y + oy, tx: o.x + ox + (dx / n) * (40 + rnd() * 60), ty: o.y + oy + (dy / n) * (40 + rnd() * 60) + 30, d: rnd() * 0.3, r: 0.8 + rnd() * 0.6, away: true });
    });
    const fit = (src, dst) => { const s = Math.min(dst.width / src.w, dst.height / src.h); return { s, x: dst.left + dst.width / 2, y: dst.top + dst.height / 2 }; };
    morph = {
      t0: now(), d, snap, rings, cells, origin, outlineTo, throatTo, motes,
      outline: snap.outline.map(([x, y]) => [x + ox, y + oy]), throat: snap.throat.map(([x, y]) => [x + ox, y + oy]),
      eyeFrom: { x: snap.eye.x + ox, y: snap.eye.y + oy }, eyeTo: { x: origin.x + 16 * cell, y: origin.y + 5 * cell },
      fly: [
        { img: snap.layers.agent, from: { x: rings[0].cx, y: rings[0].cy }, src: { w: rings[0].r * 2, h: rings[0].r * 2 }, to: fit({ w: rings[0].r * 2, h: rings[0].r * 2 }, chat) },
        { img: snap.layers.face, from: { x: rings[1].cx, y: rings[1].cy }, src: { w: rings[1].r * 2, h: rings[1].r * 2 }, to: fit({ w: rings[1].r * 2, h: rings[1].r * 2 }, edit) },
      ],
      steps: { resolve: false, handoff: false, turn: false },
    };
    window.AstridCore.hide();
  };
  const lerp = (a, b, q) => a + (b - a) * q;
  const drawMorph = (t) => {
    const m = morph, e = Math.max(0, t - m.t0) / 1000, d = m.d;
    sg.setTransform(d, 0, 0, d, 0, 0);
    sg.clearRect(0, 0, sky.width / d, sky.height / d);
    sg.lineCap = 'round'; sg.lineJoin = 'round';
    const k01 = ([a, b]) => clamp((e - a) / b);
    const qf = easeIO(k01(MORPH.fly));
    for (const f of m.fly) {
      const s = lerp(1, f.to.s * 0.82, qf), x = lerp(f.from.x, f.to.x, qf), y = lerp(f.from.y, f.to.y, qf);
      const a = 1 - smoothstep(clamp((e - 0.45) / 0.65));
      if (a <= 0) continue;
      sg.save();
      sg.globalAlpha = a;
      sg.translate(x, y); sg.scale(s, s); sg.translate(-f.from.x, -f.from.y);
      sg.drawImage(f.img, m.snap.left, m.snap.top, m.snap.W, m.snap.H);
      sg.restore();
    }
    const qo = 1 - clamp(e / 0.3);
    if (qo > 0) { sg.globalAlpha = qo; sg.drawImage(m.snap.layers.outer, m.snap.left, m.snap.top, m.snap.W, m.snap.H); sg.globalAlpha = 1; }
    for (const p of m.motes) {
      const q = clamp((e - p.d) / 0.9);
      if (q <= 0 || q >= 1) continue;
      const qq = p.away ? ease(q) : easeIO(q);
      const x = lerp(p.x, p.tx, qq), y = lerp(p.y, p.ty, qq), a = Math.sin(Math.PI * q) * (p.away ? 0.55 : 0.85);
      sg.fillStyle = `rgba(255,217,145,${a.toFixed(3)})`;
      sg.beginPath(); sg.arc(x, y, p.r, 0, Math.PI * 2); sg.fill();
    }
    const qr = easeIO(k01(MORPH.rings));
    const fa = 1 - clamp((e - MORPH.resolve - 0.1) / 0.45);
    if (fa > 0) {
      m.rings.forEach((r) => {
        r.strands.forEach((st, si) => {
          const spread = 1 - qr;
          sg.lineWidth = lerp(r.width[si] * m.snap.lw, 1, qr);
          sg.strokeStyle = `rgba(240,200,119,${(lerp(r.alpha[si], si ? 0 : 0.55, qr) * fa).toFixed(3)})`;
          sg.beginPath();
          st.forEach(([x, y], i) => {
            const [tx, ty] = r.target[i];
            const px = lerp(x, tx, qr), py = lerp(y, ty, qr);
            if (spread <= 0 && si) return;
            i ? sg.lineTo(px, py) : sg.moveTo(px, py);
          });
          sg.closePath(); sg.stroke();
        });
      });
    }
    const qm = easeIO(k01(MORPH.outline));
    const oa = 1 - clamp((e - MORPH.pixels[0] - 0.15) / 0.35);
    if (!m.steps.handoff) {
      if (oa > 0) {
        for (const [src, dst, w, a] of [[m.outline, m.outlineTo, 1.2, 0.9], [m.throat, m.throatTo, 0.8, 0.45]]) {
          sg.lineWidth = w;
          sg.strokeStyle = `rgba(255,217,145,${(a * oa).toFixed(3)})`;
          sg.beginPath();
          src.forEach(([x, y], i) => { const px = lerp(x, dst[i][0], qm), py = lerp(y, dst[i][1], qm); i ? sg.lineTo(px, py) : sg.moveTo(px, py); });
          sg.stroke();
        }
        const ex = lerp(m.eyeFrom.x, m.eyeTo.x, qm), ey = lerp(m.eyeFrom.y, m.eyeTo.y, qm);
        sg.fillStyle = `rgba(255,236,200,${oa.toFixed(3)})`;
        sg.beginPath(); sg.arc(ex, ey, 3, 0, Math.PI * 2); sg.fill();
      }
      const qp = (e - MORPH.pixels[0]) / MORPH.pixels[1];
      if (qp > 0) {
        sg.setTransform(1, 0, 0, 1, 0, 0);
        const u = cell * d, x0 = Math.round(m.origin.x * d), y0 = Math.round(m.origin.y * d);
        for (const c of m.cells) {
          if (c.at > qp) continue;
          sg.fillStyle = M.COLORS[c.ch];
          sg.fillRect(x0 + c.x * u, y0 + c.y * u, u, u);
        }
      }
    }
    if (!m.steps.resolve && e >= MORPH.resolve) { m.steps.resolve = true; root.classList.remove('is-morphing'); }
    if (!m.steps.handoff && e >= MORPH.handoff) { m.steps.handoff = true; root.classList.remove('is-minkless'); }
    if (!m.steps.turn && e >= MORPH.turn) { m.steps.turn = true; turn(); }
    if (e >= MORPH.end) { endMorph(); return false; }
    return true;
  };
  const smoothstep = (k) => k * k * (3 - 2 * k);
  const endMorph = () => {
    morph = null;
    window.deckEntryDone?.(slide);
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.clearRect(0, 0, sky.width, sky.height);
    sky.style.display = 'none';
    window.AstridCore?.release?.();
    root.classList.remove('is-morphing', 'is-minkless');
  };

  // Clock
  let running = false, raf = 0, last = 0, ticking = false, requested = false;
  const tick = () => {
    raf = 0;
    if (!running || paused) return;
    const t = now();
    ticking = true;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    const morphing = morph ? (morph.back ? unmorph(t) : drawMorph(t)) : false;
    if (!running) { ticking = false; return; } // the fold back into slide 4 has just landed and stopped the demo
    // Coming back from slide 6 the finished editor waits, hidden, for the stack to fold back into it (dt-await).
    const busy = morphing | stepBeats(slide.classList.contains('dt-await') || morph?.back ? 0 : dt) | stepMink(t);
    drawPic(t);
    ticking = false;
    if (busy || requested) { requested = false; raf = requestAnimationFrame(tick); }
  };
  const wake = () => { if (!running || paused) return; if (ticking) { requested = true; return; } if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
  const net = document.querySelector('.dt-net');
  const softenNet = (on) => {
    if (!net) return;
    if (!on) { net.style.maskImage = net.style.webkitMaskImage = ''; net.style.maskMode = ''; return; }
    const b = slide.querySelector('.split').getBoundingClientRect(), W = innerWidth, H = innerHeight, pad = 14;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><filter id='f'><feGaussianBlur stdDeviation='12'/></filter><rect width='${W}' height='${H}' fill='white'/><rect x='${Math.round(b.left - pad)}' y='${Math.round(b.top - pad)}' width='${Math.round(b.width + 2 * pad)}' height='${Math.round(b.height + 2 * pad)}' rx='18' fill='black' fill-opacity='.75' filter='url(%23f)'/></svg>`;
    net.style.maskImage = `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
    net.style.maskMode = 'luminance';
    net.style.maskSize = '100% 100%';
  };
  const layout = () => { sizeMink(); sizePic(); measureTl(); placeHead(); if (slide.classList.contains('on')) softenNet(true); };
  new ResizeObserver((es) => { for (const e of es) if (e.target === tl) { measureTl(e.contentRect.width); placeHead(); } }).observe(tl);
  const start = (fromCore) => {
    if (motionBlocked()) { pendingStart = fromCore; return; }
    pendingStart = null;
    root.classList.remove('as-unmorph', 'is-morphing', 'is-minkless'); // folded away on the way back to slide 4
    // Also warm direct #5 entry.
    window.warmDeckMedia(slide);
    running = true;
    layout();
    if (still || window.deckNav?.rest) {
      settledState(); paint('profile', 0, 0); requestAnimationFrame(() => drawPic(now())); videos[1].addEventListener('seeked', () => drawPic(now()), { once: true }); gradedVideos[1].addEventListener('seeked', () => drawPic(now()), { once: true });
      window.deckEntryDone?.(slide);
      // Back at rest: the finished editor, its preview playing, until the loop's own reset starts the demo again.
      if (!still) { view.rate = 1; td = beatTimes(BEATS[BEATS.length - 1]).act + 4; wait = 0; wake(); }
      return;
    }
    clearAll();
    td = 0; wait = 0;
    const snap = fromCore && window.AstridCore && window.AstridCore.snapshot();
    if (snap) { startMorph(snap); wait = MORPH.demo; }
    else window.deckLater(() => window.deckEntryDone?.(slide), 1800);
    wake();
  };
  const stop = () => {
    running = false;
    paused = false; pausedTime = 0; pendingStart = null; pausedVideos = [];
    if (raf) cancelAnimationFrame(raf);
    raf = 0; requested = false;
    if (morph?.back) endUnmorph();
    if (morph) endMorph();
    softenNet(false);
    mink.seq = null; mink.hover = null;
    Object.assign(mink, { pose: 'profile', lift: 0, glint: 0 });
    videos.forEach((v) => v.pause());
    gradedVideos.forEach((v) => v?.pause());
  };
  window.AstridDemo = { turn, root };

  // ---- Going back to slide 4 ------------------------------------------------------------------
  // A step back: the morph from slide 4 played backwards. The panels fade as their frames fold back into the two
  // rings, the chat and editor layers shrink back into them, the mink dissolves from the neck up as her outline
  // rises back into the lens's, and the community's motes come home; then slide 4's own picture stands in its place.
  const pace = () => window.deckPace?.() || 1;
  const fold = () => {
    const snap = window.AstridCore && window.AstridCore.snapshot(); // slide 4 has settled before this runs
    if (!snap) return false;
    startMorph(snap, true); // the same paths, measured from the editor as it stands (it hides slide 4's picture)
    morph.back = { e: MORPH.end - 1e-3, last: 0, shown: false };
    morph.steps = { resolve: true, handoff: true, turn: true };
    slide.classList.add('dt-rewind');
    coreSlide.classList.add('dt-return', 'dt-await');
    window.deckRewinding?.(coreSlide);
    window.deckNav?.signal?.addEventListener('abort', () => { if (morph?.back) { endUnmorph(); stop(); } }, { once: true });
    wake();
    return true;
  };
  const unmorph = (t) => {
    const b = morph.back;
    b.e = Math.max(0, b.e - Math.min(0.05 * pace(), (t - (b.last || t)) / 1000)); // now() runs at the turn's pace
    b.last = t;
    const e = b.e;
    morph.steps = { resolve: e >= MORPH.resolve, handoff: e >= MORPH.handoff, turn: true };
    if (e < MORPH.resolve + 0.5) root.classList.add('as-unmorph'); // the panels fade as their frames come back (as they faded in)
    root.classList.toggle('is-morphing', e < MORPH.resolve);
    root.classList.toggle('is-minkless', e < MORPH.handoff);
    if (!b.shown && e <= 0.7) { b.shown = true; coreSlide.classList.remove('dt-await'); } // its labels come back as it forms
    morph.t0 = t - e * 1000;
    drawMorph(t);
    if (e <= 0) { endUnmorph(); leave(); return false; }
    return true;
  };
  const endUnmorph = () => {
    if (!morph?.back) return;
    window.AstridCore?.show(); // the very picture the flight layer has just drawn
    endMorph(); // the sky is kept while slide 4 or 5 is up: the next turn between them flies on it
    root.classList.add('is-minkless'); // the editor and its mink stay folded away as slide 5 fades (until it next starts)
    slide.classList.replace('dt-rewind', 'dt-rewound');
    coreSlide.classList.remove('dt-return', 'dt-await');
    window.deckRewound?.(coreSlide);
  };

  const coreHost = document.querySelector('[data-astrid-core]');
  const coreSlide = coreHost && coreHost.closest('.slide');
  const leave = () => {
    if (slide.classList.contains('on')) return;
    stop();
    const signal = window.deckNav?.signal;
    const timer = setTimeout(() => { if (!slide.classList.contains('on')) clearAll(); }, 700);
    signal?.addEventListener('abort', () => clearTimeout(timer), { once: true });
  };
  let wasOn = false;
  const watch = new MutationObserver((records) => {
    const on = slide.classList.contains('on');
    if (on === wasOn) return;
    wasOn = on;
    if (morph?.back) { endUnmorph(); if (on) stop(); }
    if (on) start(!!coreSlide && !coreSlide.classList.contains('on') && records.some((r) => r.target === coreSlide));
    else if (coreSlide?.classList.contains('on') && window.deckNav?.back && !still && running && !paused && !morph && fold()) { /* folding back into slide 4 */ }
    else leave();
  });
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (coreSlide) watch.observe(coreSlide, { attributes: true, attributeFilter: ['class'] });
  if (coreSlide && !still) { // the sky, ready while slide 4 or 5 is up; let go once both are left (unless a morph flies on it)
    const idleSoon = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1000 }) : setTimeout(fn, 100));
    const near45 = () => coreSlide.classList.contains('on') || slide.classList.contains('on');
    const keepSky = () => {
      if (near45()) setTimeout(() => idleSoon(() => {
        if (!near45() || morph) return;
        const [sw, sh] = skySize();
        if (sky.width !== sw || sky.height !== sh) { sky.width = sw; sky.height = sh; }
      }), 1500);
      else setTimeout(() => { if (!near45() && !morph) freeSky(); }, 700);
    };
    const keep = new MutationObserver(keepSky);
    [coreSlide, slide].forEach((s) => keep.observe(s, { attributes: true, attributeFilter: ['class'] }));
    keepSky();
  }
  const syncMotion = () => {
    if (motionBlocked() && morph?.back) { endUnmorph(); leave(); return; } // a reverse never waits behind the overview
    if (motionBlocked()) {
      if (!running || paused) return;
      pausedAt = performance.now(); paused = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      pausedVideos = [...videos, ...gradedVideos].filter((v) => v && !v.paused);
      pausedVideos.forEach((v) => v.pause());
    } else if (slide.classList.contains('on')) {
      // An entry deferred behind the overview has no scene to resume yet.
      if (pendingStart !== null) { start(pendingStart); return; }
      if (!paused) return;
      pausedTime += performance.now() - pausedAt;
      paused = false;
      last = 0;
      pausedVideos.forEach((v) => v.play().catch(() => {}));
      pausedVideos = [];
      if (!still) wake();
    }
  };
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('deck-overview', syncMotion);
  window.deckOnResize(() => {
    if (morph?.back) { endUnmorph(); leave(); } // its paths were measured on the old screen
    if (!slide.classList.contains('on')) return;
    if (morph) { endMorph(); settledState(); td = -1; wait = 0; }
    layout();
    drawPic(now());
    if (!document.hidden && !document.getElementById('overview')?.classList.contains('on')) wake();
  });
  // Clicks on the demos stay here; they never turn the slide.
  root.addEventListener('click', (e) => { if (e.target.closest('.as-panel, .as-mink, .as-try')) e.stopPropagation(); }); // the link opens its tab and the slide stays
  videos.forEach((v) => v.addEventListener('loadeddata', () => { if (still && slide.classList.contains('on')) drawPic(now()); }));

  clearAll();
  if (slide.classList.contains('on')) { wasOn = true; start(false); }
})();
