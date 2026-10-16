// Version E, slide 1: recipients of the last Arca Gidan Prize as a collage of their films in shapes of their own
// (16:9, 2:3, 9:16, 3:5, 4:5). At rest each tile is a still from its film (same-origin, so slide 2 can sample it); a
// mouse resting on one plays a short preview from that same frame. Clicking one opens the film in a player that grows
// out of its tile (or, for a film that can't be embedded, its page on arcagidan.com). Leaving the slide, the collage
// recedes into the distance, which is where slide 2's field picks up.
(() => {
  const root = document.querySelector('[data-collage]');
  if (!root) return;
  const slide = root.closest('.slide');
  const tiles = [...root.querySelectorAll('.vc-tile')];
  // Reduced motion, or the viewer's own "animations off" switch (window.deckStill): no previews, no autoplay.
  let still = window.deckStill ? window.deckStill() : matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.addEventListener('deck-motion', () => { still = window.deckStill(); if (still) tiles.forEach((tile) => preview(tile, false)); });
  const STREAM = 'https://customer-xt84pg68d7eakb9h.cloudflarestream.com'; // where arcagidan.com hosts its films
  const FILM = 16 / 9; // every film here is 16:9
  let open = null;
  const primed = new Map(); // tile → its film's poster, fetched on the first hover
  const resting = new Map(); // tile → the timer that brings its still back
  const overviewOpen = () => document.getElementById('overview')?.classList.contains('on');
  const posterOf = (tile) => `${STREAM}/${tile.dataset.film}/thumbnails/thumbnail.jpg?time=${tile.dataset.at}s&height=720`;

  // The preview: loaded on the first hover, playing only while the mouse rests on the tile, back to its first frame
  // (the still) once it has faded out.
  const preview = (tile, on) => {
    const v = tile.querySelector('video');
    if (on && !still && !open && slide.classList.contains('on') && !document.hidden && !overviewOpen()) {
      if (!v.firstElementChild) { // a <source>, so the deck's own media warmer (video[src]) leaves it alone
        v.append(Object.assign(document.createElement('source'), { src: tile.dataset.preview, type: 'video/mp4' }));
        v.load(); // WebKit only starts on a <source> added later when told to
      }
      v.play().catch(() => {});
      if (tile.dataset.film && !primed.has(tile)) primed.set(tile, Object.assign(new Image(), { src: posterOf(tile) })); // ahead of a click
      return;
    }
    v.pause();
    if (!tile.classList.contains('is-live')) return;
    // Leaving the slide, the frame it shows stays until slide 2 has sampled it, then the still comes back.
    clearTimeout(resting.get(tile));
    resting.set(tile, setTimeout(() => {
      if (!v.paused) return;
      tile.classList.remove('is-live');
      setTimeout(() => { if (v.paused) v.currentTime = 0; }, 350);
    }, slide.classList.contains('on') ? 0 : 1000));
  };
  tiles.forEach((tile) => {
    const v = tile.querySelector('video');
    v.addEventListener('playing', () => { clearTimeout(resting.get(tile)); tile.classList.add('is-live'); });
    tile.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') preview(tile, true); });
    tile.addEventListener('pointerleave', () => preview(tile, false));
  });
  const syncMotion = () => {
    if (slide.classList.contains('on') && !open && !document.hidden && !overviewOpen()) return;
    tiles.forEach((tile) => preview(tile, false));
  };
  new MutationObserver(syncMotion).observe(slide, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('deck-overview', syncMotion);

  // The player, built once.
  const box = document.createElement('div');
  box.className = 'vc-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Prize recipient');
  box.innerHTML = `<figure class="vc-frame"><img alt=""></figure>
    <div class="vc-meta"><span class="vc-kicker">Arca Gidan Prize · recipient</span><span class="vc-title"></span>
    <a class="vc-page" target="_blank" rel="noopener">Its page on arcagidan.com ↗</a></div>
    <button class="vc-close" type="button" aria-label="Close">×</button>`;
  document.body.appendChild(box);
  const frame = box.querySelector('.vc-frame');
  const poster = frame.querySelector('img');
  const title = box.querySelector('.vc-title');
  const page = box.querySelector('.vc-page');
  const meta = box.querySelector('.vc-meta');
  let player = null;
  poster.addEventListener('load', () => poster.classList.add('is-ready'));

  // Largest 16:9 rect that fits the screen, a little above centre.
  // On a short screen it also stays clear of the title under it (and so the player's controls stay clickable).
  const fit = () => {
    const below = meta.getBoundingClientRect().top - 12;
    let w = innerWidth * 0.86, h = w / FILM;
    const tall = Math.min(innerHeight * 0.74, below - 12);
    if (h > tall) { h = tall; w = h * FILM; }
    return { x: (innerWidth - w) / 2, y: Math.min((innerHeight - h) / 2 - innerHeight * 0.04, below - h), w, h };
  };
  // The tile is a crop of its film's frame. Laid over the tile, the player is that frame scaled to the tile's size and
  // clipped to the crop, so the full frame opens out of it.
  const crop = (tile) => {
    const r = tile.getBoundingClientRect(), ratio = r.width / r.height;
    const [fx, fy] = (tile.dataset.focus || '50% 50%').split(' ').map((n) => parseFloat(n) / 100);
    const cw = Math.min(1, ratio / FILM), ch = Math.min(1, FILM / ratio);
    return { r, cw, ch, fx, fy, x0: (1 - cw) * fx, y0: (1 - ch) * fy };
  };
  const over = (tile, to) => {
    const c = crop(tile), s = c.r.width / (c.cw * to.w);
    const insets = [c.y0 * to.h, (1 - c.x0 - c.cw) * to.w, (1 - c.y0 - c.ch) * to.h, c.x0 * to.w].map((n) => `${n.toFixed(2)}px`);
    return {
      transform: `translate(${c.r.left - to.x - c.x0 * to.w * s}px, ${c.r.top - to.y - c.y0 * to.h * s}px) scale(${s})`,
      clipPath: `inset(${insets.join(' ')} round ${(4 / s).toFixed(2)}px)`,
    };
  };
  let at = null;

  const show = (tile) => {
    open = tile;
    tiles.forEach((t) => preview(t, false));
    title.textContent = `${tile.dataset.title} — ${tile.dataset.artist}`;
    page.href = tile.dataset.page;
    at = fit();
    const c = crop(tile);
    Object.assign(frame.style, {
      left: `${at.x}px`, top: `${at.y}px`, width: `${at.w}px`, height: `${at.h}px`, transition: 'none', ...over(tile, at),
      // Until the film's own poster is in, the tile's still holds its place in the frame.
      backgroundImage: `url("${tile.querySelector('img').currentSrc}")`,
      backgroundSize: `${c.cw * 100}% ${c.ch * 100}%`,
      backgroundPosition: `${c.fx * 100}% ${c.fy * 100}%`,
    });
    poster.classList.remove('is-ready');
    poster.src = posterOf(tile);
    player = document.createElement('iframe');
    player.title = `${tile.dataset.title} by ${tile.dataset.artist}`;
    player.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    player.allowFullscreen = true;
    player.addEventListener('load', () => player?.classList.add('is-ready'), { once: true });
    player.src = `${STREAM}/${tile.dataset.film}/iframe?autoplay=${!still}&preload=auto&poster=${encodeURIComponent(posterOf(tile))}`;
    frame.appendChild(player);
    box.classList.add('is-on');
    frame.getBoundingClientRect(); // commit the starting pose before growing
    frame.style.transition = '';
    frame.style.transform = 'none';
    frame.style.clipPath = 'inset(0 round 6px)';
    box.querySelector('.vc-close').focus({ preventScroll: true });
  };

  const hide = () => {
    if (!open) return;
    const tile = open;
    open = null;
    Object.assign(frame.style, over(tile, at));
    box.classList.remove('is-on');
    const gone = player;
    player = null;
    setTimeout(() => { gone?.remove(); if (!open) poster.removeAttribute('src'); }, 550);
    tile.focus({ preventScroll: true });
  };

  // The prize's name under the collage links to its site; following it leaves the slide where it is.
  slide.querySelector('.vc-label a')?.addEventListener('click', (e) => e.stopPropagation());
  // A tile click opens its film instead of turning the slide.
  tiles.forEach((tile) => tile.addEventListener('click', (e) => {
    e.stopPropagation();
    if (tile.dataset.film) show(tile);
    else window.open(tile.dataset.page, '_blank', 'noopener');
  }));
  box.addEventListener('click', (e) => { if (!e.target.closest('.vc-frame, .vc-page')) hide(); });
  // While it's open, the deck's keys and swipes wait; Esc closes.
  const DECK_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'PageUp', 'PageDown', 'Home', 'End', 'o', 'O', 'v', 'V', 'Escape']);
  addEventListener('keydown', (e) => {
    if (!open || !DECK_KEYS.has(e.key)) return;
    e.stopPropagation();
    e.preventDefault();
    if (e.key === 'Escape') hide();
  }, true);
  addEventListener('touchend', (e) => { if (open) e.stopPropagation(); }, true);
  window.deckOnResize(() => {
    if (!open) return;
    at = fit();
    Object.assign(frame.style, {
      transition: 'none', transform: 'none', clipPath: 'inset(0 round 6px)', left: `${at.x}px`, top: `${at.y}px`, width: `${at.w}px`, height: `${at.h}px`,
    });
    requestAnimationFrame(() => { if (open) frame.style.transition = ''; });
  });
})();
