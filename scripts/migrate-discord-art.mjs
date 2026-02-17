#!/usr/bin/env node
/**
 * Migrate Discord art channel messages to art_pieces table
 *
 * Reads from discord_messages (art sharing channel), downloads media via
 * the refresh-media-urls edge function, uploads to Supabase Storage,
 * and inserts records into art_pieces.
 *
 * Usage: node scripts/migrate-discord-art.mjs [--dry-run] [--limit N]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const LIMIT = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : Infinity;

// Load environment variables
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key?.trim() && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'user-uploads';
const ART_CHANNEL_ID = '1138865343314530324';

if (!SUPABASE_URL) {
  console.error('Error: VITE_SUPABASE_URL not found in .env');
  process.exit(1);
}
if (!SUPABASE_ANON_KEY) {
  console.error('Error: VITE_SUPABASE_ANON_KEY not found in .env');
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Get file extension from URL or filename
 */
function getExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).split('?')[0].toLowerCase();
    if (['.gif', '.png', '.jpg', '.jpeg', '.webp', '.mp4', '.webm', '.mov'].includes(ext)) return ext;
  } catch {}
  return '.bin';
}

/**
 * Get MIME type from extension
 */
function getContentType(ext) {
  return {
    '.gif': 'image/gif', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4',
    '.webm': 'video/webm', '.mov': 'video/quicktime',
  }[ext] || 'application/octet-stream';
}

/**
 * Determine if a content type is an image or video
 */
function getMediaCategory(contentType) {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  return 'other';
}

/**
 * Fetch all art channel messages from discord_messages, ordered by reaction_count DESC
 */
async function fetchArtMessages() {
  const allMessages = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/discord_messages?channel_id=eq.${ART_CHANNEL_ID}&is_deleted=eq.false&order=reaction_count.desc&limit=${pageSize}&offset=${offset}`;
    const resp = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to fetch messages: ${resp.status} ${await resp.text()}`);
    }

    const messages = await resp.json();
    if (messages.length === 0) break;

    allMessages.push(...messages);
    offset += pageSize;

    if (messages.length < pageSize) break;
    await delay(100);
  }

  return allMessages;
}

/**
 * Check which discord_message_ids already exist in art_pieces
 */
async function fetchExistingArtPieces() {
  const existing = new Set();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/art_pieces?source_type=eq.discord&select=discord_message_id&limit=${pageSize}&offset=${offset}`;
    const resp = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Failed to fetch existing art_pieces: ${resp.status} ${text}`);
    }

    const rows = await resp.json();
    if (rows.length === 0) break;

    for (const row of rows) {
      if (row.discord_message_id) existing.add(String(row.discord_message_id));
    }

    offset += pageSize;
    if (rows.length < pageSize) break;
    await delay(100);
  }

  return existing;
}

/**
 * Refresh Discord media URLs via edge function
 */
async function refreshMediaUrls(messageId) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/refresh-media-urls`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message_id: String(messageId) }),
  });

  if (!resp.ok) throw new Error(`Refresh failed: ${resp.status}`);
  return resp.json();
}

/**
 * Download file from URL
 */
async function downloadFile(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

/**
 * Upload to Supabase Storage
 */
async function uploadToSupabase(buffer, storagePath, contentType) {
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${storagePath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Upload failed: ${resp.status} ${text}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
}

/**
 * Insert a record into art_pieces via REST API
 */
async function insertArtPiece(record) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/art_pieces`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(record),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Insert failed: ${resp.status} ${text}`);
  }
}

/**
 * Extract image/video attachments from a message's attachments array
 */
function getMediaAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments.filter(att => {
    const ct = (att.content_type || '').toLowerCase();
    const fn = (att.filename || att.url || '').toLowerCase();
    return ct.startsWith('image/') || ct.startsWith('video/') ||
      /\.(png|jpg|jpeg|gif|webp|mp4|webm|mov)$/i.test(fn);
  });
}

/**
 * Process a single message
 */
async function processMessage(msg, index, total) {
  const messageId = String(msg.message_id);
  const label = `[${index + 1}/${total}] msg:${messageId}`;

  const attachments = getMediaAttachments(msg.attachments || []);
  if (attachments.length === 0) {
    return { success: false, skipped: true, reason: 'no media' };
  }

  if (DRY_RUN) {
    console.log(`${label}: [DRY RUN] Would process ${attachments.length} attachment(s), reactions=${msg.reaction_count}`);
    return { success: true, dryRun: true };
  }

  try {
    // Refresh URLs via edge function
    let refreshedAttachments = attachments;
    try {
      const result = await refreshMediaUrls(messageId);
      if (result.attachments && result.attachments.length > 0) {
        refreshedAttachments = result.attachments;
      }
    } catch (e) {
      console.log(`${label}: Refresh failed (${e.message}), using original URLs`);
    }

    const mediaUrls = [];
    const mediaTypes = [];
    let thumbnailUrl = null;

    for (let i = 0; i < refreshedAttachments.length; i++) {
      const att = refreshedAttachments[i];
      const url = att.url || att.proxy_url;
      if (!url) continue;

      const ext = getExtension(url);
      const contentType = att.content_type || getContentType(ext);
      const storagePath = `discord-migrated/art/${messageId}_${i}${ext}`;

      // Download
      const buffer = await downloadFile(url);
      const sizeKB = (buffer.length / 1024).toFixed(1);

      // Upload
      const publicUrl = await uploadToSupabase(buffer, storagePath, contentType);

      mediaUrls.push(publicUrl);
      mediaTypes.push(contentType);

      if (!thumbnailUrl && getMediaCategory(contentType) === 'image') {
        thumbnailUrl = publicUrl;
      }

      console.log(`${label}: Uploaded attachment ${i + 1}/${refreshedAttachments.length} (${sizeKB}KB) -> ${storagePath}`);

      if (i < refreshedAttachments.length - 1) {
        await delay(300);
      }
    }

    if (mediaUrls.length === 0) {
      console.log(`${label}: No media successfully uploaded`);
      return { success: false, error: 'No media uploaded' };
    }

    // If no image thumbnail found, use first media URL
    if (!thumbnailUrl) {
      thumbnailUrl = mediaUrls[0];
    }

    // Insert into art_pieces
    const record = {
      source_type: 'discord',
      discord_message_id: messageId,
      caption: msg.content || null,
      discord_author_id: String(msg.author_id),
      media_urls: mediaUrls,
      media_types: mediaTypes,
      thumbnail_url: thumbnailUrl,
      reaction_count: msg.reaction_count || 0,
      status: 'published',
      created_at: msg.created_at,
    };

    await insertArtPiece(record);
    console.log(`${label}: Inserted into art_pieces (${mediaUrls.length} media, ${msg.reaction_count} reactions)`);

    return { success: true };
  } catch (err) {
    console.log(`${label}: ERROR - ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Main
 */
async function main() {
  console.log('=== Discord Art -> art_pieces Migration ===');
  if (DRY_RUN) console.log('>>> DRY RUN MODE <<<');
  if (LIMIT !== Infinity) console.log(`>>> LIMIT: ${LIMIT} <<<`);
  console.log('');

  // Fetch all art channel messages
  console.log('Fetching art channel messages...');
  const allMessages = await fetchArtMessages();
  console.log(`Found ${allMessages.length} messages in art channel`);

  // Fetch existing art_pieces to skip duplicates
  console.log('Checking existing art_pieces...');
  const existingIds = await fetchExistingArtPieces();
  console.log(`Found ${existingIds.size} existing art_pieces entries`);

  // Filter to messages with media that haven't been migrated yet
  const toProcess = allMessages.filter(msg => {
    const msgId = String(msg.message_id);
    if (existingIds.has(msgId)) return false;
    const mediaAttachments = getMediaAttachments(msg.attachments || []);
    return mediaAttachments.length > 0;
  });

  const limited = toProcess.slice(0, LIMIT);
  console.log(`\nMessages to process: ${limited.length} (${allMessages.length} total, ${existingIds.size} already migrated, ${allMessages.length - toProcess.length - existingIds.size} without media)\n`);

  // Process each message
  const results = { migrated: 0, skipped: 0, failed: 0, dryRun: 0 };
  const failures = [];

  for (let i = 0; i < limited.length; i++) {
    const msg = limited[i];
    const result = await processMessage(msg, i, limited.length);

    if (result.dryRun) {
      results.dryRun++;
    } else if (result.skipped) {
      results.skipped++;
    } else if (result.success) {
      results.migrated++;
    } else {
      results.failed++;
      failures.push({ message_id: String(msg.message_id), error: result.error });
    }

    // Rate limit between messages
    if (!result.skipped && !result.dryRun) {
      await delay(300);
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  if (DRY_RUN) {
    console.log(`Would migrate: ${results.dryRun}`);
  } else {
    console.log(`Migrated: ${results.migrated}`);
  }
  console.log(`Skipped (no media): ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  message_id=${f.message_id}: ${f.error}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
