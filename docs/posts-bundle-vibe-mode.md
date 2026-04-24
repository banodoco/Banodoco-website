# Vibe Mode Briefing

## Table of Contents

- [Overview](#overview)
- [Reuse Anchors](#reuse-anchors)
- [Locked Constraints](#locked-constraints)
- [Settled Decisions](#settled-decisions)
- [Out of Scope](#out-of-scope)
- [Phase 1 - Foundation](#phase-1---foundation)
- [Step 1 - Dependencies, Flag, and Secrets](#step-1---dependencies-flag-and-secrets)
- [Step 2 - Types](#step-2---types)
- [Step 3 - Metering Migration](#step-3---metering-migration)
- [Phase 2 - Agent Proxy](#phase-2---agent-proxy)
- [Step 4 - Agent Proxy Edge Function](#step-4---agent-proxy-edge-function)
- [Step 5 - System Prompt](#step-5---system-prompt)
- [Phase 3 Part A - Manifest, Tree, IndexedDB, and Service Worker](#phase-3-part-a---manifest-tree-indexeddb-and-service-worker)
- [Step 6 - Manifest Parity](#step-6---manifest-parity)
- [Step 7 - Virtual File Tree](#step-7---virtual-file-tree)
- [Step 8 - IndexedDB Adapter](#step-8---indexeddb-adapter)
- [Step 9 - Service Worker and Blob Fallback](#step-9---service-worker-and-blob-fallback)
- [Phase 3 Part B - Preview Iframe](#phase-3-part-b---preview-iframe)
- [Step 10 - Preview Frame and Resize Handling](#step-10---preview-frame-and-resize-handling)
- [Phase 4 - Session Hook and Editor UI](#phase-4---session-hook-and-editor-ui)
- [Step 11 - useVibeSession](#step-11---usevibesession)
- [Step 12 - BundleAgentEditor](#step-12---bundleagenteditor)
- [Phase 5 - SubmitPost Integration, Ship It, and Admin Badge](#phase-5---submitpost-integration-ship-it-and-admin-badge)
- [Step 13 - SubmitPost Integration](#step-13---submitpost-integration)
- [Step 14 - Ship It](#step-14---ship-it)
- [Step 15 - Admin Badge](#step-15---admin-badge)
- [Step 16 - Docs Addendum](#step-16---docs-addendum)
- [Phase 6 - Tests, Smoke, and Validation](#phase-6---tests-smoke-and-validation)
- [Step 17 - Automated Tests](#step-17---automated-tests)
- [Step 18 - Manual Smoke](#step-18---manual-smoke)
- [Execution Order](#execution-order)
- [Validation Order](#validation-order)
- [Watch Items](#watch-items)

## Overview

This briefing executes Vibe Mode as a fourth `SubmitPost` tab layered on top of the static-bundle infrastructure documented in `docs/posts-bundle-mode.md`; it extends that system rather than forking it, keeps `post.render_mode='bundle'`, keeps the existing bundle upload/serve/review path, and adds a local-first LLM authoring surface that edits a virtual file tree, previews through a sandboxed `srcdoc` iframe, persists in IndexedDB until `Ship It`, and then hands the generated ZIP to the existing bundle pipeline. The implementation reuses shipped surfaces anchored in `src/features/bundlePosts/manifestSchema.ts`, `src/features/bundlePosts/BundleFrame.tsx`, `src/features/bundlePosts/useBundleResize.ts`, `src/pages/PostDetail/BundleView.tsx`, `../supabase/functions/process-bundle/index.ts`, `../supabase/functions/serve-bundle/index.ts`, `../supabase/functions/issue-preview-token/index.ts`, and `../supabase/functions/cloudflare-stream-ingest/index.ts`, with `VITE_ENABLE_VIBE_MODE=false` by default in production and the four baked out-of-scope items held firm: multi-user collaborative vibing, server-side SSR preview for unpublished vibes, monetization of API usage, and fine-tuning the agent.

> **SD-015 override:** `handleVibeShipped` is `setMode('bundle')` directly, not `refreshPost()`. `refreshPost()` does not exist in `src/hooks/usePost.ts` (`UsePostResult` at L7-L15 and the return at L372 expose no refetch helper, and the fetch runs from the one-shot `useEffect` keyed on `[slugOrId]` at L206). The executor must follow `setMode('bundle')` and let `BundleUpload`'s `loadLatestBundle` effect refresh the pending bundle view.

## Reuse Anchors

- Authoritative parent doc: `docs/posts-bundle-mode.md`
- Manifest validator reused in place: `src/features/bundlePosts/manifestSchema.ts`
- Production iframe wrapper reused in place: `src/features/bundlePosts/BundleFrame.tsx`
- Production resize hook reused with a one-line preview-mode relaxation later in this brief: `src/features/bundlePosts/useBundleResize.ts`
- Production bundle detail renderer remains unchanged: `src/pages/PostDetail/BundleView.tsx`
- Production ship pipeline reused as-is at `Ship It` time: `../supabase/functions/process-bundle/index.ts`
- Production serving stays unchanged: `../supabase/functions/serve-bundle/index.ts`
- Preview-token issuance stays reused for post-ship preview only: `../supabase/functions/issue-preview-token/index.ts`
- Edge Function auth pattern source for `agent-proxy`: `../supabase/functions/cloudflare-stream-ingest/index.ts`

## Locked Constraints

- Vibe mode is additive on top of static bundle posts. There is no new `render_mode` value and no new `post_bundles` columns for Vibe v1.
- Existing shipped bundle infrastructure is the parent system. Vibe extends it and never duplicates `process-bundle`, `serve-bundle`, `issue-preview-token`, `BundleFrame`, `BundleView`, or the manifest validators.
- `Ship It` reuses the existing bundle upload contract; there is no separate ship-specific Edge Function or alternate bundle-processing lane.
- Provenance is persisted in `manifest.source`, not request headers. The admin queue badge reads the stored manifest, and the value space is `source?: 'vibe' | 'manual'`.
- Live preview is `srcdoc` only, sandboxed with `allow-scripts`, guarded by CSP-via-`<meta>`, and protected by the defensive pre-doctype trim before any preview HTML is mounted.
- Preview origin is `'null'`. `useBundleResize` only accepts `'null'` when preview mode explicitly opts into that relaxation.
- Preview relative URLs resolve through an absolute-path `<base href="/submit/post/vibe-preview/<swId>/">`; this is required because `about:srcdoc` otherwise resolves against the embedding document URL.
- The Service Worker scope is per session at `/submit/post/vibe-preview/<swId>/`; stale sibling preview registrations must be unregistered, and the worker must never intercept the main app shell.
- Blob fallback is single-file only. If Service Worker registration is unavailable, rejected, or slow, multi-file previews show an instructional banner instead of a partial render.
- Claude tool calling is limited to `write_file(path, content)` and `apply_patch(path, search, replace)`, with the system prompt steering the model toward `apply_patch` by default.
- Streaming text narration is allowed, but tool execution is batched at the end of the response so the preview never sees half-finished files.
- Anthropic prompt caching uses exactly two cache breakpoints: `system + tools`, then the serialized `<file_tree>` XML as the first user-content part.
- Persistence is local-first in IndexedDB keyed by post draft id. There is no server-side staging store; `Ship It` is the only server-write moment.
- Snapshots are per turn and support forking. The storage model is full-tree snapshots with a ring buffer of 50 plus pinned entries.
- Image input to the agent is in scope and goes to Claude vision after client-side downscaling.
- Templates are in scope and start from pre-populated virtual trees; Vibe and Pro edit the same underlying tree, with the raw-code panel remaining in scope.
- The Vibe tab is feature-flagged behind `VITE_ENABLE_VIBE_MODE`, default OFF in production, and must be disabled on existing shipped bundle posts.
- Monaco, `idb`, `fflate`, and `dompurify` belong in the lazy-loaded Vibe editor chunk and must not load when the flag is off.
- Metering is additive through a `vibe_usage` table plus `vibe_usage_check` and `vibe_usage_charge` RPCs. Existing post and bundle tables remain untouched for this concern.

## Settled Decisions

| ID | Decision | Why |
| --- | --- | --- |
| SD-001 | Vibe Mode extends the existing static-bundle stack instead of creating a parallel post system. | The parent architecture in `docs/posts-bundle-mode.md` is already shipped and owns upload, review, serve, and production rendering. |
| SD-002 | Vibe keeps `post.render_mode='bundle'` and does not add Vibe-specific `post_bundles` columns in v1. | The brief explicitly requires additive reuse over schema fork, and the existing production surfaces already key off bundle mode. |
| SD-003 | Live preview is a sandboxed `srcdoc` iframe with `allow-scripts`, meta CSP, and null-origin resize handling. | Unpublished Vibe work needs fast local preview without writing server state, and null-origin isolation is part of the safety model. |
| SD-004 | Preview asset resolution uses a per-session Service Worker scoped to `/submit/post/vibe-preview/<swId>/`. | Scoped interception serves multi-file virtual trees without touching main app routes or production bundle serving. |
| SD-005 | Blob fallback exists only for single-file previews; multi-file fallback fails closed with UI guidance. | A full client-side URL rewriter for CSS, JS, `fetch()`, and SVG is too much maintenance for a rare fallback path. |
| SD-006 | Claude gets only `write_file` and `apply_patch`, and the system prompt prefers `apply_patch`. | The tool surface stays small, auditable, and aligned with patch-style editing over whole-file rewrites. |
| SD-007 | Streaming narration is visible in chat, but tool calls buffer until the turn settles and then apply as one batch. | The preview must never render half-applied file trees. |
| SD-008 | Anthropic prompt caching uses exactly two breakpoints: cached `system + tools`, then cached serialized file-tree XML. | Two breakpoints maximize cache reuse without fragmenting the prompt into low-hit segments. |
| SD-009 | `agent-proxy` is an Edge Function with server-side Anthropic credentials, bearer validation, per-user rate limiting, and per-session token budgets. | API keys and budget enforcement cannot live safely in the browser. |
| SD-010 | Session state persists in IndexedDB keyed by post draft id, with full-tree per-turn snapshots and forking. | Local-first persistence matches the zero-staging requirement and simplifies undo, history, and offline resilience. |
| SD-011 | Image input, starter templates, and the Vibe-to-Pro raw code panel are all in scope for v1. | They are explicitly baked decisions, and the authoring surface is meant to feel complete rather than crippled. |
| SD-012 | `Ship It` reuses `process-bundle` as-is and sends the same FormData contract as `BundleUpload`. | Reuse-over-fork is a hard constraint, and bundle review/approval should remain one pipeline. |
| SD-013 | Bundle provenance is stored in `manifest.source='vibe'` or `'manual'`, and the admin queue badge reads that persisted field. | Headers are not durable through `process-bundle`, while the manifest JSON is persisted and already validated. |
| SD-014 | The model whitelist is `claude-sonnet-4-6` by default, `claude-opus-4-7` behind a cost confirmation, and `claude-haiku-4-5` for cheap drafts. | Sonnet is the cost/quality default, Opus needs explicit friction, and provider sprawl is out of scope. |
| SD-015 | `handleVibeShipped` calls `setMode('bundle')` directly and does not call `refreshPost()`. | `src/hooks/usePost.ts` exposes no refetch helper at L7-L15/L372 and only runs from the effect keyed on `[slugOrId]` at L206; switching modes lets `BundleUpload` refresh itself without a fake helper. |
| SD-016 | Rollout stays behind `VITE_ENABLE_VIBE_MODE=false` in production, and usage metering is additive via the new `vibe_usage` table plus `check + charge` RPCs. | This keeps trunk safe while the paid API surface matures and enforces daily caps without altering existing post or bundle tables. |

## Out of Scope

- Multi-user collaborative vibing
- Server-side SSR preview for unpublished vibes
- Monetization of API usage
- Fine-tuning the agent

## Phase 1 - Foundation

### Step 1 - Dependencies, Flag, and Secrets

Add the four client/runtime dependencies in one pass and commit the lockfile update:

```bash
npm install @monaco-editor/react fflate idb dompurify
```

Add the Vibe feature flag to `.env.example` and keep the production default OFF:

```dotenv
VITE_ENABLE_VIBE_MODE=false
```

Set the three Functions secrets before deploying the new Edge Function:

```bash
supabase secrets set \
  ANTHROPIC_API_KEY=your-anthropic-api-key \
  VIBE_RATE_LIMIT_REQ_PER_MIN=30 \
  VIBE_DAILY_TOKEN_BUDGET=500000
```

Why these exact additions:

1. `@monaco-editor/react` powers the in-scope Vibe <-> Pro raw code panel.
2. `fflate` handles ZIP creation for `Ship It` and local `/export-zip`.
3. `idb` is the thin IndexedDB layer for local-first session persistence.
4. `dompurify` stays in the lazy Vibe chunk for any preview-side or code-panel sanitisation helpers.
5. `VITE_ENABLE_VIBE_MODE=false` keeps the paid API surface dark in production until stakeholders deliberately flip it.
6. `ANTHROPIC_API_KEY`, `VIBE_RATE_LIMIT_REQ_PER_MIN=30`, and `VIBE_DAILY_TOKEN_BUDGET=500000` encode the locked server-side metering defaults from the approved plan.

### Step 2 - Types

Create `src/types/vibe.ts` with the Vibe session primitives. The exact field names can stay implementation-local if they remain semantically equivalent to this shape, but the exported type surface must be:

```ts
export interface VirtualFile {
  path: string;
  kind: 'text' | 'binary-asset';
  mime: string;
  content?: string;
  assetId?: string;
}

export type VirtualFileTree = Record<string, VirtualFile>;

export interface VibeSnapshot {
  id: string;
  postDraftId: string;
  turnIndex: number;
  parentSnapshotId: string | null;
  label: string | null;
  source: 'template' | 'assistant_turn' | 'user_raw_edit' | 'fork' | 'undo';
  pinned: boolean;
  createdAt: string;
  tree: VirtualFileTree;
}

export type ChatPart =
  | { type: 'text'; text: string }
  | { type: 'image'; assetId: string; mime: string; width?: number; height?: number }
  | { type: 'system_notice'; text: string }
  | { type: 'tool_call'; tool: 'write_file' | 'apply_patch'; path: string }
  | { type: 'tool_result'; ok: boolean; summary: string };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
  parts: ChatPart[];
  snapshotId?: string | null;
}

export interface TurnUsage {
  model: 'claude-sonnet-4-6' | 'claude-opus-4-7' | 'claude-haiku-4-5';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedUsd: number;
  sessionTokensUsed: number;
  dailyTokensUsed: number;
  dailyTokensBudget: number;
}

export interface VibeSessionState {
  postDraftId: string;
  model: TurnUsage['model'];
  tree: VirtualFileTree;
  snapshots: VibeSnapshot[];
  chat: ChatMessage[];
  activeSnapshotId: string | null;
  usage: TurnUsage | null;
  pending: boolean;
  error: string | null;
}
```

Extend `BundleManifestV1` in `src/types/post.ts` with optional provenance:

```ts
export interface BundleManifestV1 {
  schemaVersion: 1;
  title: string;
  summary?: string;
  entry: string;
  ogImage?: string;
  source?: 'vibe' | 'manual';
  layout: {
    mode: 'inline-fixed' | 'inline-auto' | 'fullscreen';
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: number;
    allowFullscreenToggle?: boolean;
  };
  capabilities?: {
    scripts?: boolean;
    pointerLock?: boolean;
    popups?: boolean;
  };
  authoredAt?: string;
}
```

Snapshot policy is locked here, not left for later debate: full file tree per turn, ring buffer of 50 snapshots, with pinned snapshots exempt from eviction.

### Step 3 - Metering Migration

Create `supabase/migrations/20260422000000_vibe_usage.sql` as a purely additive migration. It must not touch `posts`, `post_bundles`, or the `render_mode` enum.

```sql
create table public.vibe_usage (
  user_id uuid not null,
  day date not null,
  req_this_minute int not null default 0,
  minute_window_started_at timestamptz not null default now(),
  tokens_today_input bigint not null default 0,
  tokens_today_output bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index vibe_usage_updated_at_idx
  on public.vibe_usage (updated_at desc);

alter table public.vibe_usage enable row level security;

revoke all on public.vibe_usage from anon, authenticated;

create or replace function public.vibe_usage_check(p_user_id uuid)
returns table (allowed boolean, reason text, tokens_remaining bigint)
language sql
security definer
set search_path = public
as $$
  select
    true as allowed,
    null::text as reason,
    greatest(
      0::bigint,
      500000::bigint
      - coalesce(v.tokens_today_input, 0::bigint)
      - coalesce(v.tokens_today_output, 0::bigint)
    ) as tokens_remaining
  from (select p_user_id) as input
  left join public.vibe_usage v
    on v.user_id = input.p_user_id
   and v.day = current_date;
$$;

create or replace function public.vibe_usage_charge(p_user_id uuid, p_input int, p_output int)
returns table (ok boolean, daily_tokens bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vibe_usage%rowtype;
begin
  insert into public.vibe_usage (
    user_id,
    day,
    req_this_minute,
    minute_window_started_at,
    tokens_today_input,
    tokens_today_output,
    updated_at
  )
  values (
    p_user_id,
    current_date,
    1,
    now(),
    greatest(p_input, 0),
    greatest(p_output, 0),
    now()
  )
  on conflict (user_id, day) do update
    set
      req_this_minute = case
        when public.vibe_usage.minute_window_started_at > now() - interval '1 minute'
          then public.vibe_usage.req_this_minute + 1
        else 1
      end,
      minute_window_started_at = case
        when public.vibe_usage.minute_window_started_at > now() - interval '1 minute'
          then public.vibe_usage.minute_window_started_at
        else now()
      end,
      tokens_today_input = public.vibe_usage.tokens_today_input + greatest(p_input, 0),
      tokens_today_output = public.vibe_usage.tokens_today_output + greatest(p_output, 0),
      updated_at = now()
  returning * into v_row;

  return query
  select
    true as ok,
    v_row.tokens_today_input + v_row.tokens_today_output as daily_tokens;
end;
$$;

revoke all on function public.vibe_usage_check(uuid) from public, anon, authenticated;
revoke all on function public.vibe_usage_charge(uuid, int, int) from public, anon, authenticated;
grant execute on function public.vibe_usage_check(uuid) to service_role;
grant execute on function public.vibe_usage_charge(uuid, int, int) to service_role;
```

Migration requirements that are not optional:

1. Table columns stay exactly `(user_id UUID, day DATE, req_this_minute INT, minute_window_started_at TIMESTAMPTZ, tokens_today_input BIGINT, tokens_today_output BIGINT, updated_at TIMESTAMPTZ, PRIMARY KEY (user_id, day))`.
2. `vibe_usage_check` is the read-only preflight gate.
3. `vibe_usage_charge` is the single-settle post-turn write path.
4. Metering remains `check + charge`, never reserve-then-settle.

## Phase 2 - Agent Proxy

### Step 4 - Agent Proxy Edge Function

Scaffold `supabase/functions/agent-proxy/{index.ts, anthropic.ts, safety.ts}`. This section is contract-first: downstream implementation should be able to follow it without consulting earlier plan drafts.

Endpoint and auth contract:

```ts
POST /functions/v1/agent-proxy

{
  postDraftId: string;
  model: 'claude-sonnet-4-6' | 'claude-opus-4-7' | 'claude-haiku-4-5';
  tree: VirtualFileTree;
  chatHistory: ChatMessage[];
  userTurn: {
    text: string;
    images?: Array<{
      mime: string;
      dataUrl: string;
      width: number;
      height: number;
    }>;
  };
}
```

Mirror the bearer-auth pattern from `../supabase/functions/cloudflare-stream-ingest/index.ts`:

```ts
const authHeader = req.headers.get('authorization');
if (!authHeader) {
  return jsonResponse(401, { error: { code: 'vibe_auth_required' } });
}

const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser(accessToken);

if (authError || !user) {
  return jsonResponse(401, { error: { code: 'vibe_auth_required' } });
}
```

Server event stream contract:

```text
text
summary
tool_call
tool_result
safety_warning
usage
done
refusal
error
```

SSE event types, in the exact approved order: `text|summary|tool_call|tool_result|safety_warning|usage|done|refusal|error`.

Implementation rules for `index.ts`:

1. Run `vibe_usage_check` before the Anthropic call. If it disallows the turn, return `429` with `error.code` equal to `vibe_rate_limited` or `vibe_daily_budget_exceeded`.
2. Call into `anthropic.ts` for the streamed model request. Default model is `claude-sonnet-4-6`; server whitelist is exactly `{sonnet-4-6, opus-4-7, haiku-4-5}`.
3. Use exactly two Anthropic `cache_control` breakpoints: first on the cached `system + tools` block, then on the `<file_tree>` XML content part that opens the first user message.
4. Stream assistant narration immediately, but buffer every `tool_use` until `message_stop`; only after the model finishes do you apply the tool batch and emit `tool_result`.
5. Parse the leading `<summary>…</summary>` line out of the streamed assistant text and emit it exactly once as `event: summary` before any passthrough `event: text` bytes from the same turn.
6. Refusal handling is explicit: if `stop_reason === 'refusal'`, emit `event: refusal` with `{ text }` and apply no tool calls.
7. Call `vibe_usage_charge` exactly once after the turn settles. The final `usage` event carries token totals and estimated USD.
8. Client images must be downscaled before upload to `<=1920px` on the longest edge and `<=5MB` payload size.

Tool schemas to encode in `anthropic.ts`:

```ts
write_file({
  path: string,
  content: string
})

apply_patch({
  path: string,
  search: string,
  replace: string
})
```

Tool safety invariants:

1. Paths are POSIX-style only.
2. No `..` segments.
3. No absolute paths.
4. Enforce an extension allowlist.
5. Reject files larger than `<=10MB`.
6. `apply_patch` must fail with `{ ok: false, error }` when the search block matches `0` or `>1` times.

`safety.ts` is advisory, not a hard block. It runs a regex scan over the final tree and emits `safety_warning` when it finds any of:

```text
<script src="http://
//<non-allowlisted>
javascript:
foreign iframe
```

### Step 5 - System Prompt

Create `supabase/functions/agent-proxy/systemPrompt.ts` and keep it fully separate from `src/features/bundlePosts/agentPrompt.ts`. The existing bundle prompt helper remains untouched.

`SYSTEM_PROMPT_V1` must encode the following non-negotiable instructions:

1. You are editing a bundle-mode post inside a virtual file tree.
2. Prefer `apply_patch` over `write_file` unless a full-file rewrite is clearly simpler.
3. Keep paths relative, POSIX-style, and inside the supplied tree.
4. Preserve working files unless the user explicitly asks for removal.
5. Explain high-level intent in chat, then emit one settled batch of tool calls.
6. Most importantly: `index.html` content must begin with `<!doctype html>` then `<html>` then `<head>`. Never emit scripts, styles, or other content before `<head>`.

Turn-1 template handling is also locked: if the user picked a starter template, append that template's continuation prompt to `SYSTEM_PROMPT_V1` on turn 1 only, then omit it from later turns so cache reuse stays high.

## Phase 3 Part A - Manifest, Tree, IndexedDB, and Service Worker

### Step 6 - Manifest Parity

Update both manifest validators in lockstep:

1. `src/features/bundlePosts/manifestSchema.ts`
2. `../supabase/functions/_shared/bundle-manifest.ts` (resolved by `scripts/check-manifest-schemas.mjs:11`)

The new validation rule is byte-for-byte equivalent in both places:

```ts
if (input.source !== undefined && input.source !== 'vibe' && input.source !== 'manual') {
  return fail("source must be 'vibe' or 'manual' when present.");
}
```

Add these four fixtures at the exact paths below:

```text
testdata/bundle-manifests/valid/manifest-with-source-vibe.ok.json
testdata/bundle-manifests/valid/manifest-with-source-manual.ok.json
testdata/bundle-manifests/invalid/manifest-source-invalid-value.bundle_manifest_invalid.json
testdata/bundle-manifests/invalid/manifest-source-not-string.bundle_manifest_invalid.json
```

The first validation gate for the entire Vibe feature is:

```bash
node scripts/check-manifest-schemas.mjs
```

Do not proceed past Step 6 if that parity check fails.

### Step 7 - Virtual File Tree

Create `src/features/bundleVibeMode/virtualFileTree.ts` with this exported surface:

```ts
createTree
writeFile
applyPatch
serializeForClaude(tree)
toZipBlob(tree)
```

Implementation constraints:

1. `serializeForClaude(tree)` must emit files in alphabetical path order so Anthropic cache hits remain stable from turn to turn.
2. Binary assets are represented as:

```xml
<file path="..." encoding="binary-asset" ref="asset-<id>"/>
```

3. `toZipBlob(tree)` uses `fflate`.
4. `writeFile` and `applyPatch` must share the same path and size invariants enforced server-side so client previews and server turns stay aligned.

### Step 8 - IndexedDB Adapter

Create `src/features/bundleVibeMode/db.ts` with an `idb` wrapper over `banodoco-vibe` schema version `1`.

Object stores and indexes:

```text
sessions  -> keyPath `postDraftId`
snapshots -> keyPath `id`, indexes `byDraftAndTurn`, `byDraft`
assets    -> keyPath [postDraftId, assetId]
```

Required exports:

```ts
saveSession
loadSession
saveSnapshot
listSnapshots
fork
putAsset
getAsset
evictOldUnpinned
```

Quota handling is resolved here, not later:

1. Call `navigator.storage.estimate()` during session startup and before large asset writes.
2. If estimated usage exceeds 80% of quota, raise an eviction warning banner.
3. If IndexedDB throws `QuotaExceededError`, show a blocking dialog and stop accepting more asset writes until the user frees space or exports data.
4. `evictOldUnpinned` respects the locked snapshot policy: full-tree snapshots, ring buffer `50`, pinned snapshots preserved.

### Step 9 - Service Worker and Blob Fallback

Primary implementation files:

```text
public/vibe-preview-sw.js
src/features/bundleVibeMode/swClient.ts
src/features/bundleVibeMode/blobFallback.ts
```

Service Worker requirements:

1. `public/vibe-preview-sw.js` handles `install -> skipWaiting` and `activate -> clients.claim`.
2. The live preview scope is per session: `/submit/post/vibe-preview/<swId>/`.
3. On editor mount, enumerate `navigator.serviceWorker.getRegistrations()` and unregister any `/submit/post/vibe-preview/` registration whose scope does not match the current `swId`.
4. Register the new worker and await `.ready` with a hard `1500ms` timeout.
5. Bind the preview channel with `MessageChannel` and a `{ type: 'bind', port }` message.
6. Intercepted fetches reply with `Content-Type: <mime>` and `Cross-Origin-Resource-Policy: same-origin`.

The preview CSP must appear verbatim as a meta-delivered directive set:

```text
default-src * data: blob:;
script-src 'unsafe-inline' 'unsafe-eval' *;
style-src 'unsafe-inline' *;
connect-src *;
form-action 'none';
base-uri 'none';
```

Blob fallback rules are narrow by design:

1. Enter fallback only if `navigator.serviceWorker` is undefined, `register()` rejects, or `.ready` does not settle within `1500ms`.
2. Blob fallback is single-file only.
3. If the tree needs multiple files, refuse preview and show this exact banner copy:

```text
Multi-file preview requires a Service Worker. Use Chrome/Firefox with SW enabled, or reduce the bundle to a single file to preview without one.
```

4. Track blob URL lifecycle with `currentBlobUrls: Set<string>` and `previousBlobUrls: Set<string>`.
5. On each rebuild, move current URLs to previous, mint a fresh current set, and revoke the previous set on the iframe `load` event.

Preview sandbox and URL resolution are also locked:

```html
<iframe srcdoc sandbox="allow-scripts"></iframe>
```

No `allow-same-origin`.

Inject:

```html
<base href="/submit/post/vibe-preview/<swId>/">
```

Why the absolute-path base stays mandatory: `about:srcdoc` resolves relative URLs against the embedding document URL, so the preview needs a stable app-origin path that lands inside the current Service Worker scope without hard-coding an environment-specific host.

## Phase 3 Part B - Preview Iframe

### Step 10 - Preview Frame and Resize Handling

#### 10.1 One-line `useBundleResize.ts` relaxation

Edit `src/features/bundlePosts/useBundleResize.ts:42-56`. Add a defaulted third parameter `acceptNullOrigin = false` and update the origin check to the exact expression below. Every other line of the file stays byte-identical.

```ts
export function useBundleResize(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  layout: BundleManifestV1['layout'],
  acceptNullOrigin = false,
): UseBundleResizeResult {
  // ... existing body through the message handler ...
  if (!expectedOrigin || (event.origin !== expectedOrigin && !(acceptNullOrigin && event.origin === 'null'))) return;
  // ... rest unchanged ...
}
```

Why this shape:

1. The default `false` keeps `BundleFrame.tsx:43-52` byte-identical. Production passes only two args (`useBundleResize(iframeRef, manifest.layout)` at `BundleFrame.tsx:52`), so the compiled output stays the same and no production bundle iframe gains new behaviour.
2. The preview path opts in explicitly by passing `true`. This narrows the null-origin relaxation to the one call site that actually needs it.
3. The expression preserves the original `event.source` identity check at `useBundleResize.ts:55`; the relaxation only widens the origin leg of the guard.

Do NOT widen this edit. Do NOT move the expression to a helper, do NOT rewrite the effect, do NOT inline the parameter elsewhere. A single defaulted parameter and a single if-expression change is the full scope of Step 10.1.

#### 10.2 `VibePreviewFrame` HTML-shape transform

Create `src/features/bundleVibeMode/VibePreviewFrame.tsx`. The HTML-shape transform is a pure function that runs before `srcdoc` is ever assigned.

Defensive pre-doctype trim (non-negotiable, structural defence):

1. Search the tree-produced HTML for the first case-insensitive occurrence of `<!doctype`, `<html`, or `<head`, whichever appears earliest.
2. Discard every byte before that first occurrence.
3. This step runs regardless of whether `SYSTEM_PROMPT_V1` steered the agent correctly. It structurally closes the meta-CSP pre-parse gap, because any content emitted before `<head>` (including leading inline `<script>` tags, stray text nodes, HTML comments, XML prologues, or BOMs) would otherwise be parsed before the meta-CSP is seen.

Why the trim over relying on the system prompt alone: prompts are advisory and a single model lapse would let an injected pre-doctype `<script>` run with no CSP applied. The trim is the primary defence; the prompt rule at Step 5 is secondary.

After trimming, apply the four inject-position rules based on the shape of the remaining document:

- **Case A** — trimmed content matches `/<head[\s>]/i` (a real `<head>` tag exists). Scan the opening `<head …>` tag forward to its closing `>`, then inject `<base>` and the CSP `<meta>` as the first children of `<head>` (inserted immediately after that `>`).
- **Case B** — `<html>` is present but no `<head>`. Insert `<head><base><meta></head>` immediately after the opening `<html …>` tag's closing `>`.
- **Case C** — a `<!doctype …>` is present but no `<html>` wrapper. Insert `<html><head><base><meta></head>` right after the doctype token, and append `</html>` at the end of the document.
- **Case D** — body fragment (no doctype, no `<html>`, no `<head>`). Prepend `<!doctype html><html><head><base><meta></head><body>` and append `</body></html>`.

The injected `<base>` and `<meta>` tags are always the same pair:

```html
<base href="/submit/post/vibe-preview/<swId>/">
<meta http-equiv="Content-Security-Policy" content="default-src * data: blob:; script-src 'unsafe-inline' 'unsafe-eval' *; style-src 'unsafe-inline' *; connect-src *; form-action 'none'; base-uri 'none';">
```

Unit-test all four shapes in `previewFrame.test.ts`. Add a fifth test asserting that an input beginning with `<script>alert(1)</script><!doctype html>…` ends up with the `<script>` stripped and the doctype first — confirming the trim fires before any shape rule and before the iframe ever parses the document.

Why absolute-path `<base>` over environment-specific hosts: `about:srcdoc` resolves relative URLs against the *embedding document's* URL, so a bare relative path would resolve against the app shell and miss the Service Worker scope. An absolute app-origin path (`/submit/post/vibe-preview/<swId>/`) lands inside the per-session Service Worker scope regardless of environment, without having to hard-code `banodoco.com` vs staging vs localhost.

#### 10.3 Parallel-swap iframe lifecycle

`VibePreviewFrame` renders two iframes that alternate as active and inactive slots. Swap behaviour:

1. On each preview rebuild, set `srcdoc` on the currently **inactive** slot.
2. When the inactive slot's `load` event fires, swap `display` so the newly loaded slot becomes active and the previously active slot becomes inactive.
3. Target end-to-end swap budget is `<300ms`.
4. The same `load` event triggers the blob-URL revoke sweep described in Step 9.5 (`previousBlobUrls` is revoked, `currentBlobUrls` is moved to `previousBlobUrls`, and the fresh set stays mounted until the next rebuild).

Resize handling in the preview uses the one-line relaxation from Step 10.1:

```ts
useBundleResize(activeRef, manifest.layout, true);
```

The `true` third argument is the only place in the codebase that opts into null-origin acceptance. `BundleFrame.tsx` continues to omit the argument entirely.

## Phase 4 - Session Hook and Editor UI

### Step 11 - useVibeSession

Create `src/features/bundleVibeMode/useVibeSession.ts`. The hook is the single source of truth for a live Vibe authoring session; all UI sub-components read from it and dispatch turns through it.

Public contract:

```ts
export function useVibeSession(postDraftId: string): {
  tree: VirtualFileTree;
  snapshots: VibeSnapshot[];
  chat: ChatMessage[];
  sendTurn: (text: string, images?: Array<{ mime: string; dataUrl: string; width: number; height: number }>) => Promise<void>;
  fork: (snapshotId: string) => void;
  undo: () => void;
  slashCommand: (raw: string) => Promise<void>;
  pickSnapshot: (snapshotId: string) => void;
  usage: TurnUsage | null;
  pending: boolean;
  error: string | null;
};
```

`postDraftId` is non-nullable. If the caller passes `null` or `undefined`, `useVibeSession` throws during mount. Step 13.2 guarantees a JIT-created draft id before the editor mounts, so this contract is safe by construction.

`sendTurn` behaviour:

1. Fetch `POST /functions/v1/agent-proxy` with `headers: { Authorization: 'Bearer <accessToken>', 'Content-Type': 'application/json' }` and an `AbortController` so the caller can cancel.
2. Stream the response through an SSE parser that routes events by `event:` name:
   - `text` — append to the latest assistant `ChatMessage.parts` as streaming narration.
   - `tool_call` — render a placeholder `ChatPart` of `{ type: 'tool_call', tool, path }` but do NOT mutate the tree.
   - `tool_result` — apply the batched tool outcome to `tree` via `writeFile` / `applyPatch` from `virtualFileTree.ts`, then emit a `ChatPart` of `{ type: 'tool_result', ok, summary }`.
   - `safety_warning` — append as a `ChatPart` of `{ type: 'system_notice', text }`. Non-blocking.
   - `usage` — update `usage` state with the returned `TurnUsage` totals.
   - `refusal` — append an assistant `system_notice` with the refusal text and expose a "Rephrase" affordance in chat (UI lives in Step 12's `ChatBar`).
   - `error` — set `error` state and terminate the stream.
   - `done` — persist the post-turn tree as a new snapshot via `db.saveSnapshot` with `source: 'assistant_turn'`, clear `pending`.

Slash commands handled by `slashCommand(raw)`:

- `/undo` — pop the latest `assistant_turn` snapshot and restore the parent; records a new `undo` snapshot so undo is reversible.
- `/snapshot [name]` — pin the current snapshot (sets `pinned: true` and optional `label`).
- `/model <name>` — set the active model for subsequent turns. When the target is `claude-opus-4-7`, require an explicit confirmation (the UI layer wires this to a modal); other whitelist entries (`claude-sonnet-4-6`, `claude-haiku-4-5`) switch immediately.
- `/show-code` — toggle the Pro code panel visibility (consumed by `BundleAgentEditor`).
- `/export-zip` — call `toZipBlob(tree)` and trigger a local download. This exists because `Ship It` clears IndexedDB; `/export-zip` must be used BEFORE `Ship It` if the author wants to retain a local copy.

Session-level soft budget (per-session tokens, not the per-user daily budget enforced server-side):

1. Warn banner at `80000` session tokens used.
2. Hard confirm modal at `100000` session tokens used — the next turn requires an explicit "continue" click.
3. Neither threshold blocks the server-side `vibe_daily_budget_exceeded` 429; those two gates are independent.

`src/features/bundleVibeMode/previewLint.ts` runs after every `tool_result` is applied. It scans the post-tool-result tree with regexes that simulate the production `serve-bundle` CSP (stricter than the preview CSP) and emits `ChatPart` `system_notice` messages when it spots patterns that would break at production time (e.g. external script srcs, unsupported inline handlers). Lint findings never block the turn; they surface in chat so the author can fix them before `Ship It`.

### Step 12 - BundleAgentEditor

Create `src/features/bundleVibeMode/BundleAgentEditor.tsx`. This is the entrypoint to the entire Vibe UI. It is lazy-loaded so the Monaco editor, `idb`, `fflate`, and `dompurify` live exclusively in the lazy chunk and never ship when the feature flag is off.

Lazy entrypoint contract (used by `SubmitPost/index.tsx` in Step 13):

```ts
const BundleAgentEditor = React.lazy(() => import('@/features/bundleVibeMode/BundleAgentEditor'));
```

The `React.lazy()` call is required verbatim — not a plain dynamic `import()`, not a custom wrapper. The dist-chunk regression check in Step 18 explicitly verifies that building with `VITE_ENABLE_VIBE_MODE=false` does not emit any of Monaco/idb/fflate/dompurify in the runtime chunks.

Props:

```ts
interface BundleAgentEditorProps {
  postId: string;
  title: string;
  onShipped: (result: { bundleVersionId: string }) => void;
}
```

`postId` is non-nullable by parent contract (Step 13.2 JIT-creates the draft before mounting). The component still renders a defensive error card if `postId` is nullish, because the lazy chunk could otherwise crash with a less actionable stack.

Layout:

- **Left ~60%** — `<VibePreviewFrame>` (the parallel-swap preview from Step 10).
- **Right ~40%** — scrollable chat transcript above a bottom-pinned `<ChatBar>`.
- **Top toolbar** — model selector, snapshot-graph button, `/show-code` toggle, `/export-zip` button, `Ship It` button.
- **Bottom** — `<AssetTray>` spanning the full width.

Sub-components (all colocated under `src/features/bundleVibeMode/`):

1. **`ChatBar`** — multiline textarea with paste/drop handlers for images, `⌘`/`Ctrl`+`Enter` submit, disabled during streaming, footer displays session cost + daily budget + current model.
2. **`AssetTray`** — drag-drop/paste zone, embedded `MediaUploader` (reused shipped component), and a new `LibraryPickerModal` built on `useArtPieces` + `useCommunityResources` so the author can pull existing assets into the virtual tree.
3. **`SnapshotGraph`** — visual tree of snapshots; clicking a node restores that snapshot, shift-click forks from it. Pinned snapshots render with a lock glyph.
4. **`ProCodePanel`** — Monaco-backed raw code editor. User edits write through to the same `VirtualFileTree` and each save records a snapshot with `source: 'user_raw_edit'`.
5. **`TemplatePicker`** — shown when the tree is empty. Uses `import.meta.glob('./templates/**/{files,_meta.json}', ...)` to statically bundle five starter templates under `src/features/bundleVibeMode/templates/<name>/{files, _meta.json}`. Template names are exactly:
   - `minimal`
   - `scrolly-story`
   - `interactive-toy`
   - `article-with-embeds`
   - `data-viz`

   `_meta.json` carries the optional turn-1 continuation prompt that Step 5 concatenates onto `SYSTEM_PROMPT_V1` on the first agent turn.
6. **`LibraryPickerModal`** — separate sub-component inside `AssetTray`, wraps `useArtPieces` + `useCommunityResources`, and commits picked assets as `binary-asset` entries in the tree with new `VirtualFile` records.

Asset intake pipeline (`AssetTray` + `ChatBar` image paste):

1. Accept image drops, pastes, and picks from the library modal.
2. If an image is `>5MB` or its longest edge is `>1920px`, push it through a `<canvas>` downscale (contain, preserve aspect ratio) before either storing it in IndexedDB or forwarding it to the agent.
3. Server-side image ingest in `agent-proxy` (Step 4) already enforces the same `<=1920px` / `<=5MB` ceiling as a second line of defence.

`ChatBar` details:

1. Multiline textarea, auto-grows to a capped height.
2. Image paste/drop handlers feed the same downscale pipeline.
3. `⌘`/`Ctrl`+`Enter` submits the turn; plain `Enter` inserts a newline.
4. Disabled while `useVibeSession.pending` is true.
5. Persistent footer strip shows `usage.sessionTokensUsed` + `usage.dailyTokensUsed / dailyTokensBudget` + `usage.model`.

## Phase 5 - SubmitPost Integration, Ship It, and Admin Badge

### Step 13 - SubmitPost Integration

This step threads the lazy Vibe editor into the existing `src/pages/SubmitPost/index.tsx` flow. Every line-number anchor below is taken from the current shipped file and must survive transcription verbatim so the executor can land the edit without guessing.

#### 13.1 EditorMode extension and Vibe tab guard

Extend the `EditorMode` type at `src/pages/SubmitPost/index.tsx:46` from `'raw' | 'rich' | 'bundle'` to `'raw' | 'rich' | 'bundle' | 'vibe'`.

Add the Vibe tab button in the mode selector at `src/pages/SubmitPost/index.tsx:657-696`, immediately after the Bundle tab. The tab button must carry BOTH guards:

```tsx
{import.meta.env.VITE_ENABLE_VIBE_MODE && (
  <button
    type="button"
    onClick={() => handleModeChange('vibe')}
    disabled={isExistingBundlePost}
    aria-pressed={mode === 'vibe'}
  >
    Vibe
  </button>
)}
```

Why both guards:

1. `import.meta.env.VITE_ENABLE_VIBE_MODE` hides the tab entirely when the flag is off, mirroring SD-016 and keeping paid API surfaces dark in production until flipped.
2. `disabled={isExistingBundlePost}` mirrors the Raw tab at `L661` and the Rich tab at `L674`. Re-vibing an already-shipped bundle post is explicitly out of scope for v1 — the author's only path to iterate on a shipped bundle is `/export-zip` before `Ship It` on a fresh post, or uploading a new bundle version via the Bundle tab.

#### 13.2 `handleModeChange` JIT-creates a Vibe draft

Extend `handleModeChange` at `src/pages/SubmitPost/index.tsx:565-613`. The new `'vibe'` branch must mirror the existing bundle-mode branch at `L586-595` so the editor never mounts with `postId === null`. The verbatim callback body to add:

```ts
const handleModeChange = useCallback(
  async (nextMode: EditorMode) => {
    if (nextMode !== 'bundle' && nextMode !== 'vibe') {
      if (!isExistingBundlePost) {
        setMode(nextMode);
      }
      return;
    }

    if (postId) {
      setMode(nextMode);
      return;
    }

    if (!profile?.memberId || saving || publishing || deleting || togglingStatus) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const newPostId = await createDraft({
        title: title.trim() || (nextMode === 'vibe' ? 'Untitled vibe post' : 'Untitled bundle post'),
        memberId: profile.memberId,
      });

      setPostId(newPostId);
      setLastSavedAt(Date.now());
      navigate(`/submit/post/${newPostId}`, { replace: true });
      setMode(nextMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create a draft.');
    } finally {
      setSaving(false);
    }
  },
  [
    deleting,
    isExistingBundlePost,
    navigate,
    postId,
    profile?.memberId,
    publishing,
    saving,
    title,
    togglingStatus,
  ],
);
```

Rationale: if the user enters Vibe before the 800ms autosave fires, `postId` is still null. The JIT `createDraft` branch guarantees `BundleAgentEditor` always mounts with a real draft id, which is what Step 11's `useVibeSession(postDraftId)` non-null throw relies on. This also closes the debt-watch item `posts-authoring` for the Vibe path.

#### 13.3 Lazy Suspense mount and `handleVibeShipped` (SD-015 OVERRIDE)

Render the lazy Vibe editor with `Suspense` and a local loading fallback:

```tsx
const BundleAgentEditor = React.lazy(
  () => import('@/features/bundleVibeMode/BundleAgentEditor'),
);

// ...

{mode === 'vibe' && (
  <Suspense fallback={<VibeLoadingState />}>
    <BundleAgentEditor
      postId={postId!}
      title={title}
      onShipped={handleVibeShipped}
    />
  </Suspense>
)}
```

> **SD-015 OVERRIDE — `handleVibeShipped` body must be `setMode('bundle')` directly.** The approved plan text at Step 13.3 called `refreshPost()`. That helper does NOT exist in `src/hooks/usePost.ts`. `UsePostResult` at `src/hooks/usePost.ts:7-15` exposes only `{ post, mediaById, assetsById, cover, creator, loading, error }` (no refetch), the hook return at `L372` matches that surface, and the fetch is a one-shot `useEffect` keyed on `[slugOrId]` at `L206`. Calling a non-existent helper would compile-fail; worse, if that import were faked, the refresh would never happen. The gate accepted option (b): call `setMode('bundle')` directly.

Authoritative `handleVibeShipped`:

```ts
const handleVibeShipped = useCallback(
  (_result: { bundleVersionId: string }) => {
    setMode('bundle');
  },
  [],
);
```

Why this is safe:

1. The existing auto-switch effect at `src/pages/SubmitPost/index.tsx:559-563` already flips to `'bundle'` whenever `isExistingBundlePost` becomes true, so the mode change is idempotent.
2. `BundleUpload`'s own `loadLatestBundle` effect runs on mount and refreshes the pending bundle view — see `BundleUpload.tsx:184` where it fires after a successful upload; the same effect fires on entry-mount when we switch tabs.
3. The stale-closure window on `isExistingBundlePost` is at most one render frame and is not user-visible because the newly pending bundle is already in pending-review state.
4. No navigation is required — the post is in pending review with no public slug yet, so there is nothing to route to.

Do NOT invent a `refreshPost()` helper. Do NOT edit `src/hooks/usePost.ts`. Do NOT add a cache-bust navigation. The one-line `setMode('bundle')` body is the complete fix.

Polish follow-up (not a blocker): if manual smoke in Step 18 shows stale chat transcript flashing for a frame before `BundleUpload` mounts, consider wrapping the mode switch in a brief transition state or `key`-remounting the editor subtree. Log this as a follow-up rather than blocking the landing.

#### 13.4 `persistDraft` mode-gate with full dep array

Extend the autosave callback at `src/pages/SubmitPost/index.tsx:250-300` to skip body writes when `mode === 'vibe' || mode === 'bundle'` (Vibe authors don't write to `posts.body`, they ship via the bundle pipeline). Verbatim callback:

```ts
const persistDraft = useCallback(async () => {
  if (!postId) return;
  if (mode === 'vibe' || mode === 'bundle') {
    // Vibe and Bundle modes do not persist markdown body; Ship It handles all server writes.
    return;
  }

  setSaving(true);
  setError(null);
  try {
    await saveDraft(postId, {
      title: title.trim() || 'Untitled post',
      body,
    });
    setLastSavedAt(Date.now());
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to save draft.');
  } finally {
    setSaving(false);
  }
}, [body, mode, postId, title]);
```

The dep array MUST explicitly include `mode`. Do not ellipse it, comment it out, or rely on stable identity — a closure-stale `mode` value on rapid flag flips would silently overwrite draft body with Vibe-mode state, which is the exact failure class the guard is trying to prevent.

#### 13.5 `handlePublish` and `handleUnpublish` mode-gates

At `src/pages/SubmitPost/index.tsx:361-412`, the footer Publish button must be hidden when `mode === 'vibe' || mode === 'bundle'`. Vibe and Bundle posts don't publish through the markdown flow; they go through bundle admin review. The existing Publish branch continues to own `raw` and `rich`.

At `src/pages/SubmitPost/index.tsx:414-441`, `handleUnpublish` in Vibe mode must be a title-only patch — do not rewrite `body`, do not touch `post_media` / `post_assets` (that is the `posts-editor` debt-watch concern, and Vibe doesn't contribute to it because it never writes body in the first place).

#### 13.6 Hide `CoverSection`; keep title input

`CoverSection` at `src/pages/SubmitPost/index.tsx:721-731` must be hidden when `mode === 'vibe' || mode === 'bundle'`. Vibe manifests own their own OG image via `manifest.ogImage`, and the bundle admin review flow handles cover derivation.

The title input at `src/pages/SubmitPost/index.tsx:734` stays visible in all four modes. Title is still the durable post-row field and stays editable in every editor surface.

### Step 14 - Ship It

Create `src/features/bundleVibeMode/shipIt.ts` with a single exported async function `shipVibeBundle({ tree, postId, title, onShipped })`.

Pipeline:

1. Build the ZIP via `toZipBlob(tree)` from Step 7.
2. Ensure the tree contains `post.json` with a valid `BundleManifestV1` that has `source: 'vibe'` stamped. If `post.json` is present without `source`, inject `'vibe'` before zipping. If `post.json` is absent, refuse to ship and surface an error — the manifest is the gating artifact for the bundle pipeline.
3. `POST` to `/functions/v1/process-bundle` with `FormData` that matches `BundleUpload.tsx:167-173` exactly:

   ```ts
   const formData = new FormData();
   formData.append('postId', postId);
   formData.append('zip', zipBlob, 'bundle.zip');
   const { data, error } = await supabase.functions.invoke<ProcessBundleResponse>('process-bundle', {
     body: formData,
   });
   ```

   The field names (`postId`, `zip`) and the invocation call are identical to the existing bundle upload — no new server-side code is required.
4. Reuse the error-code map from `BundleUpload.tsx:8-26` verbatim (`BUNDLE_UPLOAD_ERRORS`). Import it or inline a copy; do not invent new error codes.
5. On success: show a confirm dialog reading "This clears local snapshots" before clearing IndexedDB. Only after the user confirms:
   - Clear the IDB session for `postDraftId` via `db.ts` (remove session row, snapshots, and assets belonging to this draft).
   - Call `onShipped({ bundleVersionId: data.bundleVersionId })` to let SubmitPost flip to Bundle mode (Step 13.3).
6. If the user cancels the confirm dialog, abort without clearing IDB — the ZIP has already been accepted by `process-bundle`, so re-shipping is a no-op duplicate (`bundle_duplicate_upload`); we swallow that specific code on cancel-and-retry paths.

Provenance decision — why `manifest.source` instead of an HTTP header or multipart field:

1. `process-bundle` does not persist request headers; `X-Vibe-Generated: 1` would vanish by the time the admin reviews the bundle.
2. The `manifest` JSONB column is persisted verbatim (see `src/features/bundlePosts/manifestSchema.ts:107` where the validated manifest is returned for storage). Stamping `source: 'vibe'` there means the provenance survives the upload and reaches the admin queue with zero server changes.
3. Both manifest validators (`src/features/bundlePosts/manifestSchema.ts` and `../supabase/functions/_shared/bundle-manifest.ts`) were updated in Step 6 to accept the new field, so the field round-trips cleanly.

### Step 15 - Admin Badge

Extend the pending-bundle card at `src/pages/admin/Bundles/index.tsx` (around `L150+`) with a UI-only `Vibe` pill next to the review status. Render condition:

```tsx
{bundle.manifest?.source === 'vibe' && (
  <span className="badge">Vibe</span>
)}
```

Explicit constraints:

1. No query change. The existing admin query already pulls `bundle.manifest`, so reading `manifest?.source` costs nothing at the data layer.
2. No review-lane split. Vibe bundles go through the same `process-bundle` pipeline and the same admin approval flow; the pill is purely informational.
3. No migration. `manifest.source` lives in the existing JSONB column and was made valid by Step 6's validator parity update.
4. Style is a small neutral pill matching the surrounding admin chrome — no color signalling (Vibe is not "suspect" by default; it is additive metadata).

## Step 16 - Docs Addendum

This step is documentation work against the authoritative parent doc. Append the content below verbatim to `docs/posts-bundle-mode.md` under a new top-level section `## Vibe Mode (v2 authoring surface)`, after the existing static-bundle content. The addendum is self-contained; do not cross-reference `plan_v4.md` or any other intermediate plan artefact.

Treat everything between the start and end markers below as the addendum payload.

--- BEGIN VIBE MODE ADDENDUM ---

### Architecture

```text
+----------------------------------------------------------+
|  SubmitPost tab bar:  Raw | Rich | Bundle | Vibe  (v2)   |
+----------------------------------------------------------+
                           |
                           v
+----------------------------------------------------------+
|  BundleAgentEditor (React.lazy)                          |
|   left ~60%   VibePreviewFrame (srcdoc, sandbox=scripts) |
|   right ~40%  Chat transcript + ChatBar                  |
|   top         model / snapshot-graph / show-code / zip   |
|   bottom      AssetTray (paste / drop / library picker)  |
+----------------------------------------------------------+
                           |
         +-----------------+-----------------+
         v                 v                 v
+---------------+  +-----------------+  +---------------+
| virtualFile-  |  | useVibeSession  |  | IndexedDB     |
| Tree.ts       |  | (SSE client)    |  | banodoco-vibe |
|  createTree   |  |  sendTurn       |  |  sessions     |
|  writeFile    |  |  slashCommand   |  |  snapshots    |
|  applyPatch   |  |  usage / pending|  |  assets       |
|  serialize..  |  |                 |  |               |
|  toZipBlob    |  +-----------------+  +---------------+
+---------------+           |
                            v
+----------------------------------------------------------+
|  Edge Function: agent-proxy (Supabase Functions)         |
|   bearer auth mirroring cloudflare-stream-ingest         |
|   vibe_usage_check preflight (429 on rate/budget)        |
|   Anthropic streaming call with 2 cache_control          |
|     breakpoints (system+tools, <file_tree> XML)          |
|   batched tool_use until message_stop                    |
|   vibe_usage_charge single-settle                        |
+----------------------------------------------------------+
                            |
                            v
+----------------------------------------------------------+
|  Ship It -> toZipBlob -> POST process-bundle (reused)    |
|   manifest.source='vibe' stamped for admin badge         |
|   IDB session cleared after user confirm                 |
+----------------------------------------------------------+
                            |
                            v
+----------------------------------------------------------+
|  Admin bundle review queue (reused)                      |
|   reads bundle.manifest?.source === 'vibe' -> pill       |
+----------------------------------------------------------+
```

### Per-decision rationale (SD-001 through SD-016)

- **SD-001 — Vibe extends the static-bundle stack.** The parent architecture already ships upload, review, serve, and production rendering. A parallel post system would double the ownership surface for zero new capability; extension is cheaper and safer.
- **SD-002 — Keep `post.render_mode='bundle'`; no new `post_bundles` columns in v1.** The brief explicitly requires additive reuse over schema fork. Provenance rides on the JSONB manifest, which is already persisted end-to-end.
- **SD-003 — Sandboxed `srcdoc` iframe, `allow-scripts`, meta CSP, null-origin resize.** Unpublished work must preview locally without writing server state, and the null-origin sandbox is the primary host-isolation boundary.
- **SD-004 — Per-session Service Worker at `/submit/post/vibe-preview/<swId>/`.** Scoped interception serves multi-file virtual trees without touching main app routes or production bundle serving. The per-session scope also lets us unregister stale siblings cleanly.
- **SD-005 — Blob fallback is single-file only.** A full client-side URL rewriter for CSS `url()`/`@import`, JS `import`/`fetch()`, and SVG `<use href>` would be deep maintenance for a sub-1% path. Multi-file fallback fails closed with UI guidance instead.
- **SD-006 — `write_file` + `apply_patch` only; system prompt prefers `apply_patch`.** Tool surface stays small, auditable, and aligned with patch-style editing; whole-file rewrites remain possible when needed.
- **SD-007 — Streaming narration, batched tool execution.** Narration keeps the author informed in real time. Tool application waits for `message_stop` so the preview never sees a half-applied tree.
- **SD-008 — Exactly two Anthropic `cache_control` breakpoints.** (1) system + tools, (2) serialized `<file_tree>` XML. Two breakpoints maximize cache reuse without fragmenting the prompt.
- **SD-009 — `agent-proxy` Edge Function with server-side key, rate limit, budget.** API credentials and hard budget enforcement cannot live in the browser.
- **SD-010 — IndexedDB session state, full-tree snapshots per turn, forking.** Local-first persistence matches the zero-staging requirement and makes undo, history, and offline resilience straightforward.
- **SD-011 — Images, templates, and Vibe-to-Pro raw code are in scope.** They were explicit baked decisions; the authoring surface is meant to feel complete.
- **SD-012 — `Ship It` reuses `process-bundle` with identical FormData.** Reuse-over-fork is a hard constraint, and bundle review should remain one pipeline.
- **SD-013 — Provenance stored in `manifest.source='vibe'` or `'manual'`; admin badge reads it.** Headers do not survive `process-bundle`; the manifest JSON is persisted verbatim and already validated, so the admin badge needs zero query change.
- **SD-014 — Default `claude-sonnet-4-6`; Opus behind confirmation; Haiku for cheap drafts.** Sonnet is the cost/quality default. Opus needs explicit friction because it is ~5× the cost. Provider sprawl is out of scope.
- **SD-015 — `handleVibeShipped` calls `setMode('bundle')` directly.** `src/hooks/usePost.ts` exposes no refetch helper at L7-L15/L372 and only runs from the one-shot effect keyed on `[slugOrId]` at L206. A non-existent `refreshPost()` would compile-fail. Switching modes is the working substitute; `BundleUpload`'s own `loadLatestBundle` effect refreshes the view on mount.
- **SD-016 — `VITE_ENABLE_VIBE_MODE=false` default; additive `vibe_usage` table + `check`+`charge` RPCs.** The flag keeps trunk safe while the paid API surface matures. The metering table is additive (no changes to `posts`/`post_bundles`/`render_mode` enum) and enforces per-user daily caps at the database for cross-region consistency.

### Threat model

1. **LLM-injected malicious code.** The agent might emit `<script>` that exfiltrates data, drains crypto wallets, or phishes. Mitigations: the sandboxed `srcdoc` with null origin, the meta CSP restricting form submission (`form-action 'none'`) and framing (`base-uri 'none'`), the defensive pre-doctype trim so nothing runs before the meta CSP is parsed, the safety-scan `safety_warning` for obvious patterns, and final admin review before the bundle is public.
2. **Prompt injection from user images.** An uploaded image may contain adversarial text that steers the agent. Mitigations: the system prompt takes precedence in order, tool schema gates paths and sizes, `apply_patch` cannot introduce new files outside the existing tree without `write_file`, and the admin review backstop still applies before any bundle becomes public.
3. **Runaway token cost.** A malicious or confused user could loop until the bill hurts. Mitigations: `vibe_usage_check` preflight gate on every turn, `vibe_usage_charge` single-settle post-turn, per-minute rate limit (`VIBE_RATE_LIMIT_REQ_PER_MIN=30`), per-day token cap (`VIBE_DAILY_TOKEN_BUDGET=500000`), session-level soft budget with 80k/100k warn/confirm thresholds, and model whitelist (Sonnet default, Opus only behind explicit confirm).
4. **Agent-generated phishing UI.** A bundle could impersonate login screens, Discord OAuth flows, or fundraising UI. Mitigations: admin review before public listing, preview lint emits system notices for patterns that would break production CSP, the Vibe badge in admin queue makes AI-origin explicit, and the `frame-ancestors` production CSP prevents embedding elsewhere.

### Preview CSP rationale

Why `default-src *` instead of the more conservative production `'self'`: the preview lives in a null-origin `srcdoc`, and `'self'` in a null-origin document authorizes no origins — fetches to the author's own app origin would fail. The preview CSP is deliberately permissive because the sandbox attribute is the primary isolation, not the CSP. `base-uri 'none'` and `form-action 'none'` are the directives that close the real attack surface in this context.

The meta-CSP pre-parse gap — where the parser consumes content before reaching `<meta http-equiv="Content-Security-Policy">` — is structurally closed by the Step 10.2 defensive trim. The trim is the primary defence; `SYSTEM_PROMPT_V1`'s head-ordering rule is a secondary defence that keeps the common case well-shaped.

### Absolute-path `<base>` rationale

`about:srcdoc` resolves relative URLs against the *embedding document's* URL, so a plain relative path (`./foo.png`) would target the main app shell and miss the per-session Service Worker scope. Using an absolute app-origin path (`/submit/post/vibe-preview/<swId>/`) resolves requests deterministically into the SW scope regardless of environment, without having to hard-code production vs staging vs localhost hostnames.

### Service Worker + blob-fallback trade-offs

Primary path: SW with per-session scope. Desktop Chromium and Firefox coverage for Service Workers is effectively 100% on the Vibe target audience, so the primary path handles the overwhelming majority of sessions cleanly — including multi-file trees, CSS `url()` references, JS `import`, `fetch()`, and SVG `<use href>`.

Fallback path: single-file-only blob URLs. A full client-side URL rewriter for every primitive (CSS `url()`/`@import`, JS `import`/`fetch()`, SVG `<use href>`) would be deep maintenance for a <1% slice of sessions where SW is disabled or blocked. Instead the fallback:

1. Activates only if `navigator.serviceWorker` is undefined, `register()` rejects, or `.ready` does not settle within 1500ms.
2. Renders single-file trees via a blob URL.
3. For multi-file trees, shows the exact banner: "Multi-file preview requires a Service Worker. Use Chrome/Firefox with SW enabled, or reduce the bundle to a single file to preview without one."
4. Tracks `currentBlobUrls: Set<string>` and `previousBlobUrls: Set<string>`; on each rebuild the current set becomes previous, a fresh current set is minted, and the previous set is revoked on the iframe `load` event — preventing memory leaks across repeated turns.

### No-Playwright CI trade-off

The SW-interception path is covered by registration unit tests in `swClient.test.ts` (per-session scope, stale cleanup, 1500ms timeout) and the manual smoke plan in Step 18. We explicitly do not run Playwright for the SW-served render.

Rationale: the Playwright path for Service Worker interception is flaky enough in CI that the false-negative cost is higher than the coverage gain. The remaining ~1% of cases where SW fails fall through to the blob fallback, which is unit-tested in `blobFallback.test.ts` (single-file tree renders, multi-file tree triggers banner, three-rebuild cycle asserts revoke-count equals create-count from two rebuilds ago). The manual smoke in Step 18 backstops with a golden-path end-to-end flow and a deliberate SW-disabled-in-devtools variant.

### Metering design

Split: `vibe_usage_check` (read-only preflight) + `vibe_usage_charge` (single-settle post-turn). No reservation step. Exactly one charge per turn.

Why check+charge instead of reserve-then-settle:

1. Reservations require a hard commit on every turn, even when the turn refuses or errors out — that gives users free tokens on failure states.
2. A single post-turn charge correctly bills actual token usage and never over-bills. Double-counting would be a silent budget bug and far harder to unwind than a rare under-bill edge case.
3. Both RPCs are `SECURITY DEFINER` and granted only to `service_role`. Per-user daily caps are enforced at the database level so rate limits are consistent across Edge Function cold-start regions.

### Post-ship behaviour

Reopening a shipped Vibe post lands in the static Bundle tab automatically:

1. `isExistingBundlePost` flips true on load.
2. The existing auto-switch effect at `src/pages/SubmitPost/index.tsx:559-563` flips the active mode to `'bundle'`.
3. The Vibe tab is `disabled` (Step 13.1's `disabled={isExistingBundlePost}` guard).

To iterate on a shipped Vibe post, the author has three options:

1. Run `/export-zip` *before* `Ship It` to keep a local copy, then start a new post and re-upload via the Bundle tab.
2. Start a new post and re-vibe from a template.
3. Upload a new bundle version via the Bundle tab against the existing post.

### Out of scope (verbatim)

- Multi-user collaborative vibing.
- Server-side SSR preview for unpublished vibe SEO.
- Monetization of API usage.
- Fine-tuning the agent.
- Custom model providers (Claude only for v1).
- Embedding the vibe editor inside already-published posts.
- Real-time collaboration with other agents (Aider/Cursor pair-programming).

### Pre-doctype trim fidelity note

The preview HTML-shape transform strips any content before the first `<!doctype>`/`<html>`/`<head>` token — including leading comments (`<!-- … -->`), XML prologues (`<?xml …?>`), and byte-order marks — as a structural security defence that closes the meta-CSP pre-parse gap. Authors whose content depends on pre-head comments must move them inside `<head>`.

### /export-zip timing note

Running `/export-zip` creates a local backup of your virtual tree. Do this BEFORE `Ship It` if you want to keep a copy — the IDB session clears on successful upload and the slash command becomes unreachable once the editor flips to Bundle mode.

--- END VIBE MODE ADDENDUM ---

## Phase 6 - Tests, Smoke, and Validation

### Step 17 - Automated Tests

Author the following test files alongside the implementation. Every bullet is a hard requirement; the list is the acceptance surface for Phase 6.

1. **Manifest validator parity** — `node scripts/check-manifest-schemas.mjs` must pass with the four new fixtures landed in Step 6 (`testdata/bundle-manifests/valid/manifest-with-source-{vibe,manual}.ok.json` and `testdata/bundle-manifests/invalid/manifest-source-{invalid-value,not-string}.bundle_manifest_invalid.json`). Both validators must accept or reject identically; any divergence fails the first validation gate.
2. **`src/features/bundleVibeMode/virtualFileTree.test.ts`** — covers `applyPatch` (0-match and >1-match failure, exact single match success), `writeFile` (overwrite, new file, path guard), and `serializeForClaude` (alphabetical ordering, binary-asset XML shape `<file path="…" encoding="binary-asset" ref="asset-<id>"/>`).
3. **`src/features/bundleVibeMode/db.test.ts`** — covers round-trip `saveSession`/`loadSession`, ring-buffer eviction at 50 with pinned exemption, `fork` producing a new snapshot chain with the correct parent pointer, and asset put/get round-trip with the `[postDraftId, assetId]` composite key.
4. **`src/features/bundlePosts/useBundleResize.test.ts`** extended with three null-origin scenarios:
   1. `acceptNullOrigin = false` (default) rejects a null-origin `message` even when the `source` matches the tracked `contentWindow`.
   2. `acceptNullOrigin = true` accepts a null-origin `message` only when the `source` still matches the tracked `contentWindow`.
   3. Call without the third parameter (undefined) still rejects null-origin — preserves production byte-identity.
5. **`src/features/bundleVibeMode/previewFrame.test.ts`** — four tests, one per HTML shape A/B/C/D from Step 10.2, plus a fifth trim-before-doctype fixture asserting a leading `<script>alert(1)</script><!doctype html>…` input ends up with the `<script>` stripped and the meta CSP + `<base>` injected as first children of `<head>`.
6. **`src/features/bundleVibeMode/blobFallback.test.ts`** — three scenarios:
   1. Single-file tree renders via blob URL when SW is unavailable.
   2. Multi-file tree triggers the exact banner from Step 9.5.
   3. Three-rebuild cycle asserts the revoke count equals the create count from two rebuilds ago (confirms the `currentBlobUrls` → `previousBlobUrls` swap + revoke-on-load lifecycle does not leak across turns).
7. **`src/features/bundleVibeMode/shipIt.test.ts`** — asserts the `toZipBlob` output unzips cleanly, contains `post.json` with `manifest.source === 'vibe'`, is accepted by both validators (`src/features/bundlePosts/manifestSchema.ts` and `../supabase/functions/_shared/bundle-manifest.ts`), and is accepted by `node scripts/check-manifest-schemas.mjs` when the zip is expanded into a fixture directory.
8. **`src/features/bundleVibeMode/swClient.test.ts`** — covers the per-session `/submit/post/vibe-preview/<swId>/` scope, stale-registration enumeration + unregister, and the 1500ms `.ready` timeout triggering the blob fallback path.
9. **Metering RPC tests** (migration-linked, run against a local Supabase instance):
   1. `vibe_usage_check` is idempotent — calling it N times without any charge returns the same `tokens_remaining` every time.
   2. `vibe_usage_charge` is exactly-once per turn — the Edge Function never double-settles on a single SSE stream.
   3. Rate limiting: 30 charges in a rolling minute window, then the next `vibe_usage_check` returns `allowed: false` with `reason = 'vibe_rate_limited'`.

### Step 18 - Manual Smoke

Run the entire list against a local dev environment with `VITE_ENABLE_VIBE_MODE=true` and a seeded test account that has the Vibe-mode policy.

#### 18.1 Golden path

1. Create a new draft from the SubmitPost page.
2. Switch to the Vibe tab (the tab appears because the flag is on).
3. Pick the `minimal` template from `TemplatePicker`.
4. Send five chat turns plus one image attachment; confirm the agent narrates, then applies tool calls in one batch per turn.
5. Run `/undo` to revert the most recent turn.
6. Fork the current snapshot via `SnapshotGraph` shift-click.
7. Toggle the Pro code panel and make a small edit; confirm it creates a `user_raw_edit` snapshot.
8. Click `Ship It`; accept the confirm dialog; wait for the mode to flip to Bundle.
9. As an admin user, open the pending bundle queue and confirm the `Vibe` pill is rendered next to the review status.
10. Approve the bundle.
11. Visit the post detail page and confirm `BundleView` renders the Vibe-generated content exactly as production.

#### 18.2 Edge cases

Each item below must pass independently:

1. **Enter Vibe before the first autosave fires** — the JIT `createDraft` branch at Step 13.2 creates the draft on mode-change; the editor mounts with a real `postId`.
2. **Rate-limit 429 banner** — force 31 charges within 60 seconds; the next turn surfaces the rate-limit banner with `error.code = 'vibe_rate_limited'`.
3. **Daily budget 429 banner** — seed the `vibe_usage` table close to the `VIBE_DAILY_TOKEN_BUDGET=500000` ceiling; next turn surfaces the daily-budget banner.
4. **Refusal + Rephrase CTA** — steer the agent toward a prompt it refuses; confirm the `refusal` event renders as a system notice with a Rephrase button.
5. **6MB PNG paste downscale** — paste a >5MB PNG or one whose longest edge is >1920px; confirm the `<canvas>` downscale pipeline from Step 12 fires before upload.
6. **Four `entry.html` shapes + pre-doctype `<script>` trim** — cycle the preview through each of Case A/B/C/D plus a fixture beginning with `<script>alert(1)</script><!doctype html>…` and confirm the preview renders safely.
7. **SW disabled in devtools** — turn off Service Workers in browser devtools; confirm a single-file `minimal` template renders via the blob fallback.
8. **Multi-file template with no SW** — keep SW disabled; load `scrolly-story` (multi-file); confirm the exact banner from Step 9.5 is shown instead of a broken preview.
9. **Reopen a shipped Vibe post** — navigate to `/submit/post/<shippedPostId>`; confirm the Vibe tab is disabled and the editor auto-switches to the Bundle tab via `isExistingBundlePost`.

#### 18.3 Human-verification criteria

The registry flags 13 `verifiability-*` success criteria plus criteria 24/28/29/30/31/32/33/34 that require subjective UI inspection or runtime judgment (see Watch Items). Step 18 is where those criteria are evaluated — there is no automated substitute. Do not attempt to script them.

## Execution Order

Land phases in order. Each phase assumes the previous one has passed its gate.

1. **Phase 1 — Foundation.** Dependencies, `.env.example`, Functions secrets, types, metering migration.
2. **Phase 2 — Agent proxy.** `agent-proxy` Edge Function + `SYSTEM_PROMPT_V1`.
3. **Phase 3 — Client primitives.**
   - Phase 3A — parity first (Step 6), then the client primitives (Step 7 virtual file tree, Step 8 IndexedDB), then Step 9 Service Worker + blob fallback.
   - Phase 3B — Step 10 preview iframe (one-line `useBundleResize` relaxation + `VibePreviewFrame` shape transform + parallel-swap lifecycle).
4. **Phase 4 — Session hook + editor UI.** `useVibeSession` + `previewLint`; then lazy `BundleAgentEditor` and all its sub-components.
5. **Phase 5 — SubmitPost integration.** Step 13 mode-gate threading, Step 14 `shipIt.ts`, Step 15 admin badge.
6. **Phase 6 — Tests, smoke, validation.** Step 17 automated tests, Step 18 manual smoke, plus the nine-step Validation Order below.

## Validation Order

Nine steps, run in this exact order. Manifest parity is **first**, before `npm test`, because a parity failure should block everything downstream — the admin queue and `process-bundle` have no way to recover from validator divergence.

1. `node scripts/check-manifest-schemas.mjs` — immediately after Step 6 lands the four fixtures and the validator updates. This is the fail-fast gate.
2. `npm test` — after Phase 3, once `virtualFileTree.test.ts`, `db.test.ts`, `useBundleResize.test.ts`, `previewFrame.test.ts`, `blobFallback.test.ts`, and `swClient.test.ts` are in place.
3. `tsc -b` — after Phase 2 (Edge Function types) and again after Phase 4 (session hook + editor types).
4. `supabase secrets set ANTHROPIC_API_KEY=… VIBE_RATE_LIMIT_REQ_PER_MIN=30 VIBE_DAILY_TOKEN_BUDGET=500000` — the agent-proxy will fail at runtime until these are set.
5. `curl` the deployed `agent-proxy` — verify the SSE framing matches Step 4 (events `text|summary|tool_call|tool_result|safety_warning|usage|done|refusal|error`), that turn 2 hits both `cache_control` breakpoints (system+tools, `<file_tree>` XML), and that forcing 31 requests in a minute returns `429` with `error.code = 'vibe_rate_limited'`.
6. **In-browser smoke** — verify SW-served render (multi-file template works), SW-disabled-in-devtools single-file fallback renders correctly, and multi-file template with no SW shows the exact banner from Step 9.5.
7. **Feature-flag regression** — build with `VITE_ENABLE_VIBE_MODE=false`; inspect the `dist` chunks; confirm Monaco, `idb`, `fflate`, and `dompurify` are not present in any runtime-loaded chunk. Only the lazy chunk should contain them, and the lazy chunk must not be pulled in when the flag is off.
8. **Ship It end-to-end** — put a ZIP through `process-bundle`, confirm the `Vibe` badge appears in the admin queue, approve the bundle, visit the post detail page, and confirm `BundleView` renders.
9. Full `vitest` and `npm run lint` — final tight sweep; no test regressions, no lint errors.

## Watch Items

Gate warnings — if an executor misses any of these four, the landing will regress:

1. **SD-015 override — `handleVibeShipped` body is `setMode('bundle')` directly, NOT `refreshPost()`.** `src/hooks/usePost.ts` does not export a refetch helper (`UsePostResult` at L7-15, return at L372, one-shot `useEffect` keyed on `[slugOrId]` at L206). `BundleUpload`'s own `loadLatestBundle` effect refreshes the pending bundle view once mode switches. Stale-closure window ≤1 render frame, not user-visible. See Step 13.3.
2. **Pre-doctype trim fidelity.** The Step 10.2 trim structurally strips any content before the first `<!doctype>`/`<html>`/`<head>` token — including leading comments, XML prologues, and BOMs — as a security defence. Authors who need pre-head comments must move them inside `<head>`.
3. **`/export-zip` timing.** Run `/export-zip` BEFORE `Ship It` if the author wants to keep a local copy — the IDB session clears on successful upload and the slash command becomes unreachable once the editor flips to Bundle mode.
4. **Post-ship transition polish.** If `setMode('bundle')` leaves the stale Vibe chat transcript flashing before `BundleUpload` mounts during manual smoke, wrap the mode switch in a brief transition state or key-remount the editor subtree. This is a polish follow-up, not a landing blocker.

Locked constraints — these show up in multiple places but bear repeating here so a reviewer can check them against one surface:

- Preview CSP directives must match Step 9's verbatim text: `default-src * data: blob:; script-src 'unsafe-inline' 'unsafe-eval' *; style-src 'unsafe-inline' *; connect-src *; form-action 'none'; base-uri 'none';`
- Exactly two `cache_control` breakpoints in the Anthropic call: `system + tools` and the `<file_tree>` XML.
- Tool execution is batched — buffer `tool_use` until `message_stop`, then apply as one settled batch.
- Service Worker scope is per-session `/submit/post/vibe-preview/<swId>/`; stale prior registrations unregister on mount; `.ready` timeout is `1500ms`.
- Blob fallback is single-file scope only; multi-file trees without SW render an instructional banner. Previous-turn blob URLs revoke after the iframe `load` event.
- `VibePreviewFrame` defensive pre-doctype trim is structural, not prompt-dependent.
- `useBundleResize.ts` change is a single line — `acceptNullOrigin = false` third param plus the updated origin check. `BundleFrame.tsx:43-52` still passes two args, so production is byte-identical. Do not widen.
- Both manifest validators must be updated in lockstep with the four exact fixture paths; `node scripts/check-manifest-schemas.mjs` is the first validation gate.
- The Vibe tab carries BOTH the `import.meta.env.VITE_ENABLE_VIBE_MODE` flag AND `disabled={isExistingBundlePost}`.
- `handleModeChange` JIT-creates a draft for Vibe mirroring the existing bundle branch at `L586-595`. `BundleAgentEditor` must never mount with `postId === null`.
- `persistDraft` dep array explicitly includes `mode`. Closure-stale mode on rapid flag flips is the failure mode.
- `Ship It` provenance rides on `manifest.source='vibe'` (additive JSONB field), NOT headers or separate multipart fields.
- Functions secrets `ANTHROPIC_API_KEY`, `VIBE_RATE_LIMIT_REQ_PER_MIN=30`, `VIBE_DAILY_TOKEN_BUDGET=500000` must be set via `supabase secrets set …` before the Edge Function will run.
- Metering is CHECK + CHARGE (not reserve-then-settle). Exactly one charge per turn; double-counting is a silent budget bug.
- Anthropic model whitelist: `claude-sonnet-4-6` (default), `claude-opus-4-7` (premium, requires client-side confirmation due to ~5× cost), `claude-haiku-4-5` (draft/cheap). Reject any other model server-side.
- `BundleAgentEditor` is `React.lazy(() => import('@/features/bundleVibeMode/BundleAgentEditor'))`. Monaco, `idb`, `fflate`, `dompurify` must live in the lazy chunk; verify with `VITE_ENABLE_VIBE_MODE=false` that they are not present in runtime chunks.

Expected human-verification success criteria (not defects) — the registry flags 13 `verifiability-*` entries plus criteria 24/28/29/30/31/32/33/34 that require `inspect_runtime_ui` or `subjective_judgment`. These cannot be auto-validated; Step 18 manual smoke covers them. Do not try to script them.

Debt-watch overlaps for situational awareness (none require Vibe-side work):

- `posts-editor` — published edits desync `posts.body` from `post_media`/`post_assets`. Vibe never touches `posts.body`, so this debt does not propagate.
- `bundle-versioning` — storage/db race in static-bundle uploads. Vibe reuses the pipeline, so it inherits whatever fix lands upstream.
- `submitpost-vibe-shipit` — the `refreshPost()` helper-doesn't-exist issue. Resolved by SD-015.
