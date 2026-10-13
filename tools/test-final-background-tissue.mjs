import assert from 'node:assert/strict';
import { installVendorResolver } from './render-report-lib.mjs';
installVendorResolver();
const { buildMushroom, DETAIL } = await import('../journey/chapters/final/species.js');

// Desktop far caps must contain closed interior tissue bands, not just the
// rim: the builder deliberately leaves its first three apex rings loose.
assert.ok(DETAIL[4].capRings >= 6);
const multipliers = Object.fromEntries(['bead','cap','core','fib','gill','ovl','rim','rimPt','stem','stemPt'].map(key => [key, key]));
for (const scale of [.3,.5,.8]) {
  for (const seed of [1,17,401]) {
    const segments = [], points = [];
    buildMushroom({ tier:4, seed, scale, azFacing:.7, mat:.8, shed:0,
      mul:multipliers, shade:{heatK:()=>1,occlS:()=>1,occlM:()=>1,underVis:1,crowdK:1,innerK:1,camAz:0},
      emit:{seg:(...args)=>segments.push(args),pt:(...args)=>points.push(args)} });
    assert.ok(segments.length < 700, 'far body remains a bounded medium-detail mesh');
    assert.ok(segments.every(s=>s.slice(0,9).every(Number.isFinite)));
    const cap = segments.filter(s=>s[9]==='cap');
    const degrees = new Map();
    for(const s of cap)for(const i of [0,3]){
      const key=s.slice(i,i+3).join(',');degrees.set(key,(degrees.get(key)||0)+1);
    }
    assert.ok([...degrees.values()].filter(n=>n>=3).length>60,
      'interior cap vertices join multiple tissue edges instead of isolated spokes');
    assert.ok(segments.some(s=>s[9]==='gill'), 'far silhouette includes an underside fan');
    console.log({scale,seed,segments:segments.length,points:points.length,capSegments:cap.length});
  }
}
console.log('PASS desktop background tissue: connected cap network, finite shared anatomy, bounded segment cost.');
