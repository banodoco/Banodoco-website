// tools/scrollgates.js — QA-ONLY behavioural gates for the scroll controller
// (journey/scroll.js). NOT shipped: nothing imports it. Load it by hand next
// to scrollprobe.js and call `await __gates()`; results land in `__g`.
//
// These are the invariants the controller must hold that a speed trace cannot
// see: that scrubbing adds no distance of its own (E2/E3 must read 1.0000),
// that an out-and-back returns to where it started (E1 under ?nosnap=1 must be
// exactly 0; R1 with the resolution live must settle on the same rest), that a
// notch-by-notch reader is not fought (R3), that the landing never overshoots
// (R4), that the p = 1 end-hold holds (R5), and that a full ride 0 -> 1 -> 0
// visits every anchor and stops nowhere else (R6).
window.__g=null;window.__gErr=null;
window.__gates=async function(){const out=[];try{
const J=window.journey,S=J.scroll;
// The route's own anchor list, so R5/R6 cannot go stale against an allocation
// or a moved rest (this file is a plain script, hence the dynamic import).
const {REST_STOPS}=await import('/journey/route.js');
const nf=()=>new Promise(r=>requestAnimationFrame(r));
const wheel=d=>window.dispatchEvent(new WheelEvent('wheel',{deltaY:d,deltaMode:0,cancelable:true,bubbles:true}));
const settle=async(ms)=>{const t=performance.now();while(performance.now()-t<ms)await nf();};
const rest=async(p)=>{J.scrollTo(p); for(let i=0;i<300;i++){await nf(); if(!S.resolving&&Math.abs(S.rate)<1e-6)break;}};
const nosnap=S.nosnap;

// E1 the SCRUB itself, with no resolution in play (?nosnap=1 isolates it)
await rest(0.35); await settle(400); const e0=S.surface;
for(let i=0;i<15;i++){wheel(60); await nf();}
for(let i=0;i<15;i++){wheel(-60); await nf();}
await nf();
out.push(`E1 out-and-back surface delta ${(S.surface-e0).toExponential(2)}${nosnap?'  [nosnap: pure scrub]':'  [resolution live]'}`);

// E2 does the model ADD distance to a drag it is not resolving against?
await rest(0.30); const b0=S.surface;
for(let i=0;i<40;i++){wheel(30); await nf();}
out.push(`E2 40x30px slow drag ratio ${((S.surface-b0)/(S.pAt(S.scrollFor(b0)+1200)-b0)).toFixed(4)}`);
await rest(0.30); const c0=S.surface;
for(let i=0;i<25;i++){wheel(90); await nf();}
out.push(`E3 25x90px brisk drag ratio ${((S.surface-c0)/(S.pAt(S.scrollFor(c0)+2250)-c0)).toFixed(4)}`);

if(nosnap){
  // N1 nosnap must park anywhere outside the band, never resolve
  await rest(0.36); await settle(900);
  out.push(`N1 nosnap parks at ${J.p.toFixed(4)} (must stay ~0.36, commitP=${S.commitP})`);
  window.__g=out; return;
}

// R1 out-and-back returns to the SAME p (the visitor-visible property)
await rest(0.26); const r0=J.p;
for(let i=0;i<12;i++){wheel(45); await nf();}
for(let i=0;i<12;i++){wheel(-45); await nf();}
for(let i=0;i<300;i++){await nf(); if(!S.resolving&&Math.abs(S.rate)<1e-6)break;}
out.push(`R1 out-and-back settles at ${J.p.toFixed(6)} (started ${r0.toFixed(6)})`);

// R2 control back within one frame
await rest(0.26);
for(let i=0;i<14;i++){wheel(70); await nf();}
await settle(260); const rr=S.rate,res1=S.resolving;
wheel(-70); await nf();
out.push(`R2 reverse mid-transition: resolving=${res1} rate=${rr.toFixed(3)} -> next frame rate=${S.rate.toFixed(4)} dir=${S.lastDir}`);

// R3 notches
await rest(0.30); wheel(120); await settle(1500);
out.push(`R3a one notch -> ${J.p.toFixed(4)} streaming=${S.streaming}`);
await rest(0.30); const m=[];
for(let i=0;i<6;i++){wheel(120); await settle(230); m.push(+J.p.toFixed(4));}
await settle(1400); out.push(`R3b 6 notches @230ms: ${m.join(' ')} -> ${J.p.toFixed(4)}`);

// R4 no overshoot
await rest(0.26);
for(let i=0;i<16;i++){wheel(200); await nf();}
let tgt=null,ov=0;
for(let i=0;i<260;i++){await nf(); if(S.resolveTarget!==null)tgt=S.resolveTarget; if(tgt!==null&&J.p>tgt)ov=Math.max(ov,J.p-tgt);}
out.push(`R4 hard flick target ${tgt} settled ${J.p.toFixed(6)} overshoot ${ov.toExponential(2)}`);

// R5 end-hold. Departs from the FINAL REST, not from a p literal ahead of it:
// this gate's property is "a fling into the end-hold settles where it landed
// and is never tugged back to the Final rest", and starting short of the rest
// made it a test of whether one fling happens to span the arrival as well.
// It stopped being the latter on 2026-08-11, when the arrival's road doubled
// (route.js segVh) and the same 4320 px fling from 0.925 no longer reached
// 0.97 — the gate still "passed" while no longer touching the end-hold at all.
// Anchored to the route, it cannot drift with an allocation again.
await rest(REST_STOPS[REST_STOPS.length-1]);
for(let i=0;i<18;i++){wheel(240); await nf();} await settle(3200);
out.push(`R5 fling to end ${J.p.toFixed(6)}`);

// R6 every anchor reachable, 0 -> 1 -> 0, and nothing parks between rests.
// The anchor list is READ FROM THE ROUTE (it used to be the literal
// [0,0.26,0.49,0.725,0.925,1], which went stale when the Connect rest moved to
// 0.5230 and the Final rest to 0.97 — so this gate had been reporting the two
// CURRENT rests as "off-anchor stops" ever since).
const RESTS=[...REST_STOPS,1];
await rest(0); const seen=[];
for(let leg=0;leg<12;leg++){
  for(let i=0;i<10;i++){wheel(110); await nf();}
  for(let i=0;i<300;i++){await nf(); if(!S.resolving&&Math.abs(S.rate)<1e-6)break;}
  seen.push(+J.p.toFixed(4)); if(J.p>=1)break;
}
const back=[];
for(let leg=0;leg<12;leg++){
  for(let i=0;i<10;i++){wheel(-110); await nf();}
  for(let i=0;i<300;i++){await nf(); if(!S.resolving&&Math.abs(S.rate)<1e-6)break;}
  back.push(+J.p.toFixed(4)); if(J.p<=0)break;
}
const bad=[...seen,...back].filter(x=>!RESTS.some(r=>Math.abs(r-x)<1e-3));
out.push(`R6 ride up ${seen.join(' ')} | down ${back.join(' ')} | off-anchor stops: ${bad.length?bad.join(','):'none'}`);
}catch(e){window.__gErr=String(e.stack||e);}
window.__g=out;};
