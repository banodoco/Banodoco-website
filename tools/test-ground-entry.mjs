import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const width of [390,1280]) {
  const page=await browser.newPage({viewport:{width,height:800}});
  await page.goto(`${process.env.TEST_URL||'http://localhost:8137'}/?introat=0`);
  await page.waitForFunction(()=>window.sceneApi?.groups?.ground);
  const result=await page.evaluate(()=>{
   const {renderer:r,scene,camera,groups}=window.sceneApi;
   const old=r.getRenderTarget();r.setRenderTarget(null);
   const gl=r.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
   function pixels(){r.render(scene,camera);const a=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;}
   const withGround=pixels();groups.ground.visible=false;const without=pixels();groups.ground.visible=true;
   r.setRenderTarget(old);let differences=0;for(let i=0;i<withGround.length;i++)if(withGround[i]!==without[i])differences++;
   return {differences};
  });
  assert.equal(result.differences,0,`${width}px: unrevealed ground must render identically to absent ground`);
  await page.close();
 }
 console.log('Ground entry: zero-growth ground contributes zero pixels on mobile and desktop');
}finally{await browser.close()}
