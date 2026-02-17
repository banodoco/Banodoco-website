#!/usr/bin/env node
/**
 * Migrate Discord resources channel messages to community_resources table
 *
 * Reads from discord_messages (resources channel), extracts title/description/URLs,
 * classifies resource type, and inserts into community_resources.
 *
 * Usage: node scripts/migrate-discord-resources.mjs [--dry-run] [--limit N]
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
const RESOURCES_CHANNEL_ID = '1149372684220768367';

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
 * Fetch all resource channel messages from discord_messages, ordered by reaction_count DESC
 */
async function fetchResourceMessages() {
  const allMessages = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/discord_messages?channel_id=eq.${RESOURCES_CHANNEL_ID}&is_deleted=eq.false&order=reaction_count.desc&limit=${pageSize}&offset=${offset}`;
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
 * Check which discord_message_ids already exist in community_resources
 */
async function fetchExistingResources() {
  const existing = new Set();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/community_resources?source_type=eq.discord&select=discord_message_id&limit=${pageSize}&offset=${offset}`;
    const resp = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Failed to fetch existing community_resources: ${resp.status} ${text}`);
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
 * Extract all URLs from a string
 */
function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  const matches = text.match(urlRegex) || [];
  // Clean trailing punctuation that might be part of the sentence, not the URL
  return matches.map(u => u.replace(/[.,;:!?)]+$/, ''));
}

/**
 * Extract title from message content and embeds
 * Priority: first line of content, first embed title, first 80 chars of content
 */
function extractTitle(content, embeds) {
  if (content) {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0];
      // If first line is reasonably short, use it as title
      if (firstLine.length <= 200) {
        return firstLine;
      }
    }
  }

  // Try embed titles
  if (Array.isArray(embeds)) {
    for (const embed of embeds) {
      if (embed.title) return embed.title;
    }
  }

  // Fallback: first 80 chars of content
  if (content) {
    const trimmed = content.trim();
    if (trimmed.length <= 80) return trimmed;
    return trimmed.substring(0, 80) + '...';
  }

  return 'Untitled Resource';
}

/**
 * Extract description: remaining content after first line
 */
function extractDescription(content) {
  if (!content) return null;
  const lines = content.split('\n');
  if (lines.length <= 1) return null;
  const rest = lines.slice(1).join('\n').trim();
  return rest.length > 0 ? rest : null;
}

/**
 * Extract primary URL from content and embeds
 */
function extractPrimaryUrl(content, embeds) {
  // First URL found in content
  const contentUrls = extractUrls(content);
  if (contentUrls.length > 0) return contentUrls[0];

  // First embed URL
  if (Array.isArray(embeds)) {
    for (const embed of embeds) {
      if (embed.url) return embed.url;
    }
  }

  return null;
}

/**
 * Extract additional URLs (all URLs except the primary one)
 */
function extractAdditionalUrls(content, embeds, primaryUrl) {
  const allUrls = new Set();

  // URLs from content
  for (const url of extractUrls(content)) {
    allUrls.add(url);
  }

  // URLs from embeds
  if (Array.isArray(embeds)) {
    for (const embed of embeds) {
      if (embed.url) allUrls.add(embed.url);
    }
  }

  // Remove primary URL
  if (primaryUrl) allUrls.delete(primaryUrl);

  return Array.from(allUrls);
}

/**
 * Determine resource type based on content keywords
 */
function classifyResourceType(content) {
  if (!content) return 'other';
  const lower = content.toLowerCase();

  if (/\b(tutorial|guide|how[- ]to)\b/.test(lower)) return 'tutorial';
  if (/\b(tool|app|software)\b/.test(lower)) return 'tool';
  if (/\b(model|checkpoint|lora)\b/.test(lower)) return 'model';
  if (/\b(workflow|comfyui)\b/.test(lower)) return 'workflow';

  return 'other';
}

/**
 * Get media info from attachments (keep original Discord URLs)
 */
function getMediaInfo(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return { mediaUrls: [], mediaTypes: [] };

  const mediaUrls = [];
  const mediaTypes = [];

  for (const att of attachments) {
    const url = att.url || att.proxy_url;
    if (!url) continue;

    const contentType = att.content_type || 'application/octet-stream';
    mediaUrls.push(url);
    mediaTypes.push(contentType);
  }

  return { mediaUrls, mediaTypes };
}

/**
 * Insert a record into community_resources via REST API
 */
async function insertResource(record) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/community_resources`, {
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
 * Process a single message
 */
async function processMessage(msg, index, total) {
  const messageId = String(msg.message_id);
  const content = msg.content || '';
  const embeds = msg.embeds || [];
  const label = `[${index + 1}/${total}] msg:${messageId}`;

  const title = extractTitle(content, embeds);
  const description = extractDescription(content);
  const primaryUrl = extractPrimaryUrl(content, embeds);
  const additionalUrls = extractAdditionalUrls(content, embeds, primaryUrl);
  const resourceType = classifyResourceType(content);
  const { mediaUrls, mediaTypes } = getMediaInfo(msg.attachments);

  if (DRY_RUN) {
    const titlePreview = title.length > 60 ? title.substring(0, 60) + '...' : title;
    console.log(`${label}: [DRY RUN] "${titlePreview}" type=${resourceType}, url=${primaryUrl || 'none'}, media=${mediaUrls.length}, reactions=${msg.reaction_count}`);
    return { success: true, dryRun: true, resourceType };
  }

  try {
    const record = {
      source_type: 'discord',
      discord_message_id: messageId,
      title: title,
      description: description,
      primary_url: primaryUrl,
      additional_urls: additionalUrls.length > 0 ? additionalUrls : null,
      discord_author_id: String(msg.author_id),
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      media_types: mediaTypes.length > 0 ? mediaTypes : null,
      resource_type: resourceType,
      reaction_count: msg.reaction_count || 0,
      status: 'published',
      created_at: msg.created_at,
    };

    await insertResource(record);

    const titlePreview = title.length > 60 ? title.substring(0, 60) + '...' : title;
    console.log(`${label}: Inserted "${titlePreview}" type=${resourceType}, reactions=${msg.reaction_count}`);

    return { success: true, resourceType };
  } catch (err) {
    console.log(`${label}: ERROR - ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Main
 */
async function main() {
  console.log('=== Discord Resources -> community_resources Migration ===');
  if (DRY_RUN) console.log('>>> DRY RUN MODE <<<');
  if (LIMIT !== Infinity) console.log(`>>> LIMIT: ${LIMIT} <<<`);
  console.log('');

  // Fetch all resource channel messages
  console.log('Fetching resource channel messages...');
  const allMessages = await fetchResourceMessages();
  console.log(`Found ${allMessages.length} messages in resources channel`);

  // Fetch existing community_resources to skip duplicates
  console.log('Checking existing community_resources...');
  const existingIds = await fetchExistingResources();
  console.log(`Found ${existingIds.size} existing community_resources entries`);

  // Filter to messages not yet migrated
  const toProcess = allMessages.filter(msg => {
    const msgId = String(msg.message_id);
    return !existingIds.has(msgId);
  });

  const limited = toProcess.slice(0, LIMIT);
  console.log(`\nMessages to process: ${limited.length} (${allMessages.length} total, ${existingIds.size} already migrated)\n`);

  // Process each message
  const results = { migrated: 0, failed: 0, dryRun: 0 };
  const typeCounts = {};
  const failures = [];

  for (let i = 0; i < limited.length; i++) {
    const msg = limited[i];
    const result = await processMessage(msg, i, limited.length);

    if (result.dryRun) {
      results.dryRun++;
    } else if (result.success) {
      results.migrated++;
    } else {
      results.failed++;
      failures.push({ message_id: String(msg.message_id), error: result.error });
    }

    // Track resource type distribution
    if (result.resourceType) {
      typeCounts[result.resourceType] = (typeCounts[result.resourceType] || 0) + 1;
    }

    // Rate limit between inserts
    if (!result.dryRun) {
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
  console.log(`Failed: ${results.failed}`);

  if (Object.keys(typeCounts).length > 0) {
    console.log('\nResource type breakdown:');
    for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }
  }

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
