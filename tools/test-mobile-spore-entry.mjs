import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHeroMode, growthView } from '../journey/boot/hero-mode.js';

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
  const v=growthView(mode.viewFor(m),m,0);
  const view={mode:m,camX:.15+v.panX,camY:v.camY,camZ:v.camZ,tgtX:v.panX,
    tgtY:v.targetY,tanHalfFov:Math.tan(v.fov*Math.PI/360),aspect:w/h};
  for(const ready of [false,true]) {
    const f=createField(view,0x5be1); f.sceneReady=ready;
    let found=false;
    for(let i=0;i<240;i++) {
      advance(f,1/60,.72);
      const l=f.landings[0];
      if(!l.aimed) continue;
      const start=l.p0[0]/(l.p0[2]*f.tanHalfFov*f.aspect);
      const startY=l.p0[1]/(l.p0[2]*f.tanHalfFov);
      const end=l.p3[0]/(l.p3[2]*f.tanHalfFov*f.aspect);
      const endY=l.p3[1]/(l.p3[2]*f.tanHalfFov);
      assert.ok(f.t<2.5, 'selection does not delay the loading sequence');
      if(m==='mobile') {
        assert.ok(Math.abs(start)<.32, 'landing starts near the horizontal centre');
        assert.ok(startY<-.15 && startY>endY+.08, 'landing begins low in the view and falls to ground');
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
  }

}
