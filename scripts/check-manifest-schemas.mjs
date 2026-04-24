import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturesRoot = path.join(repoRoot, 'testdata', 'bundle-manifests');
const frontendValidatorPath = path.join(repoRoot, 'src', 'features', 'bundlePosts', 'manifestSchema.ts');
const sharedValidatorPath = path.resolve(repoRoot, '../supabase/functions/_shared/bundle-manifest.ts');

const canRead = async (filePath) => {
  try {
    await access(filePath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
};

const expectedFromFilename = (filePath) => {
  if (filePath.endsWith('.ok.json')) return { ok: true, code: null };
  if (filePath.endsWith('.bundle_manifest_invalid.json')) {
    return { ok: false, code: 'bundle_manifest_invalid' };
  }
  throw new Error(`Fixture filename must encode expected outcome: ${filePath}`);
};

const listFixtures = async (dirPath) => {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return listFixtures(resolved);
      return resolved;
    }),
  );

  return files.flat().sort((left, right) => left.localeCompare(right));
};

const loadValidator = async (entryPath) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'bundle-validator-'));

  try {
    const result = await build({
      entryPoints: [entryPath],
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node20',
      write: false,
      logLevel: 'silent',
    });

    const outputFile = result.outputFiles[0];
    const bundledPath = path.join(tempDir, 'validator.mjs');
    await writeFile(bundledPath, outputFile.text, 'utf8');
    return await import(pathToFileURL(bundledPath).href);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};

if (!(await canRead(sharedValidatorPath))) {
  console.error(`Missing sibling validator: ${sharedValidatorPath}`);
  process.exit(1);
}

const [{ parseManifestJson: parseFrontendManifest }, { parseManifestJson: parseSharedManifest }] = await Promise.all([
  loadValidator(frontendValidatorPath),
  loadValidator(sharedValidatorPath),
]);

const failures = [];
const fixtures = await listFixtures(fixturesRoot);

for (const fixturePath of fixtures) {
  const raw = await readFile(fixturePath, 'utf8');
  const expected = expectedFromFilename(fixturePath);
  const frontendResult = parseFrontendManifest(raw);
  const sharedResult = parseSharedManifest(raw);
  const frontendSummary = { ok: frontendResult.ok, code: frontendResult.ok ? null : frontendResult.code };
  const sharedSummary = { ok: sharedResult.ok, code: sharedResult.ok ? null : sharedResult.code };

  if (frontendSummary.ok !== expected.ok || frontendSummary.code !== expected.code) {
    failures.push(
      `${path.relative(repoRoot, fixturePath)} expected ${JSON.stringify(expected)} but frontend returned ${JSON.stringify(frontendSummary)}`,
    );
  }

  if (sharedSummary.ok !== expected.ok || sharedSummary.code !== expected.code) {
    failures.push(
      `${path.relative(repoRoot, fixturePath)} expected ${JSON.stringify(expected)} but shared returned ${JSON.stringify(sharedSummary)}`,
    );
  }

  if (frontendSummary.ok !== sharedSummary.ok || frontendSummary.code !== sharedSummary.code) {
    failures.push(
      `${path.relative(repoRoot, fixturePath)} frontend/shared mismatch ${JSON.stringify(frontendSummary)} vs ${JSON.stringify(sharedSummary)}`,
    );
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.log(`Validated ${fixtures.length} bundle manifest fixtures across both validators.`);
