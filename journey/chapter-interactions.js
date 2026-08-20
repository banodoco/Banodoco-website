import { CONTENT } from '../content/content.js';
import {
  FIXED_HOTSPOTS, JOURNEY_SCHEMA, RUNTIME_CHAPTER_IDS, validateJourneyStructure,
} from './structure.js';

/** Register chapter-owned hotspots and hover zones in their shipped order. */
export function registerChapterInteractions(ui, chapters) {
  const nodeChapter = {};

  function registerHotspots(chapterId, ids, mod) {
    for (const id of ids) {
      nodeChapter[id] = chapterId;
      const label = (CONTENT.nodes[id] && CONTENT.nodes[id].label)
        || (CONTENT.contributors.find(c => c.id === id) || {}).role
        || id;
      const h = ui.addHotspot({
        id, chapter: chapterId, label,
        world: () => mod.nodeWorld(id),
        radius: typeof mod.nodeRadius === 'function' ? () => mod.nodeRadius(id) : undefined,
        reveal: typeof mod.nodeReveal === 'function' ? () => mod.nodeReveal(id) : undefined,
        revealDirect: mod.revealDirect === true,
      });
      h.onHot = (on) => mod.setHot && mod.setHot(id, on);
    }
  }

  function registerHoverZones(chapterId, mod) {
    if (typeof mod.hoverZones !== 'function') return;
    for (const z of mod.hoverZones()) {
      ui.addHoverZone({
        id: z.id, chapter: chapterId, world: z.world, radius: z.radius,
        onHot: (on) => mod.setHot && mod.setHot(z.id, on),
        label: z.label,
        announce: z.announce,
        action: z.action && mod.trigger ? () => mod.trigger(z.action) : null,
      });
    }
  }

  registerHotspots('inspire', FIXED_HOTSPOTS.inspire, {
    revealDirect: true,
    nodeWorld: (id) => chapters.inspire.nodeWorld(id),
    nodeReveal: (id) => chapters.inspire.nodeReveal(id),
    setHot: (id, on) => {
      chapters.inspire.setActive(on ? FIXED_HOTSPOTS.inspire.indexOf(id) : -1);
    },
  });
  chapters.inspire.bindLandingGate(() => ui.copyEase('inspire'));
  registerHotspots('connect', chapters.connect.nodeIds, chapters.connect);
  registerHotspots('owned', chapters.owned.nodeIds, chapters.owned);

  const registeredNodes = Object.fromEntries(JOURNEY_SCHEMA.chapters
    .filter(({ hotspots }) => hotspots.kind !== 'none')
    .map(({ id }) => [id, Object.keys(nodeChapter).filter((node) => nodeChapter[node] === id)]));
  validateJourneyStructure(JOURNEY_SCHEMA, { nodes: registeredNodes });
  for (const id of RUNTIME_CHAPTER_IDS) {
    if (chapters[id]) registerHoverZones(id, chapters[id]);
  }
  return nodeChapter;
}
