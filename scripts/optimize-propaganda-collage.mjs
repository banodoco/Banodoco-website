#!/usr/bin/env node
/**
 * Re-encodes /public/assorted_propaganda/*.jpg as 480px-square WebP (q80) for
 * the Resources-page community collage tiles, then deletes the originals.
 *
 * The collage renders each tile at ~200 CSS px max. 480px source covers retina
 * at every layout we use and drops the bundle from ~4.2 MB to ~1 MB.
 *
 * Usage:
 *   node scripts/optimize-propaganda-collage.mjs           # dry run
 *   node scripts/optimize-propaganda-collage.mjs --apply   # write & delete jpgs
 */
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, '../public/assorted_propaganda');
const SIZE = 480;
const QUALITY = 80;
const APPLY = process.argv.includes('--apply');

const files = (await fs.readdir(DIR)).filter((f) => f.endsWith('.jpg')).sort();
let totalIn = 0;
let totalOut = 0;

for (const f of files) {
  const src = path.join(DIR, f);
  const dst = path.join(DIR, f.replace(/\.jpg$/, '.webp'));
  const inBytes = (await fs.stat(src)).size;
  const buf = await sharp(src).resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: QUALITY }).toBuffer();
  totalIn += inBytes;
  totalOut += buf.length;
  console.log(`${f}: ${(inBytes / 1024).toFixed(0)} KB → ${(buf.length / 1024).toFixed(0)} KB`);
  if (APPLY) {
    await fs.writeFile(dst, buf);
    await fs.unlink(src);
  }
}

console.log(`\nTotal: ${(totalIn / 1024).toFixed(0)} KB → ${(totalOut / 1024).toFixed(0)} KB (${((1 - totalOut / totalIn) * 100).toFixed(0)}% smaller)`);
if (!APPLY) console.log('\nDry run. Pass --apply to write the .webp files and delete the .jpg originals.');
