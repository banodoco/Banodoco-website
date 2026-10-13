import assert from 'node:assert/strict';
import{installVendorResolver}from'./render-report-lib.mjs';installVendorResolver();
const T=await import('../vendor/three/three.module.js');const{capTopPt,capUnderPt,rimRad}=await import('../journey/anatomy.js');const{createCapFlow}=await import('../organism/spore-cap-flow.js');
const f=createCapFlow(capUnderPt,rimRad),sway=new T.Group(),bend=new T.Group(),cap=new T.Group();sway.add(bend);bend.add(cap);cap.rotation.set(-.05,0,-.03);const off=new T.Vector3(0,0,.16);const throat=new T.Vector3(-.075,capUnderPt(0,0).y,0).applyEuler(cap.rotation).add(off);bend.position.copy(throat);cap.position.copy(off).sub(throat);
const breeze=t=>(.55+.45*Math.sin(t*.13+.6))*(.62*Math.sin(t*1.2)+.26*Math.sin(t*1.83+1.3)+.07*Math.sin(t*2.6+2.7));
function matrix(t){const b=breeze(t);sway.rotation.set(b*.007,0,-b*.034);bend.rotation.z=-breeze(t-.3)*.013;sway.updateMatrixWorld(true)};
function top(x,z){let u=0,a=0;for(let j=0;j<6;j++){const q=x+.15*(1-Math.min(u*u,1));a=Math.atan2(z,q);if(a<0)a+=2*Math.PI;u=Math.hypot(q,z)/rimRad(a);}return capTopPt(u,a).y;}
const inv=new T.Matrix4();let min=10,worst,penetrating=0;
for(let a=0;a<6.28;a+=.2)for(const u of[.3,.6,.85,.97]){matrix(0);let p=capUnderPt(u,a);p.y-=.22;p.applyMatrix4(cap.matrixWorld);const priorInv=cap.matrixWorld.clone().invert();for(let i=1;i<3600;i++){let t=i/60;matrix(t);inv.copy(cap.matrixWorld).invert();const prev=p.clone().applyMatrix4(priorInv);const next=p.clone().addScaledVector(new T.Vector3(.04,.025,.007),1/60).applyMatrix4(inv);f.advance(prev,next,1/60);const h=f.surface(next.x,next.z);if(h!==null&&next.y<top(next.x,next.z)){let clear=h-next.y;if(clear<min){min=clear;worst={a,u,t,clear,point:next.toArray(),topGap:top(next.x,next.z)-next.y}}if(clear<0)penetrating++;}p.copy(next).applyMatrix4(cap.matrixWorld);p.fromArray(new Float32Array(p.toArray()));priorInv.copy(inv)}}
assert.equal(penetrating, 0, JSON.stringify(worst));
console.log('PASS 460672 moving-cap trajectory steps, minimum clearance', min);

let changed=0,worstExterior=0,record;for(let a=0;a<6.28;a+=.1)for(const u of[.3,.6,.85,.97,.99,.999]){let p=capTopPt(u,a);p.y+=.02;let seed=p.clone();f.seed(seed);assert.ok(seed.distanceTo(p)<1e-8,'above-cap seed preserved');let q=p.clone().addScaledVector(new T.Vector3(.04,.025,.007),1/60),expect=q.clone();f.advance(p,q,1/60);let d=q.distanceTo(expect);if(d>1e-8){changed++;if(d>worstExterior){worstExterior=d;record={u,a,p:p.toArray()}}}}assert.equal(changed,0,JSON.stringify(record)); console.log('PASS 378 above-cap seed and trajectory samples unchanged');
