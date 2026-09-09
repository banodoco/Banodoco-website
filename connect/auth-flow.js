/*
 * Local browser seam for Hivemind contributor approval.
 *
 * This is intentionally dependency-free. It speaks the Supabase Auth REST
 * endpoints directly so the public page does not depend on a CDN, an
 * unpinned SDK, or a server-side callback.
 */

export const DEFAULT_CONNECT_CONFIG = Object.freeze({
  browserOrigin: 'https://www.banodoco.ai',
  callbackPath: '/connect/',
  // Use the project's custom domain for both the authorize request and the
  // callback. Supabase sets its OAuth state cookie on the authorize host;
  // mixing the project host with the custom callback host causes bad_oauth_state.
  supabaseUrl: 'https://bundles.banodoco.ai',
  anonKey: 'sb_publishable_O38oPBafrBoFrpi_rlWJvA_UJrulFsx',
  authAuthorizePath: '/auth/v1/authorize',
  authTokenPath: '/auth/v1/token?grant_type=pkce',
  brokerPath: '/functions/v1/contributor-auth',
  fetchOptions: Object.freeze({ mode: 'cors', credentials: 'omit', redirect: 'error' }),
});

const REQUEST_MIN_LENGTH = 32;
const APPROVAL_CODE_MIN_LENGTH = 8;
const MAX_OPAQUE_LENGTH = 4096;

function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function sameOriginUrl(value, origin, label) {
  const url = new URL(value, origin);
  if (url.origin !== origin) throw new Error(`${label} must stay on its configured origin.`);
  return url;
}

function configuredOrigin(value, fallback, label) {
  const url = new URL(value || fallback);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error(`${label} must use HTTPS.`);
  }
  return url.origin;
}

export function resolveConnectConfig(runtime = {}, browserOrigin = DEFAULT_CONNECT_CONFIG.browserOrigin) {
  const supabase = runtime.supabase || {};
  const supabaseOrigin = configuredOrigin(supabase.url, DEFAULT_CONNECT_CONFIG.supabaseUrl, 'Supabase URL');
  const brokerOrigin = configuredOrigin(runtime.brokerOrigin, supabaseOrigin, 'Broker origin');
  const callbackPath = runtime.callbackPath || DEFAULT_CONNECT_CONFIG.callbackPath;
  if (!callbackPath.startsWith('/') || callbackPath.includes('..')) {
    throw new Error('The connection callback path is invalid.');
  }
  const config = {
    browserOrigin,
    callbackPath,
    supabaseOrigin,
    anonKey: supabase.anonKey || DEFAULT_CONNECT_CONFIG.anonKey,
    authAuthorizeUrl: sameOriginUrl(
      runtime.endpoints?.authAuthorize || DEFAULT_CONNECT_CONFIG.authAuthorizePath,
      supabaseOrigin,
      'Supabase authorize endpoint',
    ),
    authTokenUrl: sameOriginUrl(
      runtime.endpoints?.authToken || DEFAULT_CONNECT_CONFIG.authTokenPath,
      supabaseOrigin,
      'Supabase token endpoint',
    ),
    brokerUrl: sameOriginUrl(
      runtime.endpoints?.broker || DEFAULT_CONNECT_CONFIG.brokerPath,
      brokerOrigin,
      'Hivemind broker endpoint',
    ),
    fetchOptions: { ...DEFAULT_CONNECT_CONFIG.fetchOptions },
  };
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.anonKey)) {
    throw new Error('Only a public Supabase publishable key may configure this page.');
  }
  return config;
}

export function callbackUrl(config, origin = config.browserOrigin) {
  return new URL(config.callbackPath, origin).href;
}

export function validOpaqueRequest(value) {
  return nonEmptyString(value) && value.length >= REQUEST_MIN_LENGTH && value.length <= MAX_OPAQUE_LENGTH;
}

export function validApprovalCode(value) {
  return nonEmptyString(value) && value.length >= APPROVAL_CODE_MIN_LENGTH && value.length <= 64;
}

export function captureRequest(url, existing = null) {
  const params = new URL(url, 'https://www.banodoco.ai').searchParams;
  if (!params.has('request') && existing) return existing;
  const requestToken = params.get('request');
  const approvalCode = params.get('approval_code');
  if (!validOpaqueRequest(requestToken)) throw new Error('The Hivemind connection request is invalid.');
  if (!validApprovalCode(approvalCode)) throw new Error('The Hivemind approval code is missing.');
  return { requestToken, approvalCode, receivedAt: Date.now() };
}

export function parseCallback(url) {
  const parsed = new URL(url, 'https://www.banodoco.ai/connect/');
  const query = parsed.searchParams;
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  return {
    code: query.get('code'),
    state: query.get('state') ?? hash.get('state'),
    statePresent: query.has('state') || hash.has('state'),
    error: query.get('error') || hash.get('error'),
    errorDescription: query.get('error_description') || hash.get('error_description'),
  };
}

export function validateCallback(callback, context) {
  if (callback.error) {
    throw new Error(callback.errorDescription || 'Discord sign-in was cancelled or rejected.');
  }
  if (!callback.code && !callback.statePresent) return null;
  if (!validOpaqueRequest(context?.requestToken) || !nonEmptyString(context?.verifier)) {
    throw new Error('The sign-in callback has no matching Hivemind request context.');
  }
  // Some Supabase/provider callback paths omit state. A code-only callback is
  // accepted only because the request-bound PKCE verifier is still present.
  if (callback.statePresent && callback.state !== context.state) {
    throw new Error('The sign-in callback state did not match this request.');
  }
  if (!callback.code) throw new Error('The sign-in callback did not include an authorization code.');
  return { code: callback.code, verifier: context.verifier };
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function randomBase64Url(byteLength = 32, randomValues = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto)) {
  if (typeof randomValues !== 'function') throw new Error('Secure browser randomness is unavailable.');
  const bytes = new Uint8Array(byteLength);
  randomValues(bytes);
  return base64Url(bytes);
}

export async function sha256Base64Url(value, subtle = globalThis.crypto?.subtle) {
  if (!subtle?.digest) throw new Error('Web Crypto SHA-256 is unavailable.');
  const bytes = new TextEncoder().encode(value);
  return base64Url(new Uint8Array(await subtle.digest('SHA-256', bytes)));
}

export async function createPkceContext(randomValues, subtle) {
  const verifier = randomBase64Url(32, randomValues);
  return { verifier, challenge: await sha256Base64Url(verifier, subtle) };
}

export function buildAuthorizeUrl(config, { callback, state, challenge }) {
  const url = new URL(config.authAuthorizeUrl);
  url.searchParams.set('provider', 'discord');
  url.searchParams.set('redirect_to', callback);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  // Supabase Auth owns the provider-facing OAuth state. Passing our own
  // opaque value here makes GoTrue reject the callback as bad_oauth_state;
  // the request-bound PKCE verifier still protects this browser flow.
  return url;
}

export function authFetchOptions(config, init = {}) {
  return {
    ...config.fetchOptions,
    ...init,
    headers: {
      accept: 'application/json',
      apikey: config.anonKey,
      ...(init.headers || {}),
    },
  };
}

export function exchangeCodeFetch(config, code, verifier) {
  if (!nonEmptyString(code) || !nonEmptyString(verifier)) {
    throw new Error('The PKCE authorization code exchange is incomplete.');
  }
  return {
    url: new URL(config.authTokenUrl),
    options: authFetchOptions(config, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    }),
  };
}

export function brokerFetch(config, requestToken, sessionToken, init = {}) {
  if (!validOpaqueRequest(requestToken)) throw new Error('The Hivemind request token is invalid.');
  const url = new URL(config.brokerUrl);
  if (!init.method || init.method === 'GET') url.searchParams.set('request', requestToken);
  const authorization = sessionToken || config.anonKey;
  return {
    url,
    options: authFetchOptions(config, {
      ...init,
      headers: {
        authorization: `Bearer ${authorization}`,
        ...(init.headers || {}),
      },
    }),
  };
}

export function approvalBody(requestToken, approvalCode) {
  if (!validOpaqueRequest(requestToken) || !validApprovalCode(approvalCode)) {
    throw new Error('The Hivemind approval request is incomplete.');
  }
  return JSON.stringify({ action: 'approve', request_token: requestToken, approval_code: approvalCode });
}

export const CONNECT_LIMITS = Object.freeze({ REQUEST_MIN_LENGTH, APPROVAL_CODE_MIN_LENGTH });
