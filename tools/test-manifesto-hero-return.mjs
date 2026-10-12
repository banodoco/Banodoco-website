import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createCopyArrival } from '../journey/ui/copy-arrival.js';

globalThis.Element ??= class {};
const fakeNode = () => ({style:{setProperty(){},removeProperty(){}},
  classList:{add(){},remove(){}},querySelector(){return null},querySelectorAll(){return []}});
function flightCopy(special) {
  const hero=fakeNode();
  const copy=createCopyArrival({blocks:Object.fromEntries(['inspire','connect','owned','final'].map(id=>[id,fakeNode()])),
    actionRows:{},heroBlock:hero,rail:{setHeroEase(){}},reduceMotion:{matches:false}});
  copy.step({chapterId:'final',dt:0,travelP:.97});
  const ticket={fromP:.97,targetP:0,phase:0,elapsed:0,dur:7.5,manifestoHeroReturn:special};
  for(let i=0;i<=30;i++){ticket.phase=i/60;ticket.elapsed=ticket.phase*ticket.dur;
    copy.step({chapterId:'mission',dt:1/60,travelP:0,railFlight:ticket});}
  return Number(hero.style.opacity);
}
assert.ok(flightCopy(true)>0 && flightCopy(true)<.3,'Manifesto home copy begins gently halfway through descent');
assert.equal(flightCopy(false),0,'ordinary flight keeps its existing arrival timing');

// Browser cascade regression: the real stylesheet must leave the hero's
// frame-driven flight opacity authoritative during and after descent.
const css=readFileSync(new URL('../journey/site.css',import.meta.url),'utf8');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  for(const width of [390,1280]) {
    const page=await browser.newPage({viewport:{width,height:800}});
    await page.setContent(`<style>${css}</style><div class="ui"><div class="hero" style="opacity:.45">Hero</div></div><div class="j-manifesto"></div>`);
    async function state(body,returning,opacity){return page.evaluate(({body,returning,opacity})=>{
      document.body.className=body;
      document.querySelector('.j-manifesto').classList.toggle('is-returning',returning);
      const hero=document.querySelector('.hero');hero.style.opacity=String(opacity);
      // Finish any prior state transition; the assertion tests ownership,
      // not a sampled point inside the departing Manifesto fade.
      for(const animation of hero.getAnimations()) animation.finish();
      return{opacity:Number(getComputedStyle(hero).opacity),animation:getComputedStyle(hero).animationName};
    },{body,returning,opacity});}
    assert.equal((await state('j-manifesto-open',false,.45)).opacity,0,'reading hides underlying hero');
    assert.equal((await state('j-manifesto-open',true,.45)).opacity,.45,'descent shows current flight opacity');
    assert.equal((await state('j-manifesto-open',true,0)).opacity,0,'other destinations do not reveal hero');
    assert.equal((await state('j-manifesto-open',true,.2)).opacity,.2,'retarget preserves outgoing hero fade');
    const closing=await state('j-manifesto-closing',false,.8);
    assert.equal(closing.opacity,.8);assert.equal(closing.animation,'none','no second post-landing fade');
    assert.equal((await state('',false,1)).opacity,1);
    await page.close();
  }
  console.log('Manifesto hero return: mobile/desktop cascade follows flight opacity, reading hidden, retarget and landing preserved');
} finally {await browser.close();}
