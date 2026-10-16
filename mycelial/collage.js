// Version E, slide 1: recipients of the last Arca Gidan Prize as a collage of
// films in their own shapes (16:9, 9:16, 4:5, 1:1). Clicking one opens it full
// screen, growing out of its tile. The clips are stand-ins (the prize site's
// own hero films) until the winning entries arrive; titles and artists are
// placeholders. Leaving the slide, the collage recedes into the distance,
// which is where slide 2's field picks up.
(() => {
  const root = document.querySelector('[data-collage]');
  if (!root) return;
  const slide = root.closest('.slide');
  const tiles = [...root.querySelectorAll('.vc-tile')];
  const clips = tiles.map((tile) => tile.querySelector('video'));
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let open = null;
  const isPlaceholder = (text) => /^\s*\[/.test(text || '');
  tiles.forEach((tile) => {
    const caption = tile.querySelector('.vc-cap');
    if (caption && isPlaceholder(caption.textContent)) caption.hidden = true;
  });

  const overviewOpen = () => document.getElementById('overview')?.classList.contains('on');
  const playing = (on) => clips.forEach((v) => (on && !still && !document.hidden && !overviewOpen() ? v.play().catch(() => {}) : v.pause()));
  clips.forEach((v) => v.addEventListener('loadeddata', () => {
    if (slide.classList.contains('on') && !open && !still && !document.hidden && !overviewOpen()) v.play().catch(() => {});
  }));
  // Coming back from slide 2 the films hold the frame the field's motes were made of until they are back (dt-await).
  const syncMotion = () => playing(slide.classList.contains('on') && !open && !slide.classList.contains('dt-await'));
  new MutationObserver(syncMotion)
    .observe(slide, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('deck-overview', syncMotion);

  // The full-screen view, built once.
  const box = document.createElement('div');
  box.className = 'vc-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Prize recipient');
  box.innerHTML = `<figure class="vc-frame"><video muted loop playsinline></video></figure>
    <div class="vc-meta"><span class="vc-kicker">Arca Gidan Prize · recipient</span><span class="vc-title"></span>
    <span class="vc-note">[Stand-in clip: the winning film plays here, with sound]</span></div>
    <button class="vc-close" type="button" aria-label="Close">×</button>`;
  document.body.appendChild(box);
  const frame = box.querySelector('.vc-frame');
  const film = frame.querySelector('video');
  const title = box.querySelector('.vc-title');
  const note = box.querySelector('.vc-note');
  if (isPlaceholder(note.textContent)) note.hidden = true;

  // Largest rect of the tile's shape that fits the screen, a little above centre.
  const fit = (ratio) => {
    let w = innerWidth * 0.86, h = w / ratio;
    if (h > innerHeight * 0.74) { h = innerHeight * 0.74; w = h * ratio; }
    return { x: (innerWidth - w) / 2, y: (innerHeight - h) / 2 - innerHeight * 0.04, w, h };
  };
  // The transform that lays the full-screen frame exactly over a tile.
  const over = (tile, to) => {
    const r = tile.getBoundingClientRect();
    return `translate(${r.left - to.x}px, ${r.top - to.y}px) scale(${r.width / to.w}, ${r.height / to.h})`;
  };
  let at = null;

  const show = (tile) => {
    open = tile;
    const clip = tile.querySelector('video');
    const r = tile.getBoundingClientRect();
    at = fit(r.width / r.height);
    Object.assign(frame.style, {
      left: `${at.x}px`, top: `${at.y}px`, width: `${at.w}px`, height: `${at.h}px`,
      transition: 'none', transform: over(tile, at),
    });
    const source = clip.currentSrc || clip.getAttribute('src');
    const loadFilm = () => {
      if (open !== tile) return;
      film.src = source || clip.currentSrc || clip.getAttribute('src');
      film.currentTime = clip.currentTime;
      if (!still) film.play().catch(() => {});
    };
    if (source) loadFilm();
    else if (window.warmDeckMedia) window.warmDeckMedia(slide).then(loadFilm);
    film.style.objectPosition = getComputedStyle(clip).objectPosition;
    title.textContent = isPlaceholder(tile.dataset.title) ? '' : tile.dataset.title;
    playing(false);
    box.classList.add('is-on');
    frame.getBoundingClientRect(); // commit the starting pose before growing
    frame.style.transition = '';
    frame.style.transform = 'none';
    box.querySelector('.vc-close').focus({ preventScroll: true });
  };

  const hide = () => {
    if (!open) return;
    const tile = open;
    open = null;
    frame.style.transform = over(tile, at);
    box.classList.remove('is-on');
    setTimeout(() => { if (!open) { film.pause(); film.removeAttribute('src'); film.load(); } }, 550);
    if (slide.classList.contains('on')) playing(true);
    tile.focus({ preventScroll: true });
  };

  // A tile click opens it instead of turning the slide.
  tiles.forEach((tile) => tile.addEventListener('click', (e) => { e.stopPropagation(); show(tile); }));
  box.addEventListener('click', hide);
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
    const r = open.getBoundingClientRect();
    at = fit(r.width / r.height);
    Object.assign(frame.style, {
      transition: 'none', transform: 'none', left: `${at.x}px`, top: `${at.y}px`, width: `${at.w}px`, height: `${at.h}px`,
    });
    requestAnimationFrame(() => { if (open) frame.style.transition = ''; });
  });

  playing(slide.classList.contains('on'));
})();
