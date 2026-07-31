// Interaction layer: projected DOM node-buttons per hotspot, hover/focus parity,
// drawers (desktop) / bottom sheets (touch), cards, profile cards.
// Canvas stays presentational; every interactive thing here is real DOM.
import * as THREE from 'three';
import { REST_LO, REST_HI } from './camera.js?v=6';

const DRAWER_NODES = new Set(['pype', 'arnold', 'astrid']); // full drawers + camera focus
const CARD_NODES = new Set(['community', 'ados', 'hivemind', 'pod-shared', 'pod-monthly', 'pod-split']);
const SPOTLIGHT_NODES = new Set(['arca', 'artcompute', 'tworp']);

export function createInteractions({ camera, content, cameraDirector, journey, onSelect, onHover, onFocusHint }) {
  const layer = document.getElementById('node-layer');
  const drawerEl = document.getElementById('drawer');
  const drawerContent = document.getElementById('drawer-content');
  const drawerClose = document.getElementById('drawer-close');
  const scrim = document.getElementById('scrim');

  const buttons = new Map();   // id → { el, hotspot, chapterId, cluster }
  let activeChapter = null;
  let hovered = null;
  let selected = null;
  let lastTrigger = null;      // element to restore focus to
  let touchMode = matchMedia('(pointer: coarse)').matches;
  const chapters = new Map();  // chapterId → chapter module ref

  const _v = new THREE.Vector3();

  function registerChapter(chapterId, chapter, clusterOffset) {
    chapters.set(chapterId, chapter);
    let spots = chapter.hotspots || [];
    if (touchMode && chapterId === 'owned') {
      // curated spatial subset on touch — pods plus a few contributors; the
      // complete contributor index stays accessible in the chapter copy
      let people = 0;
      spots = spots.filter(h => !h.id.startsWith('person-') || people++ < 4);
    }
    for (const h of spots) {
      const meta = content.nodes[h.id] || contributorMeta(h.id);
      if (!meta) continue;
      const el = document.createElement('button');
      el.className = 'node-label';
      el.type = 'button';
      el.dataset.node = h.id;
      el.dataset.chapter = chapterId;
      el.innerHTML = `<span class="node-dot" aria-hidden="true"></span><span class="node-text">${meta.label}</span>` +
        (meta.short ? `<span class="node-short">${meta.short}</span>` : '');
      el.setAttribute('aria-haspopup', 'dialog');
      el.hidden = true;
      layer.appendChild(el);
      const rec = { el, hotspot: h, chapterId, cluster: clusterOffset };
      buttons.set(h.id, rec);

      if (!touchMode) {
        el.addEventListener('mouseenter', () => setHover(h.id));
        el.addEventListener('mouseleave', () => { if (hovered === h.id) setHover(null); });
      }
      el.addEventListener('focus', () => setHover(h.id));
      el.addEventListener('blur', () => { if (hovered === h.id && !selected) setHover(null); });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (touchMode && hovered !== h.id && selected !== h.id) { setHover(h.id); return; } // first tap = focus
        open(h.id, el);
      });
    }
  }

  function contributorMeta(id) {
    const c = (content.contributors || []).find(c => c.id === id);
    if (!c) return null;
    return { label: c.name, short: c.role, _contributor: c };
  }

  function setHover(id) {
    if (hovered === id) return;
    if (hovered) {
      const prev = buttons.get(hovered);
      if (prev) {
        prev.el.classList.remove('is-hover');
        chapters.get(prev.chapterId)?.setHover(null);
      }
    }
    hovered = id;
    if (id) {
      const rec = buttons.get(id);
      if (rec) {
        rec.el.classList.add('is-hover');
        chapters.get(rec.chapterId)?.setHover(id);
      }
    }
    if (onHover) onHover(id);
  }

  /* ---------------- drawer / card / sheet ---------------- */
  function buildDrawerHTML(id) {
    const meta = content.nodes[id];
    if (!meta) {
      const c = contributorMeta(id);
      if (!c) return '';
      const cc = c._contributor;
      return `<h2>${cc.name}</h2><p class="drawer-role">${cc.role}</p><p>${cc.blurb}</p>
        <p class="drawer-note">${cc.consent ? '' : 'Placeholder profile — real contributor profiles appear with explicit consent.'}</p>`;
    }
    const d = meta.drawer || meta.card || meta.spotlight || {};
    let html = `<h2>${d.title || meta.label}</h2>`;
    if (meta.short && !d.body?.length) html += `<p>${meta.short}</p>`;
    for (const p of d.body || []) html += `<p>${p}</p>`;
    if (d.workflows?.length) {
      html += `<h3>Representative workflows</h3><ul>` +
        d.workflows.map(w => `<li>${w}</li>`).join('') + `</ul>`;
    }
    const links = d.links || (d.link ? [d.link] : []);
    if (links.length) {
      html += `<div class="drawer-links">` +
        links.map(l => `<a href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join('') + `</div>`;
    }
    return html;
  }

  function open(id, triggerEl) {
    const rec = buttons.get(id);
    if (!rec) return;
    const wasOpen = !!selected;
    if (selected && selected !== id) {
      // smooth retarget: swap content + camera without hard close/reopen
      const prevRec = buttons.get(selected);
      if (prevRec) {
        prevRec.el.classList.remove('is-selected');
        chapters.get(prevRec.chapterId)?.setSelected(null);
      }
    }
    selected = id;
    lastTrigger = triggerEl || rec.el;
    rec.el.classList.add('is-selected');
    chapters.get(rec.chapterId)?.setSelected(id);
    drawerContent.innerHTML = buildDrawerHTML(id);
    drawerEl.hidden = false;
    scrim.hidden = false;
    requestAnimationFrame(() => {
      drawerEl.classList.add('is-open');
      scrim.classList.add('is-open');
    });
    drawerEl.setAttribute('aria-label', (content.nodes[id]?.label || contributorMeta(id)?.label || '') + ' details');
    if (!wasOpen) drawerClose.focus({ preventScroll: true });
    // camera focus for drawer-class nodes: keep world visible, tighten laterally
    if (DRAWER_NODES.has(id)) {
      const world = new THREE.Vector3();
      rec.hotspot.object.getWorldPosition(world);
      cameraDirector.setFocus(world, { dist: 5, side: -1 }); // node left, drawer right
      if (onFocusHint) onFocusHint(world);
    } else if (onFocusHint) {
      const world = new THREE.Vector3();
      rec.hotspot.object.getWorldPosition(world);
      onFocusHint(world);
    }
    if (touchMode) document.body.classList.add('sheet-open'); // locks page scroll (CSS)
    journey.writeRoute(rec.chapterId, id, { push: !wasOpen });
    if (onSelect) onSelect(id);
  }

  function close({ returnFocus = true } = {}) {
    if (!selected) return;
    const rec = buttons.get(selected);
    if (rec) {
      rec.el.classList.remove('is-selected');
      chapters.get(rec.chapterId)?.setSelected(null);
      journey.writeRoute(rec.chapterId, null);
    }
    selected = null;
    drawerEl.classList.remove('is-open');
    scrim.classList.remove('is-open');
    document.body.classList.remove('sheet-open');
    setTimeout(() => { if (!selected) { drawerEl.hidden = true; scrim.hidden = true; } }, 350);
    cameraDirector.clearFocus();
    if (onFocusHint) onFocusHint(null);
    if (returnFocus && lastTrigger) lastTrigger.focus({ preventScroll: true });
  }

  drawerClose.addEventListener('click', () => close());
  scrim.addEventListener('click', () => close());
  document.addEventListener('click', (e) => {
    if (!selected || touchMode) return;
    if (drawerEl.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.node-label')) return;
    close({ returnFocus: false });
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selected) { e.preventDefault(); close(); }
  });
  // first meaningful scroll intent folds the drawer away (desktop)
  window.addEventListener('wheel', (e) => {
    if (selected && !touchMode && Math.abs(e.deltaY) > 8) close({ returnFocus: false });
  }, { passive: true });
  // Browser Back closes detail state first
  window.addEventListener('hashchange', () => {
    const r = journey.parseHash();
    if (selected && !r.node) close({ returnFocus: false });
    else if (r.node && r.node !== selected && buttons.has(r.node)) open(r.node);
  });
  // sheet drag-down dismiss (touch)
  let sheetStartY = null;
  drawerEl.addEventListener('touchstart', (e) => {
    if (drawerEl.scrollTop <= 0) sheetStartY = e.touches[0].clientY;
  }, { passive: true });
  drawerEl.addEventListener('touchmove', (e) => {
    if (sheetStartY != null && e.touches[0].clientY - sheetStartY > 70) { close(); sheetStartY = null; }
  }, { passive: true });
  drawerEl.addEventListener('touchend', () => { sheetStartY = null; });

  /* ---------------- per-frame projection ---------------- */
  function update(chapterId, cp, veil) {
    if (activeChapter !== chapterId) {
      activeChapter = chapterId;
      // keep a detail open when we ARRIVED here to show it (deep link / hash
      // navigation); close only when travel leaves the selected node's chapter
      const selRec = selected ? buttons.get(selected) : null;
      if (selRec && selRec.chapterId !== chapterId) close({ returnFocus: false });
      setHover(null);
    }
    const inRest = cp > REST_LO && cp < REST_HI && veil < 0.05;
    const w = window.innerWidth, h = window.innerHeight;
    for (const [id, rec] of buttons) {
      const show = rec.chapterId === chapterId && (inRest || selected === id);
      if (!show) { if (!rec.el.hidden) rec.el.hidden = true; continue; }
      rec.hotspot.object.getWorldPosition(_v);
      const off = rec.hotspot.labelOffset;
      if (off) { _v.x += off.x; _v.y += off.y; _v.z += off.z; }
      _v.project(camera);
      const behind = _v.z > 1;
      const x = (_v.x * 0.5 + 0.5) * w;
      const y = (-_v.y * 0.5 + 0.5) * h;
      const off2 = behind || x < -80 || x > w + 80 || y < -60 || y > h + 60;
      if (off2) { if (!rec.el.hidden) rec.el.hidden = true; continue; }
      if (rec.el.hidden) rec.el.hidden = false;
      rec.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  return {
    registerChapter,
    update,
    open: (id) => { const rec = buttons.get(id); if (rec) open(id, rec.el); },
    close,
    get selected() { return selected; },
    setHover,
  };
}
