// Spike A — one dense Connect preview frame (LA-5).
// A density/grade test, not the production chapter: the gill colonnade at
// target density (28 primary lamellae + lamellulae + cross-veins, per the
// donor architecture in journey/chapters/connect.js) rebuilt against the
// hero's REAL cap via capUnderPt/rimRad, hanging beneath the actual gill
// skirt so the chamber shares the cap's bend and sway.
// Light budget lesson carried over from the donor: from inside the chamber a
// view ray crosses many blades, so faces stay dark — free EDGES carry the
// light, plus sparse beads at junctions.
import * as THREE from 'three';
import {
  makeRng, gaussOf, heat, capUnderPt, rimRad,
  makeGlowTexture,
} from './anatomy.js';

const TAU = Math.PI * 2;
const FOG_NEAR = 7.0, FOG_FAR = 20.0;
const tmpC = new THREE.Color();

function lineMat(opacity) {
  return new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity,
    depthWrite: false,
    fog: false,
  });
}

export function createConnectFrame(sceneApi) {
  const rand = makeRng(31417);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();
  group.visible = false;
  sceneApi.groups.mushroom.add(group);

  const counts = { bladeSegs: 0, veinSegs: 0, beads: 0 };

  // blade depth below the gill skirt: shallow at the axis, deepest past
  // mid-span, lifting again toward the margin — a draped free-edge profile
  // deep enough that the blades read as a colonnade from a low camera
  function bladeDepth(u, scale) {
    const k = Math.max(0, Math.min(1, (u - 0.12) / 0.88));
    return (0.22 + 0.78 * Math.sin(Math.PI * Math.pow(k, 0.7))) * scale;
  }

  const N_PRIMARY = 28;
  const primaries = [];
  const lp = [], lc = [];        // bright free edges + verticals
  const fp = [], fc = [];        // dim face lattice
  const bp = [], bc = [], bs = []; // junction beads

  function seg(arr, colArr, a, b, h0, h1) {
    arr.push(a.x, a.y, a.z, b.x, b.y, b.z);
    heat(h0, tmpC); colArr.push(tmpC.r, tmpC.g, tmpC.b);
    heat(h1, tmpC); colArr.push(tmpC.r, tmpC.g, tmpC.b);
  }

  function buildBlade(az0, uStart, depthScale, bright) {
    const SEG = 26;
    const wig = gauss() * 0.015;
    const top = [], bot = [];
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG;
      const u = uStart + t * (1.0 - uStart);
      const a = az0 + wig * Math.sin(t * Math.PI * 1.3);
      const tp = capUnderPt(u, a);
      tp.y -= 0.005;
      const d = bladeDepth(u, depthScale) * (1 + gauss() * 0.05);
      const bpnt = tp.clone(); bpnt.y -= d;
      // the free edge billows slightly off the radial plane
      bpnt.x += Math.sin(u * 9 + az0 * 3) * 0.02;
      bpnt.z += Math.cos(u * 7 - az0 * 2) * 0.02;
      top.push({ p: tp, u }); bot.push({ p: bpnt, u });
    }
    // free edge — the hot line (cavity shading like the hero gills: warm
    // inner, dimmer mid, bright fringe near the rim)
    for (let s = 0; s < SEG; s++) {
      const t0 = s / SEG, t1 = (s + 1) / SEG;
      const b0 = bright * (0.55 - 0.35 * t0 + 0.65 * t0 * t0);
      const b1 = bright * (0.55 - 0.35 * t1 + 0.65 * t1 * t1);
      seg(lp, lc, bot[s].p, bot[s + 1].p, b0, b1);
      counts.bladeSegs++;
    }
    // attachment line along the skirt (dimmer — it merges into the hero gills)
    for (let s = 0; s < SEG; s += 2) {
      if (s + 2 > SEG) break;
      seg(fp, fc, top[s].p, top[s + 2].p, bright * 0.22, bright * 0.22);
      counts.bladeSegs++;
    }
    // vertical ribs tying edge to attachment — the colonnade read
    for (let s = 2; s <= SEG - 1; s += 2) {
      seg(fp, fc, top[s].p, bot[s].p, bright * 0.24, bright * 0.5);
      counts.bladeSegs++;
    }
    // sparse ember beads along the free edge
    for (let s = 0; s <= SEG; s++) {
      if (rand() < 0.16) {
        const P = bot[s].p;
        bp.push(P.x, P.y, P.z);
        heat(bright * (0.8 + rand() * 0.5), tmpC);
        bc.push(tmpC.r, tmpC.g, tmpC.b);
        bs.push(0.014 + Math.pow(rand(), 2) * 0.03);
        counts.beads++;
      }
    }
    return { az: az0, bot, top };
  }

  // 28 primaries all the way around (the chamber is entered looking across it)
  for (let i = 0; i < N_PRIMARY; i++) {
    const az = (i / N_PRIMARY) * TAU + gauss() * 0.01;
    const bright = 0.5 + rand() * 0.3 + (rand() < 0.12 ? 0.25 : 0);
    primaries.push(buildBlade(az, 0.10 + rand() * 0.05, 1.0, bright));
  }
  // lamellulae: one between each neighbouring pair, starting partway out
  for (let i = 0; i < N_PRIMARY; i++) {
    const az = ((i + 0.5) / N_PRIMARY) * TAU + gauss() * 0.012;
    buildBlade(az, 0.42 + rand() * 0.14, 0.72, 0.38 + rand() * 0.2);
  }
  // tertiary short blades near the margin
  for (let i = 0; i < N_PRIMARY; i++) {
    if (rand() < 0.6) {
      const az = ((i + (rand() < 0.5 ? 0.25 : 0.75)) / N_PRIMARY) * TAU;
      buildBlade(az, 0.68 + rand() * 0.1, 0.5, 0.3 + rand() * 0.15);
    }
  }

  // cross-veins: sagging arcs bridging neighbouring free edges — patchy, so
  // real dark gaps survive between veined sectors (never a uniform web)
  const vp = [], vc = [];
  const N_VEIN = 120;
  for (let v = 0; v < N_VEIN; v++) {
    const i = Math.floor(rand() * N_PRIMARY);
    // veined sectors clump: reject half the attempts in a moving window
    if (Math.sin(i * 1.7 + 0.8) < -0.2 && rand() < 0.6) continue;
    const A = primaries[i], B = primaries[(i + 1) % N_PRIMARY];
    const s0 = 4 + Math.floor(rand() * 20);
    const s1 = Math.max(2, Math.min(24, s0 + Math.floor(gauss() * 4)));
    const P0 = A.bot[s0].p, P1 = B.bot[s1].p;
    const bright = 0.28 + rand() * 0.22;
    const SEG = 6;
    const sag = 0.05 + rand() * 0.09;
    let prev = null;
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG;
      const p = new THREE.Vector3().lerpVectors(P0, P1, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      p.x += gauss() * 0.008; p.z += gauss() * 0.008;
      if (prev) {
        seg(vp, vc, prev, p, bright * (0.7 + 0.5 * Math.sin(t * Math.PI)),
                             bright * (0.7 + 0.5 * Math.sin(t * Math.PI)));
        counts.veinSegs++;
      }
      prev = p;
    }
    // junction beads where veins meet blades
    if (rand() < 0.5) {
      bp.push(P0.x, P0.y, P0.z);
      heat(0.72 + rand() * 0.2, tmpC);
      bc.push(tmpC.r, tmpC.g, tmpC.b);
      bs.push(0.02 + rand() * 0.03);
      counts.beads++;
    }
  }

  function geo(pos, col) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }
  group.add(new THREE.LineSegments(geo(lp, lc), lineMat(0.5)));   // free edges
  group.add(new THREE.LineSegments(geo(fp, fc), lineMat(0.3)));   // face lattice
  group.add(new THREE.LineSegments(geo(vp, vc), lineMat(0.4)));   // cross-veins

  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
  bGeo.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
  const glowTex = makeGlowTexture();
  const bMat = new THREE.PointsMaterial({
    map: glowTex,
    vertexColors: true,
    size: 0.032,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity: 0.6,
  });
  group.add(new THREE.Points(bGeo, bMat));

  // warm atmospheric scattering, cheaply: a handful of large soft amber
  // sprites deep in the chamber, so distance dissolves into ember haze
  // instead of clean black (handoff: depth language matters most under the cap)
  {
    for (let i = 0; i < 7; i++) {
      const a = 1.6 + i * 0.55 + gauss() * 0.2;   // across the far (front-left) half
      const r = 0.9 + rand() * 1.1;
      const mat = new THREE.SpriteMaterial({
        map: glowTex,
        color: heat(0.42 + rand() * 0.1, tmpC).clone(),
        transparent: true,
        opacity: 0.05 + rand() * 0.035,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const s = new THREE.Sprite(mat);
      const p = capUnderPt(Math.min(1, r / rimRad(a)), a);
      s.position.set(p.x, p.y - 0.35 - rand() * 0.3, p.z);
      s.scale.set(1.6 + rand() * 1.4, 1.1 + rand() * 0.8, 1);
      group.add(s);
    }
  }

  // The hero's point shaders carry a fake depth-of-field that balloons any
  // sprite far from the 9.5-unit focal band — at chamber range (~1-3 units)
  // the hero's motes and beads become frame-filling bokeh blobs. Production
  // re-parameterises these at the T2 threshold (adr-d3); the spike emulates
  // that by dimming the hero's point clouds while the frame is active and
  // restoring them exactly on exit. Scene state only — no hero file changes.
  const dimmed = [];
  function collectHeroPoints() {
    if (dimmed.length) return;
    const roots = [sceneApi.groups.mushroom, sceneApi.groups.ground, sceneApi.scene];
    const seen = new Set();
    for (const root of roots) {
      root.traverse((o) => {
        if (!o.isPoints || seen.has(o)) return;
        if (group.children.includes(o)) return;                  // not our own
        if (o === sceneApi.groups.spores) return;                // keep the shed alive
        const u = o.material && o.material.uniforms && o.material.uniforms.uOpacity;
        if (u) { dimmed.push({ u, base: u.value }); seen.add(o); }
      });
    }
  }

  return {
    group,
    counts,
    setVisible(on) {
      group.visible = !!on;
      collectHeroPoints();
      for (const d of dimmed) d.u.value = on ? d.base * 0.22 : d.base;
    },
  };
}
