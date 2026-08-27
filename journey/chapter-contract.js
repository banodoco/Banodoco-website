// The chapter descriptor contract — a narrow core plus four opt-in capabilities.
//
// Design of record:
//   docs/code-health/evidence/2026-08-21-elegance-run-01/c05-design/design.md
//
// WHAT A RUNTIME CHAPTER RETURNS. Every chapter whose schema row carries
// `runtime: true` (journey/structure.js) returns an object declaring the seven
// CORE keys below — read as SIX members, because `setArmed(on)` and its
// `get armed` readback are one member and splitting them would let a chapter
// declare one without the other:
//
//   id           string        — identical to the schema row's id
//   group        Object3D      — never null; the chapter's scene root
//   counts       object|null   — build-product introspection
//   setArmed(on) function      — the seam contract
//   armed        boolean       — its readback
//   snap()       function      — the dt = 0 PLACEMENT settle
//   snapLanding  function|null — the nav-LANDING settle, a different event
//
// plus, optionally, any of the four capability keys: `focus`, `interaction`,
// `selection`, `visibility`.
//
// THE KEY MUST EXIST, EVEN WHEN THE VALUE IS NULL. This mirrors
// journey/structure.js's REQUIRED_CHAPTER_KEYS rule for the schema, and it is
// what makes "opt in" mean something: a chapter with no landing settle writes
// `snapLanding: null` with a comment saying why, so the absence is a reviewable
// statement rather than a silent hole. Owned's `snap()` comment
// (journey/chapters/owned/index.js) is the cautionary tale — a missing member
// that was invisible until the root-network restage went looking for it, and
// which made the entire chapter draw nothing under a frozen clock.
//
// ---------------------------------------------------------------------------
// THE DESCRIPTOR IS NOT THE WHOLE CHAPTER CONTRACT. A chapter has two: this
// declared descriptor, and the still-duck-typed entry/drive lifecycle
// (`drive`, `beginEntry`, `driveEntry`, `entryReady`, `entryDuration`,
// `setBlending`, `setGliding`) read by journey/chapter-entry.js and
// journey/frame-application.js, which is deliberately EXCLUDED from this
// contract and must stay duck-typed. Those two readers are narrow, DOM-free,
// name no chapter and reach no global, and journey/frame-application.js is the
// only executed frame-order evidence this program owns
// (tools/test-frame-order.mjs). Interposing a capability there would buy a
// taxonomy entry at the price of re-baselining that evidence, so a later
// contributor must NOT read this descriptor as exhaustive and "tidy up" those
// `typeof` guards.
// ---------------------------------------------------------------------------
//
// WHAT NO CAPABILITY MAY DO. No capability writes `tabIndex`, `inert`,
// `visibility` or `.vis`. Those stay in journey/ui.js and journey/rail.js,
// which are the single reconciler of who is focusable. `applyChapterFrame`
// runs strictly BEFORE `ui.update()` inside `applyFrame`, so a capability that
// wrote focusability would be a second writer running earlier in the same
// frame than the reconciler that then overwrites it — dead writes or a race.
// Nor may a capability allocate, seed an RNG or register geometry: capabilities
// are read-only accessors over state the chapter factory already produced.
// Chapter CONSTRUCTION order decides bake payload order and is untouched here.
//
// NO RUNTIME CALL SITE. Nothing in journey/ calls `validateChapterDescriptor`
// at boot, deliberately: a throw during construction would white-screen a page
// that previously rendered, and that new failure mode belongs to whoever owns
// the registry lifetime. Conformance of the four shipped chapters is proved
// offline by tools/test-chapter-contract.mjs instead.

/** The seven declared core keys — six members; `setArmed`/`armed` are one. */
export const CORE_KEYS = Object.freeze([
  'id', 'group', 'counts', 'setArmed', 'armed', 'snap', 'snapLanding',
]);

/** The four capability keys. Presence is the opt-in; absence (or an explicit
 *  `null`) means the consumer never asks. */
export const CAPABILITY_KEYS = Object.freeze(['focus', 'interaction', 'selection', 'visibility']);

/** Accepted types, per member. `function|null` etc. means the key must still
 *  EXIST — only its value may be null. Numbers are absent from every capability
 *  on purpose: a duration, rate or threshold inside a capability would be a
 *  timing constant smuggled out of the module that owns it, so the type table
 *  rejects one wherever it is put. */
const CORE_SPEC = Object.freeze({
  id: 'string',
  group: 'object',
  counts: 'object|null',
  setArmed: 'function',
  armed: 'boolean',
  snap: 'function',
  snapLanding: 'function|null',
});

const CAPABILITY_SPEC = Object.freeze({
  focus: Object.freeze({
    world: 'function',
  }),
  interaction: Object.freeze({
    zones: 'function|null',
    trigger: 'function|null',
  }),
  selection: Object.freeze({
    setHot: 'function|null',
    setSelected: 'function|null',
  }),
  visibility: Object.freeze({
    nodeIds: 'string[]',
    nodeWorld: 'function',
    nodeReveal: 'function|null',
    nodeRadius: 'function|null',
    labelPolicy: 'function|null',
    revealDirect: 'boolean',
    revealScrub: 'boolean',
    setExcludedNodes: 'function|null',
    bindCopyEase: 'function|null',
  }),
});

/** The declared member names of each capability, in declaration order. A
 *  capability object's own keys must be exactly this set — an unknown member is
 *  a hard failure, and a missing one is too, because the declare-the-key-even-
 *  if-null rule applies inside a capability as well as on the core. */
export const CAPABILITY_MEMBERS = Object.freeze(Object.fromEntries(
  CAPABILITY_KEYS.map((cap) => [cap, Object.freeze(Object.keys(CAPABILITY_SPEC[cap]))]),
));

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/** Does `value` satisfy the spec string? `string[]` is the one structured
 *  case: an array whose every element is a string. */
function matches(spec, value) {
  const allowed = spec.split('|');
  for (const one of allowed) {
    if (one === 'string[]') {
      if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return true;
      continue;
    }
    if (one === 'object') {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) return true;
      continue;
    }
    if (typeOf(value) === one) return true;
  }
  return false;
}

function describe(value) {
  const t = typeOf(value);
  return t === 'string' ? `string ${JSON.stringify(value)}` : t;
}

/**
 * Validate one built chapter descriptor against one JOURNEY_SCHEMA row.
 *
 * Pure and stateless: it holds no module state, registers nothing, and is safe
 * to call at any moment a caller chooses. It THROWS on the first descriptor
 * that does not conform, with the chapter id in the message and every problem
 * listed, so a caller does not have to re-run it to find the second fault.
 *
 * It does read `descriptor.armed`, which invokes the chapter's getter — the
 * only observable thing this function does.
 *
 * A `runtime: false` schema row (mission) requires no descriptor at all and
 * passes with `null`/`undefined`, mirroring journey/structure.js, which
 * likewise only requires a builder reference for a runtime row. A descriptor
 * supplied for a non-runtime row is still validated: supplying one is a claim.
 */
export function validateChapterDescriptor(descriptor, schemaChapter) {
  if (!schemaChapter || typeof schemaChapter !== 'object' || Array.isArray(schemaChapter)) {
    throw new Error('[chapter contract] a schema chapter row is required');
  }
  const id = schemaChapter.id;
  if (typeof id !== 'string' || !id) {
    throw new Error(`[chapter contract] schema row has no usable id: ${JSON.stringify(id)}`);
  }
  if (typeof schemaChapter.runtime !== 'boolean') {
    throw new Error(`[chapter contract] ${id}: schema row has no boolean 'runtime' flag`);
  }

  const absent = descriptor === null || descriptor === undefined;
  if (absent && !schemaChapter.runtime) return;

  const problems = [];
  if (absent) {
    problems.push(`runtime chapter has no descriptor (got ${typeOf(descriptor)})`);
  } else if (typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    problems.push(`descriptor must be an object, got ${typeOf(descriptor)}`);
  } else {
    collectCoreProblems(descriptor, id, problems);
    collectCapabilityProblems(descriptor, problems);
  }
  if (problems.length) {
    throw new Error(`[chapter contract] ${id}: ${problems.join('; ')}`);
  }
}

function collectCoreProblems(descriptor, id, problems) {
  for (const key of CORE_KEYS) {
    if (!Object.hasOwn(descriptor, key)) {
      problems.push(`missing required core key '${key}' — the key must exist even when its value is null`);
      continue;
    }
    const value = descriptor[key];
    if (!matches(CORE_SPEC[key], value)) {
      problems.push(`core key '${key}' must be ${CORE_SPEC[key]}, got ${describe(value)}`);
      continue;
    }
    if (key === 'id' && value !== id) {
      problems.push(`declared id ${JSON.stringify(value)} does not match its schema row id ${JSON.stringify(id)}`);
    }
  }
}

function collectCapabilityProblems(descriptor, problems) {
  for (const cap of CAPABILITY_KEYS) {
    // Absence and an explicit null both mean "this chapter does not offer it".
    if (!Object.hasOwn(descriptor, cap)) continue;
    const value = descriptor[cap];
    if (value === null) continue;
    if (typeof value !== 'object' || Array.isArray(value)) {
      problems.push(`capability '${cap}' must be an object or null, got ${describe(value)}`);
      continue;
    }
    const spec = CAPABILITY_SPEC[cap];
    for (const member of Object.keys(value)) {
      if (!Object.hasOwn(spec, member)) {
        problems.push(`capability '${cap}' declares unknown member '${member}'`);
      }
    }
    for (const member of CAPABILITY_MEMBERS[cap]) {
      if (!Object.hasOwn(value, member)) {
        problems.push(`capability '${cap}' is missing member '${member}' — the key must exist even when its value is null`);
        continue;
      }
      if (!matches(spec[member], value[member])) {
        problems.push(`capability '${cap}' member '${member}' must be ${spec[member]}, got ${describe(value[member])}`);
      }
    }
  }
  // An unknown key on the descriptor ROOT is deliberately allowed: that is the
  // QA surface (`exits`, `pacing`, `portraits`, `_sporeSeat`) which stays
  // reachable through window.journey and unreadable from production code.
}
