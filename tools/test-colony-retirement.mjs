import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COLONY_RETIREMENT_GLSL } from '../journey/manifesto/retirement.js';

// Execute the actual shader expression across the field, including shallow
// returns. A shared scalar fade fails the distributed-completion assertion.
const body = COLONY_RETIREMENT_GLSL.match(/float colonyPresence\(float amount, vec2 foot\) \{([\s\S]*?)\n {2}\}/)[1]
  .replace(/\bfloat\b/g, 'let').replace(/\bsin\(/g, 'Math.sin(').replace(/\bmax\(/g, 'Math.max(');
const smoothstep = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t); };
const presence = new Function('amount','foot','uColonyRetiring','uColonyRetirementStart','smoothstep','mix',body);
const at = (amount,x,z,mode=1,start=1) => presence(amount,{x,y:z},mode,start,smoothstep,(a,b,t)=>a+(b-a)*t);
for (const start of [1,.4,.02]) {
  const finish = new Set();
  for (let x=-100;x<=100;x+=5) for (let z=-100;z<=100;z+=5) {
    assert.equal(at(start,x,z,1,start),start,'departure is continuous at any opening height');
    assert.equal(at(0,x,z,1,start),0,'every owner finishes before the global deadline');
    let previous=start, ended=false;
    for(let i=100;i>=0;i--) {
      const amount=start*i/100, value=at(amount,x,z,1,start);
      assert.equal(at(amount,x,z,0,start),amount,'ascent is unchanged');
      assert.ok(value<=previous+1e-12 && value>=0,'retirement is finite and monotone');
      if(!ended && value===0) {finish.add(i);ended=true;}
      previous=value;
    }
  }
  assert.ok(finish.size>40,'owners finish throughout the interval, not in one batch');
}
const source=readFileSync(new URL('../journey/manifesto/colony.js',import.meta.url),'utf8');
assert.ok(source.includes('colonyPresence(uColonyGate, aColonyPose.xz) * colonyArrival()'));
assert.ok(source.includes('colonyPresence(uColonyGate, position.xz) * fogF'));
assert.ok(source.includes('min(colonyPresence(uColonyGate, aColonyOwners.xy), colonyPresence(uColonyGate, aColonyOwners.zw))'));
console.log('Colony retirement: distributed spatial completion, monotonic shallow/full departure, unchanged ascent and owner-coherent body/spore/ground gates pass.');
