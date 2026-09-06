/* ====================================================================== *
 * journey/hero-field.js — THE ADOPTED SPORE FIELD BELONGS TO THE HERO.
 *
 * Hannah, 2026-09-01 (voice): "When I move out of the first section, can
 * you make it so that those entry dots disappear, and when I move back
 * into it they should reappear again? ... And we should be careful to
 * catch that in the right kind of navigation way because there's a lot of
 * different nuances."
 *
 * WHAT THE FIELD IS. organism/hero-spores.js paints a broad current of
 * spores across the frame before `three` has finished downloading, and at
 * scene boot organism.js ADOPTS that live layer as a THREE.Points
 * (createHeroSporeField) — same particles, same offsets, same phase, no
 * particle moving across the seam. It is world-static and it deliberately
 * takes no draw window, which is exactly why it used to be the one thing
 * on stage that every chapter inherited. Round 2's owner feedback asked
 * for it to survive the load; this ruling scopes that survival to the
 * first section, which is where the entry it is made of happened.
 *
 * ---------------------------------------------------------------------
 * THIS FILE INVENTS NO TEMPO.
 * ---------------------------------------------------------------------
 * The field's presence IS the hero furniture's painted scalar: the same
 * number journey.js's paintHeroFurniture puts on `.callouts`, `.scrim`
 * and `.spill` every frame, which is PRESENCE x ARRIVAL max()ed with the
 * DEPARTURE term. Riding that number rather than re-deriving it is the
 * whole design, and it is what buys — for free, and with no second law
 * to keep in step with the first:
 *
 *   · THE TEMPO ITSELF. The fade out on leaving and the fade in on return
 *     are heroPresence over p (authored lead 0.006, fade width 0.05), so
 *     the field leaves with the copy and the callouts rather than to a
 *     tempo somebody chose for it.
 *   · THE INTERRUPTION LAW. Every retarget continues the envelope from
 *     its currently painted value on the new ticket's easing, because the
 *     value read here IS the painted one. armHeroExit seeds `from` off
 *     heroShownNow(); cancelHeroEntry drops the AUTHORITY and never the
 *     value, relaxing back on COPY_IN_K; setHeroEntryPlay reverses a
 *     steered lap along the curve it entered on. Leaving and reversing
 *     halfway back brings the field up from wherever it had faded to
 *     because that is simply what that number does — there is no reset
 *     here to forget to skip, and no stale origin to snap from.
 *   · THE CEREMONIAL LAP LATCH (ledger section 43). The bookend wraps are
 *     >360 degree laps and pass near home's azimuth on the way. heroGate
 *     holds a lap's arrival dark until the TRUE approach (its lead is
 *     blendDur * COPY_JUMP_LEAD, so the light is not spent on the
 *     fly-past), and armHeroExit retires a DEPARTING lap's furniture over
 *     0.6 s specifically so it is gone before the camera swings back
 *     through it. The field cannot flash mid-lap, and cannot linger out
 *     of one, for exactly the reasons the callouts cannot.
 *   · PLACEMENTS SNAP, AND THEY DO NOT FLASH. A deep link, a ?capture=
 *     still and QA scrollTo all arrive on dt === 0, where both travel
 *     terms die by contract ("a placement is not an arrival"). The field
 *     is therefore at the destination's own presence on arrival — absent
 *     in a chapter it does not belong to, with no entrance played into a
 *     chapter it never entered. The prelude still runs on boot, as it
 *     always has; it is simply gated to nothing by the time the journey
 *     places a deep link away from home, which is the same thing the
 *     hero's own copy does on that path.
 *   · REDUCED MOTION AND A HIDDEN TAB NEED NO CLAUSE HERE AT ALL. This
 *     file integrates no clock of its own: it holds no `t`, no duration
 *     and no easing. There is therefore no envelope time that can pass
 *     while document.hidden is true and no wrong painted value to come
 *     back to — the question other envelopes have to answer does not
 *     arise. And whatever the furniture channel does under
 *     prefers-reduced-motion, the field does the same thing on the same
 *     frame, by construction rather than by a matching clause.
 *   · THE STATIC FALLBACK IS UNTOUCHED. It has no journey, so nothing
 *     ever constructs this, and `set()` is never called.
 *
 * ---------------------------------------------------------------------
 * WHY THE COLOUR ATTRIBUTE, AND NOT uOpacity.
 * ---------------------------------------------------------------------
 * journey/chapters/final/index.js's `collectHeroGround` walks the scene's
 * DIRECT Points children and takes a `base` off each one's uOpacity the
 * first time the Final leg arms, then writes that captured base back on
 * retire. The adopted field is such a child. A presence written on
 * uOpacity would be captured as Final's base at whatever value it held at
 * that moment — 0, when the visitor is deep in the journey, which is
 * precisely when Final arms — and restored as 0 for the rest of the
 * session, so the field would never come back. That is the same
 * un-reversible capture/restore fault journey/chapters/hero-ground-dim.js
 * was written to abolish, and it is why this presence rides an ORTHOGONAL
 * channel instead: the field's own colour attribute, which
 * hero-spores.js rewrites from F.color x F.fade every frame in inkFades()
 * and which nothing else in the tree touches. The two channels then
 * compose by multiplication with ONE WRITER EACH, which is the property
 * that matters and the one a second uOpacity writer could not have.
 *
 * It costs nothing optically. The material is AdditiveBlending and its
 * fragment shader ends `gl_FragColor = vec4(vColor * ... , 1.0)`, so
 * scaling vColor scales exactly what scaling uOpacity scales: the light
 * the sprite adds. It is a fade to nothing, not a fade to black specks.
 *
 * ---------------------------------------------------------------------
 * THE ONE-FRAME DEBT, STATED RATHER THAN HIDDEN.
 * ---------------------------------------------------------------------
 * The painter is journey.js's paintHeroFurniture, and the value it paints
 * is composed at its call site. The RIGHT shape is one more line inside
 * that function — the place the header there already calls "the ONE place
 * the hero furniture's visibility reaches the DOM" would become the one
 * place the hero's presence reaches both of its surfaces:
 *
 *     function paintHeroFurniture(a) {
 *       heroShown = a;
 *       heroField.set(a);          // <- the whole insertion
 *       ...
 *
 * journey/journey.js is owned by a concurrent lane in this round, so this
 * gate is driven from the transition controller's own per-frame stepper
 * instead, off `heroShownNow()` — the painter's memo of what it last put
 * up. That is the SAME number, one frame old. Both surfaces move on
 * continuous envelopes (that is the entire point of the two travel
 * terms), so a one-frame offset between them introduces no step, no pop
 * and nothing measurable at any speed the camera travels; and every
 * dt === 0 placement settles inside placeAt's own two synchronous passes,
 * before a frame is rendered, so a placement carries no debt at all.
 * When journey.js is free, move the call and delete this paragraph.
 * ====================================================================== */

/** The gate onto the adopted hero spore field's presence.
 *
 *  @param {object} sceneApi  the organism's scene handle. The field is
 *         published on it as `groups.heroField` by organism.js at the
 *         adoption call site — a named handle rather than a shape-match
 *         over the scene graph, so this file does not have to know how to
 *         recognise the field and cannot mistake a sibling cloud for it.
 *  @returns {{ set: (a: number) => void, shown: number }}
 */
export function createHeroFieldGate(sceneApi) {
  const points = sceneApi && sceneApi.groups && sceneApi.groups.heroField;
  const colour = points && points.geometry && points.geometry.attributes
    && points.geometry.attributes.color;

  // No field on this page (the static fallback, a scene that booted
  // without the preload layer, a future tree that stops adopting one).
  // A gate with nothing to gate is a no-op, never a throw: this runs
  // inside the spine's own frame, where a throw would take scroll,
  // navigation and copy down with it.
  if (!colour || !colour.array) {
    return { set() {}, get shown() { return 1; } };
  }

  const arr = colour.array;
  let shown = 1;
  /* THE ANTI-COMPOUNDING GUARD, and why it is a version number.
     This gate scales the colours hero-spores.js has ALREADY written this
     frame; it does not own them and keeps no copy (F.fade twinkles, and a
     copy would be a second brightness law — the exact thing the adoption
     seam exists to avoid). That is only safe while inkFades() actually
     runs between two of these writes: organism/animation.js DELETES an
     animator that throws, so a dead 'hero-spore-drift' would otherwise
     leave this multiplying its own output down to black over a second.
     THREE bumps `version` on every `needsUpdate = true`, so the attribute
     itself answers "has anyone written since I did?" for the price of an
     integer compare. If nobody has, the buffer already carries this
     gate's last scale and re-applying it would compound. */
  let stampedVersion = -1;

  return {
    /** Paint the field at the hero's presence. `a` is the hero furniture's
     *  own painted scalar; 1 means the field is fully the visitor's, 0
     *  means this is not its section. */
    set(a) {
      const next = a > 1 ? 1 : a < 0 ? 0 : (a || 0);
      shown = next;
      /* A read-only mirror for the instrumented probes (evidence/
         r11-fieldgate). userData rather than a window global: the global
         surface is pinned by tools/test-global-hooks.mjs and a QA
         convenience has no business widening it. */
      points.userData.fieldGate = next;
      // Fully present is the SHIPPED STATE, bit-for-bit: no write, no
      // upload, and the buffer keeps exactly the values inkFades() put
      // there this frame. Every capture and every golden taken at the
      // hero rest is therefore untouched by this file existing.
      if (next >= 1) { stampedVersion = -1; return; }
      if (colour.version === stampedVersion) return;   // see the guard above
      for (let i = 0; i < arr.length; i++) arr[i] *= next;
      colour.needsUpdate = true;
      stampedVersion = colour.version;
    },
    /** What this gate last painted. */
    get shown() { return shown; },
  };
}
