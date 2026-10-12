import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHeroMode, growthView } from '../journey/boot/hero-mode.js';
import { rowLayout } from '../journey/layout/rail-geometry.js';

// Run the production integrator without adding a browser QA API.
const url = new URL('../organism/hero-spores.js', import.meta.url);
const source = readFileSync(url, 'utf8').replace(/from\s+'(\.[^']+)'/g,
  (_, specifier) => `from '${new URL(specifier, url).href}'`);
const { createField, advance } = await import('data:text/javascript;base64,' +
  Buffer.from(source + '\nexport { createField, advance };').toString('base64'));
globalThis.document={getElementById(){return null}};
for (const [w,h] of [[390,664],[390,844],[430,932],[1440,900]]) {
  globalThis.innerWidth=w; globalThis.innerHeight=h;
  const mode=createHeroMode(), m=mode.resolve();
  const settled=mode.viewFor(m);
  assert.deepEqual(growthView(settled,m,1),settled, 'growth ends at the unchanged hero pose');
  const v=growthView(mode.viewFor(m),m,0);
  if(m==='mobile') {
    const middle=growthView(settled,m,.5);
    assert.equal(v.fov,settled.fov,'phone opening keeps the established lens');
    assert.equal(middle.fov,settled.fov,'lens stays fixed throughout growth');
  } else assert.deepEqual(v,settled,'desktop opening composition stays unchanged');
  const view={mode:m,camX:.15+v.panX,camY:v.camY,camZ:v.camZ,tgtX:v.panX,
    tgtY:v.targetY,tanHalfFov:Math.tan(v.fov*Math.PI/360),aspect:w/h};
  for(const ready of [false,true]) {
    const f=createField(view,0x5be1); f.sceneReady=ready;
    const streamOnly=createField(view,0x5be1);
    streamOnly.sceneReady=ready; streamOnly.landings=[];
    let found=false, recruitmentChecked=false;
    for(let i=0;i<240;i++) {
      advance(f,1/60,.72);
      advance(streamOnly,1/60,.72);
      const l=f.landings[0];
      if(m==='mobile' && l.state===1 && !l.aimed) {
        const idx=l.hi*3;
        assert.deepEqual(f.frame.slice(idx,idx+3),streamOnly.frame.slice(idx,idx+3),
          'recruited spore rides exactly the real stream throughout kindling');
        if(!recruitmentChecked) {
          assert.ok(f.q[l.hi]>=f.comp.e[0] && f.q[l.hi]<=f.comp.e[1],
            'source has an ordinary entry streamline, not a separately positioned seed');
          assert.equal(f.size[l.hi],streamOnly.size[l.hi],
            'selection starts with the ordinary particle size, without a bright pop');
          const x=f.frame[idx]/(f.frame[idx+2]*f.tanHalfFov*f.aspect);
          const y=f.frame[idx+1]/(f.frame[idx+2]*f.tanHalfFov);
          let neighbours=0, lowestCentral=Infinity;
          for(let j=0;j<f.nA+f.nH;j++) {
            if(j===l.hi) continue;
            const k=j*3, half=f.frame[k+2]*f.tanHalfFov;
            const px=f.frame[k]/(half*f.aspect), py=f.frame[k+1]/half;
            if(Math.abs(px)<=.06 && py>=-.15 && py<=.4) lowestCentral=Math.min(lowestCentral,py);
            if(Math.hypot(f.frame[k]/(half*f.aspect)-x,f.frame[k+1]/half-y)<.25) neighbours++;
          }
          assert.ok(neighbours>=3, 'landing is recruited from the visible body of the current');
          assert.ok(Math.abs(x)<=.06 && y>=-.15 && y<=.4,
            'source belongs to the central current behind the hero heading');
          assert.ok(y<=lowestCentral+.07, 'recruitment picks the lower envelope of the central stream');
          recruitmentChecked=true;
        }
      }
      if(!l.aimed) continue;
      const start=l.p0[0]/(l.p0[2]*f.tanHalfFov*f.aspect);
      const startY=l.p0[1]/(l.p0[2]*f.tanHalfFov);
      const end=l.p3[0]/(l.p3[2]*f.tanHalfFov*f.aspect);
      const endY=l.p3[1]/(l.p3[2]*f.tanHalfFov);
      assert.ok(f.t<2.5, 'selection does not delay the loading sequence');
      if(m==='mobile') {
        const row=rowLayout(w,h);
        assert.ok(Math.abs((1-endY)*h/2-(Math.min(row.centreY,h*.865)-row.majorRingD/2-7.5))<.001,
          'actual spore landing projects 7.5px above the Equip circle');
        assert.ok(Math.abs(end*w/2)<.001, 'actual landing is horizontally centred over Equip');
        assert.ok(Math.abs(start)<=.23, 'landing leaves the central original stream behind the heading');
        assert.ok(startY>endY+.08, 'landing falls from the original current to ground');
        assert.ok(Math.abs(end)<.12 && endY<-.6, 'only the landing path reaches lower centre');
        assert.ok(l.dur>=1.85*1.45, 'mobile fall retains its slower duration in normal and ready paths');
        // Same seed without the mobile tempo multiplier must choose exactly
        // the same source; only the descent clock changes.
        const baseline=createField(view,0x5be1); baseline.sceneReady=ready;
        baseline.comp={...baseline.comp,landDuration:1};
        while(!baseline.landings[0].aimed) advance(baseline,1/60,.72);
        assert.deepEqual(l.p0,baseline.landings[0].p0);
        assert.ok(Math.abs(l.dur/baseline.landings[0].dur-1.45)<1e-9);
        const position=f.frame.slice(l.hi*3,l.hi*3+3);
        advance(f,1/60,.72);
        assert.ok(Math.hypot(...position.map((x,j)=>f.frame[l.hi*3+j]-x))<.08,
          'the selected spore continues its path without teleporting');
      } else {
        assert.ok(start<end-.1, 'desktop retains its upwind source');
        assert.equal(start, ready ? .24262626704819998 : .23252493856201553,
          'desktop still selects exactly its original spore/path');
      }
      console.log(`${w}x${h} ready=${ready}: start=${start.toFixed(3)},${startY.toFixed(3)} end=${end.toFixed(3)},${endY.toFixed(3)} fall=${l.dur.toFixed(2)}s`);
      found=true; break;
    }
    assert.ok(found, 'a landing is found promptly');
    if(m==='mobile') assert.ok(recruitmentChecked, 'recruitment continuity was observed');
  }

}

// Golden ordinary-current frame from cde1743's parent, before the unwanted
// screen-slope change. These particles span near/far and left/right lanes;
// no landing is active, so this guards the actual wind integration too.
globalThis.innerWidth=390; globalThis.innerHeight=664;
const mode=createHeroMode(), m=mode.resolve();
// Freeze the reference camera too: changing the intro lens should not rewrite
// a golden intended to guard the ordinary current's integration.
const v={...mode.viewFor(m),panX:0,targetY:5.1084549711905325};
const originalStream=createField({mode:m,camX:.15+v.panX,camY:v.camY,camZ:v.camZ,
  tgtX:v.panX,tgtY:v.targetY,tanHalfFov:Math.tan(v.fov*Math.PI/360),aspect:390/664},0x5be1);
originalStream.landings=[];
for(let i=0;i<120;i++) advance(originalStream,1/60,.72);
assert.deepEqual([0,17,118,301,619].map(i=>Array.from(originalStream.frame.slice(i*3,i*3+3))),
  [[-0.7242848873138428,2.4423511028289795,7.77317476272583],
   [-6.784584999084473,7.653721809387207,14.272785186767578],
   [0.14577136933803558,1.7302907705307007,10.94500732421875],
   [2.920044183731079,-0.5111774206161499,9.87977123260498],
   [-0.40327972173690796,2.473459005355835,9.219886779785156]],
  'ordinary mobile stream retains its exact pre-cde1743 positions after two seconds');
