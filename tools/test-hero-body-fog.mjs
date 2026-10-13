import assert from 'node:assert/strict';
import { createHeroBodyFogClaim } from '../journey/chapters/hero-body-fog.js';
const u={fogNear:{value:7},fogFar:{value:20}};
const root={traverse:fn=>fn({material:{uniforms:u}})};
const api={groups:{stem:root,mushroom:root}};
const connect=createHeroBodyFogClaim(api),purpose=createHeroBodyFogClaim(api),manifesto=createHeroBodyFogClaim(api);
const pair=()=>[u.fogNear.value,u.fogFar.value];
connect.set(0,14,40);assert.deepEqual(pair(),[7,20]);
connect.set(1,14,40);assert.deepEqual(pair(),[14,40]);
purpose.set(.5,30,80);assert.deepEqual(pair(),[18.5,50]);
manifesto.set(1,104.5,190);assert.deepEqual(pair(),[104.5,190]);
// A later Purpose frame cannot undo the branch's expanded range.
purpose.set(1,30,80);assert.deepEqual(pair(),[104.5,190]);
manifesto.clear();assert.deepEqual(pair(),[30,80]);
purpose.clear();assert.deepEqual(pair(),[14,40]);
connect.clear();assert.deepEqual(pair(),[7,20]);
// An inactive chapter does not overwrite a desktop branch's direct fog.
u.fogFar.value=100;connect.clear();assert.equal(u.fogFar.value,100);
assert.equal(manifesto.owns(u.fogNear),true);
console.log('Hero body fog claims: overlapping arrivals, ascent, release and inactive desktop preservation pass.');
