// Chapter entry lifecycle.
//
// A placement (deep link, capture, QA scrollTo) and the landing of a visible
// navigation move are deliberately different events. Placements must settle
// every authored clock immediately; nav landings may settle only seam/arming
// state, because destination-owned intro choreography can continue after the
// camera arrives.

const directInvoke = (_name, fn) => fn();

/** Start a fresh navigation entry and return its optional local drive ticket. */
export function startChapterEntry(id, chapter, invoke = directInvoke) {
  if (!chapter) return null;
  if (typeof chapter.beginEntry === 'function') {
    invoke(`chapter:${id}.beginEntry`, () => chapter.beginEntry());
  }
  if (typeof chapter.driveEntry !== 'function') return null;
  return {
    id,
    f: 0,
    t: 0,
    dur: Math.max(0.001, Number(chapter.entryDuration) || 1),
  };
}

/** Reconcile only state that is allowed to settle when a nav camera lands. */
export function snapChapterLandings(chapters, invoke = directInvoke) {
  for (const id in chapters) {
    const chapter = chapters[id];
    if (chapter && typeof chapter.snapLanding === 'function') {
      invoke(`chapter:${id}.snapLanding`, () => chapter.snapLanding());
    }
  }
}

/** Fully settle a true placement/capture. Visible entry clocks are included. */
export function snapChapterPlacements(chapters, invoke = directInvoke) {
  for (const id in chapters) {
    const chapter = chapters[id];
    if (chapter && typeof chapter.snap === 'function') {
      invoke(`chapter:${id}.snap`, () => chapter.snap());
    }
  }
}
