import { createInspire } from './chapters/inspire/index.js';
import { createEquip } from './chapters/equip/index.js';
import { createConnect } from './chapters/connect/index.js';
import { createOwned } from './chapters/owned/index.js';
import { createFinal } from './chapters/final/index.js';
import { CONTENT } from '../content/content.js';
import {
  JOURNEY_SCHEMA, RUNTIME_CHAPTER_IDS, validateJourneyStructure,
} from './structure.js';

const CHAPTER_FACTORIES = {
  inspire: (sceneApi) => createInspire(sceneApi),
  equip: (sceneApi) => createEquip(sceneApi),
  connect: (sceneApi) => createConnect(sceneApi),
  owned: (sceneApi) => createOwned(sceneApi, CONTENT),
  final: (sceneApi) => createFinal(sceneApi),
};

const CHAPTER_BUILDERS = Object.fromEntries(
  RUNTIME_CHAPTER_IDS.map((id) => [id, CHAPTER_FACTORIES[id]]),
);
validateJourneyStructure(JOURNEY_SCHEMA, { builders: CHAPTER_BUILDERS });

/** One registry instance owning ONE prepared-chapter cache.
 *
 *  This module is stateless by construction: the cache lives in the closure
 *  below, never at module scope. `CHAPTER_FACTORIES`/`CHAPTER_BUILDERS` and the
 *  `validateJourneyStructure` call stay module-scoped on purpose — they are
 *  frozen data and a one-time structural assertion, not mutable per-page state.
 *
 *  The single page-lifetime instance is constructed by `journey/journey.js`,
 *  NOT here. Holding it here would recreate the exact module global this
 *  factory exists to remove, and journey.js already owns page-lifetime boot.
 *  Because journey.js re-exports `prepareChapter` and calls `build()` against
 *  that same closed-over const, the deferred-preparation path in `main.js`
 *  cannot observe a different instance than boot does.
 *
 *  THERE IS NO DISPOSAL HERE, AND THAT IS THE DECISION, NOT AN OMISSION.
 *  This registry used to carry a `dispose()` that cascaded into every chapter
 *  it had prepared and then dropped its references. Nothing ever called it —
 *  "the cascade below has never run in a browser" was its own standing note —
 *  and the chapters it would have cascaded into no longer carry disposers.
 *  This is a load-once page; the visitor's teardown is the tab closing. The
 *  full account, including which assertions died with the cascade, is in
 *  docs/code-health/DISPOSAL-REMOVED.md.
 *
 *  What that leaves: `prepare()` is a resumable prebuild loop and `build()`
 *  completes the set, reusing anything already prepared. `build()` constructs
 *  any chapter that was never prepared and does NOT record it here — a
 *  retention path here is the shape of the module global this factory exists
 *  to remove. On the shipped path that set is empty: `main.js` drains
 *  `prepareChapter` to zero before `boot()`.
 *
 *  How this boundary was reached — the order-by-order history, the refused
 *  memory measurements, the scope argument behind `build()`, and which suites
 *  held which claim — is in
 *  docs/code-health/evidence/2026-08-21-elegance-run-01/e01/relocated/
 *  journey-chapter-registry.md and .../e02/relocated/journey-chapter-registry.md.
 */
export function createChapterRegistry() {
  const prepared = {};

  return {
    /** Build the next not-yet-built chapter; returns how many remain. */
    prepare(sceneApi) {
      for (const id of Object.keys(CHAPTER_BUILDERS)) {
        if (!prepared[id]) {
          prepared[id] = CHAPTER_BUILDERS[id](sceneApi);
          break;
        }
      }
      return Object.keys(CHAPTER_BUILDERS).filter((id) => !prepared[id]).length;
    },

    /** Complete the registry synchronously, reusing any chapters prepared
     *  earlier. */
    build(sceneApi) {
      const chapters = {};
      for (const id of Object.keys(CHAPTER_BUILDERS)) {
        chapters[id] = prepared[id] || CHAPTER_BUILDERS[id](sceneApi);
      }
      return chapters;
    },

  };
}
