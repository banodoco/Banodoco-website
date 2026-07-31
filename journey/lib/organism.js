// Shared procedural mushroom builder for instanced/repeated fruiting bodies
// (used by the final fairy ring; small luminous line-work agarics).
// buildMushroom(THREE, helpers, { seed, height, capRadius, tilt, detail })
//   → { group, capTopY, capBaseY, mats }
// capBaseY is the cap rim (under-cap release height); mats are the time-driven
// pulse materials — callers MUST tick mats[i].uniforms.uTime or the fruiting
// bodies sit motionless.
// Child ordering matters for the callers' cheap LOD pass: the first two
// drawable children are the essential silhouette (body strands, gills);
// later children may be hidden on low detail.
import * as THREE from 'three';

const TAU = Math.PI * 2;

export function buildMushroom(T, helpers, opts = {}) {
  const {
    seed = 1,
    height = 2.4,
    capRadius = 1.2,
    tilt = 0,
    detail = 1,
  } = opts;
  const { rng, strandLines, makePulseMat, glowSprite } = helpers;
  const rand = rng(seed);

  const group = new T.Group();
  group.rotation.x = tilt * 0.6;
  group.rotation.z = tilt;

  const capBaseY = height;                 // where the cap rim sits
  const capTopY = height + capRadius * 0.62;
  const stipeR = Math.max(0.08, capRadius * 0.14);

  // lean direction so the little organism is never perfectly vertical
  const leanAz = rand() * TAU;
  const lean = 0.06 + rand() * 0.16;
  const lx = Math.cos(leanAz) * lean, lz = Math.sin(leanAz) * lean;

  // ---- body: stipe strands + cap ribs in one LineSegments (child 1) ----
  const stipeCount = Math.max(3, Math.round(5 * detail));
  const ribCount = Math.max(6, Math.round(9 * detail));
  const body = strandLines({
    count: stipeCount + ribCount,
    seed: seed * 7 + 1,
    generator: (i, r) => {
      if (i < stipeCount) {
        // stipe: gently curved verticals hugging a slightly leaning axis
        const az = (i / stipeCount) * TAU + r() * 0.6;
        const rr = stipeR * (0.55 + r() * 0.5);
        const pts = [];
        for (let j = 0; j <= 3; j++) {
          const t = j / 3;
          const wob = (r() - 0.5) * 0.05;
          pts.push(new T.Vector3(
            Math.cos(az) * rr * (1 - t * 0.25) + lx * height * t * t + wob,
            t * capBaseY,
            Math.sin(az) * rr * (1 - t * 0.25) + lz * height * t * t + wob,
          ));
        }
        return pts;
      }
      // cap ribs: from rim up over the dome toward the (offset) apex
      const k = i - stipeCount;
      const az = (k / ribCount) * TAU + (r() - 0.5) * 0.35;
      const rimR = capRadius * (0.92 + r() * 0.16);
      const apexX = lx * height + (r() - 0.5) * capRadius * 0.14;
      const apexZ = lz * height + (r() - 0.5) * capRadius * 0.14;
      const rimY = capBaseY + (r() - 0.5) * capRadius * 0.1;
      const pts = [];
      for (let j = 0; j <= 3; j++) {
        const t = j / 3;
        const rr = rimR * Math.cos(t * Math.PI * 0.5);
        const y = rimY + Math.sin(t * Math.PI * 0.5) * (capTopY - capBaseY) * (0.92 + r() * 0.16);
        pts.push(new T.Vector3(
          Math.cos(az) * rr + apexX * t,
          y,
          Math.sin(az) * rr + apexZ * t,
        ));
      }
      return pts;
    },
  });
  const bodyMat = makePulseMat(0xd9a441, {
    baseOpacity: 0.5, pulseColor: 0xf0c877, twinkle: 0.25, pulseWidth: 0.2,
  });
  const bodyLines = new T.LineSegments(body.geometry, bodyMat);
  bodyLines.frustumCulled = false;
  group.add(bodyLines);

  // ---- gills: short radial lines under the rim (child 2) ----
  const gillCount = Math.max(8, Math.round(14 * detail));
  const gills = strandLines({
    count: gillCount,
    seed: seed * 11 + 3,
    generator: (i, r) => {
      const az = (i / gillCount) * TAU + (r() - 0.5) * 0.2;
      const outer = capRadius * (0.9 + r() * 0.12);
      const inner = capRadius * (0.25 + r() * 0.15);
      const y = capBaseY - capRadius * 0.06 - r() * capRadius * 0.05;
      return [
        new T.Vector3(Math.cos(az) * inner + lx * height, y + 0.02, Math.sin(az) * inner + lz * height),
        new T.Vector3(Math.cos(az) * outer, y - 0.02, Math.sin(az) * outer),
      ];
    },
  });
  const gillMat = makePulseMat(0x8a6420, {
    baseOpacity: 0.34, pulseColor: 0xffb36b, twinkle: 0.35, pulseWidth: 0.25,
  });
  const gillLines = new T.LineSegments(gills.geometry, gillMat);
  gillLines.frustumCulled = false;
  group.add(gillLines);

  // ---- under-cap glow (child 3, hidden on low LOD) ----
  const glowMat = new T.SpriteMaterial({
    map: glowSprite(0xffb36b, 64), color: 0xffb36b, transparent: true,
    opacity: 0.28, blending: T.AdditiveBlending, depthWrite: false,
  });
  const glow = new T.Sprite(glowMat);
  glow.scale.setScalar(capRadius * 1.6);
  glow.position.set(lx * height * 0.8, capBaseY - capRadius * 0.15, lz * height * 0.8);
  group.add(glow);

  // ---- rim ring: a wavering circle at the cap margin (child 4) ----
  const rim = strandLines({
    count: 1,
    seed: seed * 13 + 5,
    generator: (i, r) => {
      const pts = [];
      const n = Math.max(10, Math.round(16 * detail));
      for (let j = 0; j <= n; j++) {
        const az = (j / n) * TAU;
        const rr = capRadius * (0.94 + Math.sin(az * 3 + seed) * 0.03 + (r() - 0.5) * 0.02);
        pts.push(new T.Vector3(
          Math.cos(az) * rr,
          capBaseY + (r() - 0.5) * capRadius * 0.06,
          Math.sin(az) * rr,
        ));
      }
      return pts;
    },
  });
  const rimMat = makePulseMat(0xf0c877, {
    baseOpacity: 0.4, pulseColor: 0xf0c877, twinkle: 0.2, pulseWidth: 0.2,
  });
  const rimLines = new T.LineSegments(rim.geometry, rimMat);
  rimLines.frustumCulled = false;
  group.add(rimLines);

  return { group, capTopY, capBaseY, mats: [bodyMat, gillMat, rimMat] };
}
