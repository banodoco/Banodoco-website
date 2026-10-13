import assert from 'node:assert/strict';
import { installVendorResolver } from './render-report-lib.mjs';
installVendorResolver();
const THREE = await import('../vendor/three/three.module.js');
const { poseAt } = await import('../journey/director.js');
const { restProgress } = await import('../journey/route.js');
const { manifestoPose } = await import('../journey/manifesto/pose.js');
const { createEntryFlight, sampleEntryFlight } = await import('../journey/manifesto/entry-flight.js');
const { returnVelocity, createReturnFlight, sampleReturnFlight } = await import('../journey/manifesto/return-flight.js');
for (const [aspect,width] of [[390/844,390],[1.6,1280]]) {
  const rest = id => { const p=poseAt(restProgress(id), {pos:new THREE.Vector3(),target:new THREE.Vector3()},undefined,aspect,width);
    return {position:{...p.pos},target:{...p.target},fov:p.fov,roll:p.roll||0}; };
  const anchor=rest('final'), camera=new THREE.PerspectiveCamera();
  for(const id of ['mission','inspire','equip','connect','owned']) {
    const flight=createEntryFlight(rest(id),anchor,aspect), T=flight.seconds, dt=1/1000;
    assert.deepEqual(sampleEntryFlight(flight,0).position,rest(id).position);
    const end=sampleEntryFlight(flight,T), actual=manifestoPose(anchor,T,aspect);
    assert.deepEqual(end.position,actual.position);assert.deepEqual(end.target,actual.target);
    const left=returnVelocity(sampleEntryFlight(flight,T-dt),end,dt);
    const right=returnVelocity(actual,manifestoPose(anchor,T+dt,aspect),dt);
    for(const key of Object.keys(left)) assert.ok(Math.abs(left[key]-right[key]) < .04, `${width} ${id} ${key} joins moving ascent`);
    let previous;
    for(let t=0;t<T;t+=1/240) {
      const p=sampleEntryFlight(flight,t);camera.position.set(p.position.x,p.position.y,p.position.z);camera.up.set(p.up.x,p.up.y,p.up.z);camera.lookAt(new THREE.Vector3(p.target.x,p.target.y,p.target.z));
      if(previous)assert.ok(camera.quaternion.angleTo(previous)*240<1.5,`${width} ${id} entry pole-safe at ${t}: ${camera.quaternion.angleTo(previous)*240}`);
      previous=camera.quaternion.clone();
    }
    for(const t of [.1,2,5,8]) {
      const p=sampleEntryFlight(flight,t), v=returnVelocity(sampleEntryFlight(flight,t-dt),p,dt);
      const exit=createReturnFlight(p,anchor,4,v);
      assert.deepEqual(sampleReturnFlight(exit,0).position,p.position);
    }
  }
  const top=manifestoPose(anchor,30,aspect), land=rest('owned');
  const flight=createReturnFlight(top,land,7.48,{}, {rootApproach:true});
  assert.deepEqual(sampleReturnFlight(flight,1).position,land.position);
  let previous;
  for(let i=0;i<=1000;i++) {
    const p=sampleReturnFlight(flight,i/1000);camera.position.set(p.position.x,p.position.y,p.position.z);camera.up.set(p.up.x,p.up.y,p.up.z);camera.lookAt(new THREE.Vector3(p.target.x,p.target.y,p.target.z));
    if(previous)assert.ok(camera.quaternion.angleTo(previous)/(7.48/1000)<2.2,`${width} root approach no close-range flip`);
    previous=camera.quaternion.clone();
  }
}
console.log('PASS all non-Purpose entries: moving join, continuous orientation, interrupt; root approach exact landing and continuous orientation');
