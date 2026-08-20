/** Apply chapter entry/drive/glide state in the orchestrator's fixed order. */
export function applyChapterFrame(chapters, chapterEntry, p, dt, gliding, guarded) {
  let finishChapterEntry = false;
  if (chapterEntry) {
    const entryMod = chapters[chapterEntry.id];
    let ready = !entryMod || typeof entryMod.entryReady !== 'function';
    if (entryMod && entryMod.entryReady) {
      guarded(`chapter:${chapterEntry.id}.entryReady`, () => {
        ready = !!entryMod.entryReady();
      });
    }
    if (ready) chapterEntry.t += Math.max(0, dt);
    const ef = Math.min(chapterEntry.t / chapterEntry.dur, 1);
    chapterEntry.f = ef * ef * ef * (ef * (ef * 6 - 15) + 10);
    finishChapterEntry = ef >= 1;
  }

  for (const id in chapters) {
    const mod = chapters[id];
    if (chapterEntry && chapterEntry.id === id && mod.driveEntry) {
      guarded(`chapter:${id}.driveEntry`, () => mod.driveEntry(chapterEntry.f));
    } else if (mod.drive) guarded(`chapter:${id}.drive`, () => mod.drive(p));
    if (mod.setGliding) {
      guarded(`chapter:${id}.setGliding`, () => mod.setGliding(gliding));
    }
  }
  return finishChapterEntry ? null : chapterEntry;
}
