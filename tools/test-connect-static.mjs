#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const page = await readFile(resolve(root, 'connect/index.html'), 'utf8');
assert.match(page, /method="post" action="\/connect\/approve"/);
assert.match(page, /name="csrf"/);
assert.doesNotMatch(page, /<script|sessionStorage|localStorage|access_token|provider_token|service_role|sb_secret/);
assert.match(page, /Only approve a request you started/);

const output = await mkdtemp(resolve(tmpdir(), 'banodoco-auth-package-'));
try {
  const packaged = spawnSync('python3', [
    'tools/package-public.py', output, '--origin', 'https://www.banodoco.ai', '--revision', 'auth-test',
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(packaged.status, 0, `${packaged.stdout}\n${packaged.stderr}`);
  for (const file of ['serve.py', 'webapp.py', 'web_templates/base.html', 'web_templates/account.html', 'connect/index.html']) {
    assert.equal(await readFile(resolve(output, file), 'utf8'), await readFile(resolve(root, file), 'utf8'));
  }
  // Boot the real packaged app to catch omitted imports/templates, and prove
  // that including server code in the artifact does not expose it over HTTP.
  const smoke = spawnSync('python3', ['-c', `
from webapp import create_app
app = create_app(config={"APP_ORIGIN": "http://localhost:8137", "SUPABASE_URL": "", "SUPABASE_PUBLISHABLE_KEY": ""})
client = app.test_client()
for path, status in [("/", 200), ("/app/", 200), ("/connect/", 200), ("/api/me", 401), ("/serve.py", 404), ("/webapp.py", 404), ("/web_templates/base.html", 404), ("/.env", 404)]:
    response = client.get(path, base_url="http://localhost:8137")
    assert response.status_code == status, (path, response.status_code)
    assert b"{%" not in response.data, path
`], { cwd: output, encoding: 'utf8' });
  assert.equal(smoke.status, 0, `${smoke.stdout}\n${smoke.stderr}`);
} finally {
  await rm(output, { recursive: true, force: true });
}
console.log('server auth templates and packaged runtime: ok');
