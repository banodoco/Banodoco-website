import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { buildRuntimeRelease, collectRuntime, runtimeBootstrap, verifyRetainedReleases } from './build-runtime-release.mjs';

const root = mkdtempSync(join(tmpdir(), 'banodoco-runtime-'));
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const write = (path, data) => {
  mkdirSync(resolve(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), data);
};
try {
  write('main.js', "import './organism/hero-spores.js'; import {value} from './shared.js'; import {three} from 'three'; window.releaseValue=value; window.threeValue=three;");
  write('shared.js', "export const value='A';");
  write('hero-deco.js', '// Optional classic entry fixture.');
  write('organism/hero-spores.js', 'window.singletonCount=(window.singletonCount||0)+1;');
  write('organism/hero-spores-worker.js', "import {value} from '../shared.js'; self.postMessage(value);");
  write('vendor/three/three.module.js', "export const three='three';");
  write('assets/contributor-portraits/profile-sprite.jpg', 'fixture sprite');
  write('static/geom/manifest.json', '{"version":1,"chapters":{}}');
  const a = buildRuntimeRelease({ root });
  const bootstrapA = readFileSync(join(root, 'runtime-release.js'), 'utf8');
  assert.equal(buildRuntimeRelease({ root, check: true }).hash, a.hash);
  const maps = [];
  const window = {};
  vm.runInNewContext(bootstrapA, { window, document: {
    createElement: () => ({}), head: { appendChild: map => maps.push(JSON.parse(map.textContent)) },
  } });
  assert.equal(window.__runtimeBase, a.base);
  assert.equal(maps[0].imports['./main.js'], a.base + 'main.js');
  assert.equal(maps[0].imports.three, a.base + 'vendor/three/three.module.js');
  write('shared.js', "export const value='B';");
  assert.throws(() => buildRuntimeRelease({ root, check: true }), /stale/);
  const b = buildRuntimeRelease({ root });
  assert.notEqual(a.hash, b.hash);
  assert.equal(readFileSync(join(root, a.base, 'shared.js'), 'utf8'), "export const value='A';");
  assert.equal(readFileSync(join(root, b.base, 'shared.js'), 'utf8'), "export const value='B';");
  verifyRetainedReleases(root);
  write('main.js', 'import missing from "./absent.js";');
  assert.throws(() => collectRuntime(root), /ENOENT/);
  write('main.js', 'import("../outside.js");');
  assert.throws(() => collectRuntime(root), /escapes source/);
  write('main.js', 'import(window.moduleName);');
  assert.throws(() => collectRuntime(root), /Nonliteral/);
  const originalA = readFileSync(join(root, a.base, 'shared.js'));
  write(join(a.base, 'shared.js'), 'tampered');
  assert.throws(() => verifyRetainedReleases(root), /Modified immutable/);
  write(join(a.base, 'shared.js'), originalA);
  console.log('PASS runtime release: source graph closure, missing/escaping imports, stale check, retained A after B, immutable bytes, entry/Three mapping');

  const { spawn } = await import('node:child_process');
  const { createServer } = await import('node:http');
  write('serve.py', readFileSync(join(repo, 'serve.py')));
  write('runtime-source.js', readFileSync(join(repo, 'runtime-source.js')));
  mkdirSync(join(root, 'tools'));
  async function serverMap(mode) {
    const reservation = createServer();
    await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    const env = { ...process.env, PORT: String(port) };
    delete env.RUNTIME_MODE;
    if (mode) env.RUNTIME_MODE = mode;
    const processHandle = spawn('python3', [join(root, 'serve.py')], { env, stdio: 'ignore' });
    try {
      const deadline = Date.now() + 5000;
      while (true) {
        try {
          const response = await fetch(`http://127.0.0.1:${port}/runtime-release.js`, { signal: AbortSignal.timeout(500) });
          assert.equal(response.headers.get('cache-control'), 'no-store, must-revalidate');
          return await response.text();
        } catch (error) {
          if (Date.now() >= deadline) throw error;
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
    } finally {
      processHandle.kill('SIGTERM');
      await new Promise(resolve => processHandle.once('exit', resolve));
    }
  }
  const [sourceMap, releaseMap] = await Promise.all([serverMap(), serverMap('release')]);
  assert.equal(sourceMap, readFileSync(join(root, 'runtime-source.js'), 'utf8'));
  assert.equal(releaseMap, readFileSync(join(root, 'runtime-release.js'), 'utf8'));
  console.log('PASS server modes: checkout defaults to live source; RUNTIME_MODE=release serves production map; both retain no-store');

  if (process.argv.includes('--browser')) {
    const { chromium } = await import('playwright-core');
    const index = readFileSync(join(repo, 'index.html'), 'utf8');
    assert.match(index, /<script type="module" onerror="window\.__runtimeLoadFailed\(\)">import '\.\/main\.js';<\/script>/);
    const fallback = index.match(/<script>\s*\/\/ A failed entry[\s\S]*?<\/script>/)[0];
    const server = createServer((request, response) => {
      try {
        const path = new URL(request.url, 'http://localhost').pathname;
        if (path === '/') {
          response.setHeader('Content-Type', 'text/html');
          response.end(`${fallback}<script src="./runtime-release.js" onerror="window.__runtimeLoadFailed()"></script><script type="module" onerror="window.__runtimeLoadFailed()">import './main.js'; import './organism/hero-spores.js'; window.worker = new Worker(window.__runtimeBase+'organism/hero-spores-worker.js',{type:'module'}); window.worker.onmessage=e=>window.workerValue=e.data;</script><body><a href="./static/">Static journey</a></body>`);
        } else {
          response.setHeader('Content-Type', 'application/javascript');
          // Emulate a browser retaining A's map after deployment switched to B.
          response.end(path === '/runtime-release.js' ? bootstrapA : readFileSync(join(root, path)));
        }
      } catch { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const page = await browser.newPage();
      const requests = [];
      page.on('request', request => requests.push(new URL(request.url()).pathname));
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.waitForFunction(() => window.workerValue === 'A');
      assert.deepEqual(await page.evaluate(() => [window.releaseValue, window.workerValue, window.singletonCount, window.threeValue]), ['A', 'A', 1, 'three']);
      assert.ok(requests.filter(path => path.endsWith('.js') && path !== '/runtime-release.js').every(path => path.startsWith('/runtime/' + a.hash + '/')));
      await page.close();
      console.log('PASS browser: cached A map after B deploy keeps main/Three/worker on A and hero singleton evaluates once');
      for (const failed of ['/runtime-release.js', '/runtime/' + a.hash + '/main.js']) {
        const broken = await browser.newPage();
        await broken.route('**' + failed, route => route.abort('connectionreset'));
        await broken.goto(`http://127.0.0.1:${server.address().port}/`);
        const failure = broken.locator('#runtime-load-failure');
        await failure.waitFor({ timeout: 5000 });
        assert.equal(await failure.locator('a').getAttribute('href'), './static/');
        assert.equal(await failure.locator('button').count(), 1);
        await broken.close();
      }
      console.log('PASS browser: bootstrap and entry module network failures preserve a static exit and explicit Reload');
    } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
  }
  assert.ok(runtimeBootstrap('./').includes('const base = "./";'));
} finally { rmSync(root, { recursive: true, force: true }); }
