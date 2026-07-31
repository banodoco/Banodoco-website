// Final — the epilogue pullback: oblique above/below-ground cutaway.
// Fairy ring on the surface, mycelial colony beneath, spores dispersing above.
// See CONTRACT.md ("final" row) and handoff.md Epilogue section.
import * as THREE from 'three';
import { buildMushroom } from '../lib/organism.js';

const TAU = Math.PI * 2;

export function createChapter(ctx) {
  const { THREE: T, helpers, palette } = ctx;
  const { rng, fbm3, glowSprite, softDisc, strandLines, makePulseMat, easings, pulseDriver } = helpers;

  const group = new T.Group();

  // ---------------------------------------------------------------------
  // Tilted world: everything that must share the diagonal soil-line lives
  // under `tilted`, rotated ~12deg around z so "up" stays consistent for
  // the mushrooms growing out of it.
  // ---------------------------------------------------------------------
  const tilted = new T.Group();
  tilted.rotation.z = THREE.MathUtils.degToRad(12);
  group.add(tilted);

  const rand = rng(9001);

  // ---------------------------------------------------------------------
  // Terrain surface: faint scattered horizontal noise strands at y=0
  // ---------------------------------------------------------------------
  const SURFACE_COUNT_FULL = 220;
  let surfaceCount = SURFACE_COUNT_FULL;
  function buildSurfaceGeo(count) {
    const surfRand = rng(4471);
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
  let surfaceLines = new T.LineSegments(surfaceGeo.geometry, surfaceMat);
  surfaceLines.frustumCulled = false;
  tilted.add(surfaceLines);

  // Cut face: soft gradient band marking where the ground is sliced open,
  // running along the camera-facing edge.
  const cutTex = glowSprite(palette.soil, 128);
  const cutGeo = new T.PlaneGeometry(70, 14, 1, 1);
  const cutMat = new T.MeshBasicMaterial({
    color: palette.soil, transparent: true, opacity: 0.34,
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
  // Fairy ring: 11 mushrooms, irregular ring r 14-20
  // ---------------------------------------------------------------------
  const RING_COUNT = 11;
  const ringGroup = new T.Group();
  tilted.add(ringGroup);

  const ringMembers = []; // { mush, group, arcPhase, seed, brightMat[] }
  const ringRand = rng(2024);
  for (let i = 0; i < RING_COUNT; i++) {
    const t = i / RING_COUNT;
    const az = t * TAU + (ringRand() - 0.5) * (TAU / RING_COUNT) * 0.7;
    const rad = 14 + ringRand() * 6; // 14..20
    const x = Math.cos(az) * rad;
    const z = Math.sin(az) * rad;
    const seed = 3000 + i * 37;
    const height = 1.6 + ringRand() * 1.8;   // 1.6..3.4
    const capRadius = 0.9 + ringRand() * 1.1; // 0.9..2.0
    const tilt = (ringRand() - 0.5) * 0.5;
    const dist = rad; // distance-ish proxy for LOD (furthest 5 by radius rank)
    const built = buildMushroom(T, helpers, { seed, height, capRadius, tilt, detail: 1 });
    built.group.position.set(x, 0, z);
    built.group.rotation.y = ringRand() * TAU;
    ringGroup.add(built.group);
    ringMembers.push({
      built, x, z, az, rad, seed,
      capTopY: built.capTopY ?? height,
      arcPhase: t,          // 0..1 position around the ring for the pulse
      baseScale: 1,
      brightness: { value: 0.35 + ringRand() * 0.15 },
    });
  }
  // mark the 5 furthest (largest rad) for LOD detail 0.5 — organism.js already
  // built at detail:1 above; store flags so setQuality/update can react, and
  // also physically simplify by hiding fine sub-meshes if present.
  const sortedByDist = [...ringMembers].sort((a, b) => b.rad - a.rad);
  const farFive = new Set(sortedByDist.slice(0, 5).map(m => m.seed));

  // Primordia: 2-3 tiny bright budding points between mature mushrooms
  const primordiaGroup = new T.Group();
  tilted.add(primordiaGroup);
  const primordiaTex = glowSprite(palette.goldBright, 48);
  const primordiaMat = new T.SpriteMaterial({
    map: primordiaTex, color: palette.goldBright, transparent: true,
    opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false,
  });
  const primordiaStalkMat = new T.LineBasicMaterial({
    color: palette.gold, transparent: true, opacity: 0.4,
    blending: T.AdditiveBlending, depthWrite: false,
  });
  const primordia = [];
  const primRand = rng(555);
  for (let i = 0; i < 3; i++) {
    const t = (i + 0.5) / 3 + (primRand() - 0.5) * 0.08;
    const az = t * TAU;
    const rad = 15 + primRand() * 4;
    const x = Math.cos(az) * rad, z = Math.sin(az) * rad;
    const h = 0.15 + primRand() * 0.18;
    const sprite = new T.Sprite(primordiaMat.clone());
    sprite.scale.setScalar(0.22 + primRand() * 0.12);
    sprite.position.set(x, h, z);
    primordiaGroup.add(sprite);
    const stalkGeo = new T.BufferGeometry().setFromPoints([
      new T.Vector3(x, 0, z), new T.Vector3(x, h, z),
    ]);
    const stalk = new T.Line(stalkGeo, primordiaStalkMat);
    primordiaGroup.add(stalk);
    primordia.push({ sprite, phase: primRand() * TAU });
  }

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
  let underCount = UNDER_COUNT_FULL;
  function buildUnderGeo(count) {
    return strandLines({
      count,
      seed: 8181,
      generator: (i, r) => {
        const ang = r() * TAU;
        const rad = r() * r() * 26;
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
  }
  let underGeo = buildUnderGeo(underCount);
  const underMat = makePulseMat(palette.deepGold, {
    baseOpacity: 0.14, pulseColor: palette.goldBright, twinkle: 0.6, pulseWidth: 0.16,
  });
  let underLines = new T.LineSegments(underGeo.geometry, underMat);
  underLines.frustumCulled = false;
  undergroundGroup.add(underLines);

  // Active growth front: arc of brighter strands just inside the ring radius.
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
  const arcMat = makePulseMat(palette.gold, {
    baseOpacity: 0.22, pulseColor: palette.goldBright, twinkle: 0.3, pulseWidth: 0.14,
  });
  const arcLines = new T.LineSegments(arcGeo.geometry, arcMat);
  arcLines.frustumCulled = false;
  undergroundGroup.add(arcLines);

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
      generator: () => [from, from.clone().lerp(to, 0.5).add(new T.Vector3(0, -0.3, 0)), to],
    });
    const cMat = makePulseMat(palette.gold, {
      baseOpacity: 0.08, pulseColor: palette.goldBright, twinkle: 0.2, pulseWidth: 0.3,
    });
    const line = new T.LineSegments(cGeo.geometry, cMat);
    line.frustumCulled = false;
    undergroundGroup.add(line);
    connectorLines.push({ line, mat: cMat, extraGlow: { value: 0 } });
  }

  // ---------------------------------------------------------------------
  // Spore cloud: rising from under-caps, merging into a broad broken
  // atmospheric cloud with dominant +x drift.
  // ---------------------------------------------------------------------
  const SPORE_COUNT_FULL = 2500;
  let sporeCount = SPORE_COUNT_FULL;
  const sporeTex = softDisc(48);
  let sporeGeo, sporePoints, sporeMat;
  const sporeSourceIdx = ringMembers.map((_, i) => i).filter(i => i % 2 === 0); // several ring mushrooms emit

  function buildSporeSystem(count) {
    const r = rng(6060);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sources = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const srcI = sourceForIndex(i, count, r);
      const src = ringMembers[srcI];
      const spread = 3 + r() * 6;
      const ang = r() * TAU;
      // origin near the under-cap of the source mushroom, biased upward into
      // the broad drifting cloud band (y 6..24)
      const originY = Math.max(src.capTopY - 0.3, 1.2) + r() * 2;
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
  function sourceForIndex(i, count, r) {
    const idx = sporeSourceIdx[Math.floor(r() * sporeSourceIdx.length)] ?? 0;
    return idx;
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
  // Ambient pulse driver (sequential ring activation via the growth front)
  // ---------------------------------------------------------------------
  const ARC_PERIOD = 12; // seconds
  const ringTrigger = pulseDriver(3.2);

  // ---------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------
  let clockTime = 0;
  function update(dt, time, cp, active) {
    clockTime = time;
    surfaceMat.uniforms.uTime.value = time;
    underMat.uniforms.uTime.value = time;
    arcMat.uniforms.uTime.value = time;
    sporeMat.uniforms.uTime.value = time;

    // ambient arc pulse traveling continuously around the growth front
    const ambientPhase = (time % ARC_PERIOD) / ARC_PERIOD;
    arcMat.uniforms.uPulse.value = ambientPhase;
    arcMat.uniforms.uPulseOn.value = 0.7;

    // sequential ring activation: brighten each mushroom in sequence as the
    // ambient pulse passes beneath its arc phase
    for (const m of ringMembers) {
      const d = Math.min(
        Math.abs(ambientPhase - m.arcPhase),
        1 - Math.abs(ambientPhase - m.arcPhase),
      );
      const near = Math.exp(-(d * d) / (0.045 * 0.045));
      const target = 0.35 + near * 0.65;
      m.brightness.value += (target - m.brightness.value) * Math.min(dt * 2.2, 1);
      applyBrightness(m);
    }

    // triggered ring pulse (partial arc + connection strands)
    ringTrigger.update(dt);
    if (ringTrigger.active) {
      const v = ringTrigger.value; // 0..1
      const env = Math.sin(Math.min(v, 1) * Math.PI); // rises then falls
      underMat.uniforms.uPulseOn.value = env * 0.9;
      underMat.uniforms.uPulse.value = v * 0.6; // sweeps part of the arc only
      for (const c of connectorLines) {
        c.mat.uniforms.uPulseOn.value = env;
        c.mat.uniforms.uPulse.value = v;
      }
    } else {
      underMat.uniforms.uPulseOn.value = 0.15;
      underMat.uniforms.uPulse.value = 0;
      for (const c of connectorLines) c.mat.uniforms.uPulseOn.value *= 0.9;
    }

    // primordia gentle twinkle
    for (const p of primordia) {
      const s = 0.9 + 0.25 * Math.sin(time * 0.4 + p.phase);
      p.sprite.material.opacity = 0.55 + 0.3 * (0.5 + 0.5 * Math.sin(time * 0.35 + p.phase * 1.7));
      p.sprite.scale.setScalar((0.22 + 0.02 * s));
    }

    // mist slow drift
    for (const m of mists) {
      m.spr.position.x += Math.sin(time * m.speed + m.phase) * 0.002;
      m.spr.material.opacity = 0.035 + 0.02 * (0.5 + 0.5 * Math.sin(time * m.speed * 0.7 + m.phase));
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
    primordiaGroup.visible = !reduced;
    // mushroom detail: mark far-five (and, on reduced tier, all) as detail 0.5
    // by scaling down segment-ish visuals via material linewidth is not
    // reliable cross-platform; instead we simplify by hiding secondary
    // (non-essential) children on the far/low-tier mushrooms.
    for (const m of ringMembers) {
      const wantLow = reduced || farFive.has(m.seed);
      setMushroomLOD(m.built.group, wantLow);
    }
    horizonLines.visible = true;
    for (const mist of mists) mist.spr.visible = !reduced || mists.indexOf(mist) < 2;
  }
  function setMushroomLOD(grp, low) {
    let i = 0;
    grp.traverse(obj => {
      if (obj.isMesh || obj.isLine || obj.isLineSegments || obj.isPoints) {
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
    horizonLines.geometry.dispose();
    horizonMat.dispose();
    for (const m of mists) m.spr.material.dispose();
    for (const c of connectorLines) { c.line.geometry.dispose(); c.mat.dispose(); }
    sporeGeo.dispose();
    sporeMat.dispose();
    for (const p of primordia) p.sprite.material.dispose();
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
