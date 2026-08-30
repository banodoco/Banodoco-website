// Connect's node table — what each node of the community network IS, as data.
//
// The Connect chapter draws a small network: a stipe base, three lit routes
// growing out of it, and a hub core where each route lands. A NODE is one of
// those hubs together with everything that distinguishes it from its
// siblings — where it stands, how its route leaves the base, how densely it
// converges, and whether it is the node the chapter's lens is pinned to.
//
// WHY THIS IS CONTENT AND NOT SCENE CODE. Everything below is an authored
// value: a placement chosen against a frame, a strand count chosen for how
// dense a run should read, a bow sign chosen so three routes fan instead of
// bundling. None of it is derived from anything. Held here, a node's identity
// is one row a reader can take in at once; held in the builder it was five
// literals and two `id === '...'` branches spread over four hundred lines of
// geometry, and a sixth node meant editing the builder rather than the table.
//
// WHAT THIS FILE DOES NOT OWN: WHICH NODES EXIST, and their order.
// That is `journey/structure.js`'s `hotspots.ids` for the connect chapter —
// the same list the hotspot registrar, the tab order and the label stagger
// all read. This file is keyed BY those ids and adds attributes to them;
// `journey/chapters/connect/tendrils.js` joins the two and refuses if the
// table is missing a row the schema names. Two files, two properties, one
// owner each: the schema says who is here, this says what they are like.
//
// ---- HAZARDS, before you edit a number ----
//
// THE ROUTES ARE BAKED. `static/geom/connect.bin` holds the emitted strand
// and point geometry, and on the shipped path `buildTendrils` reads it and
// never re-runs the builders these values feed. So changing `pos`, `az`,
// `bow`, `strands` or `continuations` changes NOTHING you can see until the
// bake is re-run — and then it changes the captured goldens. `spokes` and
// `coreScale` are the exceptions in spirit only: `coreScale` is applied to a
// live sprite on both paths, `spokes` only on the live fallback path.
//
// THE VALUES ARE CONSUMED IN A SEEDED RNG STREAM. The live builder draws
// from one deterministic generator, and `strands` and `continuations` are
// LOOP BOUNDS inside it. Changing either does not perturb one node in
// isolation — it shifts every draw after it, so the whole network downstream
// of that loop moves. That is why they are declared per node rather than
// computed: a value that can silently re-phase a shared stream should be
// written down where it can be read, not buried in a ternary.
//
// NARRATIVE ORDER IS NOT REVEAL ORDER. The order the schema lists these ids
// in is tab order and chip order, and it leads with ADOS. The order they
// LIGHT in is Hivemind, then Discord, then ADOS — a separate schedule that
// lives with the lighting windows in `tendrils.js`. The two have been made to
// disagree deliberately and neither should be derived from the other.

/** One row per Connect hub, keyed by the node id `journey/structure.js`
 *  declares. Every field is authored; see the hazards above.
 *
 *  `pos`          world XZ placement of the hub core. Y is a placeholder —
 *                 the builder drops every hub onto the terrain, so the
 *                 authored Y is never the shipped Y and is kept at 0 to say
 *                 so.
 *  `az`           departure azimuth from the stipe base, in radians. This is
 *                 a property of the BASE — the 37 / -27 / -8 degree fan is
 *                 what stops the three routes leaving as one bundle — and is
 *                 deliberately NOT re-aimed when a hub moves.
 *  `bow`          which side the route bows to on its way out, +1 or -1.
 *  `strands`      braided strands carried along the route.
 *  `continuations` runs that carry PAST the hub and thin out off-stage.
 *  `spokes`       radial convergence lines drawn into the hub core.
 *  `coreScale`    the hub sprite's rest scale.
 *  `focal`        set on exactly ONE node: the one the chapter's lens, its
 *                 copy anchor and its `uAdosShift` uniform all track, and
 *                 the node the chapter publishes as its `focus` capability.
 *                 Present on the focal row only; absent means false. */
export const CONNECT_NODES = {
  ados:     { pos: [4.61, 0, 3.06],  az: 0.65,  bow: 1,  strands: 3, continuations: 2, spokes: 13, coreScale: 0.46, focal: true },
  hivemind: { pos: [5.00, 0, -2.60], az: -0.48, bow: -1, strands: 3, continuations: 3, spokes: 11, coreScale: 0.40 },
  discord:  { pos: [7.86, 0, -0.58], az: -0.15, bow: 1,  strands: 2, continuations: 3, spokes: 9,  coreScale: 0.36 },
};

// Immutable to consumers. The builder grounds hub positions by writing Y, so
// it constructs its own vectors from `pos` rather than borrowing these — and
// freezing is what makes that obligation fail loudly instead of quietly
// corrupting the table for every later build on the page.
for (const node of Object.values(CONNECT_NODES)) {
  Object.freeze(node.pos);
  Object.freeze(node);
}
Object.freeze(CONNECT_NODES);

/** The one node carrying `focal`. Derived rather than declared twice: a
 *  second literal naming ADOS is a second place to forget. Throws at import
 *  if the table ever carries none or more than one, because a chapter with
 *  no focal node has nowhere to point its lens and one with two has a
 *  silent winner. */
export const CONNECT_FOCAL_ID = (() => {
  const focal = Object.keys(CONNECT_NODES).filter((id) => CONNECT_NODES[id].focal === true);
  if (focal.length !== 1) {
    throw new Error(`[connect nodes] exactly one node must be focal; found ${focal.length}`);
  }
  return focal[0];
})();
