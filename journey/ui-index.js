// journey-v6 — the node INDEX (24-mobile-pass.md; owed by
// 20-owned-root-network.md §9.4 and OW-4.5).
//
// WHY THIS EXISTS
// ---------------
// Owned's portrait arc is authored in the LANDSCAPE rest frame and reaches
// |NDC x| 0.91 by construction — that width is the composition, and it is what
// "a broad arc/oval ... denser toward the lower half" means when the reference
// frame is 1.6:1. A phone's portrait frustum is ~3.5x narrower, so twelve of
// the sixteen contributors project outside the placeable margin and two more
// fall behind the copy block. Measured at 375x812 before this module:
//
//     16 routable nodes · 4 placeable · 2 actually reachable
//
// i.e. on a phone the section's whole claim — "100% shared with the people who
// build it" — was represented by two faces out of sixteen. OW-4.5 always
// called this a "curated spatial subset ... paired with a bottom-sheet index";
// the subset shipped and the index did not. This is the index.
//
// WHY NOT RECOMPOSE THE ARC FOR PORTRAIT
// --------------------------------------
// The obvious alternative — author a second, narrower arc for tall frames —
// was considered and rejected on three counts, recorded so it is not silently
// re-litigated:
//
//   1. Node positions are WORLD positions fixed at build time, and everything
//      hanging off them (rim fibres, halo cores, the node-to-web strands, the
//      430-node mesh they are wired into, the >= 3.0-unit camera-path
//      clearance guarantee) is baked from those positions. Making them a
//      function of aspect means rebuilding all of it on a rotate.
//   2. Sixteen faces inside a 375px frame is ~23px of frame width each. The
//      reference this section was built to asks for "clear dark breathing room
//      between them"; a portrait arc would be a wall of discs, i.e. we would
//      fix reachability by breaking the picture.
//   3. The picture is not the problem. Reaching it is. A LIST is the right
//      instrument for "show me all of them", and it is the instrument that
//      also serves a screen reader, a keyboard, and a landscape phone whose
//      copy block suppresses ten chips.
//
// So the spatial composition is left exactly as authored at every size, and
// the index is offered ALONGSIDE it — never instead of it — and only when the
// frame demonstrably cannot place everything (journey/ui.js decides that from
// live projection counts, not from a viewport guess).
//
// THE CONTRACT IT KEEPS
// ---------------------
// A row is a hotspot by another route. It opens through the SAME `onOpen(id,
// trigger)` funnel a chip click uses, so journey.js writes the same
// `#/owned/contributor-N` route, pushes the same single history entry, runs
// the same `notifySelect` -> `setSelected` ember treatment, and opens the same
// dialog card. Nothing here knows what a card is. Hovering or focusing a row
// calls the hotspot's own `onHot`, so the node lights out in the field exactly
// as it does under a pointer — the list is a way into the composition, not a
// replacement for it.
//
// FILE BOUNDARY: this module owns `.j-index*` and nothing else. It is handed
// its entries and its callbacks; it never reads CONTENT, never touches a
// chapter module, and never looks at journey progress.

import { claimInput, releaseInput } from './scroll.js';

const SHEET_FADE_MS = 340;      // must outlast the opacity transition in site.css

const reduceMotion = typeof matchMedia === 'function'
  ? matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/**
 * @param {object} o
 * @param {(id: string, trigger: Element) => void} o.onOpen  the chip's own open
 *        funnel — route, history, selection and card, all of it.
 * @param {(id: string, on: boolean) => void} o.onHot  light/unlight the node in
 *        the scene. Same call the chip's `refresh()` makes.
 * @param {(msg: string) => void} o.announce  the page's existing polite live
 *        region, passed in rather than re-created (the rail does the same).
 */
export function createNodeIndex({ onOpen, onHot, announce }) {
  /* ---------------- the sheet ---------------- */
  // A real modal dialog, on the same terms the detail card earned its
  // `aria-modal="true"`: focus moved in, TRAPPED while open, returned to the
  // trigger on close. Anything less and the attribute would be a lie.
  const sheet = el('aside', 'j-index');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'j-index-h');
  sheet.hidden = true;

  // Pointer affordance only — the keyboard's routes out are Escape and the
  // close button — so it is hidden from AT rather than announced as a mystery.
  const grip = el('div', 'j-index-grip');
  grip.setAttribute('aria-hidden', 'true');
  const close = el('button', 'j-index-x', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');

  const body = el('div', 'j-index-body');
  const heading = el('h2', 'j-index-h');
  heading.id = 'j-index-h';
  const lede = el('p', 'j-index-lede');
  const groupHost = el('div', 'j-index-groups');
  body.appendChild(heading);
  body.appendChild(lede);
  body.appendChild(groupHost);

  sheet.appendChild(grip);
  sheet.appendChild(close);
  sheet.appendChild(body);

  const scrim = el('div', 'j-index-scrim');
  scrim.setAttribute('aria-hidden', 'true');

  document.body.appendChild(scrim);
  document.body.appendChild(sheet);

  let isOpen = false;
  let returnFocus = null;
  let fadeTimer = null;
  let litRows = new Set();       // node ids this sheet has lit, so it can unlight

  /* ---------------- rows ---------------- */

  function unlightAll() {
    for (const id of litRows) onHot(id, false);
    litRows.clear();
  }

  function light(id, on) {
    if (on) { if (!litRows.has(id)) { litRows.add(id); onHot(id, true); } }
    else if (litRows.has(id)) { litRows.delete(id); onHot(id, false); }
  }

  /** Build the list. `entries` is [{ id, name, group }] in registration order —
   *  which is the chapter's own narrative order, so the ordinals below are the
   *  manifest's numbering and not a sort this file invented. */
  function buildRows(entries) {
    groupHost.textContent = '';
    // Group in FIRST-APPEARANCE order. A sort would be a second opinion about
    // an order the content already states.
    const order = [];
    const byGroup = new Map();
    entries.forEach((e, i) => {
      const key = e.group || '';
      if (!byGroup.has(key)) { byGroup.set(key, []); order.push(key); }
      byGroup.get(key).push({ ...e, n: i + 1 });
    });

    for (const key of order) {
      const rows = byGroup.get(key);
      const sec = el('section', 'j-index-group');
      if (key) {
        const gh = el('h3', 'j-index-gh');
        // The role string VERBATIM. Pluralising it would be this file writing
        // copy; the tally beside it says how many there are, which is derived.
        gh.appendChild(el('span', 'j-index-gh-t', key));
        gh.appendChild(el('span', 'j-index-gh-n', String(rows.length)));
        sec.appendChild(gh);
      }
      const ul = el('ul', 'j-index-list');
      for (const e of rows) {
        const li = el('li');
        const btn = el('button', 'j-index-row');
        btn.type = 'button';
        // It opens the detail dialog, exactly as its chip does, and says so.
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.dataset.node = e.id;
        // The ordinal is DERIVED from manifest order — the same derivation the
        // rail's menu makes for "01 · Mission" (23-side-navigator.md §5) — so
        // two rows carrying the same authored name are still distinguishable
        // to a reader, and to AT through the list semantics below.
        btn.appendChild(el('span', 'j-index-n', String(e.n).padStart(2, '0')));
        btn.appendChild(el('span', 'j-index-row-t', e.name));
        // Structural position, not content: this is what tells a screen reader
        // "4 of 16" without this module inventing a label for anybody.
        li.setAttribute('aria-posinset', String(e.n));
        li.setAttribute('aria-setsize', String(entries.length));

        btn.addEventListener('pointerenter', (ev) => {
          if (ev.pointerType === 'touch') return;   // a finger has no hover
          light(e.id, true);
        });
        btn.addEventListener('pointerleave', (ev) => {
          if (ev.pointerType === 'touch') return;
          light(e.id, false);
        });
        btn.addEventListener('focus', () => light(e.id, true));
        btn.addEventListener('blur', () => light(e.id, false));
        btn.addEventListener('click', () => {
          // The row is about to leave the document, so it cannot be the focus
          // return for the card that replaces it. The CONTROL that opened this
          // sheet can, and is still on screen under it.
          const trigger = returnFocus;
          closeSheet({ restoreFocus: false });
          onOpen(e.id, trigger);
        });
        li.appendChild(btn);
        ul.appendChild(li);
      }
      sec.appendChild(ul);
      groupHost.appendChild(sec);
    }
  }

  /* ---------------- open / close ---------------- */

  function focusables() {
    return [...sheet.querySelectorAll('button:not([disabled]), a[href]')]
      .filter(n => n.offsetParent !== null || n === close);
  }

  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeSheet(); return; }
    if (e.key !== 'Tab' || !isOpen) return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || !sheet.contains(at))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !sheet.contains(at))) { e.preventDefault(); first.focus(); }
  });

  close.addEventListener('click', () => closeSheet());
  scrim.addEventListener('click', () => closeSheet());

  /** @param {{ title: string, lede: string, entries: Array }} spec */
  function openSheet(spec, trigger) {
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    heading.textContent = spec.title;
    lede.textContent = spec.lede || '';
    lede.hidden = !spec.lede;
    buildRows(spec.entries || []);
    returnFocus = trigger || null;
    sheet.hidden = false;
    scrim.hidden = false;
    sheet.inert = false;
    isOpen = true;
    if (body.scrollTop) body.scrollTop = 0;
    // A sheet arriving from `hidden` has no rendered start state for its
    // transition to run FROM. One synchronous flush, then `.open` in the same
    // tick — deferring to rAF would make a dialog's visibility depend on the
    // frame loop, and a throttled tab would open one that never paints.
    void sheet.offsetHeight;
    sheet.classList.add('open');
    scrim.classList.add('open');
    // The list scrolls, and journey/scroll.js takes wheel and touch at window
    // capture. Registering MODAL means the journey never treats a gesture in
    // here as travel, never preventDefault()s it, and takes its travel keys
    // off the table — so the list scrolls natively and cannot be scrubbed out
    // from under the reader.
    claimInput(sheet, { modal: true });
    close.focus();
    if (announce) announce(`${spec.title}. ${(spec.entries || []).length} entries.`);
  }

  function closeSheet({ restoreFocus = true } = {}) {
    if (!isOpen) return;
    isOpen = false;
    unlightAll();
    releaseInput(sheet);
    sheet.classList.remove('open');
    scrim.classList.remove('open');
    sheet.inert = true;
    const hide = () => {
      fadeTimer = null;
      if (isOpen) return;                 // re-opened inside the fade
      sheet.hidden = true;
      scrim.hidden = true;
    };
    // Reduced motion has no fade to outlast.
    if (reduceMotion.matches) hide();
    else fadeTimer = setTimeout(hide, SHEET_FADE_MS);
    if (restoreFocus && returnFocus && document.contains(returnFocus)) returnFocus.focus();
    if (restoreFocus) returnFocus = null;
  }

  /* ---------------- drag to dismiss ----------------
     The same gesture the detail card's sheet ships (journey/ui.js): pointer
     driven so finger, pen and a hybrid machine's mouse are one path; 1:1 with
     the pointer while down; dismissal on distance OR flick velocity so a short
     sharp swipe works and a slow drag that changes its mind does not. The
     RELEASE is where reduced motion is honoured — the spring back is animation,
     the drag itself is the visitor's own hand. */
  let drag = null;

  function endDrag(dismiss) {
    sheet.classList.remove('dragging');
    sheet.style.transform = '';
    drag = null;
    if (dismiss) closeSheet();
  }

  grip.addEventListener('pointerdown', (e) => {
    if (!isOpen || (e.button != null && e.button > 0)) return;
    drag = {
      id: e.pointerId, y0: e.clientY, dy: 0,
      t0: performance.now(), h: sheet.getBoundingClientRect().height || 1,
    };
    sheet.classList.add('dragging');
    try { grip.setPointerCapture(e.pointerId); } catch { /* window listeners still see it */ }
    e.preventDefault();
  });
  grip.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dy = Math.max(0, e.clientY - drag.y0);        // downward only
    sheet.style.transform = `translateY(${drag.dy.toFixed(1)}px)`;
  });
  const finishDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dt = Math.max(1, performance.now() - drag.t0);
    endDrag(drag.dy > drag.h * 0.28 || (drag.dy / dt > 0.55 && drag.dy > 44));
  };
  grip.addEventListener('pointerup', finishDrag);
  grip.addEventListener('pointercancel', (e) => {
    if (drag && e.pointerId === drag.id) endDrag(false);
  });

  /* ---------------- the control that opens it ----------------
     Built here so the whole component — sheet, scrim and the one control that
     reveals it — has a single home. journey/ui.js decides WHERE it goes (into
     the chapter's copy block, after its action row) and WHEN it is shown. */
  function buildControl(label, onActivate) {
    // A ROW around the control, not the control alone. The row is taken out of
    // the copy block's flow (site.css) and the reason is measured, not
    // cosmetic: `.j-block`'s border box is what journey/ui.js suppresses
    // hotspots against, so a control sitting inside it makes the chapter's
    // copy claim ~46px more of the frame and quietly hides the very nodes this
    // component exists to reach. It cost two of Owned's four placeable chips
    // at 430x932 and one more at 812x375 before this wrapper. Out of flow, the
    // composition claims exactly what it claimed before the index existed.
    const row = el('div', 'j-index-cue-row');
    const btn = el('button', 'j-index-cue');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.appendChild(el('span', 'j-index-cue-t', label));
    btn.appendChild(el('i', 'j-index-cue-arr'));
    // the BUTTON is the focus return, not the row that carries it
    btn.addEventListener('click', () => onActivate(btn));
    row.appendChild(btn);
    return row;
  }

  return {
    el: sheet,
    scrim,
    buildControl,
    open: openSheet,
    close: closeSheet,
    get isOpen() { return isOpen; },
  };
}
