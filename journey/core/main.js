// Boot + frame loop. One canonical journey state; chapters are lazy clusters.
import * as THREE from 'three';
import * as helpers from '../lib/helpers.js?v=6';
import { createCameraDirector, CHAPTER_RANGES, CLUSTER_OFFSETS, chapterAt, localProgress, REST_LO, REST_HI } from './camera.js?v=6';
import { createJourneyState } from './journeyState.js?v=6';
import { createInteractions } from './interact.js?v=6';
import { CONTENT } from './content.js?v=6';

const palette = {
  gold: 0xd9a441, goldBright: 0xf0c877, ember: 0xffb36b, deepGold: 0x8a6420,
  parchment: 0xf2ebdd, muted: 0xc9bfa8, coolAccent: 0x7fa8c9,
  bgWarmBlack: 0x0a0805, soil: 0x1a120a,
};

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loaderEl = document.getElementById('loader');
const loaderFill = document.getElementById('loader-organism');

function enterTier3(reason) {
  document.body.classList.add('tier3');
  document.body.classList.remove('webgl');
  const stage = document.getElementById('stage');
  if (stage) stage.remove();
  populateNodeDetails();
  if (loaderEl) {
    loaderEl.classList.add('done');
    setTimeout(() => loaderEl.remove(), 900);
  }
  console.info('[journey] Tier 3 static journey (' + reason + ')');
}

// Single source of truth: chapter copy and footer render FROM the content
// model at boot (all tiers), so index.html can never drift from content.js.
// The static HTML remains as a crawlable no-JS fallback.
function applyContentCopy() {
  for (const [id, meta] of Object.entries(CONTENT.chapters)) {
    const sec = document.querySelector(`.copy[data-chapter="${id}"]`);
    if (!sec) continue;
    const h = sec.querySelector('h1, h2');
    if (h && meta.heading) h.textContent = meta.heading;
    const sub = sec.querySelector('h1 + p, h2 + p');
    if (sub && meta.sub) sub.innerHTML = meta.sub; // trusted, our own content model
  }
  const f = CONTENT.footer;
  const grid = document.querySelector('#footer .footer-grid');
  if (f && grid) {
    const journey = Object.entries(CONTENT.chapters)
      .filter(([id]) => id !== 'final')
      .map(([id, m]) => `<a href="#/${id}">${m.nav}</a>`).join('');
    const eco = f.social.concat(f.links.filter(l => !l.href.startsWith('mailto:')))
      .filter((l, i, a) => a.findIndex(x => x.label === l.label) === i)
      .map(l => `<a href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join('');
    const contact = f.links.filter(l => l.href.startsWith('mailto:'))
      .map(l => `<a href="${l.href}">${l.href.replace('mailto:', '')}</a>`).join('');
    grid.innerHTML =
      `<div><h3>Banodoco</h3><p>One organism. One continuous circuit. Tools, spaces, and shared infrastructure for the open-source AI art ecosystem.</p></div>` +
      `<div><h3>Journey</h3>${journey}</div>` +
      `<div><h3>Ecosystem</h3>${eco}</div>` +
      `<div><h3>Contact</h3>${contact}<p class="legal">${f.legal}</p></div>`;
  }
}

// Always populate the accessible node information blocks (all tiers).
function populateNodeDetails() {
  for (const holder of document.querySelectorAll('[data-node-details]')) {
    const ids = holder.dataset.nodeDetails.split(/\s+/).filter(Boolean);
    for (const id of ids) {
      const meta = CONTENT.nodes[id];
      if (!meta) continue;
      const d = meta.drawer || meta.card || meta.spotlight || {};
      const det = document.createElement('details');
      det.className = 'node-details';
      const body = (d.body || []).map(p => `<p>${p}</p>`).join('');
      const wf = d.workflows?.length ? `<ul>${d.workflows.map(w => `<li>${w}</li>`).join('')}</ul>` : '';
      const links = (d.links || (d.link ? [d.link] : []))
        .map(l => `<a href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join(' · ');
      det.innerHTML = `<summary>${meta.label}${meta.short ? ` — <span>${meta.short}</span>` : ''}</summary>` +
        `<div>${body}${wf}${links ? `<p>${links}</p>` : ''}</div>`;
      holder.appendChild(det);
    }
    if (holder.dataset.nodeDetails === 'contributors') {
      for (const c of CONTENT.contributors) {
        const det = document.createElement('details');
        det.className = 'node-details';
        det.innerHTML = `<summary>${c.name} — <span>${c.role}</span></summary><div><p>${c.blurb}</p></div>`;
        holder.appendChild(det);
      }
    }
  }
}

async function boot() {
  applyContentCopy();
  if (reducedMotion) { enterTier3('prefers-reduced-motion'); wireNavStatic(); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.getContext();
  } catch (e) {
    enterTier3('webgl unavailable'); wireNavStatic(); return;
  }

  document.body.classList.add('webgl');
  // heuristics: coarse pointer or small screen → tier 2
  let tier = (matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 720) ? 2 : 1;

  renderer.setPixelRatio(Math.min(devicePixelRatio, tier === 1 ? 2 : 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(palette.bgWarmBlack, 1);
  document.getElementById('stage').appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x140e07, 0.016); // warm near-black: ember haze, not void
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.05, 400);

  const veilScene = new THREE.Scene();
  const veilCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const director = createCameraDirector(camera, veilScene);

  // optics (post stack) — degrade gracefully if it fails to build
  let optics = null;
  try {
    const mod = await import('./optics.js?v=6');
    optics = mod.createOptics(THREE, renderer, scene, camera,
      { tier, width: innerWidth, height: innerHeight, palette, reducedMotion });
  } catch (e) {
    console.warn('[journey] optics unavailable, raw render', e);
  }

  const journey = createJourneyState({
    // runtime hash navigation may target a chapter that hasn't lazy-loaded
    // yet — make sure its cluster (and hotspot buttons) exist before opening
    onNavigate: (r) => {
      if (r.node) ensureChapter(r.chapter).then(() => interactions.open(r.node));
    },
  });
  const interactions = createInteractions({
    camera, content: CONTENT, cameraDirector: director, journey,
    onFocusHint: (pos) => optics?.setFocusHint(pos),
  });

  const ctx = { THREE, helpers, palette, tier, reducedMotion, content: CONTENT };

  // ---- chapter cluster loading ----
  const loaded = new Map();     // id → chapter module instance
  const loading = new Map();    // id → promise
  const failed = new Set();
  async function ensureChapter(id) {
    if (loaded.has(id) || failed.has(id)) return loaded.get(id);
    if (loading.has(id)) return loading.get(id);
    const pr = import(`../chapters/${id}.js?v=6`).then(mod => {
      const ch = mod.createChapter(ctx);
      ch.group.position.copy(CLUSTER_OFFSETS[id]);
      scene.add(ch.group);
      if (tier === 2) ch.setQuality?.(2);
      interactions.registerChapter(id, ch, CLUSTER_OFFSETS[id]);
      loaded.set(id, ch);
      return ch;
    }).catch(err => {
      failed.add(id);
      console.error('[journey] chapter failed: ' + id, err);
    });
    loading.set(id, pr);
    return pr;
  }

  // Loading sequence: seed-spark grows while mission (hero) builds.
  const t0 = performance.now();
  await ensureChapter('mission');
  if (failed.has('mission')) { enterTier3('hero cluster failed'); return; }
  // lazy-load the rest while the visitor reads the opening
  const rest = ['equip', 'connect', 'inspire', 'owned', 'final'];
  let restIdx = 0;
  function loadNext() {
    if (restIdx >= rest.length) return;
    ensureChapter(rest[restIdx++]).then(() => setTimeout(loadNext, 120));
  }
  setTimeout(loadNext, 400);

  populateNodeDetails();

  // minimum-duration eased loader so progress never looks jumpy
  const minLoad = 1400;
  const elapsedLoad = performance.now() - t0;
  setTimeout(() => {
    loaderEl.classList.add('done');
    document.body.classList.add('alive');
    setTimeout(() => loaderEl.remove(), 1200);
  }, Math.max(0, minLoad - elapsedLoad));

  // ---- nav wiring ----
  wireNav(journey);
  // deep link entry
  const r0 = journey.parseHash();
  if (r0.chapter) {
    journey.jumpToChapter(r0.chapter);
    if (r0.node) ensureChapter(r0.chapter).then(() => setTimeout(() => interactions.open(r0.node), 600));
  }

  // QA hook (same convention as the hero page): ?dbg=1 exposes internals
  if (new URLSearchParams(location.search).has('dbg')) {
    window.__journey = { scene, camera, loaded, journey, optics, renderer, interactions };
  }

  // raw-vs-finished debug toggle
  let raw = false;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey &&
        !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) {
      raw = !raw; optics?.setRaw(raw);
      document.getElementById('debug-raw').hidden = !raw;
    }
  });

  // mission CTA pulls a pulse toward the stipe entry
  document.getElementById('cta-explore')?.addEventListener('mouseenter', () => loaded.get('mission')?.trigger?.('ctaPulse'));
  document.getElementById('cta-explore')?.addEventListener('focus', () => loaded.get('mission')?.trigger?.('ctaPulse'));
  document.getElementById('cta-explore')?.addEventListener('click', (e) => {
    e.preventDefault(); journey.flyToChapter('equip');
  });
  document.getElementById('cta-final')?.addEventListener('mouseenter', () => loaded.get('final')?.trigger?.('ringPulse'));
  document.getElementById('cta-final')?.addEventListener('focus', () => loaded.get('final')?.trigger?.('ringPulse'));

  // ---- resize ----
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    optics?.setSize(innerWidth, innerHeight);
  });

  // ---- performance watchdog: tier 1 → tier 2, never webgl → static ----
  let slowFrames = 0, watchdogDone = tier === 2;
  function watchdog(dt) {
    if (watchdogDone) return;
    if (dt > 1 / 42) { slowFrames++; } else { slowFrames = Math.max(0, slowFrames - 2); }
    if (slowFrames > 150) {
      watchdogDone = true; tier = 2;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setSize(innerWidth, innerHeight);
      optics?.setSize(innerWidth, innerHeight);
      optics?.setTier(2);
      for (const ch of loaded.values()) ch.setQuality?.(2);
      console.info('[journey] watchdog: simplified to tier 2');
    }
  }

  // ---- copy visibility ----
  const copyEls = new Map();
  for (const s of document.querySelectorAll('.copy')) copyEls.set(s.dataset.chapter, s);
  const navLinks = new Map();
  for (const a of document.querySelectorAll('#nav [data-chapter]')) navLinks.set(a.dataset.chapter, a);
  let lastRouteChapter = null;

  // ---- frame loop ----
  const clock = new THREE.Clock();
  let time = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.1);
    time += dt;
    const p = journey.update(dt);
    const { chapter, cp, veil } = director.update(p, time, dt);

    // route reflects the chapter (only when not showing a node route)
    if (chapter.id !== lastRouteChapter && !interactions.selected) {
      lastRouteChapter = chapter.id;
      journey.writeRoute(chapter.id, null);
      // epilogue: Owned stays active in nav during final
      const navActive = chapter.id === 'final' ? 'owned' : chapter.id;
      for (const [id, a] of navLinks) a.classList.toggle('is-active', id === navActive);
      document.body.dataset.chapter = chapter.id;
    }

    // copy fades in at rest, releases during travel
    for (const [id, el] of copyEls) {
      const c = CHAPTER_RANGES.find(c => c.id === id);
      const lcp = localProgress(p, c);
      const inRange = p >= c.start && p <= c.end;
      // first chapter is readable from page load; the epilogue stays up through
      // the long pullback
      const lo = id === 'mission' ? -1 : REST_LO;
      const hi = id === 'final' ? 2 : REST_HI + 0.02; // copy lingers a touch past labels
      const vis = inRange && lcp > lo && lcp < hi && veil < 0.3 &&
        !(id === 'final' && p > 0.985); // release the epilogue copy to the footer
      el.classList.toggle('is-visible', vis);
    }
    document.getElementById('footer').classList.toggle('is-visible', p > 0.985);
    document.getElementById('scroll-hint').classList.toggle('is-visible', p < 0.02 && !interactions.selected);

    // update chapters near the camera only
    const idx = CHAPTER_RANGES.indexOf(chapter);
    for (const [id, ch] of loaded) {
      const cidx = CHAPTER_RANGES.findIndex(c => c.id === id);
      const near = Math.abs(cidx - idx) <= 1;
      ch.group.visible = near;
      if (near) {
        const cr = CHAPTER_RANGES[cidx];
        ch.update(dt, time, localProgress(p, cr), id === chapter.id);
      }
    }

    interactions.update(chapter.id, cp, veil);

    if (optics && !raw) optics.render(dt, time); else renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.render(veilScene, veilCam);
    renderer.autoClear = true;

    watchdog(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function wireNav(journey) {
  for (const a of document.querySelectorAll('#nav [data-chapter]')) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      journey.writeRoute(a.dataset.chapter, null, { push: true });
      journey.flyToChapter(a.dataset.chapter);
    });
  }
}
function wireNavStatic() {
  // tier 3: nav anchors scroll to sections natively
  for (const a of document.querySelectorAll('#nav [data-chapter]')) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector(`.copy[data-chapter="${a.dataset.chapter}"]`)
        ?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

boot();
