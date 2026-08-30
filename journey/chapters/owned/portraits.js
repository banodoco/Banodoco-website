// journey-v6 — OWNED contributor portrait field (W4-C).
// Port of the APPROVED Spike B treatment (spike-b/portraits.js) into the
// live journey. Copied + adapted, never imported from spike-b/.
//
// Carried verbatim from the approved spike:
//   - the per-photo treatment: 62% desaturation -> 0.90 amber multiply ->
//     warm-black lift -> hard edge burn -> unify/grain -> mask feather 0.76
//     -> ember rim arcs + outward fibre ticks;
//   - procedural painted busts + anonymous spore-print glyphs, 3-way
//     crossfade in the shader (procedural / photo / anonymous);
//   - REAL strand geometry terminating exactly at each node (local strands,
//     node-to-node links, cord attachments) — hover lights ONLY the active
//     node's strands;
//   - 3D rim fibres, ember cores + halos, defocus band 2.2->5.0;
//   - the two hard placement rules from rev 2, verbatim: >=3.0 world units
//     of camera-path clearance from EVERY point of the leg (descent + rise
//     included), and frame-cell stratification (home moment on the path +
//     3x3 frustum cell + near/mid/far depth pattern).
//
// New for the journey:
//   - placement is authored against the REAL leg (owned-leg.js poseAt
//     samples), stratified against the REST pose frustum primarily (the 16
//     routable contributors) with glide coverage second (32 ambient nodes)
//     — this is the fix for the grey-box reachability gap;
//   - size/spacing jitter rule against "row of coins" chains at density;
//   - underground clamps (whole disc below the soil);
//   - uFade on every layer for the T3 streaming seam;
//   - consent hook: aAnon per-node attribute forces the anonymous glyph for
//     any contributor with consent !== true when enforcement is on. Photos
//     here are real contributors' own avatars, dealt at random out of
//     assets/contributor-portraits/ (see content/contributors.js);
//     anonymous mode stays one call away (setMode('anonymous')).
import * as THREE from 'three';
import * as H from '../../lib/helpers.js';
import { isBaked, geometry, payload } from '../../lib/baked.js';
import { REST_P } from './leg.js';
import { createPortraitDealer } from './portrait-deal.js';
import { makePortraitAtlas } from './portrait-atlas.js';
import { createPortraitTextureOwner } from './portrait-textures.js';
import { PHOTO_GRADE, drawBust, drawAnonGlyph } from './portrait-paint.js';
import { rowLayout } from '../../layout/rail-geometry.js';
import { createPortraitRemix, bustSeedsFor } from './portrait-remix.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

/* ================================================================== */
/* node-strand material: one draw call for every node's LOCAL strands  */
/* ================================================================== */
function makeNodeStrandMat(baseColor, pulseColor, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: -1 },
      uPulseOn: { value: 0 },
      uActive: { value: -999 },
      uActiveAmt: { value: 0 },
      uFade: { value: 0 },
      uBase: { value: opts.baseOpacity ?? 0.135 },
      uWidth: { value: opts.pulseWidth ?? 0.13 },
      uFogDensity: { value: opts.fogDensity ?? 0.016 },
      uColor: { value: new THREE.Color(baseColor) },
      uPulseColor: { value: new THREE.Color(pulseColor) },
      uWaveC: { value: new THREE.Vector3(0, 0, 0) },
      uWaveR: { value: -100 },
      uWaveW: { value: 2.5 },
      uWaveAmt: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      attribute float aNode;
      attribute float aRailVis;
      uniform float uActive, uActiveAmt, uWaveR, uWaveW, uWaveAmt;
      uniform vec3 uWaveC;
      varying float vA, vS, vSel, vFog, vWv, vRailVis;
      void main() {
        vRailVis = aRailVis;
        vA = aAlong; vS = aStrand;
        vSel = step(abs(aNode - uActive), 0.5) * uActiveAmt;
        float wd = distance(position, uWaveC) - uWaveR;
        vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFog = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uPulse, uPulseOn, uBase, uWidth, uFogDensity, uFade;
      uniform vec3 uColor, uPulseColor;
      varying float vA, vS, vSel, vFog, vWv, vRailVis;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.41 + vS * 1.55) + vS * 51.3);
        float amb = uBase * (0.66 + 0.34 * tw) * (0.65 + 0.55 * vA);
        float d = vA - uPulse;
        float p = exp(-d * d / (uWidth * uWidth)) * uPulseOn * vSel;
        float trail = 0.26 * exp(min(d, 0.0) * 6.0) * step(d, 0.0) * uPulseOn * vSel;
        vec3 col = uColor * amb * (1.0 + 2.90 * vSel + 2.1 * vWv)
          + uPulseColor * (p + trail) * 1.25 + uPulseColor * vWv * amb * 1.4;
        col *= exp(-uFogDensity * uFogDensity * vFog * vFog);
        col *= smoothstep(1.1, 2.9, vFog);    // near-fade (see substrate note)
        gl_FragColor = vec4(col * uFade * vRailVis, vRailVis);
      }`,
  });
}

/* ================================================================== */
export function buildPortraitField({
  leg, contributors, substrate, palette: P, nodeCount = 48, exposure = 1,
  photosEnabled = true,
}) {
  const V3 = THREE.Vector3;
  const V = (x, y, z) => new V3(x, y, z);
  const group = new THREE.Group();
  const NODE_COUNT = nodeCount;
  const C_COUNT = contributors.length;          // routable, hoverable nodes
  group.name = 'owned-portraits-' + NODE_COUNT;
  const {
    camDist, nearestCamPt, restFrame, projectInto, clampUnder, groundY,
  } = leg;
  /* THE BAND-DEPENDENT TRIO, and the only mutable placement state in this
     file. `let`, not `const`, because a viewport that crosses the portrait
     boundary re-asks leg.fieldFor() for it and re-places the field against
     the answer — see recompose() at the bottom. Every fresh load is
     bit-identical to what these three were as constants. */
  let { portraitField, portraitAspect, restFramePortrait } = leg;
  const { nearestCordPoint, inVoid } = substrate;

  // ---- baked-read wiring (2026-08-17) --------------------------------
  // The shipped path skips placement and the strand/plane/rim/core/halo
  // geometry math below, rebuilding every BufferGeometry from static/geom
  // bytes (baked once at commit time in the goldens' own headless Chrome; see
  // journey/lib/baked.js). Materials, uniforms, the two atlases, the photo /
  // remix machinery and the runtime closures all stay computed on both paths
  // — only placement and geometry are skipped. ONE try/catch wraps the WHOLE
  // read: any missing key or shape mismatch throws and the field falls back
  // to the live builders in full, never a half-baked mix.
  const baked = (() => {
    // Portrait builds place the field from their own authored table (see
    // REST_SITES_PORTRAIT below); the bake is harvested in a landscape
    // window, so its bytes ARE the landscape arc and a portrait build must
    // rebuild live. leg.js decides the predicate once, at build time.
    if (portraitField) return null;
    if (!isBaked('owned')) return null;
    try {
      const p = payload('owned');
      const P = p && p.portraits;
      if (!P || !Array.isArray(P.nodeIds) || !Array.isArray(P.nodePos)
          || !Array.isArray(P.nodeContentKeys) || !Array.isArray(P.nodeRoutable)
          || !Array.isArray(P.nodeSize) || !Array.isArray(P.nodeAnchors)
          || typeof P.swapMaxR !== 'number' || typeof P.strandCurves !== 'number') {
        return null;
      }
      return {
        g: {
          planes: geometry('owned/planes', [
            ['position', 3], ['aCorner', 2], ['aCellA', 2], ['aCellB', 2],
            ['aNode', 1], ['aSeed', 1], ['aSize', 1], ['aTilt', 1],
            ['aAnonF', 1], ['aSwapD', 1],
          ]),
          rim: geometry('owned/rim', [['position', 3], ['aOff', 2], ['aNode', 1], ['aSeed', 1], ['aAlong', 1]]),
          cores: geometry('owned/cores', [['position', 3], ['aSize', 1], ['aSeed', 1], ['aNode', 1]]),
          halos: geometry('owned/halos', [['position', 3], ['aSize', 1], ['aSeed', 1], ['aNode', 1]]),
          strands: geometry('owned/strands', [['position', 3], ['aAlong', 1], ['aStrand', 1], ['aNode', 1]]),
        },
        portraits: p.portraits,
      };
    } catch (e) {
      return null;
    }
  })();

  /* ---------------- placement: AUTHORED IN THE REST FRAME ----------------
     ROOT-NETWORK RESTAGE (2026-08-06, 20-owned-root-network.md).

     The shipped build placed 48 nodes by frame-cell stratification across the
     whole leg — 16 routable ones biased to the rest, 32 ambient ones for
     glide coverage. Under the new composition that is the wrong instrument
     twice over. First, the reference is explicit about the count: "roughly
     14-16 PORTRAIT FACES", distributed "in a broad arc/oval across the
     field, denser toward the lower half, with clear dark breathing room
     between them" — 48 faces is a crowd, not a constellation, and the old
     frame read as a wall of glowing lanterns. Second, a 3x3 grid cannot
     author an arc; it authors a grid, and at this density that is exactly
     what it looked like.

     So the sixteen contributors ARE the field, and their positions are
     authored one by one in the REST FRAME (ndcX, ndcY, depth, size) — the
     house rule from the CONNECT restage: the frame is the spec. Read the
     table as the picture it is:

       · two far arms sweep up and outward at ndcY ~ +0.30, flanking the copy;
       · the sides fill at ndcY ~ 0; nine ride the lower half in two ranks,
         nearest lowest and largest — except bottom-LEFT: the navigator docks
         there and rail-mask.js deletes covered faces, so site 13 rides high.

     Depth falls as the row falls (13.0 at the top of the arc, 5.2 at the
     bottom), which is what makes "larger and lower reads as nearer" true in
     perspective rather than by drawing bigger sprites. Nothing is placed
     inside the copy block's box (|ndcX| < 0.5, ndcY in +0.15..+0.80) at any
     of the three review sizes.

     The 3.0-unit camera-path clearance rule from Spike B rev 2 SURVIVES
     unchanged below, and is now nearly free by construction: the camera
     glides just under the soil and the whole network hangs below it, so
     every site is already 3+ units under the flight line. The old build had
     to fight that rule; this one satisfies it. */
  const REST_SITES = [
    // ndcX, ndcY, depth, size
    [-0.70, 0.30, 12.4, 0.38],
    [0.72, 0.28, 11.8, 0.38],
    [-0.88, -0.03, 10.6, 0.39],
    [0.88, -0.06, 10.2, 0.39],
    [-0.58, 0.11, 11.6, 0.38],
    [0.56, 0.09, 11.2, 0.38],
    [-0.74, -0.32, 8.8, 0.42],
    [0.76, -0.30, 8.4, 0.42],
    [-0.26, -0.19, 9.8, 0.40],
    [0.21, -0.24, 9.4, 0.41],
    [-0.58, -0.47, 7.2, 0.44],
    [0.56, -0.45, 7.0, 0.44],
    [-0.05, -0.50, 8.0, 0.43],
    [-0.86, -0.52, 7.0, 0.45], // was [-0.84,-0.68,6.2,0.46]; lifted clear of the navigator dock (2026-08-23) — evidence/2026-08-21-elegance-run-01/owned-pass/
    [0.82, -0.64, 6.0, 0.46],
    [0.40, -0.76, 5.6, 0.39], // shifted clear of the return CTA; peer-sized at its nearer authored depth
  ];

  /* PORTRAIT ARC (2026-08-17; revised the same day). The table above is the
     landscape picture, and a ~0.46-aspect phone sees barely a fifth of its
     width: only the four central sites projected into the tall frame, and
     the chapter read as five faces and a lot of dark. This is the SAME
     sixteen slots authored again for the tall frame — in the PORTRAIT rest
     frame (leg.js restFramePortrait: the portrait.js re-composed pose,
     fov 64) at the BUILD aspect, so a tablet's wider tall frame spreads the
     same NDC picture across its own width instead of inheriting a
     phone-squeezed middle (the first cut fixed the aspect at 430/932 and
     tablets read as a cluttered centre column).

     The first cut also ran the arc too high: two flankers at ndcY +0.30 sat
     BEHIND the paragraph, and the top rank at -0.04 crowded the button. The
     revision is one intention — THE COPY OWNS THE TOP, THE NETWORK RISES TO
     MEET IT AND STOPS:

       · the crown holds the top edge, the copy block runs to ndcY ~ +0.05;
       · a clear dark band (~0.16 of frame height) separates the button from
         the first face — the composition breathes where the eye enters;
       · the LEFT flanker peeks in AT THE BUTTON LINE from the far edge
         (y +0.12, x -0.82, depth 13.6), where the edge is empty. The RIGHT
         one cannot: the navigator docks dead centre of the right edge on
         every portrait viewport, so its mirror rides the first rank's line;
       · four ranks descend from there — 3 / 4 / 3 / 4, alternating so no
         face sits directly above another — with rank gaps of ~0.20 frame
         heights and depth falling 11.8 -> 5.5, so lower IS nearer and the
         size hierarchy (0.34 far, 0.47 near) does the de-cluttering: the
         far ranks recede to accents, the near rank carries the weight.

     Nothing sits inside the copy's box (|ndcX| < 0.75, ndcY in
     +0.14..+0.85) at either phone size or at 768x1024. */
  const REST_SITES_PORTRAIT = [
    // ndcX, ndcY, depth, size
    [-0.82, 0.12, 13.6, 0.34],
    [0.94, -0.28, 12.8, 0.34], // was [0.84,0.08,13.2,0.34]; the navigator's right-edge dock ate it on every phone (2026-08-24) — evidence/2026-08-21-elegance-run-01/defect-03/
    [-0.55, -0.20, 11.8, 0.37],
    [0.02, -0.26, 11.4, 0.37],
    [0.60, -0.21, 11.0, 0.37],
    [-0.85, -0.44, 9.6, 0.40],
    [-0.30, -0.47, 9.2, 0.41],
    [0.36, -0.48, 9.0, 0.41],
    [0.87, -0.43, 9.4, 0.40],
    [-0.58, -0.64, 7.4, 0.43],
    [0.04, -0.68, 7.0, 0.44],
    [0.62, -0.65, 7.2, 0.43],
    [-0.84, -0.80, 6.0, 0.45],
    [-0.28, -0.87, 5.6, 0.46],
    [0.32, -0.84, 5.5, 0.47],
    [0.82, -0.79, 5.9, 0.45],
  ];

  // The frame, aspect and table every placement read below composes against.
  // One trio, chosen from the band the viewport is in — a landscape build is
  // bit-identical to what this file always produced (siteFrame IS restFrame),
  // and a portrait build is the authored tall-frame arc through the same
  // placement law, separation pass, clearance rule and repair loop.
  //
  // Re-chosen, not patched, when the viewport crosses the band boundary
  // (recompose()): the three move together or not at all, because a table
  // read through the other band's frame is precisely the defect this file
  // carried until 2026-08-25.
  let SITES = portraitField ? REST_SITES_PORTRAIT : REST_SITES;
  let siteFrame = portraitField ? restFramePortrait : restFrame;
  let siteAspect = portraitField ? portraitAspect : 1.6;

  // Rest reachability repair (the grey-box gap, fixed by construction and
  // then VERIFIED here): every routable node must project into the rest
  // frame with margin for the hotspot layer (|ndc| <= 0.97 in x, 0.90 in y —
  // the arc deliberately runs wide, and a chip whose dot is at |x| 0.96 is
  // still fully placeable because ui.js flips the pill inboard) at a workable
  // depth. A failure is pulled straight back toward its authored site along
  // the rest gaze rather than re-rolled somewhere else: the arc is authored,
  // so the repair must preserve it. `restOk` stays defined on both paths: it
  // is also the runtime `restVisible()` QA gate.
  /* THE NAVIGATOR'S BAND IS NOT A SEAT (nav-restage, 2026-08-27). The
     journey navigator stopped docking at the right edge and now stands as
     a centred row across the bottom of every viewport. A face resting
     inside that band would only ever be WITHHELD by the rail mask
     (journey/ui/rail-mask.js) — measured before this rule: four of
     sixteen contributors gone at the phone rest, one at the desktop rest.
     So the placement law itself refuses the seat and the repair loop
     below finds another, exactly as it already does for a seat outside
     the chip layer's margins. The band is derived from the SAME
     rowLayout() the navigator is laid out by — pure arithmetic, no DOM —
     at the nominal frame of the band this composition is authored for
     (430x932 portrait / 1440x900 landscape, the frames the faces gate
     measures), padded by the mask's own 24px profile clearance plus a
     12px safety margin. */
  function navBandRefuses(pr, size) {
    const hpx = siteAspect < 1 ? 932 : 900;
    const wpx = Math.round(hpx * siteAspect);
    const L = rowLayout(wpx, hpx);
    const px = (pr.x * 0.5 + 0.5) * wpx;
    const py = (-pr.y * 0.5 + 0.5) * hpx;
    const tanv = Math.tan(0.5 * siteFrame.fov * Math.PI / 180);
    const rpx = size * (hpx * 0.5) / (Math.max(0.05, pr.z) * tanv);
    const pad = 24;
    const bl = L.left - pad;
    const br = L.left + L.width + pad;
    const bt = L.centreY - L.major / 2 - pad;
    const cx = Math.max(bl, Math.min(px, br));
    const cy = Math.max(bt, Math.min(py, hpx));
    return Math.hypot(px - cx, py - cy) < rpx + 12;
  }

  function restOk(nd) {
    const pr = projectInto(siteFrame, nd.pos, siteAspect);
    return pr.z > 2.6 && pr.z < 16.5 && Math.abs(pr.x) <= 0.97 && Math.abs(pr.y) <= 0.90
      && !navBandRefuses(pr, nd.size);
  }

  // Baked read path: reconstruct the runtime-read node fields from the
  // payload in index order, and re-resolve each content reference through
  // the SAME `contributors` array the live placement read (store the id, not
  // the object — see baked.js). seed/tilt/strandCount/rand are bake-time only
  // and already folded into the baked attributes, so they are inert here;
  // anchors are restored for completeness (the commit pipeline's assignOwners
  // is their only reader, and it is skipped on the baked path).
  let nodes;
  if (baked) {
    const P = baked.portraits;
    nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
      id: P.nodeIds[i] ?? null,
      i,
      pos: new V3(P.nodePos[i * 3], P.nodePos[i * 3 + 1], P.nodePos[i * 3 + 2]),
      content: contributors.find(c => c.id === P.nodeContentKeys[i]) || contributors[i % C_COUNT],
      routable: !!P.nodeRoutable[i],
      homeP: REST_P,
      size: P.nodeSize[i],
      seed: 0, tilt: 0, strandCount: 0, rand: null,
      anchors: (P.nodeAnchors[i] || []).map(([x, y, z]) => new V3(x, y, z)),
    }));
  } else {
    nodes = placeNodes();
  }

  /* THE PLACEMENT LAW, AS A FUNCTION OF THE BAND — moved here whole on
     2026-08-25 and otherwise unchanged, so a first call reproduces the
     `nodes = Array.from(...)` block, the three separation passes, the
     clearance rule and the repair loop exactly as they stood.
     Making it callable twice is the whole fix: a viewport that crosses the
     portrait boundary calls it again against the re-chosen trio above.
     It reads only `SITES` / `siteFrame` / `siteAspect` and `contributors`,
     and it re-derives EVERY per-node number from `contributors[i]`'s own
     seed — never from a node it is replacing — which is what lets a page
     that booted on the BAKED path (where seed/tilt/strandCount/rand arrive
     as zeroes and null) re-place itself with the identical stream a live
     build would have drawn. */
  function placeNodes() {
    const nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
      const c = contributors[i % C_COUNT];
      const routable = i < C_COUNT;
      const rand = H.rng((((c.seed ?? (i + 1)) * 7919 + 17 + i * 977) | 0) >>> 0);
      const site = SITES[i % SITES.length];
      const f = siteFrame;
      const TANV = Math.tan(0.5 * f.fov * Math.PI / 180);
      const ASPECT = siteAspect;
      // a hair of authored-position jitter so the arc never reads as a plotted
      // curve, small enough that the composition above is what ships
      const cx = site[0] + (rand() - 0.5) * 0.045;
      const cy = site[1] + (rand() - 0.5) * 0.040;
      const d = site[2] * (0.96 + rand() * 0.08);
      const pos = f.pos.clone()
        .addScaledVector(f.fwd, d)
        .addScaledVector(f.right, cx * TANV * ASPECT * d)
        .addScaledVector(f.up, cy * TANV * d);
      pos.x = clamp(pos.x, -16.5, 5.0);
      pos.z = clamp(pos.z, -9.0, 9.0);
      clampUnder(pos, 0.9);
      // a site that lands in an authored void is nudged SIDEWAYS out of it,
      // never re-rolled and never dropped: the arc is the composition and the
      // void is only seasoning. (The first pass pushed down 0.45 per iteration
      // and moved two nodes half a frame south of where they were authored —
      // measured NDC y -0.45 -> -0.88. Lateral, small, and capped.)
      for (let guard = 0; guard < 4 && inVoid(pos.x, pos.y, pos.z); guard++) {
        // INWARD, toward frame centre — an outward nudge walks edge sites off
        // the frame (measured: authored 0.78 -> 0.96 ndc, past the chip layer's
        // placeable margin).
        pos.addScaledVector(f.right, (cx >= 0 ? -1 : 1) * 0.34)
           .addScaledVector(f.up, -0.10);
        clampUnder(pos, 0.9);
      }
      return {
        id: routable ? c.id : null, i, pos, content: c, routable, homeP: REST_P,
        // size/spacing jitter (rev-2 rule, kept): a spread wide enough that
        // density never reads as a "row of coins". The base size now comes
        // from the authored table so scale tracks the arc.
        size: site[3] * (0.92 + rand() * 0.20),
        seed: rand(),
        tilt: (rand() - 0.5) * 0.16,
        strandCount: 4 + Math.floor(rand() * 3),
        rand,
      };
    });

    // gentle separation pass — per-pair jittered minimum so spacing never
    // settles into an even chain. The authored arc already spaces them; this
    // only catches the jitter's worst case.
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i].pos, b = nodes[j].pos;
          const d = a.distanceTo(b);
          const min = 1.7 + ((i * 31 + j * 17) % 7) * 0.07;
          if (d < min && d > 0.001) {
            const push = a.clone().sub(b).normalize().multiplyScalar((min - d) * 0.5);
            a.add(push); b.sub(push);
            clampUnder(a, 0.9); clampUnder(b, 0.9);
          }
        }
      }
    }

    // HARD RULE (rev 2, verbatim): every portrait node keeps >=3.0 world units
    // of clearance from ANY point of the camera path — descent and rise
    // included — or its defocused plane can swallow the whole frame on a
    // different pass. If the push breaches the soil, it is redirected along
    // the horizontal component.
    function enforceClearance(nd) {
      for (let it = 0; it < 4; it++) {
        const cd = camDist(nd.pos.x, nd.pos.y, nd.pos.z);
        if (cd >= 3.0) return;
        const nearest = nearestCamPt(nd.pos);
        const away = nd.pos.clone().sub(nearest);
        if (away.lengthSq() < 0.001) away.set(0, -1, 0);
        away.normalize();
        const lid = groundY(nd.pos.x, nd.pos.z) - (0.35 + nd.size);
        if (nd.pos.y + away.y * (3.0 - cd) > lid) {
          away.y = Math.min(away.y, 0);
          if (away.lengthSq() < 0.05) away.set(0, -1, 0);
          away.normalize();
        }
        nd.pos.addScaledVector(away, 3.05 - cd);
        clampUnder(nd.pos, 0.35 + nd.size);
      }
    }
    for (const nd of nodes) enforceClearance(nd);

    for (const nd of nodes) {
      if (!nd.routable || restOk(nd)) continue;
      const site = SITES[nd.i % SITES.length];
      const TANV_R = Math.tan(0.5 * siteFrame.fov * Math.PI / 180);
      for (let attempt = 0; attempt < 8; attempt++) {
        const shrink = 1 - attempt * 0.06;
        const d = site[2] * (1 - attempt * 0.05);
        const p = siteFrame.pos.clone()
          .addScaledVector(siteFrame.fwd, d)
          .addScaledVector(siteFrame.right, site[0] * shrink * TANV_R * siteAspect * d)
          .addScaledVector(siteFrame.up, site[1] * shrink * TANV_R * d);
        clampUnder(p, 0.35 + nd.size);
        if (camDist(p.x, p.y, p.z) < 3.0) continue;
        nd.pos.copy(p);
        if (restOk(nd)) break;
      }
      enforceClearance(nd);
    }
    return nodes;
  }

  /* ---------------- atlases (8 columns; flipY-correct cell coords) ------ */
  const CELL = 256;
  const COLS = 8;
  const ROWS = Math.ceil(NODE_COUNT / COLS);
  const cellUV = (i) => [(i % COLS) / COLS, 1 - (Math.floor(i / COLS) + 1) / ROWS];

  // arrangement 0 (`bustSeedsFor` lives with the remix machinery, in
  // portrait-remix.js, so the seed rule has one home and the build-time atlas
  // is simply its first call — an import edge now, where before A01a-2 it was
  // a hoisted forward call to a function declared 800 lines further down)
  const atlasA = makePortraitAtlas(NODE_COUNT, COLS, CELL, drawBust, bustSeedsFor(nodes, 0));
  const anonSeeds = [11, 23, 37, 53];
  const atlasB = makePortraitAtlas(4, 2, CELL, drawAnonGlyph, anonSeeds);

  /* ---------------- local strands that TERMINATE at each node -----------
     Wrapped in a function on 2026-08-25, contents unchanged: the strands grow
     FROM the node positions, so re-placing the field has to regrow them. On
     the build path it is called exactly where it always ran (and not at all
     on the baked path, where the bytes already hold the answer). */
  let nodeStrandSpecs = [];     // empty on the baked path; strandCurves comes from the payload
  function growStrandSpecs(nodes) {
    const nodeStrandSpecs = [];
    function addStrandCurve(startPt, target, nodeIdx, strandVal, seedA, seedB, amp) {
      const segs = 5;
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const e = H.easings.smooth(t);
        const p = startPt.clone().lerp(target, e);
        const hump = Math.sin(Math.PI * t);
        p.x += H.fbm3(seedA * 2.3, t * 3.3, 1.7, 3) * amp * hump;
        p.y += H.fbm3(3.9, t * 3.1 + seedA * 1.4, seedB * 0.0005, 3) * amp * 0.75 * hump;
        p.z += H.fbm3(1.1, 2.6, t * 2.8 + seedA * 1.9, 3) * amp * hump;
        clampUnder(p, 0.16);
        pts.push(p);
      }
      pts[segs].copy(target);   // terminate exactly at the node
      nodeStrandSpecs.push({ pts, node: nodeIdx, strand: strandVal });
    }
    function addLocalStrands(target, nodeIdx, count, seed, minLen, maxLen, cordBias, anchors) {
      const rand = H.rng(seed >>> 0);
      for (let k = 0; k < count; k++) {
        let start = null;
        if (rand() < cordBias) start = nearestCordPoint(target, rand);
        // WHERE THIS FACE IS WIRED INTO THE ROOT WORLD (2026-08-06, report C).
        // `nearestCordPoint` returns a point ON the substrate's own root pool —
        // i.e. this strand does not merely end near a root, it starts on one.
        // Recording those points is what lets substrate.assignOwners() find the
        // face's LOCAL filaments by walking the network graph out from them,
        // instead of guessing by distance. Strands that rolled a free-space
        // start (55% of them) are not anchors and are not recorded.
        if (start && anchors) anchors.push(start.clone());
        if (!start) {
          const a = rand() * TAU;
          const b = (rand() - 0.5) * Math.PI * 0.85;
          const rr = minLen + rand() * (maxLen - minLen);
          start = V(
            target.x + Math.cos(a) * Math.cos(b) * rr,
            target.y + Math.sin(b) * rr * 0.75,
            target.z + Math.sin(a) * Math.cos(b) * rr,
          );
          clampUnder(start, 0.16);
        }
        addStrandCurve(start, target, nodeIdx, (k + 1) / (count + 1), k + seed * 0.0007, seed, 0.95);
      }
    }
    for (const n of nodes) {
      n.anchors = [];
      addLocalStrands(n.pos, n.i, n.strandCount, 8100 + n.i * 173, 1.7, 4.2, 0.45, n.anchors);
    }
    // node-to-node links: people are woven into EACH OTHER's networks —
    // each node reaches its nearest neighbour(s), endpoints exact at both.
    for (const n of nodes) {
      const byDist = nodes
        .filter(m => m.i !== n.i)
        .sort((a, b) => a.pos.distanceToSquared(n.pos) - b.pos.distanceToSquared(n.pos));
      const linkCount = n.rand() < 0.45 ? 2 : 1;
      for (let k = 0; k < linkCount; k++) {
        const m = byDist[k];
        if (!m || m.pos.distanceTo(n.pos) > 8.5) continue;
        addStrandCurve(m.pos.clone(), n.pos, n.i, 0.9 - k * 0.25, n.i * 1.7 + k * 3.1, 7700 + n.i, 1.35);
      }
    }
    return nodeStrandSpecs;
  }
  if (!baked) nodeStrandSpecs = growStrandSpecs(nodes);

  /** One curve spec -> its 8 line segments, as four flat arrays. The
   *  tessellation moved here verbatim so the build and a recompose cannot
   *  drift; `STRAND_SEGS` is the 8 the build has always used, and it is what
   *  turns a curve budget into a vertex budget. */
  const STRAND_SEGS = 8;
  function strandArrays(specs) {
    const pos = [], along = [], strand = [], nodeA = [];
    for (const s of specs) {
      const curve = H.catmull(s.pts);
      let prev = curve.getPointAt(0);
      for (let j = 1; j <= STRAND_SEGS; j++) {
        const t = j / STRAND_SEGS;
        const p = curve.getPointAt(t);
        pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        along.push((j - 1) / STRAND_SEGS, t);
        strand.push(s.strand, s.strand);
        nodeA.push(s.node, s.node);
        prev = p;
      }
    }
    return { pos, along, strand, nodeA };
  }

  /** THE STRAND GEOMETRY'S ONE CONSTRUCTION SITE — the build's and the
   *  recompose's alike. It is exactly sized to the specs it is given, which is
   *  what keeps the tree's standing invariant true (test-render-baseline D1:
   *  no source site narrows a draw range, so every geometry here draws its
   *  full attribute count and three.js's default range is the shipped one).
   *  A capacity buffer plus setDrawRange would have avoided the per-crossing
   *  allocation and broken that invariant to do it; a 40 KB buffer handed back
   *  at the leaf that owns it is the cheaper trade. */
  function buildStrandGeometry(specs) {
    const { pos, along, strand, nodeA } = strandArrays(specs);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    geo.setAttribute('aStrand', new THREE.Float32BufferAttribute(strand, 1));
    geo.setAttribute('aNode', new THREE.Float32BufferAttribute(nodeA, 1));
    return geo;
  }

  const nodeStrands = (() => {
    const mat = makeNodeStrandMat(P.gold, P.goldBright, {
      baseOpacity: 0.14 * exposure, pulseWidth: 0.13, fogDensity: 0.016,
    });
    let geo, verts;
    if (baked) {
      geo = baked.g.strands;
      verts = geo.attributes.position.count;
    } else {
      geo = buildStrandGeometry(nodeStrandSpecs);
      verts = geo.attributes.position.count;
    }
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    lines.renderOrder = -3;
    group.add(lines);
    return { lines, mat, geo, driver: H.pulseDriver(1.35), verts };
  })();

  /* ---------------- portrait planes (one draw call) ---------------- */
  const portraitMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMapA: { value: atlasA },
      uMapP: { value: atlasA },     // becomes the photo atlas when it lands
      uMapB: { value: atlasB },
      // REMIX (Hannah, 2026-08-07). The *2 slots hold the INCOMING arrangement
      // during a swap; uSwap is the one clock that drives the whole field, and
      // aSwapD is each node's place in the wave. At rest uSwap is 0 and the *2
      // slots are never sampled — which is also why a frozen capture is
      // untouched by any of this.
      uMapA2: { value: atlasA },
      uMapP2: { value: atlasA },
      uSwap: { value: 0 },
      uSwapSpan: { value: 0.34 },   // each node's own crossfade, as a fraction
      // The flare's GATE, and it starts at 0 for a reason worth recording. The
      // per-node flare is a Gaussian on the distance from the node's own
      // crossing, and a Gaussian is never exactly zero: at uSwap = 0 the node
      // whose delay is 0 sits one sigma out and evaluates to exp(-2.4) = 0.091.
      // Left ungated that is a permanent 9% ember lift on one contributor at
      // the resting composition — enough to move a frozen golden and, worse,
      // to make one face quietly hotter than its neighbours forever. The
      // uniform is 0 whenever no swap is running (see promoteSwap), 1 during
      // one, and 0 under prefers-reduced-motion.
      uSwapFlare: { value: 0 },
      // FIRST ARRIVAL (2026-08-26). The clock the sixteen faces condense in
      // on, one per-node window each, ordered by the same aSwapD wave the
      // remix travels — crown outward, as drawn. RESTS AT 1: a settled frame
      // multiplies every term it touches by exactly 1.0, so the resting
      // composition, the hover calibration and the frozen goldens are
      // untouched by construction. See the arrival block above setFade().
      uArrive: { value: 1 },
      uArriveSpan: { value: 0.5 },
      uAnon: { value: 0 },
      uPhoto: { value: 0 },
      uCellAP: { value: new THREE.Vector2(1 / COLS, 1 / ROWS) },
      uRim: { value: new THREE.Color(P.ember) },
      uCore: { value: new THREE.Color(P.goldBright) },
      uHaze: { value: new THREE.Color(P.deepGold) },
      uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
      uSelIdx: { value: -999 }, uSelAmt: { value: 0 },
      // THE HOVER GRADE (2026-08-18) — see PHOTO_GRADE.hoverDeSepia. uMapH /
      // uMapH2 are the HOVER_GRADE bakes of the same photo arrangements uMapP /
      // uMapP2 hold; the shader crossfades to them by vH. atlasA stands in
      // exactly as it does for uMapP until the photos land.
      uDeSepia: { value: PHOTO_GRADE.hoverDeSepia },
      uMapH: { value: atlasA },
      uMapH2: { value: atlasA },
      uCoreMute: { value: PHOTO_GRADE.hoverCoreMute },
      uImgMute: { value: PHOTO_GRADE.hoverImgMute },
      uSolid: { value: PHOTO_GRADE.hoverSolid },
      uOpacity: { value: 0 },       // == chapter fade
      uExposure: { value: exposure },
      uWaveC: { value: new THREE.Vector3(0, 0, 0) },
      uWaveR: { value: -100 },
      uWaveW: { value: 2.5 },
      uWaveAmt: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    // Premultiplied, not additive — and identical to additive by construction
    // wherever the fragment writes alpha 0 (out = rgb*a + dst either way; the
    // shader premultiplies). Alpha is written ONLY for a hovered photo face
    // (see PHOTO_GRADE.hoverSolid), which is what lets that one disc occlude
    // the strands and cords behind it instead of letting them shine through
    // the person. Rest frame, busts, glyphs, goldens: alpha 0, pure additive.
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    fog: false,
    vertexShader: /* glsl */`
      attribute vec2 aCorner;
      attribute vec2 aCellA;
      attribute vec2 aCellB;
      attribute float aNode;
      attribute float aSeed;
      attribute float aSize;
      attribute float aTilt;
      attribute float aAnonF;
      attribute float aSwapD;
      attribute float aRailVis;
      uniform float uTime, uHoverIdx, uHoverAmt, uSelIdx, uSelAmt;
      uniform float uWaveR, uWaveW, uWaveAmt;
      uniform float uSwap, uSwapSpan, uSwapFlare;
      uniform float uArrive, uArriveSpan;
      uniform vec3 uWaveC;
      uniform vec2 uCellAP;
      varying vec2 vUvA, vUvB;
      varying vec2 vQ;
      varying float vSeed, vH, vSoft, vDepth, vWv, vAnonF, vSwap, vFlare, vRailVis;
      varying float vArr, vArrR;
      void main() {
        vRailVis = aRailVis;
        vQ = aCorner;
        // THE WAVE. aSwapD is this node's normalised place in the order the
        // swap travels (distance out from the crown, see SWAP ORDER below), so
        // every node's crossfade is the same uSwapSpan-long window, opened at
        // a different moment by the one clock. Span 1 = the whole field turns
        // over together, which is the reduced-motion setting.
        float span = max(uSwapSpan, 0.001);
        float d0 = aSwapD * (1.0 - span);
        vSwap = smoothstep(d0, d0 + span, uSwap);
        // …and a flare centred on the node's own crossing, so the change
        // happens INSIDE a flush of ember rather than being watched happening.
        float fq = (uSwap - (d0 + span * 0.5)) / (span * 0.5);
        vFlare = exp(-fq * fq * 2.4) * uSwapFlare;
        // FIRST ARRIVAL: the swap's own construction, on its own clock —
        // one uArrive, opened per node by the same aSwapD order, so the
        // people arrive on the wave the chapter already speaks (crown
        // outward, as drawn). Two windows per face: the ember ring's leads
        // the image's by ~0.2 s of the clock — the light is the cause, the
        // face condenses out of it — and both are monotone 0 -> 1 with no
        // overshoot, the entry-path lesson below applied from the start.
        // At uArrive = 1 (rest, snap(), every frozen path) both are exactly
        // 1.0 for every aSwapD, since az + aw <= 1.
        float aw = max(uArriveSpan, 0.001);
        float az = aSwapD * (1.0 - aw);
        vArrR = smoothstep(az, az + aw * 0.55, uArrive);
        vArr = smoothstep(az + aw * 0.30, az + aw, uArrive);
        vec2 half01 = aCorner * 0.5 + 0.5;
        vUvA = half01 * uCellAP + aCellA;
        vUvB = half01 * 0.5 + aCellB;
        vSeed = aSeed;
        vAnonF = aAnonF;
        float h = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
        float s = step(abs(aNode - uSelIdx), 0.5) * uSelAmt;
        vH = max(h, s * 0.88);
        float wd = distance(position, uWaveC) - uWaveR;
        vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;

        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // HOVER STAYS IN PLACE (Hannah, 2026-08-06 — report B, and the cause
        // of report A). This line used to read "mv.z += vH * 0.62": the plane
        // stepped 0.62 view units toward the lens on hover. A view-space step
        // toward the camera is not a translation on screen of zero — it is a
        // RADIAL magnification about the frame centre, so the node slid
        // OUTWARD from where it was drawn, by an amount proportional to its
        // eccentricity: measured 13 px at ndc x 0.05 and 87 px at ndc x 0.89,
        // 1440x900. The hit target never moved with it, so the further out a
        // face sat the further the picture disagreed with the pointer — which
        // is exactly why the EDGE faces were the worst ones to hover.
        // The emphasis is now entirely in place: a centred scale (below), the
        // ember ring and the image/core terms in the fragment shader, and the
        // node's own local strands. Nothing about hover moves a node.
        float dist = max(-mv.z, 0.05);
        // defocus band (rev-2 retune): only true near passes (< ~5) soften;
        // the mid field reads crisp like the approved still.
        // A HOVERED face leaves the band ENTIRELY (0.45 -> 1.0, 2026-08-18:
        // "still blurred upon hover"): vSoft both mips the texture AND cuts
        // alpha by up to 85%, so the old 55% leftover kept the one face the
        // visitor is examining milky and half-transparent. The focus pull
        // rides vH's ease, so it cannot pop.
        float nb0 = 1.0 - smoothstep(2.2, 5.0, dist);
        float nearBlur = nb0 * (1.0 - vH);
        vSoft = nearBlur;
        // grown, not pinned: slight per-node tilt + slow micro-sway + breath.
        // Both LIVING terms damp out with vH (the static aTilt stays — it is
        // the pose, not the motion): a face being examined holds still, so
        // TAA stops smearing the one image the visitor is trying to read.
        float ang = aTilt + sin(uTime * (0.05 + fract(aSeed) * 0.06) + aSeed * 3.0) * 0.02 * (1.0 - vH);
        float ca = cos(ang), sa = sin(ang);
        vec2 c = vec2(aCorner.x * ca - aCorner.y * sa, aCorner.x * sa + aCorner.y * ca);
        float breath = 1.0 + 0.010 * sin(uTime * (0.14 + fract(aSeed) * 0.21) + aSeed * 7.0) * (1.0 - vH);
        // 0.13 -> 0.20: the retired depth step bought 8-12% of apparent growth
        // on its own (a node 0.62 nearer at depth 5.6-12.4). Folding that into
        // the CENTRED scale keeps the hover reading as strong as it was while
        // leaving the node's centre exactly where it is drawn at rest.
        // The bokeh-spread growth relaxes on the OLD 45% curve even though the
        // blur itself now leaves fully — condensing the footprint by the whole
        // spread read as the face shrinking away from the pointer.
        float size = aSize * breath * (1.0 + 0.20 * vH) * (1.0 + nb0 * (1.0 - vH * 0.45));
        mv.xy += c * size;
        vDepth = dist;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMapA, uMapP, uMapB, uMapA2, uMapP2, uMapH, uMapH2;
      uniform vec3 uRim, uCore, uHaze;
      uniform float uTime, uOpacity, uAnon, uPhoto, uExposure;
      uniform float uDeSepia, uCoreMute, uImgMute, uSolid;
      varying vec2 vUvA, vUvB;
      varying vec2 vQ;
      varying float vSeed, vH, vSoft, vDepth, vWv, vAnonF, vSwap, vFlare, vRailVis;
      varying float vArr, vArrR;
      void main() {
        float r = length(vQ);
        if (r > 1.30) discard;
        // foreground defocus is a REAL blur: force lower mips as vSoft rises
        float lod = vSoft * 5.5;
        // and the swap dissolves THROUGH soft focus: both the outgoing and the
        // incoming image lose definition together at the middle of the node's
        // crossfade and the new one comes back sharp. A straight A/B mix of two
        // sharp faces reads as a jump cut; this reads as a focus pull.
        // FIRST ARRIVAL rides the same optics: a face arrives OUT of soft
        // focus (1 - vArr adds mip exactly as the flare does), never by
        // scaling or moving — nothing about arrival moves a node either.
        float slod = lod + (vFlare + (1.0 - vArr)) * 1.7;
        // three-way content: procedural bust -> real photo -> anonymous glyph
        // (vAnonF is the per-node consent gate: it forces the glyph even in
        // photo mode when enforcement is on)
        float anon = max(uAnon, vAnonF);
        vec4 tA = mix(texture2D(uMapA, vUvA, slod), texture2D(uMapA2, vUvA, slod), vSwap);
        vec4 tP = mix(texture2D(uMapP, vUvA, slod), texture2D(uMapP2, vUvA, slod), vSwap);
        // THE HOVER GRADE (2026-08-18) — a crossfade to the HOVER_GRADE bake
        // of the same source tile, so a hovered face shows the photograph's
        // actual colours because those are the bytes in the texture. This
        // replaced an analytic inverse + chroma expansion whose sum measured
        // MORE amber than doing nothing — see PHOTO_GRADE.hoverDeSepia for the
        // numbers. PHOTOS ONLY: applied to tP before the mix, so the
        // procedural busts (which the frozen goldens render) never see it.
        // Rides vH, which is 0 at rest and eased in both directions by
        // hoverAmt/selAmt — so this cannot pop on the way in or out. The same
        // vSwap mixes both pairs, so a face mid-remix de-sepias coherently.
        // The hover cells are double-res, so at typical hover sizes the GPU
        // is MINIFYING them (~0.6x at dpr 2) and trilinear filtering blends
        // toward the next mip — re-blurring the face this atlas exists to
        // sharpen. The negative bias rides vH: a held hover samples the
        // full-res mip, a distant or fading face keeps enough mip to stay
        // calm, and at vH 0 the term is multiplied away entirely.
        float hlod = slod - 1.25 * vH;
        vec4 tH = mix(texture2D(uMapH, vUvA, hlod), texture2D(uMapH2, vUvA, hlod), vSwap);
        tP = mix(tP, tH, uDeSepia * vH);
        vec4 tAP = mix(tA, tP, uPhoto);
        // the anonymous glyph is identity, not arrangement — a remix never
        // touches it, so it keeps the plain lod
        vec4 t = mix(tAP, texture2D(uMapB, vUvB, lod), anon);
        float soft = exp(-r * r * 1.7);
        float mask = mix(t.a, soft * 0.72, vSoft * 0.88);
        // independent flicker — two incommensurate rates, no shared loop
        float flick = 0.86 + 0.14 * (
            0.62 * sin(uTime * (0.29 + vSeed * 0.61) + vSeed * 17.3)
          + 0.38 * sin(uTime * (0.163 + vSeed * 0.37) + vSeed * 5.1));
        // pg is "this is a photograph AND it is hovered" — defined here
        // because the ring's width needs it below; 0 at rest and on busts.
        float pg = uPhoto * vH;
        // On a hovered photo the ring NARROWS (0.115 -> ~0.063) instead of
        // fattening under bloom: a fine bright line reads as focus, and the
        // ring's bloom energy — the gold fog that was washing dark avatars —
        // scales with its width.
        float rq = (r - 0.72) / (0.115 * (1.0 - 0.45 * pg));
        float rim = exp(-rq * rq);
        float boost = vH;
        // 0.88 -> 1.12 on the image term and 0.07 -> 0.20 on the resting rim
        // (root-network restage): the reference's people are "softly
        // ringed/haloed with light", i.e. the ring is part of the RESTING
        // read, not only the hover response. The hover deltas are unchanged,
        // so hover still moves the same distance from a higher floor.
        // The swap's own light: the ember RING answers first and hardest (it
        // is the node's edge, so the change reads as arriving from the network
        // around the face) with a much smaller lift in the core and almost
        // none in the image.
        //
        // These levels were cut from a first pass (0.22 / 0.85 / 0.26) after
        // shooting the swap at 375x812. The flare and the colony wave the
        // chapter fires are deliberately SIMULTANEOUS, so their contributions
        // add on the same pixels — and at phone size the only faces on screen
        // are the three or four NEAREST, which are already the largest and
        // brightest things in the frame. Measured on that shot, the image term
        // ran 1.12 -> 1.89 and the near faces bloomed to featureless orbs under
        // UnrealBloom: exactly the failure EXPOSURE_PLANES was tuned against
        // (see index.js). The RING is what should carry a swap anyway — the
        // face has to stay a face while it is being exchanged.
        // THE HOVER GRADE, second half (2026-08-14). pg is "this is a
        // photograph AND it is hovered" — 0 at rest and 0 on a bust, so the
        // resting frame and the procedural path are untouched by construction.
        //
        // What Hannah is looking at when she says the hovered image is sepia is
        // NOT mostly the bake: it is the two terms below that quadruple over a
        // face on hover. Measured at the Owned rest with the test photos loaded,
        // hovering the nearest contributor takes the CORE — uCore is goldBright,
        // and exp(-r*r*8) puts it straight over the middle of the head — from
        // 0.07 to 0.31, and the image term from 1.12 to 1.42, and then
        // UnrealBloom works on the result. The photograph that reads clearly at
        // rest becomes an amber lamp. So the pullback is applied where the amber
        // is actually arriving.
        //
        // THE RIM IS DELIBERATELY NOT TOUCHED. It still runs 0.20 -> 1.00 on
        // hover, it sits at r ~ 0.72 (the disc's EDGE, not the face), and it is
        // the whole of the "these discs read as lit nodes in the network rather
        // than as photographs laid over it" contract that 45f600b's §F.3 refused
        // to trade away. The node still answers, and answers as hard as it did;
        // it just stops answering ON the person's face.
        // ROUND 4 of the hover grade (2026-08-18, "still quite blurry and
        // sepia'd"), all of it gated by pg so rest, busts and goldens are
        // untouched by construction. Four residual warm/blurring terms over a
        // hovered photo, each pulled back at the source:
        //   img  x1.12 -> x0.95: a bright face FEEDS UnrealBloom, and the
        //        returned gold fog was reading as both blur and sepia. A
        //        slightly dimmer, higher-contrast face beats a brighter one
        //        under a veil.
        //   rim  hover growth 0.80 -> 0.52 on photos only: the ring is the
        //        node's answer and it stays, but at full send its bloom
        //        spilled a gold rim of fog inward across the person.
        //   haze the depth fog is amber; a hovered face pulls OUT of it —
        //        the same focus-pull statement the defocus band now makes.
        //   flick the living flicker under bloom reads as shimmering glow;
        //        a face being read holds a steady exposure instead.
        float flickH = mix(flick, 0.95, pg);
        // THE ENTRY PATH (2026-08-25, Hannah: the border "lights up and
        // disappears before it properly loads"). Round 4's three mutes used
        // to ride pg — the same clock as the boost each one corrects — so a
        // muted term was boost*(1 - mute*boost): a parabola along the hover
        // ramp. The endpoints were calibrated and correct; the PATH overshot
        // and handed the light back. Measured at 1440x900, first hover of a
        // near face: ring-band luma 123 -> 173 by 200 ms, then down through
        // its own resting value while the photo terms caught up — the
        // lit-then-dying border she is describing. The image term peaked at
        // vH 0.22 and the core lamp relit to double its endpoint at vH 0.5.
        // The mutes now ride uPhoto alone: on a photo each term runs
        // STRAIGHT from its resting value to its held-hover value (both
        // unchanged — pg equals uPhoto at vH 1, so the calibrated endpoints
        // are byte-identical), and every millisecond of the ramp buys
        // motion toward the state it lands in. Busts (uPhoto 0), rest
        // (boost 0) and the frozen goldens are untouched by construction.
        // FIRST ARRIVAL, applied per term: the ring rides its leading window
        // (vArrR), the image and the core lamp ride the trailing one (vArr).
        // Each term runs STRAIGHT from 0 to its calibrated resting value —
        // monotone, no overshoot, no handing light back — and at rest both
        // windows are exactly 1.0, so every number below is untouched.
        vec3 col = t.rgb * (1.12 - 0.17 * pg + 0.30 * boost * (1.0 - uImgMute * uPhoto) + 0.55 * vWv + 0.10 * vFlare) * vArr
          + uRim * rim * (0.20 + 0.80 * boost * (1.0 - 0.35 * uPhoto) + 0.60 * vWv + 0.62 * vFlare) * (1.0 - vSoft * 0.85) * vArrR
          + uCore * exp(-r * r * 8.0) * (0.07 + 0.24 * boost * (1.0 - uCoreMute * uPhoto) + 0.30 * vWv + 0.15 * vFlare) * vArr;
        // distant nodes emerge from amber haze rather than vanishing to black
        float haze = exp(-0.00135 * vDepth * vDepth);
        float hazeMix = mix(clamp(haze + 0.14, 0.0, 1.0), 1.0, pg * 0.85);
        col = mix(uHaze * 0.38, col, hazeMix) * flickH;
        // alpha follows the LEADING window: the disc exists from the moment
        // its ring does, and the image resolves inside it.
        float alpha = mask * (1.0 - vSoft * 0.85) * (0.35 + 0.75 * haze) * uOpacity * uExposure * vArrR;
        alpha = clamp(alpha * (1.0 + 0.22 * vWv + 0.12 * vFlare), 0.0, 1.0);
        // SOLIDITY (2026-08-18) — the written alpha under premultiplied
        // blending: how much this fragment OCCLUDES the layers drawn behind
        // it. Zero everywhere except a hovered photo face (pg), gated off the
        // anonymous glyph, and riding uOpacity so the chapter fade dissolves
        // the cover with the light. See PHOTO_GRADE.hoverSolid.
        // Shaped by t.a — the cell's own BAKED feathered disc — and NOT by
        // mask: mask widens with the defocus softening (vSoft), and during
        // the focus pull that put occlusion out to the quad's discard radius,
        // where it dimmed the strands in a visible rounded-square edge. The
        // baked disc ends where the image ends, at every hover amount.
        // (No backticks anywhere in this shader: it is a JS template literal.)
        float occ = uSolid * pg * t.a * (1.0 - anon) * uOpacity * vArr;
        gl_FragColor = vec4(col * alpha * vRailVis, occ * vRailVis);
      }`,
  });
  const textureOwner = createPortraitTextureOwner({
    uniforms: portraitMat.uniforms,
    permanent: [atlasA, atlasB],
  });

  /* ---------------- SWAP ORDER: the wave the remix travels on -------------
     A remix that cut all sixteen faces at once would read as a page reload of
     the field. This orders it as a wave OUT FROM THE CROWN, which is the one
     epicentre the chapter already recognises: every root leaves the crown, so
     a change that starts there and runs outward is the network redistributing
     rather than the browser repainting (chapters/owned/index.js setHot fires
     the same gesture from the same point on a crown hover, and substrate
     surge() runs crown -> out along the roots underneath it).

     Measured IN THE REST FRAME, not in world space, and that is the decision
     worth recording. In world space the nodes nearest the crown are the
     NEAR-CAMERA ones — the crown sits 1.85 units off the lens — so a
     world-space order starts the wave on the three big foreground faces at the
     BOTTOM of the picture. Shot and compared: the visitor presses a button at
     top-centre and the answer begins at the far bottom edge, running back up
     the frame while the substrate's own surge runs the other way down the
     roots. Two waves crossing reads as noise. Ordered by distance from the
     crown AS DRAWN, the wave starts under the button, sweeps out along both
     arms and settles at the low corners — one direction, the same one the
     roots and the copy already establish. The house rule from the CONNECT and
     root-network restages, again: the frame is the spec.

     A small deterministic jitter keeps it off a clean expanding ring:
     near-equidistant nodes turn over a beat apart, so the field reads as
     thinking rather than counting. */
  const swapEpicentre = (leg.CROWN ? leg.CROWN.clone() : nodes[0].pos.clone());
  // The wave is ordered by distance AS DRAWN, so its order is a property of
  // the band's frame, not of the world — which is why this is a function of
  // `nodes` and re-runs with them (the IIFE it was until 2026-08-25 could
  // not).
  function computeSwapDelays(nodes) {
    const crownNdc = projectInto(siteFrame, swapEpicentre, siteAspect);
    const d = nodes.map((nd) => {
      const p = projectInto(siteFrame, nd.pos, siteAspect);
      // x by the same aspect the placement table uses, so "distance" is the
      // distance the eye sees rather than the one the NDC cube reports
      return Math.hypot((p.x - crownNdc.x) * siteAspect, p.y - crownNdc.y);
    });
    const lo = Math.min(...d), hi = Math.max(...d);
    const spread = (hi - lo) || 1;
    return nodes.map((nd, i) => clamp((d[i] - lo) / spread + (nd.seed - 0.5) * 0.11, 0, 1));
  }
  let swapDelays = baked ? null : computeSwapDelays(nodes);
  // World radius for the colony wave index.js fires alongside the swap — that
  // one IS a spherical wave in the world, so it keeps world units.
  let swapMaxR = baked ? baked.portraits.swapMaxR : Math.max(...nodes.map(nd => nd.pos.distanceTo(swapEpicentre)));

  /* ---- THE THREE FIXED-SIZE FILLS (2026-08-25) --------------------------
     planes, rim and the two glow point clouds are sized by NODE_COUNT and
     constants alone — never by where the nodes ended up — so re-placing the
     field rewrites their attributes and allocates nothing. These three
     functions are the fills, lifted verbatim out of the builders below so
     that the build and a recompose cannot drift into two different pictures.
     Only the strand geometry's LENGTH depends on placement, and it is dealt
     with on its own terms in recompose(). */
  const PLANE_CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  function fillPlaneArrays(nodes, swapDelays, a) {
    nodes.forEach((nd, i) => {
      const [ax, ay] = cellUV(i);
      const bcell = i % 4;
      const bx = (bcell % 2) * 0.5, by = 1 - (Math.floor(bcell / 2) + 1) * 0.5;
      for (let k = 0; k < 4; k++) {
        const v = i * 4 + k;
        a.pos[v * 3 + 0] = nd.pos.x; a.pos[v * 3 + 1] = nd.pos.y; a.pos[v * 3 + 2] = nd.pos.z;
        a.corner[v * 2 + 0] = PLANE_CORNERS[k][0]; a.corner[v * 2 + 1] = PLANE_CORNERS[k][1];
        a.cellA[v * 2 + 0] = ax; a.cellA[v * 2 + 1] = ay;
        a.cellB[v * 2 + 0] = bx; a.cellB[v * 2 + 1] = by;
        a.nodeA[v] = i; a.seedA[v] = nd.seed * 9.7 + i * 1.31;
        a.sizeA[v] = nd.size; a.tiltA[v] = nd.tilt;
        a.swapD[v] = swapDelays[i];
      }
    });
  }

  const RIM_SEGS = 3;
  function fillRimArrays(nodes, a) {
    let w = 0;
    nodes.forEach((nd, i) => {
      const rand = H.rng((3300 + i * 97) >>> 0);
      for (let f = 0; f < RIM_FIBRES; f++) {
        const a0 = (f / RIM_FIBRES) * TAU + (rand() - 0.5) * 0.42;
        const r0 = nd.size * (0.66 + rand() * 0.10);
        const len = nd.size * (0.34 + rand() * 0.72);
        const bend = (rand() - 0.5) * 0.9;
        const sd = rand();
        const pts = [];
        for (let s = 0; s <= RIM_SEGS; s++) {
          const t = s / RIM_SEGS;
          const ang = a0 + bend * t * t;
          const rr = r0 + len * t;
          const jit = (H.noise3(i * 2.1 + f * 0.7, t * 4.0, sd * 9.0)) * nd.size * 0.10 * t;
          pts.push([Math.cos(ang) * rr + jit, Math.sin(ang) * rr - jit * 0.6, t]);
        }
        for (let s = 0; s < RIM_SEGS; s++) {
          for (const q of [pts[s], pts[s + 1]]) {
            a.pos[w * 3 + 0] = nd.pos.x; a.pos[w * 3 + 1] = nd.pos.y; a.pos[w * 3 + 2] = nd.pos.z;
            a.off[w * 2 + 0] = q[0]; a.off[w * 2 + 1] = q[1];
            a.nodeA[w] = i; a.seedA[w] = sd * 7.3 + f * 0.53; a.alongA[w] = q[2];
            w++;
          }
        }
      }
    });
  }

  function fillGlowArrays(nodes, sizeMul, a) {
    nodes.forEach((nd, i) => {
      a.pos[i * 3] = nd.pos.x; a.pos[i * 3 + 1] = nd.pos.y; a.pos[i * 3 + 2] = nd.pos.z;
      a.sizeA[i] = nd.size * sizeMul;
      a.seedA[i] = nd.seed * 11.3 + i * 0.77;
      a.nodeA[i] = i;
    });
  }

  const portraits = (() => {
    let geo;
    if (baked) {
      geo = baked.g.planes;
    } else {
      const n = NODE_COUNT;
      const pos = new Float32Array(n * 4 * 3);
      const corner = new Float32Array(n * 4 * 2);
      const cellA = new Float32Array(n * 4 * 2);
      const cellB = new Float32Array(n * 4 * 2);
      const nodeA = new Float32Array(n * 4);
      const seedA = new Float32Array(n * 4);
      const sizeA = new Float32Array(n * 4);
      const tiltA = new Float32Array(n * 4);
      const anonF = new Float32Array(n * 4);
      const swapD = new Float32Array(n * 4);
      const idx = new Uint16Array(n * 6);
      // anonF is left at the Float32Array's own zeros — consent enforcement
      // writes 1s into it via setConsentEnforced, and a recompose must not
      // reach in and clear them, so it is the one plane attribute
      // fillPlaneArrays() below does not own.
      fillPlaneArrays(nodes, swapDelays,
        { pos, corner, cellA, cellB, nodeA, seedA, sizeA, tiltA, swapD });
      for (let i = 0; i < n; i++) {
        const o = i * 4;
        idx.set([o, o + 1, o + 2, o, o + 2, o + 3], i * 6);
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
      geo.setAttribute('aCellA', new THREE.BufferAttribute(cellA, 2));
      geo.setAttribute('aCellB', new THREE.BufferAttribute(cellB, 2));
      geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
      geo.setAttribute('aTilt', new THREE.BufferAttribute(tiltA, 1));
      geo.setAttribute('aAnonF', new THREE.BufferAttribute(anonF, 1));
      geo.setAttribute('aSwapD', new THREE.BufferAttribute(swapD, 1));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    const mesh = new THREE.Mesh(geo, portraitMat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    group.add(mesh);
    return { mesh, geo, planes: NODE_COUNT };
  })();

  /* ---------------- real 3D fibre rim: strands radiating off each disc --- */
  const RIM_FIBRES = 12;
  const rimMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(P.ember) },
      uHot: { value: new THREE.Color(P.goldBright) },
      uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
      uSelIdx: { value: -999 }, uSelAmt: { value: 0 },
      uBase: { value: 0.30 * exposure },
      uFade: { value: 0 },
      uWaveC: { value: new THREE.Vector3(0, 0, 0) },
      uWaveR: { value: -100 },
      uWaveW: { value: 2.5 },
      uWaveAmt: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */`
      attribute vec2 aOff;
      attribute float aNode;
      attribute float aSeed;
      attribute float aAlong;
      attribute float aRailVis;
      uniform float uTime, uHoverIdx, uHoverAmt, uSelIdx, uSelAmt;
      uniform float uWaveR, uWaveW, uWaveAmt;
      uniform vec3 uWaveC;
      varying float vA, vSeed, vH, vSoft, vDepth, vWv, vRailVis;
      void main() {
        vRailVis = aRailVis;
        vA = aAlong; vSeed = aSeed;
        float h = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
        float s = step(abs(aNode - uSelIdx), 0.5) * uSelAmt;
        vH = max(h, s * 0.88);
        float wd = distance(position, uWaveC) - uWaveR;
        vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // in place, like the plane it rings — see the portrait shader's note
        float dist = max(-mv.z, 0.05);
        float nearBlur = (1.0 - smoothstep(2.2, 5.0, dist)) * (1.0 - vH * 0.45);
        vSoft = nearBlur; vDepth = dist;
        // moisture/substrate sway: per-fibre phase, tiny amplitude
        float ang = sin(uTime * (0.20 + aSeed * 0.47) + aSeed * 11.3) * 0.05;
        float ca = cos(ang), sa = sin(ang);
        vec2 o = vec2(aOff.x * ca - aOff.y * sa, aOff.x * sa + aOff.y * ca);
        mv.xy += o * (1.0 + 0.18 * vH) * (1.0 + nearBlur * 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor, uHot;
      uniform float uTime, uBase, uFade;
      varying float vA, vSeed, vH, vSoft, vDepth, vWv, vRailVis;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.37 + vSeed * 0.9) + vSeed * 23.1);
        float fall = 1.0 - vA;                    // hot at the rim, fading outward
        float a = uBase * fall * fall * (0.62 + 0.38 * tw) * (1.0 - vSoft * 0.9);
        a *= exp(-0.0013 * vDepth * vDepth) * (1.0 + 1.5 * vH + 1.7 * vWv);
        vec3 col = mix(uColor, uHot, clamp(vH * 0.7 + 0.15 + vWv * 0.5, 0.0, 1.0));
        gl_FragColor = vec4(col * vRailVis, clamp(a * uFade * vRailVis, 0.0, 1.0));
      }`,
  });

  const rimFibres = (() => {
    let geo, verts;
    if (baked) {
      geo = baked.g.rim;
      verts = geo.attributes.position.count;
    } else {
      const total = NODE_COUNT * RIM_FIBRES * RIM_SEGS * 2;
      const pos = new Float32Array(total * 3);
      const off = new Float32Array(total * 2);
      const nodeA = new Float32Array(total);
      const seedA = new Float32Array(total);
      const alongA = new Float32Array(total);
      fillRimArrays(nodes, { pos, off, nodeA, seedA, alongA });
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aOff', new THREE.BufferAttribute(off, 2));
      geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
      geo.setAttribute('aAlong', new THREE.BufferAttribute(alongA, 1));
      verts = total;
    }
    const lines = new THREE.LineSegments(geo, rimMat);
    lines.frustumCulled = false;
    lines.renderOrder = 1;
    group.add(lines);
    return { lines, geo, verts };
  })();

  /* ---------------- ember cores + broad halos (Points, 2 draws) --------- */
  function makeGlowPoints(map, color, sizeMul, baseA, hoverA, order, bakedGeo) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: map },
        uColor: { value: new THREE.Color(color) },
        uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
        uScale: { value: 220 },
        uBaseA: { value: baseA * exposure }, uHoverA: { value: hoverA },
        uFade: { value: 0 },
        uWaveC: { value: new THREE.Vector3(0, 0, 0) },
        uWaveR: { value: -100 },
        uWaveW: { value: 2.5 },
        uWaveAmt: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute float aSeed;
        attribute float aNode;
        attribute float aRailVis;
        uniform float uHoverIdx, uHoverAmt, uScale;
        uniform float uWaveR, uWaveW, uWaveAmt;
        uniform vec3 uWaveC;
        varying float vSeed, vH, vWv, vRailVis;
        void main() {
          vRailVis = aRailVis;
          vSeed = aSeed;
          vH = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
          float wd = distance(position, uWaveC) - uWaveR;
          vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // in place — the core and halo grow about the node, they do not
          // travel toward the lens (see the portrait shader's note)
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * aSize * (1.0 + 0.42 * vH + 0.18 * vWv) / max(-mv.z, 0.1);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uBaseA, uHoverA, uFade;
        varying float vSeed, vH, vWv, vRailVis;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          // HELD STILL (2026-08-11): this used to be a live flicker,
          // 0.80 + 0.20 sin(uTime * (0.33 + vSeed * 0.71) + vSeed * 13.7) —
          // a 12-28% brightness swing measured ON THE DOTS at the rest. The
          // clock is gone; the SAME expression at its t = 0 phase keeps every
          // node's individual level (no army of identical dots, and the frozen
          // goldens — which always rendered uTime = 0 — are byte-identical).
          float flick = 0.80 + 0.20 * sin(vSeed * 13.7);
          float a = t.a * (uBaseA + uHoverA * vH) * flick * (1.0 + 1.3 * vWv);
          gl_FragColor = vec4(uColor * vRailVis, clamp(a * uFade * vRailVis, 0.0, 1.0));
        }`,
    });
    let geo = bakedGeo || null;
    if (!geo) {
      const n = NODE_COUNT;
      const pos = new Float32Array(n * 3);
      const sizeA = new Float32Array(n);
      const seedA = new Float32Array(n);
      const nodeA = new Float32Array(n);
      fillGlowArrays(nodes, sizeMul, { pos, sizeA, seedA, nodeA });
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
      geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
    }
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = order;
    group.add(pts);
    // `sizeMul` is kept because recompose() re-fills these arrays and the
    // multiplier is the only thing that distinguishes the core from the halo.
    return { pts, mat, geo, sizeMul };
  }
  // the halo each face sits inside; the core is the ember at its centre
  const cores = makeGlowPoints(H.softDisc(64), P.goldBright, 0.5, 0.085, 0.30, 3, baked?.g.cores);
  const halos = makeGlowPoints(H.glowSprite(P.ember, 64), P.ember, 2.7, 0.058, 0.18, -2, baked?.g.halos);

  /* WHO IS IN THE FIELD, AND WHAT A RE-DEAL ACTUALLY CHANGES.

     Sixteen positions, 120 people (content/contributors.js). An arrangement `v`
     deals sixteen DISTINCT people into the sixteen slots and writes each one's
     name, role and blurb onto that slot's content row, so the popover, the
     hotspot's accessible name and the face are the same person by construction
     — there is no path that moves one without the others.

     THE DEAL IS SEEDED, THE SESSION IS NOT. `dealFor(v)` is a pure function of
     v and `dealSalt`, so the same arrangement always re-bakes identically (the
     atlas is baked more than once — the prepare-ahead path in schedulePrepare
     re-derives v before the visitor ever sees it, and it must not produce a
     different sixteen the second time). `dealSalt` is randomised ONCE per page
     load, which is what makes two visitors see different people while keeping
     any single visit self-consistent.

     A Fisher-Yates prefix, not sixteen independent draws: with 120 people and
     sixteen slots, independent draws collide about 65% of the time, and one
     face appearing twice in a field of sixteen is the single most obvious way
     this could look broken.

     MIRRORING IS GONE, not merely unused. It existed to stop a small pool of
     stock faces from looking repeated, and it is actively wrong here: these
     avatars include wordmarks and lettering (THE DOR BROTHERS, Kosinkadink's
     JK), which a horizontal flip renders backwards.

     Everything that is not identity still varies with `v` — exposure, warmth,
     grain seed — so a re-deal re-lights the field as well as re-casting it.
     V_STRIDE/V_OFFSET survive as generators for those. */
  const dealer = createPortraitDealer({ nodes, contributors, nodeCount: NODE_COUNT });

  /* ---------------- the remix pipeline (portrait-remix.js) ---------------
     A01a-2 moved the arrangement/texture lifecycle out of this closure: the
     async photo load, the four atlas bakes, the swap clock and its six direct
     mutators of variant/pending/prepareTimer/swap. It is constructed here, at
     the exact point loadPortraitSprite() used to be called, so the request
     still leaves at the same moment in the build.

     Eight of its members are re-published on `api` below, unchanged. The
     three getters are re-declared as getters rather than spread, because a
     spread would read them once at build time and freeze arrangement 0,
     swapping=false and photosAvailable=false forever. */
  const remixer = createPortraitRemix({
    uniforms: portraitMat.uniforms,
    nodes,
    atlasA,
    atlasB,
    textureOwner,
    dealer,
    nodeCount: NODE_COUNT,
    cols: COLS,
    cell: CELL,
    photosEnabled,
    swapEpicentre,
    // a getter, not the number: recompose() re-measures it — see the note on
    // createPortraitRemix's parameter list
    swapMaxR: () => swapMaxR,
  });

  /* ---------------- state + frame update ---------------- */
  let hoverIdx = -999, selIdx = -999;
  let hoverAmt = 0, selAmt = 0;
  let anonTarget = 0, photoTarget = 0;
  let wave = null;
  let fade = 0;

  /* ---------------- FIRST ARRIVAL (2026-08-26) ----------------
     What the sixteen did before this: nothing of their own. One scalar —
     setFade's camera-pure product from owned/index.js — lit the whole field
     as a unit, an opacity ramp and nothing else. The reveal LAW is not
     touched here: that fade is still the CEILING, and this clock only ever
     multiplies BELOW it in the shader, so it cannot create light the lens
     has not earned — every mask, wrap fix and golden derivation in
     owned/index.js still holds, and a reverse scrub retires the field on
     the camera exactly as before.

     What is added is the performed half, the icon-arrival doctrine
     (evidence/2026-08-21-elegance-run-01/icon-arrival/): the arrival is a
     performance in SECONDS — you cannot scrub a person taking their place —
     armed when the light first returns from fully dark, advanced
     monotonically by the frame clock, snapped to its end by every dt = 0
     placement path (snap(), which deep links, ?capture= and hidden-tab
     bursts all reach). Re-armed ONLY through fully dark (fade exactly 0:
     the group hidden, or the lens above the face window), so a mid-scrub
     wobble cannot replay it, and recompose() never touches it — a resize
     re-places the field without re-performing it.

     The tempo keys to the chapter's own grammar: the remix swap crosses the
     field in 1.25 s at span 0.34; the arrival takes 1.4 s at span 0.5 —
     each face's own resolve is ~0.7 s (the paced icon formation's scale),
     onsets rippling crown-outward over the other 0.7 s on aSwapD's own
     jittered order. On the ride, the face window opens as the dive lands,
     so the people finish taking their places about when the copy settles —
     the arrival law final/index.js §41 already states: a town you are
     walking into may go on lighting while you stand still. */
  const ARRIVE_S = 1.4;
  const ARRIVE_S_REDUCED = 0.35;  // span 1: one paced crossfade, no travel
  const ARRIVE_SPAN = 0.5;
  const arriveMotion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  let arrive = 1;      // settled: any path that never arms shows today's frame
  let arriveRate = 0;

  // HELD STILL (2026-08-11, Hannah: the node dots must not pulse): the glow
  // points (cores + halos — the per-face ember DOTS) left timeMats. Their
  // flick is frozen at its own t = 0 phase in the shader (see makeGlowPoints),
  // so no clock reaches them any more; they still answer the remix wave and
  // hover, which are events, not cycles. The faces, rims and strands keep
  // their living light — the life stays in the surround, the marker holds.
  const timeMats = [portraitMat, rimMat, nodeStrands.mat];
  const waveMats = [portraitMat, rimMat, cores.mat, halos.mat, nodeStrands.mat];   // every node layer answers the wave

  /* A contributor that projects into the live navigator lane must disappear
     as one object: face, rim, core, halo and its local fibres. Per-vertex
     visibility attributes keep this to the existing five batched draw calls;
     setRailExcluded only uploads when the node mask actually changes. */
  const railBindings = [portraits.geo, rimFibres.geo, cores.geo, halos.geo, nodeStrands.geo]
    .map((geo) => {
      const node = geo.getAttribute('aNode');
      const vis = new THREE.BufferAttribute(new Float32Array(node.count).fill(1), 1);
      geo.setAttribute('aRailVis', vis);
      return { node, vis };
    });
  let railMaskKey = '';

  /* ==================================================================
     RECOMPOSE — the authored composition, RE-ASKED (2026-08-25)
     ==================================================================
     THE DEFECT THIS CLOSES, stated as the owner reported it: "when I resize
     the screen, the number of items that shows in the ownership section
     doesn't update appropriately." Measured, one live page driven across the
     portrait boundary against fresh-load controls: 16/16 faces on frame at
     1440x900, 8/16 at 700x900 and 4/16 at 430x932 — while a FRESH load at
     each of those sizes framed all sixteen. It was never a stale count. The
     camera re-poses every frame (fov 58 -> 64, the portrait pose adopted on
     crossing), so a page that crossed the band was showing the LANDSCAPE arc
     through the PORTRAIT lens: the positions were wrong, and twelve of the
     sixteen were simply outside the frame.

     WHY THIS IS THE SHAPE OF THE FIX, and not one of the two obvious
     alternatives:

       * REBUILD THE CHAPTER on a crossing. It cannot be done from inside the
         chapter — the hotspot registry, the rail mask, the animator and the
         card layer all hold this build by identity — and it would need the
         teardown path that was deliberately removed the day before this was
         written. It also throws away everything a rebuild has no reason to
         redo: two 2048x512 atlases, the photo fetch, four graded bakes,
         eleven shader programs. None of that depends on the aspect.
       * PRE-BUILD BOTH FIELDS AND SWAP. The geometry it would double is the
         cheap half (the five batched buffers are ~82 KB together); the
         expensive half is the atlas/photo/material set, which is per-FIELD
         and would double with it — megabytes of texture and a second photo
         pipeline, paid by every visitor, to serve a gesture almost none of
         them make.

     So: ONE field, re-placed. Everything downstream already reads through —
     `worldOf`/`radiusOf` return live node state, so the chips and the rail
     mask follow for nothing, and the camera was never the problem.

     WHAT IT COSTS, plainly. Four of the five batched geometries are sized by
     NODE_COUNT and constants alone, so they are REWRITTEN IN PLACE and
     allocate nothing at all. The strand geometry is not: its length depends
     on which node-to-node links survive the 8.5-unit reach test, which
     depends on where the nodes ended up. So a crossing builds one new strand
     geometry (~1700 line vertices, ~40 KB across four attributes) and hands
     the outgoing one back. Measured on this machine, under headless Chrome
     with ANGLE/Metal: 57 ms for the first crossing on a page (cold JIT),
     ~4 ms warm. The settle in owned/index.js is what keeps that to ONE
     crossing per gesture however far the window is dragged.

     WHY NOT A CAPACITY BUFFER AND A DRAW RANGE, which would have made the
     allocation once-ever: because tools/test-render-baseline.mjs D1 pins, as
     a standing invariant, that NO source site in this tree narrows a draw
     range — every geometry draws its full attribute count and three.js's
     default { start: 0, count: Infinity } is the shipped value everywhere. A
     40 KB buffer rebuilt on a gesture nobody makes twice a minute is a much
     smaller price than being the first order to break that.

     WHAT IT DOES NOT FIX, and the cost of fixing it: on a page that booted
     LANDSCAPE the substrate is serving from baked bytes, and the baked read
     leaves `netNodes`/`webAdj`/`webLinkMeta` empty — so `assignOwners()`
     cannot re-walk, and the web's per-face ownership keeps the landscape
     assignment. After such a crossing, hovering a face lights filaments
     chosen for where that face used to be. Making it right means rebuilding
     the substrate's 430-vertex web graph live — the chapter's largest
     allocation — at the exact moment someone is dragging a window, or giving
     up the bake for every visitor to serve that drag. Neither is worth it for
     a hover accent; a page that boots portrait builds live and is correct.

     @param {number} aspect  the viewport aspect to compose for. Returns true
            when the field moved, false when the answer was already right —
            so a caller may ask on every settled resize without a predicate
            of its own. `?aspect=` still wins inside leg.fieldFor(), which is
            what keeps capture.py and every golden pinned. */
  function recompose(aspect) {
    if (typeof leg.fieldFor !== 'function') return false;
    const next = leg.fieldFor(aspect);
    const bandSame = next.portraitField === portraitField;
    // Inside the portrait band the ARC ITSELF is composed at the live aspect
    // (a tablet spreads it, a phone does not), so a band that stays portrait
    // still has to follow — otherwise a drag that crosses at 0.875 and
    // carries on to 0.46 leaves the arc composed for a frame twice as wide.
    if (bandSame && (!portraitField || Math.abs(next.portraitAspect - portraitAspect) < 1e-4)) {
      return false;
    }
    portraitField = next.portraitField;
    portraitAspect = next.portraitAspect;
    restFramePortrait = next.restFramePortrait;
    SITES = portraitField ? REST_SITES_PORTRAIT : REST_SITES;
    siteFrame = portraitField ? restFramePortrait : restFrame;
    siteAspect = portraitField ? portraitAspect : 1.6;

    /* 1. THE SIXTEEN, RE-PLACED. The node OBJECTS are written THROUGH, never
       replaced: the dealer, the remixer, `worldOf`/`radiusOf`/`indexOf` and
       the bake payload all hold this array and its members by identity, and
       `content`/`id`/`routable` belong to the deal, not to the composition —
       a re-place must not re-cast the field. */
    const placed = placeNodes();
    for (let i = 0; i < NODE_COUNT; i++) {
      const a = nodes[i], b = placed[i];
      a.pos.copy(b.pos);
      a.size = b.size; a.seed = b.seed; a.tilt = b.tilt;
      a.strandCount = b.strandCount; a.rand = b.rand;
    }
    // regrow the strands (this also rewrites every node's `anchors`, which is
    // what owned/index.js re-hands to substrate.assignOwners) and re-measure
    // the two swap-order derivations, both of which are frame-relative.
    nodeStrandSpecs = growStrandSpecs(nodes);
    swapDelays = computeSwapDelays(nodes);
    swapMaxR = Math.max(...nodes.map(nd => nd.pos.distanceTo(swapEpicentre)));

    /* 2. THE FOUR FIXED-SIZE GEOMETRIES — rewritten, never reallocated.
       aAnonF is untouched on purpose: it carries consent enforcement, which
       is identity and not composition. */
    const pa = portraits.geo.attributes;
    fillPlaneArrays(nodes, swapDelays, {
      pos: pa.position.array, corner: pa.aCorner.array, cellA: pa.aCellA.array,
      cellB: pa.aCellB.array, nodeA: pa.aNode.array, seedA: pa.aSeed.array,
      sizeA: pa.aSize.array, tiltA: pa.aTilt.array, swapD: pa.aSwapD.array,
    });
    const ra = rimFibres.geo.attributes;
    fillRimArrays(nodes, {
      pos: ra.position.array, off: ra.aOff.array, nodeA: ra.aNode.array,
      seedA: ra.aSeed.array, alongA: ra.aAlong.array,
    });
    for (const glow of [cores, halos]) {
      const ga = glow.geo.attributes;
      fillGlowArrays(nodes, glow.sizeMul, {
        pos: ga.position.array, sizeA: ga.aSize.array,
        seedA: ga.aSeed.array, nodeA: ga.aNode.array,
      });
      for (const k of ['position', 'aSize', 'aSeed', 'aNode']) ga[k].needsUpdate = true;
    }
    for (const k of ['position', 'aCorner', 'aCellA', 'aCellB', 'aNode', 'aSeed', 'aSize', 'aTilt', 'aSwapD']) {
      pa[k].needsUpdate = true;
    }
    for (const k of ['position', 'aOff', 'aNode', 'aSeed', 'aAlong']) ra[k].needsUpdate = true;

    /* 3. THE STRANDS — the one length that placement can change, and the one
       geometry this fix ever allocates or releases. See the note above. */
    const grown = buildStrandGeometry(nodeStrandSpecs);
    grown.setAttribute('aRailVis',
      new THREE.BufferAttribute(new Float32Array(grown.attributes.aNode.count).fill(1), 1));
    const outgoing = nodeStrands.lines.geometry;
    nodeStrands.lines.geometry = grown;
    nodeStrands.geo = grown;
    nodeStrands.verts = grown.attributes.position.count;
    railBindings[4] = { node: grown.getAttribute('aNode'), vis: grown.getAttribute('aRailVis') };
    /* THE RELEASE, and it is deliberate that it is a LEAF. Replacing an
       attribute in place would have been cheaper still and would have LEAKED:
       three.js keys its GL buffers off the BufferAttribute in a WeakMap and
       frees them only from a geometry's own dispose, so a replaced attribute's
       buffer is never reclaimed. So the outgoing geometry is disposed here, at
       the site that owns it and nowhere else — no cascade, no registry, no
       teardown path reintroduced. DEF-A01-03 was closed as moot when the
       cascade was removed and stays closed; this is the leaf disposer that
       removal deliberately kept. */
    outgoing.dispose();

    /* 4. The rail mask is keyed off its CONTENT, and the strand layer's
       aNode has just changed under it — so drop the key and let the next
       frame's unconditional setExcludedNodes re-derive all five layers. */
    railMaskKey = '';
    return true;
  }

  const api = {
    group, nodes,
    /** Re-place the sixteen for a viewport aspect. See recompose() above. */
    recompose,
    /** Which band the field is currently COMPOSED for — not which band the
     *  viewport is in. owned/index.js compares the two. */
    get portraitField() { return portraitField; },
    photosReady: remixer.photosReady,
    prepareRemix: remixer.prepareRemix,
    get photosAvailable() { return remixer.photosAvailable; },
    setRailExcluded(ids) {
      const excluded = ids instanceof Set ? ids : new Set(ids || []);
      const hidden = new Uint8Array(NODE_COUNT);
      for (const nd of nodes) if (nd.routable && excluded.has(nd.id)) hidden[nd.i] = 1;
      const key = Array.from(hidden).join('');
      if (key === railMaskKey) return;
      railMaskKey = key;
      for (const { node, vis } of railBindings) {
        const dst = vis.array;
        for (let i = 0; i < dst.length; i++) dst[i] = hidden[Math.round(node.array[i])] ? 0 : 1;
        vis.needsUpdate = true;
      }
    },
    /** QA: contributor node indices currently withheld from the rail lane. */
    get railExcludedIndices() {
      if (!railMaskKey) return [];
      return Array.from(railMaskKey, (v, i) => v === '0' ? -1 : i).filter(i => i >= 0);
    },
    /** Idempotent texture/async teardown for a chapter owner that retires.
     *  Lives in portrait-remix.js, which owns every texture this frees.
     *  DEF-A01-03 stands: no geometry, no material and no scene removal is
     *  covered here or anywhere else under journey/chapters/owned/. */
    dispose: remixer.dispose,
    // The two placement-dependent counters are GETTERS (2026-08-25): a
    // recompose regrows the strands, and a QA counter frozen at build would
    // report the field that was replaced. The rest are build-time constants
    // and stay values.
    counts: {
      nodeCount: NODE_COUNT,
      routable: C_COUNT,
      planes: portraits.planes,
      get strandVerts() { return nodeStrands.verts; },
      rimVerts: rimFibres.verts,
      get strandCurves() {
        return nodeStrandSpecs.length || (baked ? baked.portraits.strandCurves : 0);
      },
      atlasPx: `${atlasA.image.width}x${atlasA.image.height} ×2 + ${atlasB.image.width}x${atlasB.image.height}`,
    },
    // The bake recording site (owned/index.js) reads these AFTER assignOwners
    // so the substrate's aOwner is final. Keys match baked.js geometry() keys;
    // the payload is the runtime-read node data the baked path rebuilds
    // (content round-trips as its id and is re-resolved against `contributors`).
    geometries: {
      planes: portraits.geo,
      rim: rimFibres.geo,
      cores: cores.geo,
      halos: halos.geo,
      // a getter: recompose() re-seats the strand geometry once, on the first
      // band crossing, and a captured reference would name a disposed one
      get strands() { return nodeStrands.geo; },
    },
    bakePayload: {
      portraits: {
        nodeIds: nodes.map(n => n.id),
        nodeRoutable: nodes.map(n => n.routable),
        nodeContentKeys: nodes.map(n => (n.content ? n.content.id : null)),
        nodePos: nodes.flatMap(n => [n.pos.x, n.pos.y, n.pos.z]),
        nodeSize: nodes.map(n => n.size),
        nodeAnchors: nodes.map(n => n.anchors.map(a => [a.x, a.y, a.z])),
        swapMaxR,
        strandCurves: nodeStrandSpecs.length,
      },
    },

    indexOf(id) {
      const nd = nodes.find(n => n.id === id);
      return nd ? nd.i : -1;
    },
    worldOf(id) {
      const nd = nodes.find(n => n.id === id);
      return nd ? nd.pos.clone() : null;
    },
    /** World-space radius of the DRAWN face — the ember ring, not the quad.
     *  The quad's half-extent is `size`; the atlas draws its disc at 0.36 of
     *  the cell, i.e. 0.72 of the half-extent, and the shader's rim ring sits
     *  at the same 0.72. 0.80 takes in the ring itself and the fray just
     *  outside it. ui.js turns this into the chip's hit radius, which is the
     *  whole point: the thing you can hover is the thing you can see. */
    radiusOf(id) {
      const nd = nodes.find(n => n.id === id);
      return nd ? nd.size * 0.80 : 0;
    },
    /** QA: routable nodes that frame at the rest pose (the reachability audit). */
    restVisible() {
      return nodes.filter(n => n.routable && restOk(n)).map(n => n.id);
    },

    setHover(idx) {
      if (idx === hoverIdx) return;
      hoverIdx = idx;
      if (idx >= 0) nodeStrands.driver.fire();
    },
    setSelected(idx) {
      if (idx === selIdx) return;
      selIdx = idx;
      if (idx >= 0) nodeStrands.driver.fire();
    },
    // mode: 'procedural' | 'photo' | 'anonymous'
    setMode(m) {
      photoTarget = m === 'photo' ? 1 : 0;
      anonTarget = m === 'anonymous' ? 1 : 0;
    },
    get mode() {
      return anonTarget ? 'anonymous' : (photoTarget ? 'photo' : 'procedural');
    },
    /** OW-4.4 consent gate: when on, any contributor without consent:true
     *  renders the anonymous glyph regardless of the global mode. With the
     *  current all-placeholder content this blanks every real image — which
     *  is exactly the rule. */
    setConsentEnforced(on) {
      const attr = portraits.geo.attributes.aAnonF;
      nodes.forEach((nd, i) => {
        const v = on && nd.content.consent !== true ? 1 : 0;
        for (let k = 0; k < 4; k++) attr.setX(i * 4 + k, v);
      });
      attr.needsUpdate = true;
    },
    // pod-hover responses (OW-3): an expanding spherical wave in WORLD space.
    wavePulse(center, { speed = 3.6, width = 2.8, maxR = 30, amp = 1 } = {}) {
      wave = { c: center.clone(), r: -width * 0.6, speed, width, maxR, amp };
    },

    /** REMIX: re-deal the field's faces. Both of these, and the two getters
     *  under them, are portrait-remix.js's — re-published here unchanged so
     *  owned/index.js and the C04 lifecycle suites keep the api they had. */
    remix: remixer.remix,
    tickSwap: remixer.tickSwap,
    get swapping() { return remixer.swapping; },
    get arrangement() { return remixer.arrangement; },
    /** Jump the eased UI channels to their targets — the dt = 0 path (deep
     *  links, hidden-tab and frozen capture), reached through the chapter's
     *  snap().
     *
     *  uPhoto is DELIBERATELY not snapped. Under freezeTime(0) the photo
     *  crossfade never advances, so the frozen captures render the PROCEDURAL
     *  painted busts. That is kept on purpose — but the ORIGINAL reason for it
     *  expired on 2026-08-16 and the real one is different, so it is written
     *  out here rather than left to be re-derived.
     *
     *  It used to be a consent argument: the only images were stock faces that
     *  must never ship, and static/captures/*.png is committed, so snapping
     *  would have baked strangers' likenesses into checked-in files. The
     *  portraits are now contributors' own published avatars and that argument
     *  is gone.
     *
     *  What replaces it is DETERMINISM. The gate's whole value is that a
     *  frozen pose renders byte-identically every run; the photo path depends
     *  on a 384 KB network fetch, a canvas bake and a timed crossfade, none of
     *  which are frame-deterministic, and the field now deals a RANDOM sixteen
     *  out of 120 people per load, which is not deterministic by design. A
     *  golden that included any of that would flake for reasons unrelated to
     *  the scene, and the first response to a flaky gate is to stop trusting
     *  it. The busts are a stable baseline that still exercises the geometry,
     *  the lighting and the substrate.
     *
     *  THE COST, stated plainly: the ten goldens do not cover the photo
     *  pipeline. Changes to the grade, the atlas bake or the deal have to be
     *  checked by eye on the live page. */
    snap() {
      const u = portraitMat.uniforms;
      // the dt = 0 placement contract: the arrival performance lands settled
      u.uArrive.value = arrive = 1;
      u.uAnon.value = anonTarget;
      hoverAmt = hoverIdx >= 0 ? 1 : 0;
      selAmt = selIdx >= 0 ? 1 : 0;
      u.uHoverIdx.value = hoverIdx; u.uHoverAmt.value = hoverAmt;
      u.uSelIdx.value = selIdx; u.uSelAmt.value = selAmt;
    },
    setFade(a) {
      // The arrival performance arms on the first light after fully dark —
      // and only then; a settled field (arrive already 1, e.g. a deep-link
      // snap) stays settled. The media query is read at the arm, not at
      // build, following portrait-remix.js's remix().
      if (a > 0 && fade <= 0 && arrive < 1) {
        const reduced = !!arriveMotion.matches;
        portraitMat.uniforms.uArriveSpan.value = reduced ? 1 : ARRIVE_SPAN;
        arriveRate = 1 / (reduced ? ARRIVE_S_REDUCED : ARRIVE_S);
      } else if (a <= 0) {
        arrive = 0;   // fully dark re-arms: every descent is an arrival
      }
      fade = a;
      portraitMat.uniforms.uOpacity.value = a;
      rimMat.uniforms.uFade.value = a;
      cores.mat.uniforms.uFade.value = a;
      halos.mat.uniforms.uFade.value = a;
      nodeStrands.mat.uniforms.uFade.value = a;
    },
    get hoverIdx() { return hoverIdx; },
    get selIdx() { return selIdx; },
    // The node the field is currently answering, and how strongly — the same
    // pair `update()` feeds its own layers, exposed so the substrate's local
    // strand lighting can answer the identical node at the identical strength
    // (chapters/owned/index.js).
    get activeIdx() { return hoverIdx >= 0 ? hoverIdx : selIdx; },
    get activeAmt() { return Math.max(hoverAmt, selAmt * 0.85); },

    update(dt, time) {
      if (fade <= 0 && !wave) return;
      for (const m of timeMats) m.uniforms.uTime.value = time;

      // the arrival clock: monotone, seconds-denominated, and ceiling-bounded
      // in the shader (every term it gates also rides the camera-pure fade)
      if (arrive < 1) arrive = Math.min(1, arrive + dt * arriveRate);
      portraitMat.uniforms.uArrive.value = arrive;

      // colony wave: expand, fade out over the last quarter, then rest
      if (wave) {
        wave.r += dt * wave.speed;
        const fadeW = 1 - clamp((wave.r / wave.maxR - 0.72) / 0.28, 0, 1);
        const amt = wave.amp * fadeW;
        for (const m of waveMats) {
          m.uniforms.uWaveC.value.copy(wave.c);
          m.uniforms.uWaveR.value = wave.r;
          m.uniforms.uWaveW.value = wave.width;
          m.uniforms.uWaveAmt.value = amt;
        }
        if (wave.r > wave.maxR) {
          wave = null;
          for (const m of waveMats) m.uniforms.uWaveAmt.value = 0;
        }
      }

      hoverAmt += ((hoverIdx >= 0 ? 1 : 0) - hoverAmt) * Math.min(dt * 5.0, 1);
      selAmt += ((selIdx >= 0 ? 1 : 0) - selAmt) * Math.min(dt * 3.2, 1);
      const u = portraitMat.uniforms;
      u.uHoverIdx.value = hoverIdx; u.uHoverAmt.value = hoverAmt;
      u.uSelIdx.value = selIdx; u.uSelAmt.value = selAmt;
      u.uAnon.value += (anonTarget - u.uAnon.value) * Math.min(dt * 2.6, 1);
      u.uPhoto.value += (photoTarget - u.uPhoto.value) * Math.min(dt * 2.6, 1);
      rimMat.uniforms.uHoverIdx.value = hoverIdx;
      rimMat.uniforms.uHoverAmt.value = hoverAmt;
      rimMat.uniforms.uSelIdx.value = selIdx;
      rimMat.uniforms.uSelAmt.value = selAmt;
      const activeIdx = hoverIdx >= 0 ? hoverIdx : selIdx;
      const activeAmt = Math.max(hoverAmt, selAmt * 0.85);
      cores.mat.uniforms.uHoverIdx.value = activeIdx;
      // The core dot draws AFTER the portrait plane (renderOrder 3 vs 2), so
      // the hover solidity cannot cover it — and its hover growth is a gold
      // lamp in the middle of the person's face. Muted in photo mode for the
      // same reason as the in-shader core term (PHOTO_GRADE.hoverCoreMute);
      // the procedural busts keep the full answer.
      cores.mat.uniforms.uHoverAmt.value =
        activeAmt * (1 - u.uPhoto.value * PHOTO_GRADE.hoverCoreMute);
      halos.mat.uniforms.uHoverIdx.value = activeIdx;
      halos.mat.uniforms.uHoverAmt.value = activeAmt;

      // only the LOCAL strands of the active node illuminate
      nodeStrands.driver.update(dt);
      nodeStrands.mat.uniforms.uActive.value = activeIdx;
      nodeStrands.mat.uniforms.uActiveAmt.value = Math.max(hoverAmt, selAmt * 0.9);
      nodeStrands.mat.uniforms.uPulse.value = nodeStrands.driver.value;
      nodeStrands.mat.uniforms.uPulseOn.value = nodeStrands.driver.active ? 1 : 0;
    },
  };
  return api;
}
