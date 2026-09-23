#!/usr/bin/env node
// The browser-only OAuth seam was replaced by the server; exercise the actual
// HTTP routes, PKCE binding and broker contract in the normal static test gate.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', 'tests', '-v'], {
  cwd: root, stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
