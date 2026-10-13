import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel:'chrome', headless:true });
try {
  for (const [width,height] of [[375,548],[375,667],[390,844]]) {
    const page = await browser.newPage({ viewport:{width,height} });
    const animation = fs.readFileSync(new URL('../organism/animation.js',import.meta.url),'utf8')
      .replace('const animators = new Map();', 'const animators = new Map(); window.__readingStep = (t,dt) => animators.get("journey")?.(t,dt);');
    await page.route('**/organism/animation.js', route => route.fulfill({contentType:'application/javascript',body:animation}));
    await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`);
    await page.waitForFunction(() => window.journey, null, {timeout:60000});
    await page.evaluate(async () => {
      await document.fonts.ready;
      const {restProgress}=await import('/journey/route.js');
      const {CONTENT}=await import('/content/content.js');
      const {lineSecondsFor,mobileReadingSchedule}=await import('/journey/manifesto/pose.js');
      window.sceneApi.freezeTime(0); window.sceneApi.setRenderEnabled(false);
      window.journey.chapters.final.setManifesto=()=>{};
      window.journey.scrollTo(restProgress('final'));
      window.__readingStep(0,0);
      window.journey.flyTo('manifesto');
      const counts=CONTENT.manifesto.lines.map(line=>line.trim().split(/\s+/).length);
      const box=document.querySelector('.j-manifesto-lines');
      const beats=[...box.children].map(line=>Math.max(...[...line.querySelectorAll('[style]')].map(e=>parseFloat(e.style.getPropertyValue('--w')) || 0)));
      window.readingSchedule=mobileReadingSchedule(lineSecondsFor(counts),beats);
      window.readingTime=0;
      window.readingState=()=>({ height:box.clientHeight, extent:box.scrollHeight, top:box.scrollTop,
        firstTop:box.children[0].getBoundingClientRect().top,
        shown:[...box.children].filter(e=>e.classList.contains('shown')).length,
        laidOut:[...box.children].filter(e=>!e.hidden).length,
        overflow:getComputedStyle(box).overflowY });
    });
    const advance = async seconds => {
      await page.evaluate(seconds => {
        while(window.readingTime < seconds - 1e-8) {
          const step=Math.min(1/120,seconds-window.readingTime);
          window.readingTime+=step; window.__readingStep(window.readingTime,step);
        }
      },seconds);
      await page.waitForTimeout(20);
      return page.evaluate(()=>window.readingState());
    };
    const schedule=await page.evaluate(()=>window.readingSchedule);
    const empty=await advance(1), first=await advance(schedule.reveal[0]+.2);
    assert.equal(empty.extent,empty.height,'no overflow before the first paragraph');
    assert.equal(first.extent,first.height,'one fitting paragraph creates no native scrollbar');
    for(let i=1;i<schedule.reveal.length;i++) {
      let before=await advance(schedule.admit[i]-.03);
      if(i===2) {
        await page.evaluate(()=>{
          document.querySelector('.j-manifesto-panel').dispatchEvent(new Event('pointerdown'));
          document.querySelector('.j-manifesto-lines').scrollTop=20;
        });
        before=await page.evaluate(()=>window.readingState());
      }
      const lead=await advance(schedule.reveal[i]-.03);
      assert.equal(lead.laidOut,lead.shown,'future ink contributes no native layout height');
      assert.ok(lead.extent<=before.extent+1,'early admission adds no empty native scroll extent');
      if(i===1 && height<800) {
        assert.equal(lead.extent,lead.height,'first early lead has no phantom scrollbar');
        assert.ok(lead.firstTop < before.firstTop-10,'opening text still moves before the next ink');
      }
      const reveal=await advance(schedule.reveal[i]+.001);
      assert.equal(reveal.shown,i+1);
      assert.equal(reveal.laidOut,reveal.shown);
      assert.ok(Math.abs(reveal.firstTop-lead.firstTop)<5,'admitting ink does not jump existing text');
      assert.equal(reveal.overflow,'auto','native scrollbar remains enabled for real overflow');
      if(i===2) {
        assert.equal(lead.top,before.top,'manual hold owns the scroll throughout an early lead');
        assert.equal(reveal.top,before.top,'ink admission preserves a held native position');
        await page.evaluate(()=>window.dispatchEvent(new Event('pointerup')));
      }
    }
    // Manual reading owns the actual native range after the inset has retired.
    await page.evaluate(()=>{
      document.querySelector('.j-manifesto-panel').dispatchEvent(new Event('pointerdown'));
      document.querySelector('.j-manifesto-lines').scrollTop=40;
    });
    const held=await page.evaluate(()=>window.readingState());
    const heldLater=await advance(schedule.reveal.at(-1)+2);
    assert.equal(heldLater.top,held.top,'automatic following yields to a held reader');
    console.log(`${width}x${height}: no empty initial/admission overflow; early lead, reveal continuity and native input pass`);
    await page.close();
  }
} finally { await browser.close(); }
