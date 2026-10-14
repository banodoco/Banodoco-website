import { CONTENT } from '../content/content.js';
import {
  JOURNEY_SCHEMA, RUNTIME_CHAPTER_IDS, validateJourneyStructure,
} from './structure.js';

/** Register chapter-owned hotspots and hover zones in their shipped order.
 *
 *  C05 slice C. This module used to name three chapters (design.md §5.1-5.2):
 *  it built inspire a shim literal, authored inspire's `revealDirect` flag on
 *  the registrar's side, synthesised inspire's `setHot` by POSITION into
 *  FIXED_HOTSPOTS.inspire, called `bindLandingGate` by name, and handed connect
 *  and owned their WHOLE module as `mod`. It now reads two declared
 *  capabilities — `visibility` and `selection` for the hotspot pass,
 *  `interaction` and `selection` for the zone pass — off whatever
 *  RUNTIME_CHAPTER_IDS names, and contains no chapter id at all.
 *
 *  WHAT DID NOT CHANGE, and must not:
 *
 *  * ORDER. Registration order is tab order and label stagger.
 *    RUNTIME_CHAPTER_IDS is ['inspire','connect','owned','final']
 *    (structure.js), which is exactly the order the three deleted calls ran
 *    in; final declares no `visibility` and is skipped, which is what
 *    `hotspots.kind !== 'none'` already said about it. Within a chapter the
 *    order is `visibility.nodeIds`.
 *  * TWO PASSES, hotspots then zones, with validateJourneyStructure between
 *    them. Zones live in a different DOM host and their order is their own tab
 *    order; interleaving them with hotspots would reorder both (H5).
 *  * `null` MEANS `undefined` AT THIS BOUNDARY (H4). `visibility` declares
 *    every member, nullable ones as `null`; `addHotspot` must receive
 *    `undefined` for an absent `nodeRadius`/`nodeReveal`. The `typeof ... ===
 *    'function'` tests below are the same two the old body used, and they turn
 *    a declared `null` into `undefined` unchanged. Forwarding owned's
 *    `nodeReveal: null` as any function at all makes `h.reveal` truthy and
 *    switches all sixteen contributor labels off the chapter copy ease and
 *    onto a reveal product with a different gate.
 *  * `onHot` IS ALWAYS ASSIGNED (§3.3). The old body assigned
 *    `(on) => mod.setHot && mod.setHot(id, on)` — a closure that always exists
 *    and no-ops when the chapter has no `setHot`. ui.js:1199 and ui.js:3101
 *    call `z.onHot(on)` BARE, so a chapter declaring `selection: null` must
 *    still receive a function. The guard moved inside the closure; it did not
 *    move to the assignment.
 *
 *  Capability members are called as methods on the capability object. That is
 *  sound because every one of them is a lexically-bound body the chapter also
 *  exposes at its root (slice B) — no member reaches a sibling through `this`.
 *  The migration table's `world() { return this.nodeWorld('ados'); }` form does
 *  NOT work from here and is recorded as DEF-C05-01.
 *
 *  NOT closed by this slice: DEF-06. Inspire's `visibility.nodeIds` is
 *  `[...FIXED_HOTSPOTS.inspire]` and its `setHot` is id-based, so this file no
 *  longer couples the two arrays — but nothing anywhere still compares
 *  FIXED_HOTSPOTS.inspire's order to EXITS' (design.md §8.5). */
export function registerChapterInteractions(ui, chapters) {
  const nodeChapter = {};

  function registerHotspots(chapterId, ids, vis, selection) {
    for (const id of ids) {
      nodeChapter[id] = chapterId;
      const label = (CONTENT.nodes[id] && CONTENT.nodes[id].label)
        || (CONTENT.contributors.find(c => c.id === id) || {}).role
        || id;
      const h = ui.addHotspot({
        id, chapter: chapterId, label,
        world: () => vis.nodeWorld(id),
        radius: typeof vis.nodeRadius === 'function' ? () => vis.nodeRadius(id) : undefined,
        reveal: typeof vis.nodeReveal === 'function' ? () => vis.nodeReveal(id) : undefined,
        revealDirect: vis.revealDirect === true,
        revealScrub: vis.revealScrub === true,
      });
      h.onHot = (on) => { if (selection && selection.setHot) selection.setHot(id, on); };
    }
  }

  function registerHoverZones(chapterId, interaction, selection) {
    if (!interaction || typeof interaction.zones !== 'function') return;
    for (const z of interaction.zones()) {
      ui.addHoverZone({
        id: z.id, chapter: chapterId, world: z.world, radius: z.radius,
        onHot: (on) => { if (selection && selection.setHot) selection.setHot(z.id, on); },
        label: z.label,
        announce: z.announce,
        action: z.action && interaction.trigger ? () => interaction.trigger(z.action) : null,
      });
    }
  }

  for (const id of RUNTIME_CHAPTER_IDS) {
    const ch = chapters[id];
    const vis = ch && ch.visibility;
    if (!vis) continue;
    registerHotspots(id, vis.nodeIds, vis, ch.selection);
    // Renamed from bindLandingGate: what it receives is the chapter's eased
    // copy opacity, not a gate. Same function object.
    if (vis.bindCopyEase) vis.bindCopyEase(() => ui.copyEase(id));
  }

  const registeredNodes = Object.fromEntries(JOURNEY_SCHEMA.chapters
    .filter(({ hotspots }) => hotspots.kind !== 'none')
    .map(({ id }) => [id, Object.keys(nodeChapter).filter((node) => nodeChapter[node] === id)]));
  validateJourneyStructure(JOURNEY_SCHEMA, { nodes: registeredNodes });
  for (const id of RUNTIME_CHAPTER_IDS) {
    const ch = chapters[id];
    if (ch) registerHoverZones(id, ch.interaction, ch.selection);
  }
  return nodeChapter;
}
