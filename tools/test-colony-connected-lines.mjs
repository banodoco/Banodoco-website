import assert from 'node:assert/strict';
import { installVendorResolver } from './render-report-lib.mjs';
installVendorResolver();
const THREE = await import('three');
const { connectedLineIndex } = await import('../journey/manifesto/connected-lines.js');
const p=[];
const point=(x,z)=>[x/20,Math.sqrt(Math.max(0,2-(x*x+z*z)/400)),z/20];
for(let x=-16;x<16;x++)for(let z=-16;z<16;z++){
  p.push(...point(x,z),...point(x+1,z),...point(x,z),...point(x,z+1));
}
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
const original=geometry.attributes.position.array.slice();
const {index,gain}=connectedLineIndex(geometry,8);
assert.ok(index.count/2<=Math.ceil(p.length/6/8),'same or lower segment budget');
assert.deepEqual(geometry.attributes.position.array,original,'shared hero vertices remain immutable');
assert.deepEqual(connectedLineIndex(geometry,8).index.array,index.array,'deterministic prepared topology');
assert.ok(Number.isFinite(gain)&&gain>=1&&gain<=8,'light compensation follows retained edge length');
const degree=new Map();
for(const i of index.array){assert.ok(i>=0&&i<p.length/3);degree.set(i,(degree.get(i)||0)+1);}
assert.ok([...degree.values()].filter(d=>d>=2).length/degree.size>.9,'cap network retains connected junctions instead of isolated edges');
console.log(`PASS connected cap topology: ${index.count/2} segments within ${p.length/6/8} budget, immutable source, connected junctions, bounded gain ${gain.toFixed(3)}.`);
