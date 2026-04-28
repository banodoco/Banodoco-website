#!/usr/bin/env node
/**
 * Re-encode oversized backup thumbnails in Supabase Storage.
 *
 * Walks every `media` row with a backup_thumbnail_url, downloads the file,
 * resizes to max edge 1920px, and re-encodes as progressive mozjpeg q90 —
 * visually lossless to virtually any viewer. Files where re-encoding doesn't
 * meaningfully shrink the bytes (<5% savings) are left alone.
 *
 * Optimized bytes are uploaded to the SAME storage path so existing signed
 * URLs in the DB keep working — no schema/data changes required.
 *
 * Usage:
 *   node scripts/optimize-backup-thumbnails.mjs                # dry run
 *   node scripts/optimize-backup-thumbnails.mjs --apply        # upload changes
 *   node scripts/optimize-backup-thumbnails.mjs --apply --limit 10
 *   node scripts/optimize-backup-thumbnails.mjs --id <uuid>    # one row only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key?.trim() && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const idIdx = args.indexOf('--id');
const ONLY_ID = idIdx !== -1 ? args[idIdx + 1] : null;

const MAX_EDGE = 1920;
const QUALITY = 90;
const MIN_SAVINGS_RATIO = 0.95; // skip upload if new is >95% of original
const CONCURRENCY = 4;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function extractBucketAndPath(url) {
  // Matches /storage/v1/object/{sign,public}/<bucket>/<path>(?...)
  const m = url?.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/([^?]+)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

function isReencodeable(pathname) {
  return /\.(jpe?g|png|webp|tiff?|avif)$/i.test(pathname);
}

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / 1024).toFixed(1)} KB`;
}

async function processRow(row) {
  const parsed = extractBucketAndPath(row.backup_thumbnail_url);
  if (!parsed) return { id: row.id, skipped: 'unparseable URL' };
  const { bucket, path: storagePath } = parsed;

  if (!isReencodeable(storagePath)) {
    return { id: row.id, bucket, path: storagePath, skipped: `unsupported ext (${path.extname(storagePath)})` };
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(bucket)
    .download(storagePath);
  if (dlErr) return { id: row.id, bucket, path: storagePath, error: `download: ${dlErr.message}` };
  const input = Buffer.from(await blob.arrayBuffer());

  let output;
  let outMeta;
  let outContentType;
  try {
    const inMeta = await sharp(input).metadata();
    const inFmt = inMeta.format;
    const hasAlpha = !!inMeta.hasAlpha;

    let pipeline = sharp(input)
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      });

    if (inFmt === 'jpeg' || (inFmt === 'png' && !hasAlpha) || inFmt === 'jpg') {
      pipeline = pipeline.jpeg({ quality: QUALITY, progressive: true, mozjpeg: true });
      outContentType = 'image/jpeg';
    } else if (inFmt === 'png') {
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
      outContentType = 'image/png';
    } else if (inFmt === 'webp') {
      pipeline = pipeline.webp({ quality: QUALITY });
      outContentType = 'image/webp';
    } else if (inFmt === 'avif') {
      pipeline = pipeline.avif({ quality: 70 });
      outContentType = 'image/avif';
    } else {
      return { id: row.id, bucket, path: storagePath, skipped: `unsupported format (${inFmt})` };
    }

    output = await pipeline.toBuffer();
    outMeta = await sharp(output).metadata();
  } catch (e) {
    return { id: row.id, bucket, path: storagePath, error: `encode: ${e.message}` };
  }

  const ratio = output.length / input.length;
  const result = {
    id: row.id,
    bucket,
    path: storagePath,
    inBytes: input.length,
    outBytes: output.length,
    outDims: `${outMeta.width}x${outMeta.height}`,
    ratio,
  };

  if (ratio > MIN_SAVINGS_RATIO) {
    result.skipped = `negligible savings (${(ratio * 100).toFixed(0)}%)`;
    return result;
  }

  if (!APPLY) {
    result.dryRun = true;
    return result;
  }

  const { error: upErr } = await supabase.storage.from(bucket).upload(storagePath, output, {
    contentType: outContentType,
    upsert: true,
    cacheControl: '31536000',
  });
  if (upErr) return { ...result, error: `upload: ${upErr.message}` };

  result.uploaded = true;
  return result;
}

async function main() {
  console.log('Fetching media rows with backup_thumbnail_url…');

  let query = supabase
    .from('media')
    .select('id, backup_thumbnail_url')
    .not('backup_thumbnail_url', 'is', null);

  if (ONLY_ID) query = query.eq('id', ONLY_ID);

  const rows = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE || ONLY_ID) break;
    from += PAGE;
  }

  const work = rows.slice(0, LIMIT);
  console.log(
    `${rows.length} candidate rows; processing ${work.length}.${
      APPLY ? ' WRITES ENABLED.' : ' (dry-run; pass --apply to upload)'
    }`,
  );

  let totalIn = 0;
  let totalOut = 0;
  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < work.length) {
      const idx = cursor++;
      const row = work[idx];
      const r = await processRow(row);

      let tag;
      if (r.error) {
        tag = `ERROR: ${r.error}`;
        errorCount++;
      } else if (r.skipped) {
        tag = `skip (${r.skipped})`;
        skippedCount++;
      } else {
        const verb = r.uploaded ? 'upload' : 'would upload';
        tag = `${verb} ${fmtBytes(r.inBytes)} → ${fmtBytes(r.outBytes)} (${(r.ratio * 100).toFixed(
          0,
        )}%) @ ${r.outDims}`;
        totalIn += r.inBytes;
        totalOut += r.outBytes;
        if (r.uploaded) uploadedCount++;
      }

      console.log(`[${String(idx + 1).padStart(4)}/${work.length}] ${row.id} — ${tag}`);
    }
  });
  await Promise.all(workers);

  console.log('\n---');
  console.log(`Processed: ${work.length}`);
  console.log(`Uploaded:  ${uploadedCount}`);
  console.log(`Skipped:   ${skippedCount}`);
  console.log(`Errors:    ${errorCount}`);
  if (totalIn > 0) {
    console.log(
      `Bytes:     ${fmtBytes(totalIn)} → ${fmtBytes(totalOut)} (saved ${fmtBytes(
        totalIn - totalOut,
      )}, ${(((totalIn - totalOut) / totalIn) * 100).toFixed(0)}%)`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
