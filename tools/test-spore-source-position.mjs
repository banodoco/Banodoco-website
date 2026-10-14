import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeroMode} from '../journey/boot/hero-mode.js';
const url=new URL('../organism/hero-spores.js',import.meta.url);
const source=readFileSync(url,'utf8').replace(/from\s+'(\.[^']+)'/g,(_,p)=>`from '${new URL(p,url).href}'`);
let baseline;
for(const w of [1907,1280,1050,390]) for(const old of [true,false]){
 globalThis.innerWidth=w;globalThis.innerHeight=824;globalThis.document={getElementById(){return null}};
 const mode=createHeroMode(),m=mode.resolve(),v=mode.viewFor(m);
 const code=old?source.replaceAll('sourceOffset: [-0.105, -0.133], ',''):source;
 const {createField,advance}=await import('data:text/javascript;base64,'+Buffer.from(code+'\nexport {createField,advance};').toString('base64'));
 const f=createField({mode:m,camX:.15+v.panX,camY:v.camY,camZ:v.camZ,tgtX:v.panX,tgtY:v.targetY,tanHalfFov:Math.tan(v.fov*Math.PI/360),aspect:w/824},0x5be1);f.sceneReady=true;
 while(!f.landings[0].aimed)advance(f,1/240,.72);
 const p=f.landings[0].p0;const point=[(1+p[0]/(p[2]*f.tanHalfFov*f.aspect))*w/2,(1-p[1]/(p[2]*f.tanHalfFov))*824/2];
 if(old) baseline=point;
 else if(w===390) assert.deepEqual(point,baseline,'mobile source is unchanged');
 else { assert.ok(point[0]<=baseline[0]&&point[1]>=baseline[1],'desktop only moves down-left or keeps its valid original');
 if(w===1907) assert.ok(baseline[0]-point[0]>80&&point[1]-baseline[1]>10,'reference desktop visibly shifts down-left'); }
 console.log(w,old?'old':'new',...point);
}
