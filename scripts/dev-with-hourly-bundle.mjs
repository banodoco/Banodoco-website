import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ONE_HOUR_MS = 60 * 60 * 1000;
const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const buildBundleScript = path.join(rootDir, 'scripts/build-bundle-starter.mjs');
const viteBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vite.cmd' : 'vite'
);
const viteArgs = process.argv.slice(2);

let shuttingDown = false;
let viteProcess = null;

const runCommand = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    ...options,
  });

  child.on('error', reject);
  child.on('exit', (code, signal) => {
    if (signal) {
      reject(new Error(`${command} exited with signal ${signal}`));
      return;
    }

    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`${command} exited with code ${code}`));
  });
});

const buildBundleStarter = async (reason) => {
  const timestamp = new Date().toISOString();
  console.log(`[dev] Building bundle starter (${reason}) at ${timestamp}`);
  await runCommand(process.execPath, [buildBundleScript]);
};

const startVite = () => {
  viteProcess = spawn(viteBin, viteArgs, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  viteProcess.on('exit', (code, signal) => {
    viteProcess = null;
    if (shuttingDown) return;

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
};

const shutdown = (signal) => {
  shuttingDown = true;
  if (viteProcess) {
    viteProcess.kill(signal);
    return;
  }

  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

await buildBundleStarter('startup');
startVite();

setInterval(() => {
  buildBundleStarter('hourly refresh').catch(error => {
    console.error('[dev] Hourly bundle starter refresh failed.');
    console.error(error);
  });
}, ONE_HOUR_MS);
