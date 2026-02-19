export const DISCORD_INVITE_URL = 'https://discord.gg/NnFxGvx94b';

export const CLAUDE_CODE_INSTRUCTIONS = `Your goal is to answer questons based on the below Discord. Dig into the messages based on user queries.

Discord DB Tables
=================
discord_messages: message_id, author_id, channel_id, content, created_at, reference_id
discord_members:  member_id, username, global_name, server_nick
discord_channels: channel_id, channel_name

Joins: messages.author_id → members.member_id | messages.channel_id → channels.channel_id
Note: IDs are numeric in JSON (jq: .author_id == 123, not "123")

API_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqbHd1dmtyeGx2b3N3d2tlcmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzcyMzcsImV4cCI6MjA4MjczNzIzN30.XSTztghf_6a_bpR62wZdoA4S4oafJFDMoPQDRR4dT08'
BASE='https://ujlwuvkrxlvoswwkerdf.supabase.co/rest/v1'

curl -s "$BASE/discord_messages?select=content,author_id&limit=10" -H "apikey: $API_KEY" | jq
curl -s "$BASE/discord_members?member_id=eq.123456789" -H "apikey: $API_KEY" | jq
curl -s "$BASE/discord_messages?content=ilike.*keyword*&limit=20" -H "apikey: $API_KEY" | jq
curl -s "$BASE/discord_messages?limit=1000&offset=1000" -H "apikey: $API_KEY" | jq  # page 2

Filters: eq, neq, gt, lt, ilike, is.null, not.is.null, in.(a,b,c)
         reference_id=not.is.null ✓   not.reference_id=is.null ✗

Tips: Max 1000 rows (use offset=N to page) • ~100 IDs per in.() query • Parallelize with &
      -H "Prefer: count=exact" → X-Total-Count header • Aggregation is client-side

Refresh Discord Media URLs
==========================
Discord CDN URLs expire. To refresh a message's attachment URLs:

curl -X POST 'https://ujlwuvkrxlvoswwkerdf.supabase.co/functions/v1/refresh-media-urls' \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message_id": "1465702490467995718"}'

Returns: { "success": true, "attachments": [...], "urls_updated": 1 }

Note: message_id must be a STRING (quoted) to preserve precision for Discord's large IDs.`;
