import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';

const engine=process.env.TEST_BROWSER || 'webkit';
const browser=await ({chromium,webkit}[engine]).launch({headless:true,
  ...(engine==='chromium'?{channel:'chrome'}:{})});
try {
  for(const largeViewport of [true,false]) {
    const page=await browser.newPage({viewport:{width:390,height:664},deviceScaleFactor:1,
      isMobile:true,hasTouch:true});
    // Model mobile toolbar geometry: CSS vh keeps its large viewport while
    // JS/canvas innerHeight reports the smaller visible viewport. This is
    // deliberately applied before boot, not patched after the spore launches.
    if(largeViewport) await page.route('**/journey/site.css',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text()).replace(
        'calc(13.5vh - var(--nav-centre-bottom))','calc(125.82px - var(--nav-centre-bottom))')});
    });
    if(process.env.TEST_LEGACY_HERO_MODE) await page.route('**/journey/boot/hero-mode.js',async route=>
      route.fulfill({contentType:'text/javascript',body:await readFile(process.env.TEST_LEGACY_HERO_MODE,'utf8')}));
    await page.goto(process.env.TEST_URL || 'http://localhost:8137/');
    await page.evaluate(async()=>{
      const {heroSpores}=await import('/organism/hero-spores.js');
      window.landingStatus=()=>heroSpores.preludeLandingStatus();
    });
    await page.waitForFunction(()=>window.landingStatus().firstImpact && !!window.sceneApi,
      null,{timeout:45000});
    const result=await page.evaluate(async()=>{
      const {LANDING_SITES}=await import('/organism/network-skeleton.js');
      const hero=window.sceneApi,camera=hero.camera;camera.updateMatrixWorld();
      const point=camera.position.clone().fromArray(LANDING_SITES[0]).project(camera);
      const mark=document.querySelector('.j-rail [data-chapter="equip"] .j-rail-mark');
      const box=mark.getBoundingClientRect();
      const scale=box.height/parseFloat(getComputedStyle(mark).height);
      const radius=parseFloat(getComputedStyle(mark,'::after').height)*scale/2;
      const y=(1-point.y)*innerHeight/2;
      return {gap:box.top+box.height/2-radius-y,
        dx:(point.x+1)*innerWidth/2-(box.left+box.width/2),
        growth:hero.intro.growthProgress,fov:camera.fov,scale,
        landing:window.landingStatus(),started:performance.getEntriesByName('hero-intro-start').length};
    });
    console.log(JSON.stringify({engine,largeViewport,...result}));
    await page.screenshot({path:`/tmp/mobile-landing-anchor-${engine}-${largeViewport?'toolbar':'normal'}.png`});
    assert.ok(Math.abs(result.gap-10)<.8,'real first landing is 10px above the transformed painted circle');
    assert.ok(Math.abs(result.dx)<.8,'landing remains horizontally aligned');
    assert.equal(result.growth,0,'growth camera waits until after real landing');
    assert.equal(result.started,0);
    assert.equal(result.fov,64,'no intro zoom');
    await page.close();
  }
} finally {await browser.close();}
