# Discord login and local Hivemind identity

The approved public homepage remains public: the same 148-bird ASCII animation,
statement, logo and Discord link, plus a small Sign in link. `/app/` shows the
login screen or authenticated account entry. This repo has no separate creative
web application to port; its protected functionality is account access and
approval of local Hivemind/Astrid connections. `/api/*` requires authentication
by default, except `/api/auth/session`, which exposes identity but no tokens.

## Identity authority

Use **the same Supabase project as Hivemind**, currently at the custom domain
`https://bundles.banodoco.ai`. Supabase owns the Discord OAuth2 Authorization
Code exchange and identity mapping already used by the local contributor broker.
The website uses that provider's server-side PKCE flow:

1. `/auth/login` generates an S256 challenge and a random verifier. A ten-minute,
   one-use HttpOnly flow cookie binds the server-held transaction to the browser.
2. Supabase `/auth/v1/authorize?provider=discord` directs the browser to Discord.
   Supabase manages Discord's OAuth `state` and exchanges its code using the
   server-held Discord client secret. Do not override its `state` parameter.
3. `/auth/callback` consumes the transaction and exchanges the returned Supabase
   authorization code with the server-held verifier. Missing/expired/forged or
   replayed transactions fail; a code from another browser fails PKCE upstream.
4. The backend verifies the access token at `/auth/v1/user`, requires a
   non-anonymous UUID account with a matching Discord identity, rotates the
   website session, and redirects only to `/app/` or `/connect/`.

This reuses the identity authority rather than creating another user database.
The contributor broker accepts a verified Supabase user token, not a raw Discord
bearer token. See [Supabase's Discord setup](https://supabase.com/docs/guides/auth/social-login/auth-discord)
and [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

Discord client ID/secret belong in **Supabase Auth → Sign In / Providers →
Discord**, not in this website's environment or frontend. The website only needs
the project's publishable key. Supabase access tokens arrive at runtime and stay
in server memory; provider and refresh tokens are discarded. Email/display-name
matching is never used for identity, and login grants no guild or editor rights.

## Exact setup

Railway service variables:

| Variable | Value |
| --- | --- |
| `APP_ORIGIN` | `https://www.banodoco.ai` (required on Railway) |
| `SUPABASE_URL` | `https://bundles.banodoco.ai` (existing custom auth domain) |
| `SUPABASE_PUBLISHABLE_KEY` | `<Hivemind project's sb_publishable_… key>` |
| `SESSION_TTL_SECONDS` | `3600` (default; also capped by provider token expiry minus 30 seconds) |
| `PORT` | Supplied by Railway; leave it managed by Railway |

Run **one replica/process**. The existing `railway.toml` start command stays
unchanged: package `/tmp/public`, change into it, then `python3 serve.py`.
`requirements.txt` installs Flask, Waitress and dotenv. Use `/health` for health
checks. Missing auth settings leave the public homepage available, show a setup
message, and deny protected functionality. Server/template files are packaged
for runtime use but blocked at the HTTP boundary.

Discord Developer Portal → existing application → OAuth2 → Redirects:

```text
https://bundles.banodoco.ai/auth/v1/callback
```

This **Discord → Supabase** callback also applies when developing locally against
the existing remote project. Keep other redirect URIs needed by existing clients.
The website callback belongs in Supabase's allowlist, not this Discord list.

Supabase Auth → URL Configuration → Redirect URLs, add exactly:

```text
https://www.banodoco.ai/auth/callback
http://127.0.0.1:8137/auth/callback
```

Keep the existing `/connect/` entries for older clients during cutover. Use exact
URLs, without broad wildcards; production Site URL is `https://www.banodoco.ai`.
The authorize host and Discord callback must consistently use the custom domain:
mixing canonical and custom hosts can break Supabase's OAuth state cookie.

The broker's existing `HIVEMIND_AUTH_CONNECT_URL` remains
`https://www.banodoco.ai/connect/`. Its `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` stay **only in the broker environment**. This website
requires no service-role or contributor credential and changes no broker schema.

## Local development

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
# Edit .env: local APP_ORIGIN, the existing Supabase URL and publishable key.
python3 serve.py
```

Open `http://127.0.0.1:8137/`, then Sign in. `.env` is ignored by Git, not packaged,
and not served. Explicit environment values override it. Use the exact
`127.0.0.1` origin; `localhost` or another port needs matching `APP_ORIGIN` and
callback registration. Without auth configuration, the public homepage and
setup screen still work. There is no development authentication bypass.

For a real local-tool check, run `hivemind auth login --no-browser` or
`astrid login --no-browser`. Replace only the approval link's origin with
`http://127.0.0.1:8137`, retaining its request and approval-code parameters.
Do not change the live broker URL for local testing. Approval/redemption issues
a real machine credential; automated tests use a simulated authority/broker.

## Session and cookie behavior

- Production cookies: `__Host-banodoco-session` and `__Host-banodoco-oauth`, with
  `Secure; HttpOnly; SameSite=Lax; Path=/`, no Domain. Loopback HTTP uses unprefixed
  cookies without Secure. Remote HTTP origins are rejected at startup.
- Cookies hold 256-bit random capabilities. SHA-256 digests index server storage;
  cookies contain no identity or OAuth tokens. No cookie-signing secret is needed
  because cookie contents are never accepted as a signed data structure.
- Storage is bounded, expiring, thread-safe **single-process memory**. A restart
  logs browsers out, leaving local machine keys intact. Before adding replicas
  or processes, provide shared TTL storage with atomic consumption/deletion.
- Sessions expire no later than the upstream token. There is no refresh-token
  persistence or silent refresh. On expiry, sign in again.
- Logout is a CSRF-protected POST. Local revocation is immediate even if Supabase
  is unavailable; the server also attempts `/auth/v1/logout?scope=local`.
  Already-issued provider JWTs may live until expiry, but the browser never
  receives them and the website no longer permits their use after logout.
- Mutation requests require the exact Origin and a session-bound CSRF token.
  Login completion never approves a machine. The person must confirm its label
  and code; the approval capability is consumed atomically. Capturing another
  connection invalidates older forms and does not extend session lifetime.
- Auth responses are no-store/no-referrer/frame-denied and allow no scripts.
  Callback URLs use configured `APP_ORIGIN`, not proxy/Host input. Upstream
  redirects are refused. Waitress does not log request URLs; any added access
  logging must redact callback codes and connection query parameters.

## Hivemind/Astrid bridge

Evidence inspected: sibling `hivemind-astrid-local/{cli.py,executors/_common.py,
supabase/functions/contributor-auth/index.ts,supabase/functions/contributor-auth/protocol.ts,
schema/040_contributor_auth.sql}`; Astrid's `astrid/core/auth.py` and
`astrid/core/execution/generic_host.py`.

Public read/search calls retain their existing public credentials and behavior.
For contributions the CLI creates an expiring request with separate request and
polling capabilities. Only request token and approval code enter the browser URL;
the polling secret remains local. This website captures the pairing server-side
and redirects to a clean `/connect/` URL.

After explicit confirmation the website sends exactly `{action: "approve",
request_token, approval_code}` to the fixed `/functions/v1/contributor-auth`
endpoint using the logged-in user's **Supabase** access token. The broker verifies
the user again and maps `auth.users.id → contributors.auth_user_id →
contributors.id`. Neither browser nor website can choose the contributor ID or
grant editor permission. Existing unlinked contributor accounts still require
the broker's operator-verified claim process.

The CLI polls and redeems once, then saves a separate revocable `hm_<64 hex>` key
in `~/.hivemind/key` (0600, parent directory 0700). `HIVEMIND_CONTRIBUTOR_KEY`
remains the override. Astrid uses the same resolver. The website never receives
the machine key or polling secret. Website sign-out does not revoke local keys:
use `hivemind auth revoke`, or `hivemind auth logout` for local deletion only.

## Verification and external setup limits

```sh
source .venv/bin/activate
npm run test:auth
node tools/test-connect-static.mjs
node tools/test-serve-range.mjs
```

Tests use a simulated PKCE authority and broker, checking callback binding,
replay/expiry, cookies, token redaction, session rotation, non-Discord rejection,
CSRF/origin, explicit one-use approval, logout, and private-file blocking.
Packaging tests boot the actual generated runtime artifact. No real account or
machine key is created.

Real OAuth verification needs the website configuration and exact callback
allowlist entries above. Confirm the existing Discord ID/secret in Supabase;
no secret has been read or added to this repo. The existing broker endpoint is
reachable, but its deployed schema/writer revision has not been authenticated
or changed. Sibling Hivemind versions differ: the auth implementation uses
`contributor_keys`, while the older main writer still uses
`contributors.api_key_hash`. The deployed migration **and protected writers**
must support the same revocable-key contract. Confirm this with a real local
login/contribution after setup; website tests cannot establish that deployment
fact.

**Next setup step:** populate the ignored local `.env` with the existing
Supabase URL/publishable key and register the exact local callback in Supabase,
then complete a real browser login and machine approval. Publishing requires
separate user confirmation. None of the verification commands pushes or deploys.
