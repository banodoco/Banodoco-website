#!/usr/bin/env node
/**
 * Migrate Discord media URLs to Supabase Storage
 *
 * Strategy:
 * 1. Extract channel_id from Discord CDN URLs
 * 2. Batch query database by channel_id + timestamp to find correct message_ids
 * 3. Refresh Discord URLs via edge function
 * 4. Download and upload to Supabase Storage
 * 5. Update data.json with permanent URLs
 *
 * Usage: node scripts/migrate-media-to-supabase.mjs [--dry-run] [--limit N]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_JSON_PATH = path.join(__dirname, '../public/wrapped/data.json');

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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ujlwuvkrxlvoswwkerdf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'wrapped-media';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Extract channel_id from Discord CDN URL
 * Format: https://cdn.discordapp.com/attachments/{channel_id}/{attachment_id}/{filename}
 */
function extractChannelId(url) {
  const match = url.match(/attachments\/(\d+)\/(\d+)\//);
  return match ? match[1] : null;
}

/**
 * Find member_id by author name (checks username, global_name, server_nick)
 */
async function findMemberId(authorName) {
  const encoded = encodeURIComponent(authorName);
  const url = `${SUPABASE_URL}/rest/v1/discord_members?or=(username.ilike.${encoded},global_name.ilike.${encoded},server_nick.ilike.${encoded})&limit=1`;

  try {
    const resp = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY } });
    if (!resp.ok) return null;
    const text = await resp.text();
    const match = text.match(/"member_id"\s*:\s*(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Find message by author + month + most reactions (fallback method)
 */
async function findByAuthorAndMonth(item, memberId) {
  // Get month range
  const [year, month] = item.month.split('-');
  const startDate = `${year}-${month}-01T00:00:00Z`;
  const endMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
  const endYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00Z`;

  // Query messages by author in that month, with attachments, ordered by reaction_count
  const url = `${SUPABASE_URL}/rest/v1/discord_messages?author_id=eq.${memberId}&created_at=gte.${startDate}&created_at=lt.${endDate}&attachments=neq.%5B%5D&order=reaction_count.desc&limit=10`;

  try {
    const resp = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY } });
    if (!resp.ok) return null;
    const text = await resp.text();

    // Parse to find message with attachments matching reaction count
    const msgRegex = /"message_id"\s*:\s*(\d+).*?"reaction_count"\s*:\s*(\d+)/g;
    let match;
    const candidates = [];
    while ((match = msgRegex.exec(text)) !== null) {
      candidates.push({ message_id: match[1], reaction_count: parseInt(match[2]) });
    }

    // Return the one closest to the expected reaction count
    if (candidates.length === 0) return null;

    // If we have the expected reaction count, find closest match
    const target = item.reaction_count || 0;
    candidates.sort((a, b) => Math.abs(a.reaction_count - target) - Math.abs(b.reaction_count - target));

    return candidates[0].message_id;
  } catch {
    return null;
  }
}

/**
 * Batch query messages by channel_id and timestamp ranges
 */
async function batchFindMessages(items) {
  console.log('\nPhase 1: Batch querying by channel_id + timestamp...');

  // Group items by channel_id for efficient querying
  const byChannel = new Map();
  for (const item of items) {
    const channelId = extractChannelId(item.mediaUrl);
    if (!channelId) continue;
    if (!byChannel.has(channelId)) byChannel.set(channelId, []);
    byChannel.get(channelId).push(item);
  }

  console.log(`  Found ${byChannel.size} unique channels to query`);

  const results = new Map(); // keyed by original mediaUrl

  for (const [channelId, channelItems] of byChannel) {
    // Find min/max timestamps for this channel
    const timestamps = channelItems.map(i => new Date(i.created_at).getTime());
    const minTime = new Date(Math.min(...timestamps) - 60000).toISOString(); // -1 min buffer
    const maxTime = new Date(Math.max(...timestamps) + 60000).toISOString(); // +1 min buffer

    const url = `${SUPABASE_URL}/rest/v1/discord_messages?channel_id=eq.${channelId}&created_at=gte.${minTime}&created_at=lte.${maxTime}&select=message_id,created_at,attachments&limit=100`;

    try {
      const resp = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY } });
      if (!resp.ok) {
        continue;
      }

      // Get raw text to preserve message_id precision
      const text = await resp.text();

      // Parse messages manually to preserve bigint precision
      const messages = [];
      const msgRegex = /"message_id"\s*:\s*(\d+).*?"created_at"\s*:\s*"([^"]+)".*?"attachments"\s*:\s*(\[[^\]]*\])/g;
      let match;
      while ((match = msgRegex.exec(text)) !== null) {
        messages.push({
          message_id: match[1], // Keep as string
          created_at: match[2],
          attachments: match[3]
        });
      }

      // Match each item to its message by timestamp
      for (const item of channelItems) {
        const itemTime = new Date(item.created_at).getTime();

        // Find message within 5 seconds
        const found = messages.find(m => {
          const msgTime = new Date(m.created_at).getTime();
          return Math.abs(msgTime - itemTime) < 5000;
        });

        if (found) {
          results.set(item.mediaUrl, found.message_id);
        }
      }
    } catch (err) {
      // Silent fail, will try fallback
    }

    await delay(50); // Rate limiting between channel queries
  }

  console.log(`  Found ${results.size}/${items.length} via channel+timestamp`);

  // Phase 2: Fallback - find by author + month + reaction count
  const missing = items.filter(i => !results.has(i.mediaUrl));
  if (missing.length > 0) {
    console.log(`\nPhase 2: Fallback search for ${missing.length} items by author+month+reactions...`);

    // Cache member lookups
    const memberCache = new Map();

    for (const item of missing) {
      // Look up member_id
      if (!memberCache.has(item.author)) {
        const memberId = await findMemberId(item.author);
        memberCache.set(item.author, memberId);
        await delay(50);
      }

      const memberId = memberCache.get(item.author);
      if (!memberId) {
        continue;
      }

      // Find by author + month
      const messageId = await findByAuthorAndMonth(item, memberId);
      if (messageId) {
        results.set(item.mediaUrl, messageId);
      }

      await delay(50);
    }

    console.log(`  Found ${results.size}/${items.length} total after fallback`);
  }

  return results;
}

/**
 * Refresh Discord media URL
 */
async function refreshMediaUrl(messageId) {
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
async function uploadToSupabase(buffer, fileName, contentType) {
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${fileName}`, {
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

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
}

/**
 * Get file extension from URL
 */
function getExtension(url, mediaType) {
  try {
    const ext = path.extname(new URL(url).pathname).split('?')[0].toLowerCase();
    if (['.gif', '.png', '.jpg', '.jpeg', '.webp', '.mp4', '.webm'].includes(ext)) return ext;
  } catch {}
  return { gif: '.gif', video: '.mp4', image: '.png' }[mediaType] || '.bin';
}

/**
 * Get content type from extension
 */
function getContentType(ext) {
  return {
    '.gif': 'image/gif', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm'
  }[ext] || 'application/octet-stream';
}

/**
 * Process a single item
 */
async function processItem(item, messageId, index, total) {
  const label = `[${index + 1}/${total}] ${item.month} by ${item.author}`;

  if (item.mediaUrl?.includes('supabase.co/storage')) {
    console.log(`${label}: Already migrated ✓`);
    return { item, success: true, skipped: true };
  }

  if (!messageId) {
    console.log(`${label}: No message ID found ✗`);
    return { item, success: false, error: 'No message ID' };
  }

  try {
    // Refresh URL
    let freshUrl = item.mediaUrl;
    try {
      const result = await refreshMediaUrl(messageId);
      if (result.attachments?.[0]?.url) {
        freshUrl = result.attachments[0].url;
      }
    } catch (e) {
      console.log(`${label}: Refresh failed, trying original URL`);
    }

    if (DRY_RUN) {
      console.log(`${label}: [DRY RUN] Would download from ${freshUrl.substring(0, 60)}...`);
      return { item: { ...item, message_id: messageId }, success: true, dryRun: true };
    }

    // Download
    const buffer = await downloadFile(freshUrl);
    const sizeKB = (buffer.length / 1024).toFixed(1);

    // Upload
    const ext = getExtension(freshUrl, item.mediaType);
    const safeName = item.author.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${item.month}/${safeName}_${messageId}${ext}`;
    const publicUrl = await uploadToSupabase(buffer, fileName, getContentType(ext));

    console.log(`${label}: ${sizeKB}KB → ${fileName} ✓`);

    return {
      item: { ...item, message_id: messageId, mediaUrl: publicUrl, originalDiscordUrl: item.mediaUrl },
      success: true
    };
  } catch (err) {
    console.log(`${label}: ${err.message} ✗`);
    return { item, success: false, error: err.message };
  }
}

/**
 * Main
 */
async function main() {
  console.log('=== Discord Media → Supabase Migration ===');
  if (DRY_RUN) console.log('>>> DRY RUN MODE <<<\n');

  const dataJson = JSON.parse(fs.readFileSync(DATA_JSON_PATH, 'utf-8'));
  const items = dataJson.topGenerations.slice(0, LIMIT);
  console.log(`Processing ${items.length} items\n`);

  // Batch find all message IDs first
  const messageIds = await batchFindMessages(items);

  // Process each item
  console.log('\nMigrating media files...');
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const messageId = messageIds.get(item.mediaUrl);
    const result = await processItem(item, messageId, i, items.length);
    results.push(result);

    if (!result.skipped && !result.dryRun) {
      await delay(300); // Rate limit
    }
  }

  // Update data.json
  if (!DRY_RUN) {
    const updated = [...dataJson.topGenerations];
    results.forEach((r, i) => {
      if (r.success && !r.skipped && !r.dryRun) updated[i] = r.item;
    });
    dataJson.topGenerations = updated;
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(dataJson, null, 2));
    console.log('\n✓ data.json updated');
  }

  // Summary
  const migrated = results.filter(r => r.success && !r.skipped && !r.dryRun).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n=== Summary ===`);
  console.log(`✓ Migrated: ${migrated}`);
  console.log(`- Skipped: ${skipped}`);
  console.log(`✗ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  ${r.item.month} by ${r.item.author}: ${r.error}`);
    });
  }
}

main().catch(console.error);
