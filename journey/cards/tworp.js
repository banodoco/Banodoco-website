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

import { CARD_ASSETS, REDUCE } from './runtime.js';

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

    // the cover is a bounded plate (round 2): media, scrim and masthead
    // share one frame, and the launch status gets a real band below it so
    // the card ends like the others instead of trailing off in the art
    const media = document.createElement('div');
    media.className = 'rp-media';

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
    const mast = document.createElement('span');
    mast.className = 'rp-masthead';
    mast.textContent = '2RP';
    mastEl = mast;
    // the opening face is a random draw, as the site's is per session
    setFace(Math.floor(Math.random() * FACES.length));
    // Round 3: the dek that led the mark is gone — it was the shell head's
    // short line word for word, and the restored head says it now. The
    // masthead alone is the cover; its rotating face IS the identity.

    // hover = the identity itself: the mark cycles faces while pointed at
    stage.addEventListener('pointerenter', () => {
      if (REDUCE.matches || flicker) return;
      flicker = setInterval(() => setFace(face + 1), FLICKER_MS);
    });
    stage.addEventListener('pointerleave', () => {
      if (flicker) { clearInterval(flicker); flicker = null; }
    });

    head.append(mast);
    media.append(cover, scrim, head);

    // the ending — a letterpress status band, the one card that closes on
    // a promise instead of a door. The short line already says "Coming
    // soon." for AT, so the band stays decorative rather than
    // double-announcing.
    const foot = document.createElement('div');
    foot.className = 'rp-foot card-door';
    foot.setAttribute('aria-hidden', 'true');
    const soon = document.createElement('span');
    soon.className = 'rp-soon';
    soon.textContent = 'COMING SOON';
    foot.appendChild(soon);

    stage.append(media, foot);
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
