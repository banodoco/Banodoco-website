// journey-v6 — the DOM layer: persistent nav, chapter copy, detail cards and
// hotspot proxies. Everything is BUILT AT BOOT, i.e. after the hero's entry
// choreography has finished and journey.js has been lazy-loaded, so the hero's
// own first paint, TTI and Mission screenshot are untouched by construction:
// none of these nodes exist while the hero is settling.
//
// Copy comes from content/content.js and nowhere else (13-content-ops.md
// CO-2.2: one content source governs everything). The Mission chapter is the
// exception by design - its copy is the hero's OWN DOM (06-mission-
// preservation.md), so this module fades that block rather than duplicating it.

import { CONTENT } from '../content/content.js';
import {
  CHAPTERS, COPY_BANDS, COPY_FADE_P,
  COPY_OUT_K, COPY_IN_K, COPY_SETTLE_LO, COPY_SETTLE_HI,
  COPY_TRAVEL_LO, COPY_TRAVEL_HI,
  HOTSPOT_STAGGER_MS, HOTSPOT_IN_K, HOTSPOT_OUT_K,
} from '../constants.js';

const CHAPTER_POSITION = {
  inspire: 'pos-bottom',
  connect: 'pos-left',
  owned: 'pos-topcentre',
  final: 'pos-upperleft',
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function smoothA(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

function bandOpacity(p, band) {
  if (!band) return 0;
  const { lo, hi } = band;
  if (p <= lo - COPY_FADE_P || p >= hi + COPY_FADE_P) return 0;
  const inLo = lo <= -1 ? 1 : Math.min(1, Math.max(0, (p - (lo - COPY_FADE_P)) / COPY_FADE_P));
  const inHi = hi >= 2 ? 1 : Math.min(1, Math.max(0, ((hi + COPY_FADE_P) - p) / COPY_FADE_P));
  const a = Math.min(inLo, inHi);
  return a * a * (3 - 2 * a);
}

export function createUI({ onNav, onOpen, onClose, isDetailOpen }) {
  /* ---------------- persistent nav ---------------- */
  // Rendered into the hero's own <nav>, between the wordmark and the 2RP /
  // Discord pair, and styled like it. Hidden at p = 0 so the Mission
  // composition is byte-identical to the hero; it fades in with the first
  // travel and is then persistent for the rest of the journey.
  const navHost = document.querySelector('.ui nav');
  const navWrap = el('div', 'j-nav');
  const navLinks = {};
  for (const c of CHAPTERS) {
    if (!c.nav) continue;                       // Final has no nav entry (v6)
    const a = el('a', 'j-navlink', c.nav);
    a.href = `#/${c.id}`;
    a.dataset.chapter = c.id;
    a.addEventListener('click', (e) => { e.preventDefault(); onNav(c.id); });
    navWrap.appendChild(a);
    navLinks[c.id] = a;
  }
  if (navHost) navHost.insertBefore(navWrap, navHost.querySelector('.nav-cta'));

  /* ---------------- chapter copy ---------------- */
  const copyHost = el('div', 'j-copy');
  document.body.appendChild(copyHost);
  const blocks = {};
  for (const c of CHAPTERS) {
    const data = CONTENT.chapters[c.id];
    if (!data || c.id === 'mission') continue;   // Mission is the hero's own DOM
    const b = el('div', `j-block ${CHAPTER_POSITION[c.id] || 'pos-left'}`);
    b.dataset.chapter = c.id;
    b.appendChild(el('h2', 'j-h', data.heading));
    if (data.sub) b.appendChild(el('p', 'j-sub', data.sub));
    if (data.claims) {
      const ul = el('ul', 'j-claims');
      for (const cl of data.claims) {
        const li = el('li', `j-claim ${cl.tier}`);
        li.appendChild(el('span', 'j-claim-t', cl.text));
        if (cl.detail) li.appendChild(el('span', 'j-claim-d', cl.detail));
        ul.appendChild(li);
      }
      b.appendChild(ul);
    }
    copyHost.appendChild(b);
    blocks[c.id] = b;
  }
  const heroBlock = document.querySelector('.ui .hero');

  /* ---------------- hotspot proxies ---------------- */
  const hotHost = el('div', 'j-hotspots');
  document.body.appendChild(hotHost);
  const hotspots = [];

  /** Register a named node. `world()` returns a THREE.Vector3 or null.
   *  Registration order within a chapter is the label stagger order. */
  function addHotspot({ id, chapter, label, world }) {
    const stagger = hotspots.filter(h => h.chapter === chapter).length;
    const btn = el('button', 'j-hot');
    btn.type = 'button';
    btn.dataset.node = id;
    btn.dataset.chapter = chapter;
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.appendChild(el('i', 'j-hot-dot'));
    btn.appendChild(el('span', 'j-hot-label', label));
    btn.addEventListener('click', () => onOpen(id, btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(id, btn); }
    });
    const h = { id, chapter, btn, world, hot: false, stagger, a: 0, armAt: null, sup: false };
    const setHot = (on) => { h.hot = on; btn.classList.toggle('hot', on); if (h.onHot) h.onHot(on); };
    btn.addEventListener('pointerenter', () => setHot(true));
    btn.addEventListener('pointerleave', () => setHot(false));
    btn.addEventListener('focus', () => setHot(true));
    btn.addEventListener('blur', () => setHot(false));
    hotHost.appendChild(btn);
    hotspots.push(h);
    return h;
  }

  /* ---------------- detail card ---------------- */
  const card = el('aside', 'j-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'false');
  card.hidden = true;
  const cardClose = el('button', 'j-card-x', '✕');
  cardClose.type = 'button';
  cardClose.setAttribute('aria-label', 'Close');
  const cardBody = el('div', 'j-card-body');
  card.appendChild(cardClose);
  card.appendChild(cardBody);
  document.body.appendChild(card);
  cardClose.addEventListener('click', () => onClose());
  let returnFocus = null;

  function openCard(nodeId, trigger) {
    const node = CONTENT.nodes[nodeId]
      || CONTENT.contributors.find(c => c.id === nodeId);
    if (!node) return false;
    const d = node.spotlight || node.card
      // contributor rows have no card block: everyone is the anonymous ember
      // fallback until the consent pipeline lands (CO-1.4 / OW-4.4)
      || (node.role ? { title: node.name, body: [node.role, node.blurb] } : null)
      || { title: node.label, body: [node.short] };
    cardBody.textContent = '';
    const h = el('h3', 'j-card-h', d.title || node.label);
    h.id = 'j-card-h';
    cardBody.appendChild(h);
    card.setAttribute('aria-labelledby', 'j-card-h');
    if (d.claim) cardBody.appendChild(el('p', 'j-card-claim', d.claim + (d.claimDetail ? ' — ' + d.claimDetail : '')));
    for (const para of (d.body || [])) cardBody.appendChild(el('p', 'j-card-p', para));
    if (d.status) cardBody.appendChild(el('p', 'j-card-status', d.status));
    if (d.link) {
      const a = el('a', 'j-card-link', d.link.label);
      a.href = d.link.href || '#';
      cardBody.appendChild(a);
    }
    card.hidden = false;
    card.classList.add('open');
    returnFocus = trigger || null;
    cardClose.focus();
    return true;
  }

  function closeCard() {
    if (card.hidden) return;
    card.classList.remove('open');
    card.hidden = true;
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !card.hidden) { e.preventDefault(); onClose(); }
  });

  /* ---------------- per-frame ---------------- */
  let navShown = false;

  // W3-B (gap e): copy choreography. The COPY_BANDS say WHERE copy may live;
  // this layer decides WHEN. Copy releases the moment travel begins (fast
  // temporal fade driven by scrub speed, even inside its own band) and
  // re-anchors only once the camera has settled — a slow breathe-in gated on
  // |dp/dt|, so a fast pass through a rest never flashes its copy, and a
  // deliberate arrival gets its text only after the composition has made its
  // negative space. dt === 0 (deep-link placement / hidden-tab capture) snaps
  // straight to the target so captures are deterministic.
  const eased = { mission: 0 };
  for (const id in COPY_BANDS) eased[id] = 0;
  let lastP = null;
  let pSpeed = 0;             // smoothed |dp/dt|, p per second

  function update(p, chapterId, camera, dt = 0) {
    // nav: hidden at the hero rest, persistent from the first travel on
    const show = p > 0.004;
    if (show !== navShown) { navWrap.classList.toggle('on', show); navShown = show; }
    const active = chapterId === 'final' ? 'owned' : chapterId;   // Owned stays lit through Final
    for (const id in navLinks) navLinks[id].classList.toggle('active', id === active);

    if (dt > 0 && lastP !== null) {
      pSpeed += (Math.abs(p - lastP) / dt - pSpeed) * Math.min(1, dt * 5);
    } else if (dt === 0) {
      pSpeed = 0;             // placed, not travelled
    }
    lastP = p;
    // moving fast releases copy even inside its band; arriving slow lets it in
    const travelHold = 1 - smoothA((pSpeed - COPY_TRAVEL_LO) / (COPY_TRAVEL_HI - COPY_TRAVEL_LO));
    const settled = 1 - smoothA((pSpeed - COPY_SETTLE_LO) / (COPY_SETTLE_HI - COPY_SETTLE_LO));

    for (const id in eased) {
      const target = bandOpacity(p, COPY_BANDS[id]) * travelHold;
      let s = eased[id];
      if (dt === 0) s = target;
      else if (target < s) s += (target - s) * Math.min(1, dt * COPY_OUT_K);
      else s += (target - s) * Math.min(1, dt * COPY_IN_K * settled);
      if (s < 0.001 && target === 0) s = 0;
      eased[id] = s;
      if (id === 'mission') {
        if (heroBlock) {
          heroBlock.style.opacity = s;
          heroBlock.style.pointerEvents = s > 0.5 ? '' : 'none';
        }
      } else if (blocks[id]) {
        blocks[id].style.opacity = s;
        blocks[id].style.visibility = s > 0.002 ? 'visible' : 'hidden';
      }
    }

    // hotspots: they belong to the RESTING composition, so they follow the
    // eased copy state (never the raw band), arrive AFTER the copy has
    // re-anchored, one per HOTSPOT_STAGGER_MS in narrative order (gap g),
    // and never show while a detail is open (the frame belongs to the detail)
    const detail = isDetailOpen();
    const now = performance.now();
    for (const h of hotspots) {
      const gate = eased[h.chapter] || 0;
      let want = gate > 0.72 && !detail;
      let w = want ? h.world() : null;
      let sx = 0, sy = 0;
      if (w) {
        const v = w.clone().project(camera);
        // behind the camera, or too near the frame edge to carry a readable
        // label without clipping
        if (v.z > 1 || Math.abs(v.x) > 0.92 || Math.abs(v.y) > 0.9) {
          w = null;
        } else {
          sx = (v.x * 0.5 + 0.5) * window.innerWidth;
          sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
          // The chapter's editorial copy owns its area of the frame: a
          // hotspot that projects into it is suppressed rather than drawn on
          // top of the text. Hit model stays honest - a suppressed hotspot is
          // also removed from the tab order, so keyboard and pointer agree.
          // W3-B: the test has HYSTERESIS (enter at +8 px, leave at +26 px) —
          // the organism's ambient sway moves projections a few px per
          // second, and a single margin made borderline labels strobe.
          const cb = blocks[h.chapter];
          if (cb && cb.style.visibility === 'visible') {
            const r = cb.getBoundingClientRect();
            const m = h.sup ? 26 : 8;
            h.sup = sx > r.left - m && sx < r.right + m && sy > r.top - m && sy < r.bottom + m;
            if (h.sup) w = null;
          } else h.sup = false;
        }
      }
      want = want && !!w;
      if (want) {
        if (h.armAt === null) h.armAt = now + h.stagger * HOTSPOT_STAGGER_MS;
        if (dt === 0) h.a = 1;
        else if (now >= h.armAt) h.a += (1 - h.a) * Math.min(1, dt * HOTSPOT_IN_K);
        h.btn.style.transform = `translate(${sx}px, ${sy}px)`;
      } else {
        h.armAt = null;
        if (dt === 0) h.a = 0;
        else { h.a += (0 - h.a) * Math.min(1, dt * HOTSPOT_OUT_K); if (h.a < 0.02) h.a = 0; }
      }
      const vis = h.a > 0.015;
      h.btn.style.opacity = h.a;
      h.btn.classList.toggle('vis', vis);
      h.btn.tabIndex = want && vis ? 0 : -1;
    }
  }

  return {
    update, addHotspot, openCard, closeCard,
    get cardOpen() { return !card.hidden; },
    hotspots,
  };
}
