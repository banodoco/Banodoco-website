import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const url = new URL('../organism/hero-spores.js', import.meta.url);
const source = readFileSync(url, 'utf8').replace(/from\s+'(\.[^']+)'/g,
  (_, path) => `from '${new URL(path, url).href}'`);
const { descentAt, flutterAt, createField, advance } = await import('data:text/javascript;base64,' +
  Buffer.from(source + '\nexport { descentAt, flutterAt, createField, advance };').toString('base64'));
for (const duration of [2.3,2.68,3.68,4.5]) {
  const landing = { p0:[.2,1.2,11.6], p3:[0,-4.7,11.27], v0x:.08,
    dur:duration, swayA:.1, phase:1.7 };
  const at = u => { const p=[]; flutterAt(null,landing,u,p); return p; };
  assert.deepEqual(at(0),landing.p0);
  at(1).forEach((v,i)=>assert.ok(Math.abs(v-landing.p3[i])<1e-12));
  const velocity = u => (at(u+.00001)[1]-at(u-.00001)[1])/(.00002*duration);
  const speeds = [.35,.4,.55,.7,.8].map(u=>-velocity(u));
  assert.ok(Math.max(...speeds)/Math.min(...speeds)<1.15,'middle descent stays steady after the gentle acceleration');
  assert.ok(-velocity(.001) > .4 * -velocity(.4), 'starts moving without a stationary hold');
  assert.ok(-velocity(.001) < .55 * -velocity(.4), 'starts gently below cruise speed');
  assert.ok(-velocity(.15) > -velocity(.03), 'speed eases up during the opening');
  const end = (at(1)[1]-at(.999999)[1])/(.000001*duration);
  assert.ok(Math.abs(end)<.001,'spore still settles gently at the unchanged endpoint');
}
let previous=1.2;
for(let i=0;i<=1000;i++){
  const next=descentAt(1.2,-4.7,i/1000);
  assert.ok(next<=previous+1e-12,'vertical carrier never pauses or reverses before landing');
  previous=next;
}
for (const mode of ['desktop','mobile']) for (const ready of [false,true]) {
  const view={mode,camX:.15,camY:2,camZ:9,tgtX:0,tgtY:1,tanHalfFov:.5,aspect:mode==='mobile'?390/844:1.6};
  const field=createField(view,0x5be1), stream=createField(view,0x5be1);
  field.sceneReady=stream.sceneReady=ready; stream.landings=[];
  let landed=false, selected=false, early=0;
  for(let i=0;i<3000;i++) {
    advance(field,1/240,.72); advance(stream,1/240,.72);
    const landing=field.landings[0];
    if(landing.state===1) {
      const p=Array.from(field.frame.slice(landing.hi*3,landing.hi*3+3));
      if(!selected) {
        assert.deepEqual(p,Array.from(stream.frame.slice(landing.hi*3,landing.hi*3+3)), 'selection keeps the actual stream position');
        assert.equal(landing.t0,landing.kAt,'no motionless kindle phase');
        if (mode === 'desktop') assert.ok(field.t <= 1/240, 'desktop recruits on its first frame even before scene readiness');
        selected=true;
      }
      const age=field.t-landing.kAt;
      if(age>=.1&&age<=.5) {
        const progress=(landing.p0[1]-p[1])/(landing.p0[1]-landing.p3[1]);
        assert.ok(progress>=.4*age/landing.dur,'first100–500ms keep moving through the slower acceleration');
        early++;
      }
    }
    if(landing.state===2) {
      assert.ok(Math.abs(field.t-landing.t0-landing.dur)<1/240+1e-10,'landing retains its planned impact deadline');
      Array.from(field.frame.slice(landing.hi*3,landing.hi*3+3)).forEach((v,k)=>
        assert.ok(Math.abs(v-landing.p3[k])<1e-6,'landing keeps its exact site'));
      landed=true; break;
    }
  }
  assert.ok(selected&&early>50&&landed,'actual selected particle exercised from first motion to landing');
}
console.log('PASS spore descent: immediate visible travel, steady first/middle pace, continuous recruitment position, original landing budget and site.');
