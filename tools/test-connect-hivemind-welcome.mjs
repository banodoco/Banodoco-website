import assert from 'node:assert/strict';
import fs from 'node:fs';
const material=fs.readFileSync(new URL('../journey/chapters/connect/tendrils-materials.js',import.meta.url),'utf8');
const builder=fs.readFileSync(new URL('../journey/chapters/connect/tendrils.js',import.meta.url),'utf8');
const radii=builder.match(/uHivemindWelcome = \{ value: new THREE.Vector4\(hivemind.pos.x, hivemind.pos.z, ([\d.]+), ([\d.]+)\)/);
assert.ok(radii,'welcome follows the actual built/baked Hivemind marker');
const inner=Number(radii[1]),outer=Number(radii[2]);
const block=material.match(/if \(litRoute > 0.5 && litRoute < 1.5\) \{\s*tip \*= ([\s\S]*?);\s*\}/);
assert.ok(block,'only Hivemind arrival light receives the spatial envelope');
const expression=block[1].replace('uHivemindWelcome.z','inner').replace('uHivemindWelcome.w','outer')
  .replace(/distance\(placed.xz, uHivemindWelcome.xy\)/,'distance');
const smoothstep=(a,b,x)=>{const k=Math.max(0,Math.min(1,(x-a)/(b-a)));return k*k*(3-2*k);};
const envelope=new Function('distance','inner','outer','smoothstep',`return ${expression};`);
const at=d=>envelope(d,inner,outer,smoothstep);
assert.equal(at(0),1,'marker keeps its welcome brightness');
assert.equal(at(inner),1,'local strands keep full flash');
assert.equal(at(outer),0,'far strands cannot receive the flash');
assert.equal(at(17.2),0,'background network outer reach is excluded');
let previous=1;
for(let d=0;d<=20;d+=.01){const value=at(d);assert.ok(value<=previous+1e-12&&value>=0,'smooth monotone spatial decay');previous=value;}
assert.ok(at(inner+.0001)>.999999,'inner seam is smooth');
assert.ok(at(outer-.0001)<.000001,'outer seam is smooth');
assert.match(material,/float litMask = 1.0 - smoothstep\(head - uSoft, head \+ 0.004, along\);/,'ordinary network reveal remains authored');
assert.match(material,/float tip = exp\(-dTip \* dTip\) \* headAmp;/,'arrival timing and strength remain authored before spatial focus');
console.log(`PASS Hivemind welcome: full within ${inner}u, smooth fade to ${outer}u, no distant flash; ordinary reveal and other routes retained.`);
