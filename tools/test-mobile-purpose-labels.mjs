import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright-core';

// TEST_BROWSER=webkit exercises Safari's rendering engine. TEST_FPS=15 also
// limits the application's RAF updates; CSS can still paint between those frames.
const engine = process.env.TEST_BROWSER || 'chromium';
assert.ok(['chromium', 'webkit'].includes(engine), 'supported browser engine');
const browser = await ({ chromium, webkit }[engine]).launch({
  ...(engine === 'chromium' ? { channel: 'chrome' } : {}), headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: Number(process.env.TEST_WIDTH || 390), height: Number(process.env.TEST_HEIGHT || 664) },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  });
  // A supplied pre-fix stylesheet is a negative control for the browser test.
  if (process.env.TEST_CSS) await page.route('**/mycelial.css', route => route.fulfill({
    path: process.env.TEST_CSS, contentType: 'text/css',
  }));
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1&pose=${process.env.TEST_FROM || 'inspire'}`);
  await page.waitForFunction(() => !!window.journey);
  await page.waitForTimeout(1000);
  if (process.env.TEST_FPS) await page.evaluate(fps => {
    const original = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => original(() => {
      setTimeout(() => callback(performance.now()), 1000 / fps);
    });
  }, Number(process.env.TEST_FPS));

  async function record(action) {
    await page.evaluate(() => {
      window.labelSamples = [];
      window.sampleLabels = true;
      const sample = () => {
        if (!window.sampleLabels) return;
        window.labelSamples.push({
          time: performance.now(),
          rail: document.querySelector('.j-rail').className,
          body: document.body.className,
          opacity: [...document.querySelectorAll('.j-rail-purpose-child .j-rail-name')].map(name => {
            // Composed visibility includes the tree, item and rail, not just
            // the label and slot: a smooth label behind a snapping parent fails.
            let opacity = 1;
            for (let node = name; node; node = node.parentElement) {
              const style = getComputedStyle(node);
              if (style.visibility === 'hidden' || style.display === 'none') return 0;
              opacity *= Number(style.opacity);
            }
            const box = name.getBoundingClientRect();
            if (box.bottom <= 0 || box.top >= innerHeight || box.right <= 0 || box.left >= innerWidth) return 0;
            return opacity;
          }),
        });
        requestAnimationFrame(sample);
      };
      sample();
    });
    await action();
    // Input changes the ticket synchronously; the rail publishes it next RAF.
    // Waiting for only the old 'not travelling' state races that publication.
    await page.waitForFunction(() => document.querySelector('.j-rail').classList.contains('j-rail-purpose-travelling'));
    await page.waitForFunction(() => !document.querySelector('.j-rail').classList.contains('j-rail-purpose-travelling'));
    await page.waitForTimeout(1600);
    return page.evaluate(() => {
      window.sampleLabels = false;
      return window.labelSamples;
    });
  }
  async function arrival(label) {
    const frames = await record(() => page.locator('.j-rail-list > [data-chapter="final"] .j-rail-item').tap());
    const durations = [];
    for (let child = 0; child < 2; child++) {
      const faint = frames.find(frame => frame.opacity[child] > .1);
      const bright = frames.find(frame => frame.opacity[child] > .9);
      assert.ok(faint && bright, `${label}: both names eventually become readable; final frame ${JSON.stringify(frames.at(-1))}`);
      durations.push(Math.round(bright.time - faint.time));
      assert.ok(bright.time - faint.time > 500,
        `${label}: names resolve over a gentle fade (${durations.at(-1)} ms)`);
      for (let i = 1; i < frames.length; i++) {
        const step = frames[i].opacity[child] - frames[i - 1].opacity[child];
        if (frames[i].time - frames[i - 1].time < 100) {
          assert.ok(step < .25, `${label}: no opacity snap when gathering or arrival classes change (${step})`);
        }
      }
    }
    console.log(`${engine} ${label}: 10–90% composed fade ${durations.join('/')} ms.`);
  }
  await arrival('ordinary arrival');
  await record(() => page.locator('.j-rail-purpose-ownership .j-rail-item').tap());
  await arrival('Ownership return');
  await record(() => page.locator('.j-rail-purpose-manifesto .j-rail-item').tap());
  const siblingFrames = await record(() => page.locator('.j-rail-purpose-ownership .j-rail-item').tap());
  assert.ok(siblingFrames.every(frame => frame.opacity.every(value => value < .01)),
    'touch and sibling travel must not reopen either child name');
  await record(() => page.locator('.j-rail-purpose-manifesto .j-rail-item').tap());
  await arrival('Manifesto return');
} finally {
  await browser.close();
}
