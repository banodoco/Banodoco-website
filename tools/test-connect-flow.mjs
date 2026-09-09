#!/usr/bin/env node

import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  DEFAULT_CONNECT_CONFIG,
  approvalBody,
  brokerFetch,
  buildAuthorizeUrl,
  captureRequest,
  createPkceContext,
  exchangeCodeFetch,
  parseCallback,
  resolveConnectConfig,
  validateCallback,
} from '../connect/auth-flow.js';

const config = resolveConnectConfig({}, 'https://www.banodoco.ai');
assert.equal(config.supabaseOrigin, 'https://bundles.banodoco.ai');
assert.equal(config.brokerUrl.href, 'https://bundles.banodoco.ai/functions/v1/contributor-auth');
assert.equal(config.authAuthorizeUrl.pathname, '/auth/v1/authorize');
assert.equal(config.authTokenUrl.pathname, '/auth/v1/token');
assert.equal(config.authTokenUrl.search, '?grant_type=pkce');
assert.deepEqual(config.fetchOptions, { mode: 'cors', credentials: 'omit', redirect: 'error' });
assert.equal(DEFAULT_CONNECT_CONFIG.anonKey.startsWith('sb_publishable_'), true);
assert.throws(
  () => resolveConnectConfig({ supabase: { anonKey: 'service_role_not_for_browser' } }),
  /publishable key/,
);

const requestToken = 'r'.repeat(43);
const approvalCode = 'ABCD1234';
const captured = captureRequest(`https://www.banodoco.ai/connect/?request=${requestToken}&approval_code=${approvalCode}`);
assert.equal(captured.requestToken, requestToken);
assert.equal(captured.approvalCode, approvalCode);
assert.equal(captureRequest('https://www.banodoco.ai/connect/', captured), captured);

const pkce = await createPkceContext((bytes) => webcrypto.getRandomValues(bytes), webcrypto.subtle);
assert.match(pkce.verifier, /^[A-Za-z0-9_-]{43}$/);
assert.match(pkce.challenge, /^[A-Za-z0-9_-]{43}$/);
const state = 'state-bound-to-request';
const context = { ...captured, verifier: pkce.verifier, state };

const authorize = buildAuthorizeUrl(config, {
  callback: 'https://www.banodoco.ai/connect/',
  state,
  challenge: pkce.challenge,
});
assert.equal(authorize.origin, config.supabaseOrigin);
assert.equal(authorize.pathname, '/auth/v1/authorize');
assert.equal(authorize.searchParams.get('provider'), 'discord');
assert.equal(authorize.searchParams.get('redirect_to'), 'https://www.banodoco.ai/connect/');
assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
assert.equal(authorize.searchParams.get('state'), null);

const tokenExchange = exchangeCodeFetch(config, 'oauth-code', pkce.verifier);
assert.equal(tokenExchange.url.href, `${config.supabaseOrigin}/auth/v1/token?grant_type=pkce`);
assert.equal(tokenExchange.options.method, 'POST');
assert.equal(tokenExchange.options.mode, 'cors');
assert.equal(tokenExchange.options.credentials, 'omit');
assert.equal(tokenExchange.options.headers.apikey, config.anonKey);
assert.deepEqual(JSON.parse(tokenExchange.options.body), {
  auth_code: 'oauth-code', code_verifier: pkce.verifier,
});

const codeOnly = parseCallback('https://www.banodoco.ai/connect/?code=oauth-code');
assert.deepEqual(validateCallback(codeOnly, context), { code: 'oauth-code', verifier: pkce.verifier });
const matchingState = parseCallback(`https://www.banodoco.ai/connect/?code=oauth-code&state=${state}`);
assert.deepEqual(validateCallback(matchingState, context), { code: 'oauth-code', verifier: pkce.verifier });
assert.throws(
  () => validateCallback(parseCallback('https://www.banodoco.ai/connect/?code=oauth-code&state=wrong'), context),
  /state did not match/,
);
assert.throws(
  () => validateCallback(codeOnly, { requestToken, state }),
  /request context/,
);

const getBroker = brokerFetch(config, requestToken, null);
assert.equal(getBroker.url.href, `${config.brokerUrl.href}?request=${requestToken}`);
assert.equal(getBroker.options.mode, 'cors');
assert.equal(getBroker.options.credentials, 'omit');
assert.equal(getBroker.options.redirect, 'error');
assert.equal(getBroker.options.headers.apikey, config.anonKey);
assert.equal(getBroker.options.headers.authorization, `Bearer ${config.anonKey}`);

const postBroker = brokerFetch(config, requestToken, 'user-access-token', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: approvalBody(requestToken, approvalCode),
});
assert.equal(postBroker.url.href, config.brokerUrl.href);
assert.equal(postBroker.options.headers.authorization, 'Bearer user-access-token');
assert.deepEqual(JSON.parse(postBroker.options.body), {
  action: 'approve', request_token: requestToken, approval_code: approvalCode,
});

console.log('connect PKCE/broker behavior OK');
