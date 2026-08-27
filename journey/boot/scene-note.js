/* ==================================================================== *
 * journey/boot/scene-note.js — THE FAILURE STORY'S OWNER.
 *
 * Lifted out of main.js by B01 with its behaviour unchanged. It was
 * already the best-argued region of that file and it did not move
 * because it was wrong; it moved because it is one thing with one
 * surface, and main.js is the page's wiring harness rather than its
 * error policy.
 *
 * WHAT THIS OWNS, and it is the whole of it: the ONE visitor-facing note
 * element, and the QA error channel that paints into the same element
 * under ?debug=1. Nothing else in the tree may build a second note.
 *
 * THE THREE WAYS THIS PAGE USED TO DIE MID-BOOT — WebGL missing, the
 * journey import failing, or the GPU context being lost on a mobile tab
 * — each left a dead or inert page with only a console.error: body is
 * overflow:hidden so there is no scroll, and the static tier's only link
 * is built by the journey rail at boot. So every note this module can
 * show CARRIES A WORKING EXIT. The three texts live here, together,
 * because "what the visitor is told when the page cannot do its job" is
 * one editorial decision and reads as one only in one place. They are
 * written out in full rather than assembled from parts: this markup is
 * the last thing a broken page says, and it should be greppable.
 *
 * LAZY BY DESIGN. `show()` builds the element on first use, so the happy
 * path never touches the DOM for it. That is why `el` is a `let`, and it
 * has exactly one write site.
 *
 * WHAT STAYED IN main.js, deliberately: the two `window` listeners that
 * feed `recordError`. They are PAGE-class registrations in J05's
 * register, and that register is a map of one file's registrations.
 * Registration is main.js's; the policy behind it — the counter, the
 * dedupe, the overlay — is this module's. See the J05 block in main.js.
 * ==================================================================== */

import { DEBUG_OVERLAY } from '../../flags.js';

/** The three notes, each with a working exit. `./static/` is the static
 *  journey: it carries every chapter and link, and it needs no WebGL. */
export const NOTE = Object.freeze({
  sceneFailed: `This page's live scene could not start on this browser. <a href="./static/" style="color: inherit; text-decoration: underline;">The static journey</a> carries every chapter and link.`,
  contextLost: `The scene's graphics context was lost. <a href="./static/" style="color: inherit; text-decoration: underline;">The static journey</a> carries every chapter — or reload to restart the scene.`,
  journeyFailed: `The interactive journey could not load. The hero scene above is still live, and <a href="./static/" style="color: inherit; text-decoration: underline;">the static journey</a> carries every chapter.`,
});

/**
 * The page's one note surface and its error channel.
 *
 * THE MACHINE (G3). States: ABSENT (no note has ever been needed) ->
 * SHOWN <-> HIDDEN. `el` is the binding that encodes ABSENT, and it is
 * the only mutable state here. SHOWN vs HIDDEN is carried by `display`
 * on that element rather than by a second binding, because the element
 * IS the state once it exists — a boolean beside it could disagree with
 * the DOM, and there is nothing a boolean could answer that the node
 * cannot. Events: `show(html)`, `hide()`, `recordError(msg)`.
 */
export function createSceneNote() {
  let el = null;

  /** QA reads `window.__pageErrors`; the visitor-facing story is the
   *  specific `show()` calls at the three failure sites. */
  const seen = new Set();

  function show(html) {
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      const s = el.style;
      s.position = 'fixed';
      s.left = '50%';
      s.bottom = '1.5rem';
      s.transform = 'translateX(-50%)';
      s.maxWidth = '44ch';
      s.padding = '0.75rem 1.15rem';
      s.background = 'rgba(12, 9, 4, 0.86)';
      s.color = 'var(--parchment, #f2ebdd)';
      s.fontSize = '0.85rem';
      s.lineHeight = '1.5';
      s.borderRadius = '10px';
      s.zIndex = '10';
      s.textAlign = 'center';
      document.body.appendChild(el);
    }
    el.style.display = '';
    el.innerHTML = html;
    return el;
  }

  function hide() {
    if (el) el.style.display = 'none';
  }

  /* ?debug=1 field overlay: venue staff load /?debug=1 and read failures
     on screen (registered in flags.js like every other flag). It was
     blind to guarded chapter failures until this week; those now arrive
     through the same window channel, so they land here too. */
  function renderOverlay() {
    if (!DEBUG_OVERLAY) return;
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    show([...seen].map(esc).join('<br>'));
  }

  /** The error channel: count it for QA, log each distinct message once,
   *  and paint the set under ?debug=1. Deliberately NOT a visitor-facing
   *  note — a stray console error is not a reason to tell a visitor the
   *  page is broken. The three real failures call `show()` by name. */
  function recordError(msg) {
    window.__pageErrors = (window.__pageErrors || 0) + 1;
    if (!seen.has(msg)) { seen.add(msg); console.error(msg); }
    renderOverlay();
  }

  return { show, hide, recordError };
}
