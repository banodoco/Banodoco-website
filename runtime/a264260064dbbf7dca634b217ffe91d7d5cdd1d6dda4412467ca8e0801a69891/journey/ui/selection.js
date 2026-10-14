/* The two facts BOTH disclosure vessels need and neither may own.
 *
 * A node can be revealed by the popover or by the card — the split is drawn
 * by content, not by chapter (see `previewFor`) — but "which node wears the
 * chapter's selected light" and "which node reports `aria-expanded`" are
 * single-valued facts about the whole surface. While they lived as two `let`s
 * in `createUI`'s body, every one of the five sub-owners that opens or closes
 * anything wrote them directly, and the two could disagree only by someone
 * forgetting a line. Here there is one writer for each.
 *
 * WHY THEY ARE TWO FACTS AND NOT ONE. They were one variable until the card
 * grew its transient tier (2026-08-14): the visual selection follows the
 * REVEAL, `aria-expanded` follows the COMMIT, and conflating them announced
 * every passing mouse as an opened disclosure.
 */

/** The chapter's selected light (visual, follows hover) and the committed
 *  disclosure (semantic, follows click / key / route). */
export function createSelection({ hotspots, chapters }) {
  let revealed = null;      // wearing the chapter's selected light
  let committed = null;     // the node whose disclosure is COMMITTED

  /** The chapter contract's own per-node setter, exactly mirroring
   *  setHot(id, on). A chapter that declares no `selection`, or declares
   *  `setSelected: null` inside it (connect), is simply not told — which is
   *  what happens today.
   *
   *  Chapters are reached through the `chapters` map `createUI` is handed, and
   *  specifically through the `selection` capability (journey/chapter-contract.js)
   *  — never through a chapter's own fields.
   *  C05 slice D: this used to read window.journey's public handle, because
   *  journey.js did not pass the map to createUI(). It does now.
   *
   *  THE PORTRAITS BRIDGE IS DELETED, NOT MIGRATED (C05 slice D, design.md
   *  §6.2). It read `mod.portraits.setSelected(index)` through a chapter's
   *  private field, and its own comment said it "retires itself the moment the
   *  contract method lands". That moment was owned/index.js:804, which grew a
   *  real `setSelected`; the branch above returned before the bridge on every
   *  reachable call from that day on. */
  function notify(nodeId, on) {
    const h = hotspots.find(x => x.id === nodeId);
    const sel = h && chapters[h.chapter] && chapters[h.chapter].selection;
    if (sel && typeof sel.setSelected === 'function') sel.setSelected(nodeId, on);
  }

  /** a11y debt #5: exactly the hotspot whose disclosure is COMMITTED reports
   *  expanded. Driven off `committed`, so it is correct for every commit path
   *  — click, key, deep link, inbound route — and stays false through a
   *  transient hover/focus reveal, which is not a disclosure the visitor has
   *  opened. */
  function syncExpanded() {
    for (const h of hotspots) {
      h.btn.setAttribute('aria-expanded', h.id === committed ? 'true' : 'false');
    }
  }

  return {
    /** Move the selected light to `nodeId`, releasing whoever had it. A
     *  retarget (one hotspot straight to the next) must release the previous
     *  node before lighting the new one; BOTH tiers do this, because the
     *  chapter's selected light is the visual half of the reveal and Hannah
     *  asked for the full click-state treatment on hover. */
    reveal(nodeId) {
      if (revealed && revealed !== nodeId) notify(revealed, false);
      revealed = nodeId;
      notify(nodeId, true);
    },
    /** Take the light away entirely — the close paths. */
    clearReveal() {
      if (revealed) { notify(revealed, false); revealed = null; }
    },
    /** Record the committed disclosure (or `null` for none) and republish
     *  `aria-expanded` from it. */
    setCommitted(nodeId) {
      committed = nodeId;
      syncExpanded();
    },
    /** Drop the commitment only if it is the one `nodeId` names — the
     *  popover's release, which must not clear a card's commitment that has
     *  already opened behind it. `aria-expanded` is republished either way,
     *  exactly as it was when this was three statements in `createUI`. */
    dropCommittedIf(nodeId) {
      if (committed && nodeId && committed === nodeId) committed = null;
      syncExpanded();
    },
  };
}

/** Where focus goes back to when a committed disclosure closes.
 *
 *  KNOWN DEFECT, PRE-EXISTING AND DELIBERATELY NOT FIXED HERE (U03): when the
 *  remembered trigger has left the document — a chip whose chapter changed
 *  under an open card — `restore()` moves focus nowhere at all and the visitor
 *  is returned to `<body>`, losing their place in the tab order (WCAG 2.4.3).
 *  The behaviour is preserved to the letter because U03's acceptance is
 *  behavioural identity, but it is preserved HERE, in one function with one
 *  caller-visible name, rather than as the same four lines written twice in
 *  two vessels' close paths. A fix is now one edit in one place. */
export function createFocusReturn() {
  let trigger = null;

  return {
    /** An explicit trigger always wins; a retarget or a deep link that
     *  supplies none keeps the control the visitor last used, so Escape lands
     *  where they came from. */
    remember(next) { trigger = next || trigger; },
    restore() {
      if (trigger && document.contains(trigger)) trigger.focus();
      trigger = null;
    },
  };
}
