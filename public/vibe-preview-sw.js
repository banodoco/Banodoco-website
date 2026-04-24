// Vibe Mode preview Service Worker.
//
// Registered per-session from src/features/bundleVibeMode/swClient.ts
// with a URL-scoped boundary:
//
//     /submit/post/vibe-preview/<swId>/
//
// The <swId> segment is a fresh random UUID per editor mount so two
// concurrent browser tabs cannot cross-serve each other's virtual file
// trees. swClient.ts enumerates existing registrations whose scope
// starts with `/submit/post/vibe-preview/` and unregisters any whose
// scope does not match the current session's swId.
//
// Controller binding: the preview iframe is scoped inside the SW, but
// we still perform a MessageChannel handshake so the SW knows which
// virtual tree to serve. swClient.ts posts `{type:'bind', port}` to
// the active worker; this handler keeps the port + tree in memory and
// replies to intercepted fetches from within that scope.
//
// CSP parity is enforced at the iframe assembler (T11), not here. The
// SW only sets `Content-Type` + `Cross-Origin-Resource-Policy: same-origin`
// on served responses.

'use strict';

// Broadcast logs to all controlled clients so they show up in the page's
// console (the SW's own console is a separate DevTools window, which makes
// copying a single log stream during debugging painful). Falls through to
// the SW's own console as well for anyone with the SW inspector open.
const swLog = (level, ...args) => {
  const method = console[level] ? level : 'log';
  console[method](...args);
  if (self.clients && typeof self.clients.matchAll === 'function') {
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(
      (clients) => {
        for (const c of clients) {
          try {
            c.postMessage({ __vibeSwLog: true, level: method, args });
          } catch { /* ignore */ }
        }
      },
      () => { /* ignore */ },
    );
  }
};

self.addEventListener('install', (event) => {
  swLog('info', '[vibe/sw] install');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  swLog('info', '[vibe/sw] activate — claiming clients');
  event.waitUntil(self.clients.claim());
});

// scope -> { port, tree, swId } keyed by registration scope so multiple
// concurrent registrations (mid-handoff) don't clobber each other.
const sessionsByScope = new Map();

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'bind') {
    const port = event.ports && event.ports[0];
    const scope = typeof data.scope === 'string' ? data.scope : self.registration.scope;
    const swId = typeof data.swId === 'string' ? data.swId : '';
    if (!port) return;
    swLog('info', '[vibe/sw] bind', { scope, swId });
    sessionsByScope.set(scope, { port, tree: null, swId });
    port.onmessage = (ev) => {
      const d = ev.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'tree') {
        const entry = sessionsByScope.get(scope);
        const fileCount = d.tree ? Object.keys(d.tree).length : 0;
        swLog('info', '[vibe/sw] tree received', { scope, fileCount, version: d.version, paths: d.tree ? Object.keys(d.tree) : [] });
        if (entry) {
          entry.tree = d.tree ?? null;
        }
        if (d.version !== undefined) {
          try {
            port.postMessage({ type: 'tree-applied', version: d.version });
            swLog('info', '[vibe/sw] tree-applied ack sent', { version: d.version });
          } catch (err) {
            swLog('warn', '[vibe/sw] ack failed', err);
          }
        }
      }
    };
    // Initial greeting so the client knows we're alive and bound.
    port.postMessage({ type: 'bound', scope, swId });
    return;
  }

  if (data.type === 'unbind') {
    const scope = typeof data.scope === 'string' ? data.scope : self.registration.scope;
    const entry = sessionsByScope.get(scope);
    if (entry?.port) {
      try { entry.port.close(); } catch { /* ignore */ }
    }
    sessionsByScope.delete(scope);
  }
});

const inferMime = (path) => {
  const lower = path.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.wasm')) return 'application/wasm';
  return 'application/octet-stream';
};

const buildResponse = (body, mime) =>
  new Response(body, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });

const notFound = () =>
  new Response('Vibe preview: file not found in virtual tree', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });

// Normalize a bind-message scope (which swClient.ts sends as a path like
// `/submit/post/vibe-preview/<id>/`) or a registration.scope fallback
// (which is a full URL) down to a pathname that always starts with `/`
// and ends with `/`. Used so all downstream comparisons are path-only.
const scopeToPath = (scope) => {
  if (typeof scope !== 'string') return '/';
  if (scope.startsWith('/')) return scope;
  try {
    return new URL(scope).pathname;
  } catch {
    return '/';
  }
};

const findSessionForRequest = (url) => {
  // Compare paths, not full URLs: swClient.ts passes path-only scopes
  // while url.href includes the origin, so startsWith on href never matched.
  for (const [scope, entry] of sessionsByScope) {
    const scopePath = scopeToPath(scope);
    if (url.pathname.startsWith(scopePath)) return { scope, scopePath, entry };
  }
  return null;
};

const resolveTreeFile = (tree, relPath) => {
  if (!tree || typeof tree !== 'object') return null;
  // Default-document handling: "" or trailing-slash → index.html
  const candidates = relPath === '' || relPath.endsWith('/')
    ? [relPath + 'index.html', relPath]
    : [relPath];
  for (const candidate of candidates) {
    const file = tree[candidate];
    if (file) return { path: candidate, file };
  }
  return null;
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // FIRST log — catches every request the SW sees, so we can tell whether
  // nothing hits the SW at all vs. requests get filtered out. Keep this
  // ABOVE the scope/origin filters for debugging.
  swLog('info', '[vibe/sw] fetch event fired', {
    mode: req.mode,
    dest: req.destination,
    method: req.method,
    url: req.url,
    inScope: url.origin === self.location.origin && url.pathname.startsWith('/submit/post/vibe-preview/'),
  });
  // Only intercept same-origin requests inside a bound Vibe scope.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/submit/post/vibe-preview/')) return;
  swLog('info', '[vibe/sw] ← request entered SW', {
    mode: req.mode,       // 'navigate' | 'cors' | 'no-cors' | 'same-origin'
    dest: req.destination, // 'document' | 'image' | 'script' | etc.
    method: req.method,
    path: url.pathname,
    query: url.search,
  });

  event.respondWith((async () => {
    const match = findSessionForRequest(url);
    if (!match) {
      swLog('info', '[vibe/sw] fetch: no bound session for', url.pathname);
      return notFound();
    }
    const { scopePath, entry } = match;
    if (!entry.tree) {
      swLog('warn', '[vibe/sw] fetch: session has no tree yet', { url: url.pathname });
      return notFound();
    }

    const relPath = decodeURIComponent(url.pathname.slice(scopePath.length));
    const resolved = resolveTreeFile(entry.tree, relPath);
    if (!resolved) {
      swLog('warn', '[vibe/sw] fetch: path not in tree', { relPath, availablePaths: Object.keys(entry.tree).slice(0, 10) });
      return notFound();
    }
    swLog('info', '[vibe/sw] fetch:', resolved.path, '(' + resolved.file.kind + ')');

    const file = resolved.file;
    if (file.kind === 'text') {
      const body = typeof file.content === 'string' ? file.content : '';
      return buildResponse(body, file.mime || inferMime(resolved.path));
    }

    if (file.kind === 'binary-asset') {
      // Binary bytes aren't stored in the SW; swClient.ts relays them
      // on demand via the MessageChannel port. We ask for them now.
      const port = entry.port;
      if (!port || !file.assetId) {
        swLog('warn', '[vibe/sw] binary-asset missing port or assetId', { hasPort: !!port, assetId: file.assetId });
        return notFound();
      }
      const assetId = file.assetId;
      swLog('info', '[vibe/sw] requesting bytes for asset', { path: resolved.path, assetId });
      const bytes = await new Promise((resolve) => {
        const reqId = `${assetId}:${Date.now()}:${Math.random()}`;
        const handler = (ev) => {
          const d = ev.data;
          if (!d || d.type !== 'asset-reply' || d.reqId !== reqId) return;
          port.removeEventListener?.('message', handler);
          swLog('info', '[vibe/sw] asset-reply received', { assetId, hasBytes: !!(d.bytes instanceof ArrayBuffer) });
          resolve(d.bytes instanceof ArrayBuffer ? new Uint8Array(d.bytes) : null);
        };
        if (port.addEventListener) {
          port.addEventListener('message', handler);
        } else {
          swLog('warn', '[vibe/sw] port has no addEventListener — asset fetch will time out');
        }
        try {
          port.postMessage({ type: 'asset-request', reqId, assetId });
        } catch (err) {
          swLog('warn', '[vibe/sw] asset-request postMessage failed', err);
          resolve(null);
        }
        // Safety timeout — never hang a preview fetch on a dead channel.
        setTimeout(() => {
          port.removeEventListener?.('message', handler);
          swLog('warn', '[vibe/sw] asset-request timed out', { assetId });
          resolve(null);
        }, 1000);
      });
      if (!bytes) return notFound();
      return buildResponse(bytes, file.mime || inferMime(resolved.path));
    }

    return notFound();
  })());
});
