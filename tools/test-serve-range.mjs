#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDir = await mkdtemp(path.join(root, '.serve-range-test-'));
const fixture = Buffer.from('0123456789');
await writeFile(path.join(fixtureDir, 'fixture.txt'), fixture);

function availablePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const { port } = socket.address();
      socket.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function request(port, method = 'GET', range) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      method,
      path: `/${path.basename(fixtureDir)}/fixture.txt`,
      headers: range ? { Range: range } : {},
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.once('error', reject);
    req.end();
  });
}

async function waitUntilReady(port, child) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`serve.py exited before becoming ready (${child.exitCode})`);
    }
    try {
      await request(port);
      return;
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error('serve.py did not become ready');
}

function check(response, expected) {
  assert.equal(response.status, expected.status);
  assert.equal(response.body.toString(), expected.body);
  assert.equal(response.headers['content-length'], String(expected.length));
  assert.equal(response.headers['content-range'], expected.contentRange);
}

const port = await availablePort();
const child = spawn('python3', ['serve.py'], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const childClosed = new Promise((resolve) => child.once('close', resolve));
let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk; });

try {
  await waitUntilReady(port, child);

  const full = await request(port);
  check(full, { status: 200, body: '0123456789', length: 10, contentRange: undefined });

  const closed = await request(port, 'GET', 'bytes=2-5');
  check(closed, { status: 206, body: '2345', length: 4, contentRange: 'bytes 2-5/10' });

  check(await request(port, 'GET', 'bytes=7-'), {
    status: 206, body: '789', length: 3, contentRange: 'bytes 7-9/10',
  });
  check(await request(port, 'GET', 'bytes=-3'), {
    status: 206, body: '789', length: 3, contentRange: 'bytes 7-9/10',
  });
  check(await request(port, 'GET', 'bytes=-99'), {
    status: 206, body: '0123456789', length: 10, contentRange: 'bytes 0-9/10',
  });

  const unsatisfiable = await request(port, 'GET', 'bytes=99-');
  check(unsatisfiable, {
    status: 416, body: '', length: 0, contentRange: 'bytes */10',
  });
  for (const range of ['bytes=abc', 'bytes=0-1,4-5']) {
    check(await request(port, 'GET', range), {
      status: 416, body: '', length: 0, contentRange: 'bytes */10',
    });
  }

  const fullHead = await request(port, 'HEAD');
  assert.equal(fullHead.body.length, 0);
  assert.equal(fullHead.status, full.status);
  for (const header of ['content-type', 'content-length', 'last-modified', 'content-range']) {
    assert.equal(fullHead.headers[header], full.headers[header], `full HEAD ${header}`);
  }

  const rangeHead = await request(port, 'HEAD', 'bytes=2-5');
  assert.equal(rangeHead.body.length, 0);
  assert.equal(rangeHead.status, closed.status);
  for (const header of ['content-type', 'accept-ranges', 'content-range', 'content-length']) {
    assert.equal(rangeHead.headers[header], closed.headers[header], `HEAD ${header}`);
  }

  const unsatisfiableHead = await request(port, 'HEAD', 'bytes=99-');
  assert.equal(unsatisfiableHead.body.length, 0);
  assert.equal(unsatisfiableHead.status, unsatisfiable.status);
  for (const header of ['accept-ranges', 'content-range', 'content-length']) {
    assert.equal(
      unsatisfiableHead.headers[header],
      unsatisfiable.headers[header],
      `unsatisfiable HEAD ${header}`,
    );
  }

  console.log('serve.py range handling: ok');
} finally {
  if (child.exitCode === null) child.kill('SIGTERM');
  await childClosed;
  await rm(fixtureDir, { recursive: true, force: true });
}

if (stderr) process.stderr.write(stderr);
