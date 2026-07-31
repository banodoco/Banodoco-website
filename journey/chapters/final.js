// Final — the epilogue pullback: oblique above/below-ground cutaway.
// Fairy ring on the surface, mycelial colony beneath, spores dispersing above.
// See CONTRACT.md ("final" row) and handoff.md Epilogue section.
import * as THREE from 'three';
import { buildMushroom } from '../lib/organism.js?v=6';

const TAU = Math.PI * 2;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createChapter(ctx) {
  const { THREE: T, helpers, palette } = ctx;
  const {
    rng, fbm3, glowSprite, softDisc, strandLines, makePulseMat,
    easings, pulseDriver, tubeFrom,
  } = helpers;

  // Reduced motion: ambient motion amplitudes are gated, twinkle phases freeze,
  // environmental drift is skipped. Causal/transport motion survives, slowed.
  const REDUCED = !!ctx.reducedMotion;
  const MOTION = REDUCED ? 0.35 : 1;
  const FROZEN_T = 7.3; // fixed twinkle phase used when reduced motion is on

  const group = new T.Group();

  // ---------------------------------------------------------------------
  // Tilted world: everything that must share the diagonal soil-line lives
  // under `tilted`, rotated ~12deg around z so "up" stays consistent for
  // the mushrooms growing out of it.
  // ---------------------------------------------------------------------
  const tilted = new T.Group();
  tilted.rotation.z = THREE.MathUtils.degToRad(12);
  group.add(tilted);

  // Every material whose uTime must be ticked each frame. Anything built with
  // makePulseMat (mushroom body/gill/rim mats, cords, connectors, fields) goes
  // in here — otherwise its twinkle is frozen and the shot reads as dead.
  const timeMats = [];

  // ---------------------------------------------------------------------
  // aAlong rewrites.
  // makePulseMat's pulse rides `aAlong`, which strandLines fills as 0..1 along
  // EACH strand. For short strands that means every strand lights the same
  // fraction of itself at once — a ring-wide flash, not a travelling front.
  // Rewriting aAlong to a spatial coordinate (as chapters/owned.js does) turns
  // the same uniform into a genuine wave through space.
  // ---------------------------------------------------------------------
  function azimuthAlong(geo, cx = 0, cz = 0) {
    // normalized azimuth around the ring centre, unwrapped to 0..1
    const pos = geo.attributes.position;
    const a = geo.attributes.aAlong;
    for (let i = 0; i < pos.count; i++) {
      let ang = Math.atan2(pos.getZ(i) - cz, pos.getX(i) - cx) / TAU;
      if (ang < 0) ang += 1;
      a.setX(i, ang);
    }
    a.needsUpdate = true;
  }
  function radialAlong(geo, maxR) {
    // normalized radius from the colony centre → the pulse expands outward
    const pos = geo.attributes.position;
    const a = geo.attributes.aAlong;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      a.setX(i, Math.min(1, Math.sqrt(x * x + z * z) / maxR));
    }
    a.needsUpdate = true;
  }

  // ---------------------------------------------------------------------
  // Terrain surface: faint scattered horizontal noise strands at y=0
  // ---------------------------------------------------------------------
  const SURFACE_COUNT_FULL = 220;
  let surfaceCount = SURFACE_COUNT_FULL;
  function buildSurfaceGeo(count) {
    return strandLines({
      count,
      seed: 4471,
      generator: (i, r) => {
        const ang = r() * TAU;
        const rad = 3 + r() * 45;
        const cx = Math.cos(ang) * rad;
        const cz = Math.sin(ang) * rad;
        const len = 0.8 + r() * 2.6;
        const dir = r() * TAU;
        const dx = Math.cos(dir), dz = Math.sin(dir);
        const y = -0.05 + r() * 0.1;
        const mid = new T.Vector3(cx + dx * len * 0.5, y + 0.02, cz + dz * len * 0.5);
        return [
          new T.Vector3(cx, y, cz),
          mid,
          new T.Vector3(cx + dx * len, y - 0.02, cz + dz * len),
        ];
      },
    });
  }
  let surfaceGeo = buildSurfaceGeo(surfaceCount);
  const surfaceMat = makePulseMat(palette.muted, {
    baseOpacity: 0.16, pulseColor: palette.goldBright, twinkle: 0.5, pulseWidth: 0.18,
  });
  timeMats.push(surfaceMat);
  let surfaceLines = new T.LineSegments(surfaceGeo.geometry, surfaceMat);
  surfaceLines.frustumCulled = false;
  tilted.add(surfaceLines);

  // Cut face: soft gradient band marking where the ground is sliced open,
  // running along the camera-facing edge. Opacity is deliberately substantial —
  // at 0.34 the soil-line read as haze rather than a cut.
  const cutGeo = new T.PlaneGeometry(70, 14, 1, 1);
  const cutMat = new T.MeshBasicMaterial({
    color: palette.soil, transparent: true, opacity: 0.5,
    blending: T.NormalBlending, depthWrite: false, side: T.DoubleSide,
    map: (() => {
      const c = document.createElement('canvas');
      c.width = 8; c.height = 128;
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0.0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.45, 'rgba(20,14,8,0.6)');
      grad.addColorStop(1.0, 'rgba(10,7,4,0.95)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 8, 128);
      const tex = new T.CanvasTexture(c);
      return tex;
    })(),
  });
  const cutFace = new T.Mesh(cutGeo, cutMat);
  cutFace.rotation.x = Math.PI / 2 - 0.06;
  cutFace.position.set(0, -3.2, 9);
  tilted.add(cutFace);

  // ---------------------------------------------------------------------
  // Fairy ring: 11 mushrooms on the ring r 14-20, plus one foreground and one
  // background specimen so the frame has real depth layering (13 total = the
  // contract maximum).
  // ---------------------------------------------------------------------
  const RING_COUNT = 11;
  const ringGroup = new T.Group();
  tilted.add(ringGroup);

  const ringMembers = [];
  const ringRand = rng(2024);

  function addMushroom(spec) {
    const built = buildMushroom(T, helpers, {
      seed: spec.seed, height: spec.height, capRadius: spec.capRadius,
      tilt: spec.tilt, detail: spec.detail ?? 1,
    });
    built.group.position.set(spec.x, 0, spec.z);
    built.group.rotation.y = spec.rotY;
    if (spec.scale !== 1) built.group.scale.setScalar(spec.scale);
    ringGroup.add(built.group);
    for (const mm of built.mats) timeMats.push(mm);
    const m = {
      built, x: spec.x, z: spec.z, az: spec.az, rad: spec.rad, seed: spec.seed,
      capTopY: (built.capTopY ?? spec.height) * spec.scale,
      capBaseY: (built.capBaseY ?? spec.height) * spec.scale,
      // position of this mushroom along the growth front (normalized azimuth),
      // so the sequential brightening is caused by the passing wave
      arcPhase: (((spec.az % TAU) + TAU) % TAU) / TAU,
      layer: spec.layer,               // 'ring' | 'fore' | 'back'
      ambientPhase: spec.ambientPhase,
      dim: spec.dim ?? 1,
      lowLOD: false,
      brightness: { value: 0.35 },
    };
    ringMembers.push(m);
    return m;
  }

  for (let i = 0; i < RING_COUNT; i++) {
    const t = i / RING_COUNT;
    const az = t * TAU + (ringRand() - 0.5) * (TAU / RING_COUNT) * 0.7;
    const rad = 14 + ringRand() * 6; // 14..20
    addMushroom({
      seed: 3000 + i * 37, az, rad,
      x: Math.cos(az) * rad, z: Math.sin(az) * rad,
      height: 1.6 + ringRand() * 1.8,     // 1.6..3.4
      capRadius: 0.9 + ringRand() * 1.1,  // 0.9..2.0
      tilt: (ringRand() - 0.5) * 0.5,
      rotY: ringRand() * TAU,
      scale: 1, layer: 'ring',
      ambientPhase: ringRand() * TAU,
    });
  }

  // Foreground specimen: toward the camera azimuth (camera sits in the +x+z
  // quadrant and recedes along ~1.1rad), larger, closest to the lens.
  {
    const az = 0.92;
    const rad = 26 + ringRand() * 4;
    addMushroom({
      seed: 3901, az, rad,
      x: Math.cos(az) * rad, z: Math.sin(az) * rad,
      height: 3.1, capRadius: 2.1, tilt: -0.14,
      rotY: ringRand() * TAU, scale: 1.45, layer: 'fore',
      ambientPhase: ringRand() * TAU,
    });
  }
  // Background specimen: opposite side, smaller and dimmer, reads as distance.
  {
    const az = 0.92 + Math.PI;
    const rad = 34 + ringRand() * 4;
    addMushroom({
      seed: 3947, az, rad,
      x: Math.cos(az) * rad, z: Math.sin(az) * rad,
      height: 2.2, capRadius: 1.2, tilt: 0.18,
      rotY: ringRand() * TAU, scale: 0.72, layer: 'back', dim: 0.45,
      ambientPhase: ringRand() * TAU,
    });
  }

  // LOD flags: the 5 furthest ring members plus the background specimen drop
  // their fine children; the foreground specimen always stays full detail.
  {
    const ringOnly = ringMembers.filter(m => m.layer === 'ring')
      .sort((a, b) => b.rad - a.rad);
    for (const m of ringOnly.slice(0, 5)) m.lowLOD = true;
    for (const m of ringMembers) if (m.layer === 'back') m.lowLOD = true;
  }

  // Primordia: 3 tiny budding points between mature mushrooms. They are NOT
  // present from frame 0 — they emerge during a long hold (see PRIM_* below).
  const primordiaGroup = new T.Group();
  primordiaGroup.visible = false;
  tilted.add(primordiaGroup);
  const primordiaTex = glowSprite(palette.goldBright, 48);
  const primordiaMat = new T.SpriteMaterial({
    map: primordiaTex, color: palette.goldBright, transparent: true,
    opacity: 0, blending: T.AdditiveBlending, depthWrite: false,
  });
  const primordiaStalkMat = new T.LineBasicMaterial({
    color: palette.gold, transparent: true, opacity: 0,
    blending: T.AdditiveBlending, depthWrite: false,
  });
  const primordia = [];
  const primordiaStalks = [];
  const primRand = rng(555);
  for (let i = 0; i < 3; i++) {
    const t = (i + 0.5) / 3 + (primRand() - 0.5) * 0.08;
    const az = t * TAU;
    const rad = 15 + primRand() * 4;
    const x = Math.cos(az) * rad, z = Math.sin(az) * rad;
    const h = 0.15 + primRand() * 0.18;
    const sprite = new T.Sprite(primordiaMat.clone());
    const baseScale = 0.22 + primRand() * 0.12;
    sprite.scale.setScalar(0.001);
    sprite.position.set(x, h, z);
    primordiaGroup.add(sprite);
    const stalkGeo = new T.BufferGeometry().setFromPoints([
      new T.Vector3(x, 0, z), new T.Vector3(x, h, z),
    ]);
    const stalk = new T.Line(stalkGeo, primordiaStalkMat);
    primordiaGroup.add(stalk);
    primordiaStalks.push(stalkGeo);
    primordia.push({ sprite, phase: primRand() * TAU, baseScale });
  }
  const PRIM_DELAY = 6;   // seconds of accumulated active dwell before emerging
  const PRIM_GROW = 8;    // seconds of time-compressed growth
  let primordiaEnabled = true;
  let dwell = 0;

  // ---------------------------------------------------------------------
  // Forest horizon: faint vertical silhouette strands + mist sprites
  // ---------------------------------------------------------------------
  const horizonGroup = new T.Group();
  tilted.add(horizonGroup);
  const horizonRand = rng(777);
  const horizonCount = 7;
  const horizonGeo = strandLines({
    count: horizonCount,
    seed: 778,
    generator: (i, r) => {
      const az = r() * TAU;
      const rad = 30 + r() * 10;
      const x = Math.cos(az) * rad, z = Math.sin(az) * rad;
      const h = 4 + r() * 6;
      return [
        new T.Vector3(x, -1, z),
        new T.Vector3(x + (r() - 0.5) * 1.5, h * 0.5, z + (r() - 0.5) * 1.5),
        new T.Vector3(x + (r() - 0.5) * 2, h, z + (r() - 0.5) * 2),
      ];
    },
  });
  const horizonMat = new T.LineBasicMaterial({
    color: palette.deepGold, transparent: true, opacity: 0.09,
    blending: T.AdditiveBlending, depthWrite: false,
  });
  const horizonLines = new T.LineSegments(horizonGeo.geometry, horizonMat);
  horizonLines.frustumCulled = false;
  horizonGroup.add(horizonLines);

  const mistTex = glowSprite(palette.muted, 128);
  const mistMat0 = () => new T.SpriteMaterial({
    map: mistTex, color: palette.muted, transparent: true, opacity: 0.05,
    blending: T.NormalBlending, depthWrite: false,
  });
  const mists = [];
  for (let i = 0; i < 3; i++) {
    const az = horizonRand() * TAU;
    const rad = 32 + horizonRand() * 8;
    const spr = new T.Sprite(mistMat0());
    spr.scale.set(30 + horizonRand() * 14, 12 + horizonRand() * 6, 1);
    spr.position.set(Math.cos(az) * rad, 1 + horizonRand() * 2, Math.sin(az) * rad);
    horizonGroup.add(spr);
    mists.push({ spr, speed: 0.03 + horizonRand() * 0.02, phase: horizonRand() * TAU });
  }

  // ---------------------------------------------------------------------
  // Underground colony: mycelial field below y=0, plus an active growth
  // front arc just inside the ring radius.
  // ---------------------------------------------------------------------
  const undergroundGroup = new T.Group();
  tilted.add(undergroundGroup);

  const UNDER_COUNT_FULL = 250;
  const UNDER_MAX_R = 26;
  let underCount = UNDER_COUNT_FULL;
  function buildUnderGeo(count) {
    const res = strandLines({
      count,
      seed: 8181,
      generator: (i, r) => {
        const ang = r() * TAU;
        const rad = r() * r() * UNDER_MAX_R;
        const cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad;
        const depth = -1 - r() * 7;
        const len = 1 + r() * 3;
        const dir = r() * TAU;
        const pts = [];
        const n = 3;
        for (let j = 0; j < n; j++) {
          const tt = j / (n - 1);
          pts.push(new T.Vector3(
            cx + Math.cos(dir) * len * tt + (r() - 0.5) * 0.6,
            depth + (r() - 0.5) * 0.8,
            cz + Math.sin(dir) * len * tt + (r() - 0.5) * 0.6,
          ));
        }
        return pts;
      },
    });
    // pulse expands outward through the colony instead of flashing every hypha
    radialAlong(res.geometry, UNDER_MAX_R);
    return res;
  }
  let underGeo = buildUnderGeo(underCount);
  const UNDER_BASE = 0.14;
  const underMat = makePulseMat(palette.deepGold, {
    baseOpacity: UNDER_BASE, pulseColor: palette.goldBright, twinkle: 0.6, pulseWidth: 0.16,
  });
  timeMats.push(underMat);
  let underLines = new T.LineSegments(underGeo.geometry, underMat);
  underLines.frustumCulled = false;
  undergroundGroup.add(underLines);

  // Active growth front: arc of brighter strands just inside the ring radius.
  // Base opacity is a step above the fine field so the front reads as a
  // distinct brighter arc rather than dissolving into it.
  const ARC_RADIUS = 12.5;
  const arcGeo = strandLines({
    count: 60,
    seed: 4242,
    generator: (i, r) => {
      const t = i / 60;
      const az = t * TAU;
      const rad = ARC_RADIUS + (r() - 0.5) * 2.2;
      const depth = -0.4 - r() * 2.4;
      const x = Math.cos(az) * rad, z = Math.sin(az) * rad;
      const dx = (r() - 0.5) * 1.2, dz = (r() - 0.5) * 1.2;
      return [
        new T.Vector3(x, depth, z),
        new T.Vector3(x + dx, depth - r() * 0.6, z + dz),
      ];
    },
  });
  // aAlong = azimuth, so uPulse sweeps a front AROUND the ring. The 0/1 seam is
  // masked by the randomized gap between revolutions (see arcCycle).
  azimuthAlong(arcGeo.geometry);
  const ARC_BASE = 0.3;
  const arcMat = makePulseMat(palette.gold, {
    baseOpacity: ARC_BASE, pulseColor: palette.goldBright, twinkle: 0.3, pulseWidth: 0.14,
  });
  timeMats.push(arcMat);
  const arcLines = new T.LineSegments(arcGeo.geometry, arcMat);
  arcLines.frustumCulled = false;
  undergroundGroup.add(arcLines);

  // ---------------------------------------------------------------------
  // Rhizomorph cords: 3 thicker tubes carrying slow travelling waves outward
  // from near the colony centre, past the growth front. They also give the
  // lower part of the frame something to hold on to.
  // ---------------------------------------------------------------------
  function tubeStrand(points, opts, strandVal) {
    const g = tubeFrom(points, opts);
    const n = g.attributes.position.count;
    const uv = g.attributes.uv;
    const along = new Float32Array(n);
    const st = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      along[i] = uv ? uv.getX(i) : 0;   // TubeGeometry uv.x runs along the spine
      st[i] = strandVal;
    }
    g.setAttribute('aAlong', new T.BufferAttribute(along, 1));
    g.setAttribute('aStrand', new T.BufferAttribute(st, 1));
    if (g.attributes.normal) g.deleteAttribute('normal');
    if (g.attributes.uv) g.deleteAttribute('uv');
    return g;
  }

  // Azimuths stay clear of the camera azimuth (~1.1rad) so no cord passes
  // through the lens; they run out past ARC_RADIUS and sit low in frame.
  const CORD_SPECS = [
    { seed: 7101, az: 0.42, bend: 0.5, rOut: 21, r: 0.12, y0: -2.4, y1: -4.4,
      col: palette.gold, pulse: palette.goldBright, speed: 0.055, base: 0.15 },
    { seed: 7207, az: 2.35, bend: -0.7, rOut: 20, r: 0.11, y0: -2.6, y1: -4.6,
      col: palette.deepGold, pulse: palette.ember, speed: 0.038, base: 0.13 },
    { seed: 7309, az: 5.15, bend: 0.62, rOut: 22, r: 0.1, y0: -2.2, y1: -4.1,
      col: palette.gold, pulse: palette.ember, speed: 0.031, base: 0.12 },
  ];
  const cords = [];
  const cordRand = rng(7777);
  CORD_SPECS.forEach((S, ci) => {
    const SEG = 10;
    const pts = [];
    for (let j = 0; j <= SEG; j++) {
      const t = j / SEG;
      const rad = 1.4 + (S.rOut - 1.4) * t;
      const az = S.az + S.bend * Math.sin(Math.PI * t) * 0.45
        + fbm3(t * 2.7 + ci * 5.3, 0.7, 2.1, 3) * 0.12;
      const y = S.y0 + (S.y1 - S.y0) * t
        + fbm3(1.9, t * 3.1 + ci * 2.7, 0.4, 3) * 0.55;
      pts.push(new T.Vector3(Math.cos(az) * rad, y, Math.sin(az) * rad));
    }
    const geo = tubeStrand(pts, {
      radius: S.r, radialSegments: 6, tubularSegments: 64, taper: 0.6,
    }, ci / CORD_SPECS.length);
    const mat = makePulseMat(S.col, {
      baseOpacity: S.base, twinkle: 0.14, pulseWidth: 0.08, pulseColor: S.pulse,
    });
    timeMats.push(mat);
    const mesh = new T.Mesh(geo, mat);
    mesh.frustumCulled = false;
    undergroundGroup.add(mesh);
    cords.push({
      mesh, mat, geo, base: S.base,
      p: -0.15 - ci * 0.34, speed: S.speed, k: ci * 4.7 + 1.3,
    });
  });

  // Connection strands: a few visible tendrils from arc up to specific ring
  // mushrooms, used for the ringPulse trigger (brighten 2-3 of them).
  const connectorIdx = [0, 4, 8].filter(i => i < ringMembers.length);
  const connectorLines = [];
  for (const idx of connectorIdx) {
    const m = ringMembers[idx];
    const az = m.az;
    const rad = ARC_RADIUS;
    const from = new T.Vector3(Math.cos(az) * rad, -1.4, Math.sin(az) * rad);
    const to = new T.Vector3(m.x, 0.05, m.z);
    const cGeo = strandLines({
      count: 1, seed: 1 + idx,
      // aAlong stays per-strand here: the pulse genuinely travels up the cord
      generator: () => [from, from.clone().lerp(to, 0.5).add(new T.Vector3(0, -0.3, 0)), to],
    });
    const cMat = makePulseMat(palette.gold, {
      baseOpacity: 0.08, pulseColor: palette.goldBright, twinkle: 0.2, pulseWidth: 0.3,
    });
    timeMats.push(cMat);
    const line = new T.LineSegments(cGeo.geometry, cMat);
    line.frustumCulled = false;
    undergroundGroup.add(line);
    connectorLines.push({ line, mat: cMat });
  }

  // ---------------------------------------------------------------------
  // Spore cloud: released from under the caps, merging into a broad broken
  // atmospheric cloud with dominant +x drift.
  // ---------------------------------------------------------------------
  const SPORE_COUNT_FULL = 2500;
  let sporeCount = SPORE_COUNT_FULL;
  const sporeTex = softDisc(48);
  let sporeGeo, sporePoints, sporeMat;
  // several ring mushrooms emit, plus the foreground specimen for depth
  const sporeSourceIdx = ringMembers
    .map((m, i) => ({ m, i }))
    .filter(({ m, i }) => (m.layer === 'ring' && i % 2 === 0) || m.layer === 'fore')
    .map(({ i }) => i);

  function buildSporeSystem(count) {
    const r = rng(6060);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sources = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const srcI = sourceForIndex(r);
      const src = ringMembers[srcI];
      const spread = 3 + r() * 6;
      const ang = r() * TAU;
      // release happens UNDER the cap: seed just below the rim (capBaseY),
      // never at/above the apex. The shader lifts them into the drift band.
      const originY = Math.max(src.capBaseY - 0.15 - r() * 0.35, 0.5);
      positions[i * 3 + 0] = src.x + Math.cos(ang) * spread * 0.3;
      positions[i * 3 + 1] = originY;
      positions[i * 3 + 2] = src.z + Math.sin(ang) * spread * 0.3;
      seeds[i] = r() * 1000;
      sources[i] = srcI;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new T.Float32BufferAttribute(seeds, 1));
    geo.setAttribute('aSource', new T.Float32BufferAttribute(sources, 1));
    return geo;
  }
  function sourceForIndex(r) {
    return sporeSourceIdx[Math.floor(r() * sporeSourceIdx.length)] ?? 0;
  }
  sporeGeo = buildSporeSystem(sporeCount);

  sporeMat = new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new T.Color(palette.goldBright) },
      uColor2: { value: new T.Color(palette.parchment) },
      uMap: { value: sporeTex },
      uSize: { value: 34 },
    },
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed;
      attribute float aSource;
      uniform float uTime, uSize;
      varying float vAlpha;
      varying float vSeed;
      // cheap hash-based pseudo fbm for drift/turbulence
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main() {
        vSeed = aSeed;
        float t = mod(uTime * (0.035 + hash(aSeed) * 0.02) + aSeed, 1.0);
        vec3 p = position;
        // rise + dominant +x drift + turbulence eddies
        float rise = t * (10.0 + hash(aSeed * 1.7) * 10.0);
        float drift = t * (3.5 + hash(aSeed * 2.3) * 3.0);
        float eddyX = sin(uTime * 0.15 + aSeed) * (1.2 + hash(aSeed * 3.1) * 1.8);
        float eddyY = cos(uTime * 0.12 + aSeed * 1.3) * 0.8;
        float eddyZ = sin(uTime * 0.09 + aSeed * 2.1) * 1.4;
        p.y += rise;
        p.x += drift + eddyX;
        p.z += eddyZ;
        p.y += eddyY;
        vAlpha = (1.0 - smoothstep(0.7, 1.0, t)) * smoothstep(0.0, 0.08, t) * (0.35 + 0.5 * hash(aSeed * 4.1));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (1.0 / -mv.z) * (0.6 + hash(aSeed * 5.7) * 0.8);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uColor, uColor2;
      varying float vAlpha;
      varying float vSeed;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        vec3 col = mix(uColor, uColor2, hash(vSeed * 9.3) * 0.4);
        gl_FragColor = vec4(col, tex.a * vAlpha);
      }`,
  });
  sporePoints = new T.Points(sporeGeo, sporeMat);
  sporePoints.frustumCulled = false;
  tilted.add(sporePoints);

  // ---------------------------------------------------------------------
  // Growth-front cycle. NOT a fixed period: each revolution runs for a
  // randomized duration, then the front rests for a randomized gap, so no loop
  // is perceptible and the 0/1 azimuth seam falls inside the rest.
  // ---------------------------------------------------------------------
  const arcRand = rng(9182);
  const arcCycle = {
    phase: -0.08,
    running: true,
    dur: 10 + arcRand() * 5,   // 10..15s per revolution
    wait: 0,
  };
  const ringTrigger = pulseDriver(3.2);

  // ---------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------
  function update(dt, time, cp, active) {
    const mTime = REDUCED ? FROZEN_T : time;   // frozen twinkle phases
    for (const mm of timeMats) mm.uniforms.uTime.value = mTime;
    sporeMat.uniforms.uTime.value = REDUCED ? time * 0.3 : time;

    // --- growth front travels around the ring, then rests ---
    if (arcCycle.running) {
      arcCycle.phase += (dt / arcCycle.dur) * MOTION;
      if (arcCycle.phase >= 1.08) {
        arcCycle.running = false;
        arcCycle.phase = -0.08;
        arcCycle.wait = 1.8 + arcRand() * 4.6;
      }
    } else {
      arcCycle.wait -= dt;
      if (arcCycle.wait <= 0) {
        arcCycle.running = true;
        arcCycle.dur = 10 + arcRand() * 5;
      }
    }
    const edge = clamp01(Math.min(arcCycle.phase + 0.08, 1.08 - arcCycle.phase) / 0.12);
    const frontAmp = arcCycle.running ? easings.smooth(edge) * (REDUCED ? 0.45 : 0.8) : 0;
    arcMat.uniforms.uPulse.value = arcCycle.phase;
    arcMat.uniforms.uPulseOn.value +=
      (frontAmp - arcMat.uniforms.uPulseOn.value) * Math.min(dt * 4, 1);

    // Camera proximity is approximated from cp: the camera recedes along a
    // known path (8,5,20) → (26,17,52), so low cp == low and near the cut.
    // The fine field and the cords brighten locally while it is close.
    const nearCam = 1 - easings.smooth(clamp01(cp / 0.4));
    underMat.uniforms.uBase.value = UNDER_BASE * (1 + 0.55 * nearCam);
    arcMat.uniforms.uBase.value = ARC_BASE * (1 + 0.25 * nearCam);

    // --- sequential ring activation, caused by the passing front ---
    for (const m of ringMembers) {
      let target;
      if (m.layer === 'ring' && arcCycle.running) {
        const d0 = Math.abs(arcCycle.phase - m.arcPhase);
        const d = Math.min(d0, 1 - d0);
        target = 0.35 + Math.exp(-(d * d) / (0.045 * 0.045)) * 0.65;
      } else {
        // depth-layer specimens (and everyone between revolutions) keep an
        // independent slow twinkle so nothing breathes in unison
        target = (0.34 + 0.09 * Math.sin(mTime * 0.13 + m.ambientPhase)) * m.dim;
      }
      m.brightness.value += (target - m.brightness.value) * Math.min(dt * 2.2, 1);
      applyBrightness(m);
    }

    // --- rhizomorph cords: slow, uneven, independent outward waves ---
    for (const c of cords) {
      const jit = 0.55 + 0.8 * (0.5 + 0.5 * fbm3(mTime * 0.06, c.k, 0.0, 2));
      c.p += dt * c.speed * jit * MOTION;
      if (c.p > 1.18) c.p = -0.12 - cordRand() * 0.9;
      c.mat.uniforms.uPulse.value = c.p;
      c.mat.uniforms.uPulseOn.value =
        (c.p > -0.1 && c.p < 1.1) ? (REDUCED ? 0.3 : 0.55) : 0;
      c.mat.uniforms.uBase.value = c.base * (1 + 0.5 * nearCam);
    }

    // --- triggered colony pulse (expands outward + up the connectors) ---
    ringTrigger.update(dt);
    if (ringTrigger.active) {
      const v = ringTrigger.value; // 0..1
      const env = Math.sin(Math.min(v, 1) * Math.PI); // rises then falls
      underMat.uniforms.uPulseOn.value = env * 0.9;
      underMat.uniforms.uPulse.value = v * 1.05; // radius wave, centre → rim
      for (const c of connectorLines) {
        c.mat.uniforms.uPulseOn.value = env;
        c.mat.uniforms.uPulse.value = v;
      }
    } else {
      underMat.uniforms.uPulseOn.value = 0.15;
      underMat.uniforms.uPulse.value = 0;
      for (const c of connectorLines) c.mat.uniforms.uPulseOn.value *= 0.9;
    }

    // --- primordia: time-compressed emergence during a long hold ---
    if (active) dwell += dt;
    if (primordiaEnabled) {
      const emerge = easings.smooth(clamp01((dwell - PRIM_DELAY) / PRIM_GROW));
      primordiaGroup.visible = emerge > 0.002;
      if (primordiaGroup.visible) {
        primordiaStalkMat.opacity = 0.4 * emerge;
        for (const p of primordia) {
          const tw = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(mTime * 0.35 + p.phase * 1.7);
          const s = REDUCED ? 1 : 0.9 + 0.25 * Math.sin(mTime * 0.4 + p.phase);
          p.sprite.material.opacity = emerge * (0.55 + 0.3 * tw);
          p.sprite.scale.setScalar(p.baseScale * (0.18 + 0.82 * emerge) * (0.94 + 0.06 * s));
        }
      }
    }

    // --- mist: slow environmental drift (skipped under reduced motion) ---
    for (const m of mists) {
      if (!REDUCED) m.spr.position.x += Math.sin(time * m.speed + m.phase) * 0.002;
      m.spr.material.opacity = 0.035 + 0.02 * (0.5 + 0.5 * Math.sin(mTime * m.speed * 0.7 + m.phase));
    }

    // below-ground twinkle intensifies subtly when this chapter is active
    // (camera passing through); keep motion slow regardless.
    underMat.uniforms.uTwinkle.value = active ? 0.65 : 0.5;
  }

  function applyBrightness(m) {
    const grp = m.built.group;
    const b = m.brightness.value;
    grp.traverse(obj => {
      if (obj.material && obj.material.uniforms && obj.material.uniforms.uBase) {
        obj.material.uniforms.uBase.value = b * 0.5;
      } else if (obj.material && 'opacity' in obj.material && obj.userData.baseOpacity != null) {
        obj.material.opacity = obj.userData.baseOpacity * (0.6 + b * 0.6);
      }
    });
  }
  // cache base opacities once for fallback dimming path
  for (const m of ringMembers) {
    m.built.group.traverse(obj => {
      if (obj.material && 'opacity' in obj.material && obj.userData.baseOpacity == null) {
        obj.userData.baseOpacity = obj.material.opacity;
      }
    });
  }

  function setHover(/* idOrNull */) { /* no hotspots in the epilogue */ }
  function setSelected(/* idOrNull */) { /* no hotspots in the epilogue */ }

  function trigger(name) {
    if (name === 'ringPulse' || name === 'ctaPulse') {
      ringTrigger.fire();
    }
  }

  function setQuality(tier) {
    const reduced = tier >= 2;
    // surface strands
    const targetSurface = reduced ? Math.round(SURFACE_COUNT_FULL * 0.4) : SURFACE_COUNT_FULL;
    if (targetSurface !== surfaceCount) {
      surfaceCount = targetSurface;
      surfaceLines.geometry.dispose();
      surfaceGeo = buildSurfaceGeo(surfaceCount);
      surfaceLines.geometry = surfaceGeo.geometry;
    }
    // underground field
    const targetUnder = reduced ? Math.round(UNDER_COUNT_FULL * 0.4) : UNDER_COUNT_FULL;
    if (targetUnder !== underCount) {
      underCount = targetUnder;
      underLines.geometry.dispose();
      underGeo = buildUnderGeo(underCount);
      underLines.geometry = underGeo.geometry;
    }
    // spores
    const targetSpore = reduced ? Math.round(SPORE_COUNT_FULL * 0.4) : SPORE_COUNT_FULL;
    if (targetSpore !== sporeCount) {
      sporeCount = targetSpore;
      sporePoints.geometry.dispose();
      sporeGeo = buildSporeSystem(sporeCount);
      sporePoints.geometry = sporeGeo;
    }
    // primordia dropped entirely on reduced tier
    primordiaEnabled = !reduced;
    if (reduced) primordiaGroup.visible = false;
    // thinnest cord drops out on reduced tier
    cords.forEach((c, i) => { c.mesh.visible = !reduced || i < 2; });
    // mushroom detail: far ring members and the background specimen (and, on
    // reduced tier, everything) hide their non-essential children.
    for (const m of ringMembers) {
      setMushroomLOD(m.built.group, reduced || m.lowLOD);
    }
    horizonLines.visible = true;
    for (const mist of mists) mist.spr.visible = !reduced || mists.indexOf(mist) < 2;
  }
  function setMushroomLOD(grp, low) {
    let i = 0;
    grp.traverse(obj => {
      // isSprite matters: the under-cap glow is a Sprite (child 3) and was
      // never being hidden without it.
      if (obj.isMesh || obj.isLine || obj.isLineSegments || obj.isPoints || obj.isSprite) {
        i++;
        // keep primary (first) structures, hide later/finer ones under low LOD
        if (i > 2) obj.visible = !low;
      }
    });
  }

  function dispose() {
    surfaceLines.geometry.dispose();
    surfaceMat.dispose();
    cutGeo.dispose();
    cutMat.map && cutMat.map.dispose();
    cutMat.dispose();
    underLines.geometry.dispose();
    underMat.dispose();
    arcLines.geometry.dispose();
    arcMat.dispose();
    for (const c of cords) { c.geo.dispose(); c.mat.dispose(); }
    horizonLines.geometry.dispose();
    horizonMat.dispose();
    for (const m of mists) m.spr.material.dispose();
    for (const c of connectorLines) { c.line.geometry.dispose(); c.mat.dispose(); }
    sporeGeo.dispose();
    sporeMat.dispose();
    for (const p of primordia) p.sprite.material.dispose();
    for (const g of primordiaStalks) g.dispose();
    primordiaStalkMat.dispose();
    primordiaMat.dispose();
    primordiaTex.dispose();
    for (const m of ringMembers) {
      m.built.group.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(mm => mm.dispose());
          else obj.material.dispose();
        }
      });
    }
  }

  return {
    id: 'final',
    group,
    hotspots: [],
    update,
    setHover,
    setSelected,
    trigger,
    setQuality,
    dispose,
  };
}
