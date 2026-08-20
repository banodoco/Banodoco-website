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

import { CARD_ASSETS, REDUCE } from './runtime.js';

const EVENTS = [
  { name: 'Paris',       date: '17–19 April 2026', tag: null,
    thumb: 'paris-2026-thumb.jpg', preview: 'paris-2026-preview.mp4' },
  { name: 'Los Angeles', date: '7 November 2025',  tag: null,
    thumb: 'la-2025-thumb.jpg',    preview: 'la-2025-preview.mp4' },
  { name: 'Paris',       date: '28–29 March 2025', tag: null,
    thumb: 'paris-2025-thumb.jpg', preview: 'paris-2025-preview.mp4' },
];

// One video per event (~10s), played once; when it ends the FINAL FRAME
// HOLDS on screen (Peter, 2026-08-18: "play like 10 seconds before
// stopping on the final frame"). No auto-advance — the ‹ › arrows are
// the only way to move between the three events (retrying auto-advance
// read as "the old behaviour": a stalled video ended early and the card
// kept crossfading to the next poster).
const CROSSFADE_MS = 500;    // their event-media preview crossfade

let idx = 0, pending = null;
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

/** Point the preview at the current event and crossfade it in (500ms)
    once frames are actually rendering — the poster holds until then. */
function setPreview() {
  previewEl.classList.remove('on');
  previewEl.src = `${CARD_ASSETS}/ados/${EVENTS[idx].preview}`;
  previewEl.play().catch(() => {});   // autoplay veto -> the poster stays
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

function manualStep(delta) {
  render((idx + delta + EVENTS.length) % EVENTS.length);
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
    previewEl = document.createElement('video');
    previewEl.className = 'ad-preview';
    previewEl.muted = true;
    // NO NATIVE FULLSCREEN (2026-08-19): on a phone the browser's tap-on-
    // video default opens the full-screen player — this card is a window,
    // not a cinema, so the media plays inline and a tap on it is inert.
    // preventDefault on click stops that default; the attributes keep
    // Chrome from offering PiP / playback-rate chrome over it either.
    previewEl.controls = false;
    previewEl.disablePictureInPicture = true;
    previewEl.setAttribute('controlsList', 'noplaybackrate nodownload noremoteplayback');
    previewEl.addEventListener('click', (e) => e.preventDefault());
    // no loop: the preview plays once and HOLDS its final frame (Peter,
    // 2026-08-18); `ended` needs no handler — a finished video keeps the
    // last frame on screen by itself
    previewEl.playsInline = true;
    // preload the whole clip: each file is ~500KB, and Safari's media
    // loader stalls/finishes early on range-requested progressive
    // playback, which showed as "plays a second then the poster" — a
    // single full fetch removes that failure mode entirely
    previewEl.preload = 'auto';
    previewEl.setAttribute('aria-hidden', 'true');
    previewEl.addEventListener('playing', () => {
      previewEl.classList.add('on');
      // once real frames are rendering the poster is DONE for this reveal —
      // it must never come back over the video (a decoder hiccup or surface
      // drop otherwise shows the thumbnail through the transparent element)
      posterEl.style.visibility = 'hidden';
    });
    // a real decode/load failure parks on the poster (the autoplay-veto
    // fallback) — never churn the walker
    previewEl.addEventListener('error', () => {
      previewEl.classList.remove('on');
      posterEl.style.visibility = '';
    });
    media.append(posterEl, previewEl);

    const scrim = document.createElement('div');
    scrim.className = 'ad-scrim';

    const word = document.createElement('div');
    word.className = 'ad-word';
    const mark = document.createElement('span');
    mark.className = 'ad-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = 'ADOS';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'ad-eyebrow';
    eyebrow.setAttribute('aria-hidden', 'true');
    eyebrow.textContent = 'AI ART GATHERINGS';

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
    // One centred identity stack: current gathering, ADOS, then its eyebrow.
    // Keeping the caption in this group means changing events never changes
    // the group's optical centre or pushes a separate footer around.
    word.append(center, mark, eyebrow);

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

    // horizontal swipe = the ‹ › walker (2026-08-19): on touch a finger
    // pull steps the events exactly as the arrows do — right pulls the
    // previous event in, left the next. Only a committed horizontal drag
    // steps; a tap on the media stays a tap (the fullscreen guard above).
    let swipe = null;
    const SWIPE_MIN_X = 44;   // px of horizontal travel before a swipe commits
    const onSwipeDown = (e) => {
      if (e.pointerType !== 'touch') return;
      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onSwipeMove = (e) => {
      if (!swipe || e.pointerId !== swipe.id) return;
      swipe.dx = e.clientX - swipe.x;
      swipe.dy = e.clientY - swipe.y;
    };
    const onSwipeUp = (e) => {
      if (!swipe || e.pointerId !== swipe.id) return;
      const { dx = 0, dy = 0 } = swipe;
      swipe = null;
      if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dx) <= Math.abs(dy)) return;
      manualStep(dx < 0 ? 1 : -1);
    };
    stage.addEventListener('pointerdown', onSwipeDown, { passive: true });
    stage.addEventListener('pointermove', onSwipeMove, { passive: true });
    stage.addEventListener('pointerup', onSwipeUp, { passive: true });
    stage.addEventListener('pointercancel', () => { swipe = null; });

    // the walker arrows live on the SIDE EDGES at vertical middle (Hannah,
    // 2026-08-18: fixed in place, so they never move as captions change)

    // the door, in the site's own eyebrow voice, top-right like its event
    // tags; revealed on hover/pin by the shared card-cta rule
    const cta = document.createElement('a');
    cta.className = 'ad-cta card-cta';
    cta.href = 'https://ados.events/';
    cta.target = '_blank';
    cta.rel = 'noopener noreferrer';
    cta.tabIndex = -1;
    cta.textContent = 'SEE EVENTS →';

    stage.append(media, scrim, word, prev, next, cta);

    caption(0);
  },

  activate() {
    // every fresh reveal opens on the MOST RECENT event (Hannah,
    // 2026-08-17); the ‹ › walker moves on from there
    if (idx !== 0) {
      idx = 0;
      caption(0);
      posterEl.src = `${CARD_ASSETS}/ados/${EVENTS[0].thumb}`;
    }
    if (REDUCE.matches) return;   // poster-only; never load the previews
    setPreview();
  },

  deactivate() {
    if (pending) {
      clearTimeout(pending);
      pending = null;
      // a fade-out was in flight: finish the poster swap so the poster always
      // matches idx (posters survive deactivate; the preview is dropped below)
      posterEl.src = `${CARD_ASSETS}/ados/${EVENTS[idx].thumb}`;
    }
    previewEl.pause();
    previewEl.classList.remove('on');
    previewEl.removeAttribute('src');   // free the decoder; keep posters
    previewEl.load();
    posterEl.style.visibility = '';     // next reveal starts on the poster again
  },
};
