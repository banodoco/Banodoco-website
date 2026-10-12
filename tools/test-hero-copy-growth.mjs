import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const handoff = readFileSync(new URL('../journey/boot/handoff.js', import.meta.url), 'utf8');
const intro = readFileSync(new URL('../organism/intro.js', import.meta.url), 'utf8');
const capStart = Number(intro.match(/gills:\s*\[([\d.]+)/)[1]);
assert.match(intro, /get capStartProgress\(\) \{ return GROWTH\.gills\[0\]; \}/);
const block = handoff.slice(handoff.indexOf('    const followGrowth = () => {'), handoff.indexOf('    followGrowth();'));
let drawn, queued=0;
const scene={intro:{growthProgress:0,capStartProgress:capStart}};
const follow = new Function('scene','heroCopy','skipIntro','frozen','requestAnimationFrame',
  `${block} return followGrowth;`)(scene,{style:{setProperty(k,v){drawn=Number(v)}}},false,false,()=>queued++);
const liftEnd=(1+capStart)/2;
for(const [p,expected] of [[0,0],[liftEnd/2,.5],[liftEnd,1],[.8,1],[1,1]]){
  scene.intro.growthProgress=p;queued=0;follow();
  assert.ok(Math.abs(drawn-expected)<1e-9, `growth ${p}: copy progress ${drawn}`);
  assert.equal(queued,p<liftEnd?1:0);
}
console.log(`Hero text settles between cap onset and completion (${liftEnd}), preserves endpoints and uses specimen clock`);
