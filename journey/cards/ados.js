// ados — "a window into the actual events" (the event-series card).
//
// ados.events' own language, miniaturized: a full-bleed event-media window —
// poster <img> underneath, the animated preview crossfading in over it
// (opacity 500ms), a black-to-clear scrim, the wordmark in real Pilowlava
// with an "AI ART GATHERINGS" eyebrow, and the minimal ‹ › event walker over
// a "Paris — 17–19 April 2026" caption line. Sources, verified 2026-08-17
// against ados.events and its bundle (research pass):
//   wordmark — Pilowlava (its self-hosted hero face, subset),
//              assets/cards/ados/pilowlava-sub.woff2.
//   ground   — #0a0a0a, its theme-color.
//   eyebrow  — its hero's subtitle language: tiny uppercase, 0.35em tracking,
//              white/70 ("AI ART GATHERINGS").
//   media    — its event-media component: poster img, animated preview
//              crossfade 500ms, scrim linear-gradient(to top, black,
//              rgba(0,0,0,.4), rgba(0,0,0,.15)), border rgba(255,255,255,.10).
//   events   — its own event array, verbatim. The Paris 2026 date is
//              ados.events' "17–19 April 2026", the source of truth over the
//              banodoco.ai repo's truncated string.
//
// STATS: none. This card is a trailer window and an event walker, not a
// counter — cards/index.js policy (a) only covers dated COMPLETED artefacts,
// and "current event" is live navigation state, not a shipped figure.

import { CARD_ASSETS, REDUCE } from './index.js';

const EVENTS = [
  { name: 'Paris',       date: '17–19 April 2026', tag: 'Just wrapped',
    thumb: 'paris-2026-thumb.jpg', preview: 'paris-2026-preview.webp' },
  { name: 'Los Angeles', date: '7 November 2025',  tag: null,
    thumb: 'la-2025-thumb.jpg',    preview: 'la-2025-preview.webp' },
  { name: 'Paris',       date: '28–29 March 2025', tag: null,
    thumb: 'paris-2025-thumb.jpg', preview: 'paris-2025-preview.webp' },
];

const AUTO_MS = 6000;        // their useEventsAutoAdvance interval
const CROSSFADE_MS = 500;    // their event-media preview crossfade

let idx = 0, timer = null, pending = null;
let posterEl, previewEl, lineEl, tagEl;

function caption(i, animate = false) {
  const ev = EVENTS[i];
  lineEl.textContent = `${ev.name} — ${ev.date}`;
  tagEl.textContent = ev.tag ? ev.tag.toUpperCase() : '';
  tagEl.hidden = !ev.tag;
  if (animate && !REDUCE.matches) {
    // re-arm the caption's rise so it lands with the media crossfade
    const center = lineEl.parentElement;
    center.classList.remove('ad-swap');
    void center.offsetWidth;
    center.classList.add('ad-swap');
  }
}

/** Load the current event's animated preview and crossfade it in (500ms). */
function setPreview() {
  previewEl.onload = () => previewEl.classList.add('on');
  previewEl.classList.remove('on');
  previewEl.src = `${CARD_ASSETS}/ados/${EVENTS[idx].preview}`;
  if (previewEl.complete) previewEl.classList.add('on');
}

function render(i) {
  idx = i;
  caption(i, true);
  const ev = EVENTS[idx];
  if (REDUCE.matches) {
    // poster-only still; previews are never loaded under reduced motion
    posterEl.src = `${CARD_ASSETS}/ados/${ev.thumb}`;
    return;
  }
  // their crossfade: the preview fades out, poster + preview swap underneath,
  // the new preview fades back in over 500ms.
  if (pending) clearTimeout(pending);
  previewEl.classList.remove('on');
  pending = setTimeout(() => {
    pending = null;
    posterEl.src = `${CARD_ASSETS}/ados/${ev.thumb}`;
    setPreview();
  }, CROSSFADE_MS);
}

function step(delta) {
  render((idx + delta + EVENTS.length) % EVENTS.length);
}

function manualStep(delta) {
  // stop auto for the rest of this reveal
  if (timer) { clearInterval(timer); timer = null; }
  step(delta);
}

export default {
  build(stage) {
    stage.classList.add('ad');

    const media = document.createElement('div');
    media.className = 'ad-media';
    posterEl = document.createElement('img');
    posterEl.className = 'ad-poster';
    posterEl.src = `${CARD_ASSETS}/ados/${EVENTS[0].thumb}`;
    posterEl.alt = '';
    posterEl.loading = 'lazy';
    posterEl.decoding = 'async';
    previewEl = document.createElement('img');
    previewEl.className = 'ad-preview';
    previewEl.alt = '';
    previewEl.loading = 'lazy';
    previewEl.decoding = 'async';
    media.append(posterEl, previewEl);

    const scrim = document.createElement('div');
    scrim.className = 'ad-scrim';

    const word = document.createElement('div');
    word.className = 'ad-word';
    word.setAttribute('aria-hidden', 'true');   // decorative; the description is the short line
    const mark = document.createElement('span');
    mark.className = 'ad-mark';
    mark.textContent = 'ADOS';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'ad-eyebrow';
    eyebrow.textContent = 'AI ART GATHERINGS';
    word.append(mark, eyebrow);

    const bar = document.createElement('div');
    bar.className = 'ad-bar';
    const prev = document.createElement('button');
    prev.className = 'ad-nav ad-prev';
    prev.type = 'button';
    prev.tabIndex = -1;   // ui.js promotes controls to tabbable on pin
    prev.setAttribute('aria-label', 'Previous event');
    prev.textContent = '‹';
    const next = document.createElement('button');
    next.className = 'ad-nav ad-next';
    next.type = 'button';
    next.tabIndex = -1;
    next.setAttribute('aria-label', 'Next event');
    next.textContent = '›';
    const center = document.createElement('div');
    center.className = 'ad-center';
    lineEl = document.createElement('span');
    lineEl.className = 'ad-line';
    tagEl = document.createElement('span');
    tagEl.className = 'ad-tag';
    center.append(lineEl, tagEl);

    prev.addEventListener('click', () => manualStep(-1));
    next.addEventListener('click', () => manualStep(1));
    // Enter/Space activate natively; buttons don't map arrows, so add them
    // for the pinned keyboard walker.
    const onNavKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); manualStep(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); manualStep(1); }
    };
    prev.addEventListener('keydown', onNavKey);
    next.addEventListener('keydown', onNavKey);

    // the walker arrows live on the SIDE EDGES at vertical middle (Hannah,
    // 2026-08-18: fixed in place, so they never move as captions change);
    // the bar keeps only the event line, centred at the bottom
    bar.append(center);

    // the door, in the site's own eyebrow voice, top-right like its event
    // tags; revealed on hover/pin by the shared card-cta rule
    const cta = document.createElement('a');
    cta.className = 'ad-cta card-cta';
    cta.href = 'https://ados.events/';
    cta.target = '_blank';
    cta.rel = 'noopener noreferrer';
    cta.tabIndex = -1;
    cta.textContent = 'SEE EVENTS →';

    stage.append(media, scrim, word, bar, prev, next, cta);

    caption(0);
  },

  activate() {
    // every fresh reveal opens on the MOST RECENT event (Hannah,
    // 2026-08-17) — the walker and auto-advance move on from there
    if (idx !== 0) {
      idx = 0;
      caption(0);
      posterEl.src = `${CARD_ASSETS}/ados/${EVENTS[0].thumb}`;
    }
    if (REDUCE.matches || timer) return;   // poster-only; never load the previews
    setPreview();
    timer = setInterval(() => { if (!REDUCE.matches) step(1); }, AUTO_MS);
  },

  deactivate() {
    if (timer) { clearInterval(timer); timer = null; }
    if (pending) {
      clearTimeout(pending);
      pending = null;
      // a fade-out was in flight: finish the poster swap so the poster always
      // matches idx (posters survive deactivate; the preview is dropped below)
      posterEl.src = `${CARD_ASSETS}/ados/${EVENTS[idx].thumb}`;
    }
    previewEl.classList.remove('on');
    previewEl.removeAttribute('src');   // free the animation; keep posters
    previewEl.onload = null;
  },
};
