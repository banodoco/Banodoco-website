// tworp — "a miniature editorial cover" (2RP / 2nd Renaissance People, an
// art+tech publication, COMING SOON).
//
// The card is visual-editorial, NOT stats, and deliberately has NO link — an
// unbuilt thing gets a cover, not a door (content/content.js keeps the node's
// own content decision). Identity, verified 2026-08-17 against the
// banodoco.ai repo: the 2RP wordmark renders in a RANDOM display face per
// session from a fixed list — that rotation IS the identity. Three of its
// real faces are subset locally, and the cover art is the site's own 2RP card
// image (VisualFrisson, "Everyone All at Once").
//
// The masthead FLICKERS through the faces on hover (Hannah, 2026-08-17:
// "make the name 2rp flicker to different fonts like the website when you
// hover") — the site draws one face per session; the card compresses that
// identity into a hover you can feel. (Its "104 WEEKS…" hero stat line was
// tried here and cut the same day, also Hannah.)

import { CARD_ASSETS, REDUCE } from './index.js';

// the site's own wordmark rotation; subsets cover "2RP" etc.
const FACES = ['Monoton', 'Sixtyfour', 'Rubik Glitch'];
const FLICKER_MS = 340;   // one face per beat while hovered

let stageEl = null, mastEl = null, face = 0, flicker = null;

function setFace(i) {
  face = ((i % FACES.length) + FACES.length) % FACES.length;
  mastEl.style.fontFamily = `'${FACES[face]}', 'Impact', sans-serif`;
}

export default {
  build(stage) {
    stageEl = stage;
    stage.classList.add('rp');

    const cover = document.createElement('img');
    cover.className = 'rp-cover';
    cover.src = `${CARD_ASSETS}/tworp/cover.jpg`;
    cover.alt = '';
    cover.loading = 'lazy';
    cover.decoding = 'async';

    const scrim = document.createElement('div');
    scrim.className = 'rp-scrim';

    const head = document.createElement('div');
    head.className = 'rp-head';
    head.setAttribute('aria-hidden', 'true');   // decorative; the description is the short line
    const eyebrow = document.createElement('span');
    eyebrow.className = 'rp-eyebrow';
    eyebrow.textContent = '2ND RENAISSANCE PEOPLE';
    const mast = document.createElement('span');
    mast.className = 'rp-masthead';
    mast.textContent = '2RP';
    mastEl = mast;
    // the opening face is a random draw, as the site's is per session
    setFace(Math.floor(Math.random() * FACES.length));
    // the five-word dek under the mast (Hannah, 2026-08-18): what 2RP is
    const dek = document.createElement('span');
    dek.className = 'rp-dek';
    dek.textContent = 'AN ART & TECH PUBLICATION';
    head.append(eyebrow, mast, dek);

    // hover = the identity itself: the mark cycles faces while pointed at
    stage.addEventListener('pointerenter', () => {
      if (REDUCE.matches || flicker) return;
      flicker = setInterval(() => setFace(face + 1), FLICKER_MS);
    });
    stage.addEventListener('pointerleave', () => {
      if (flicker) { clearInterval(flicker); flicker = null; }
    });

    const soon = document.createElement('span');
    soon.className = 'rp-soon';
    soon.textContent = 'COMING SOON';
    // ui.js previewFor renders title/short/link only — never the card's status
    // line — so the cover carries the promise. The short line already says
    // "Coming soon.", so keep this decorative rather than double-announcing.
    soon.setAttribute('aria-hidden', 'true');

    stage.append(cover, scrim, head, soon);
  },

  activate() {
    if (REDUCE.matches) return;   // static cover under reduced motion
    stageEl.classList.add('rp-live');
  },

  deactivate() {
    stageEl.classList.remove('rp-live');
    if (flicker) { clearInterval(flicker); flicker = null; }
  },
};
