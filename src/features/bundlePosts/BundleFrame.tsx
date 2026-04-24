import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { BundleManifestV1 } from '@/types/post';
import { useBundleResize } from './useBundleResize';
import { buildBundleUrl, buildSandboxTokens } from './buildBundleUrl';
import { isSupabaseDefaultHost } from './bundleFrameUtils';

interface BundleFrameProps {
  bundleVersionId: string;
  manifest: BundleManifestV1;
  previewToken?: string | null;
  className?: string;
  style?: CSSProperties;
}

/**
 * Sandboxed iframe for bundle-mode posts.
 *
 * Two serving paths, selected per-request from the entry URL's host:
 *
 * 1. Supabase default host (`*.supabase.co`): the gateway rewrites
 *    `Content-Type: text/html` → `text/plain` as arbitrary-HTML hardening,
 *    which makes a direct `<iframe src>` render as plain text. We sidestep
 *    it by fetching the HTML with `fetch()` (body bytes are correct, only
 *    the content-type header is stripped) and feeding the result to
 *    `srcdoc`, which parses as HTML regardless of origin or header. A
 *    `<base href="<edge-fn>/">` is injected so relative sub-resources
 *    resolve back to the Edge Function. Non-HTML responses aren't
 *    rewritten, so those load correctly.
 *
 * 2. Custom domain (anything not matching `*.supabase.co`): the HTML
 *    hardening doesn't apply, so we render a plain `<iframe src>` with the
 *    same sandbox tokens. Cleaner, no fetch, real cross-origin, and the
 *    browser-native CSP applies.
 *
 * The switch is driven entirely by the hostname in `entryUrl` — set
 * `VITE_BUNDLE_SERVING_ORIGIN` to a custom-domain host in production to
 * flip to the direct-iframe path.
 */
function layoutStyle(manifest: BundleManifestV1, height: number | string): CSSProperties {
  const { layout } = manifest;
  if (layout.mode === 'inline-fixed' && layout.aspectRatio && layout.aspectRatio > 0) {
    return {
      width: '100%',
      aspectRatio: String(layout.aspectRatio),
      height: typeof height === 'string' ? undefined : height,
    };
  }
  if (layout.mode === 'fullscreen') {
    return {
      width: '100%',
      height: '100%',
      border: '0',
      display: 'block',
    };
  }
  return {
    width: '100%',
    height,
    border: '0',
    display: 'block',
  };
}

function injectBase(html: string, baseHref: string): string {
  const baseTag = `<base href="${baseHref.replace(/"/g, '&quot;')}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${baseTag}</head>`);
  }
  if (/^<!doctype/i.test(html.trim())) {
    return html.replace(/^<!doctype[^>]*>/i, (m) => `${m}<html><head>${baseTag}</head>`);
  }
  return `<!doctype html><html><head>${baseTag}</head><body>${html}</body></html>`;
}

export function BundleFrame({
  bundleVersionId,
  manifest,
  previewToken,
  className,
  style,
}: BundleFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const entryUrl = buildBundleUrl(bundleVersionId, manifest.entry, previewToken);
  const baseUrl = buildBundleUrl(bundleVersionId, '', previewToken).replace(/\/?$/, '/');
  const useSrcdocWorkaround = isSupabaseDefaultHost(entryUrl);
  // Cross-origin direct iframes need `allow-same-origin` so the iframe can
  // claim its own origin (bundles.banodoco.ai) — without it the origin is
  // opaque and postMessage fires with `event.origin === 'null'`, breaking
  // the resize handshake. For srcdoc (dev) we leave it OFF because with
  // allow-same-origin a srcdoc iframe inherits the PARENT's origin, which
  // would drop the security boundary.
  const sandbox = useSrcdocWorkaround
    ? buildSandboxTokens(manifest.capabilities)
    : `${buildSandboxTokens(manifest.capabilities)} allow-same-origin`;
  // srcdoc iframes have opaque ("null") origin; direct-iframe has a real one.
  const { height } = useBundleResize(iframeRef, manifest.layout, useSrcdocWorkaround);

  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // One log per mount announcing which path was chosen.
  useEffect(() => {
    console.info('[bundle/frame] serving mode', {
      mode: useSrcdocWorkaround ? 'srcdoc-workaround' : 'direct-iframe',
      entryUrl,
    });
    // Intentionally mount-only; entryUrl changes also fire the fetch effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!useSrcdocWorkaround) return undefined;
    let cancelled = false;
    setSrcDoc(null);
    setFetchError(null);
    console.info('[bundle/frame] fetching entry', { entryUrl });
    fetch(entryUrl, { credentials: 'omit', mode: 'cors', cache: 'no-store' })
      .then(async (resp) => {
        const body = await resp.text();
        if (!resp.ok) {
          console.warn('[bundle/frame] non-ok response', {
            entryUrl,
            status: resp.status,
            statusText: resp.statusText,
            contentType: resp.headers.get('content-type'),
            bodyPreview: body.slice(0, 200),
          });
          throw new Error(`HTTP ${resp.status}: ${body.slice(0, 120)}`);
        }
        console.info('[bundle/frame] entry fetched', {
          entryUrl,
          bytes: body.length,
          contentType: resp.headers.get('content-type'),
          baseUrl,
        });
        return body;
      })
      .then((text) => {
        if (cancelled) return;
        setSrcDoc(injectBase(text, baseUrl));
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[bundle/frame] entry fetch failed', { entryUrl, err: String(err) });
        setFetchError(err instanceof Error ? err.message : String(err));
      });
    return () => { cancelled = true; };
  }, [entryUrl, baseUrl, useSrcdocWorkaround]);

  if (fetchError) {
    return (
      <div
        className={className}
        style={{ ...layoutStyle(manifest, height), ...style }}
      >
        <div className="flex h-full w-full items-center justify-center p-6 text-sm text-red-300">
          Bundle failed to load: {fetchError}
        </div>
      </div>
    );
  }

  if (!useSrcdocWorkaround) {
    return (
      <iframe
        ref={iframeRef}
        src={entryUrl}
        sandbox={sandbox}
        allow=""
        referrerPolicy="no-referrer"
        title={manifest.title}
        className={className}
        style={{ ...layoutStyle(manifest, height), ...style }}
        onLoad={() => console.info('[bundle/frame] iframe load fired', { entryUrl })}
        onError={(e) => console.warn('[bundle/frame] iframe error', { entryUrl, e })}
      />
    );
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc ?? ''}
      sandbox={sandbox}
      allow=""
      referrerPolicy="no-referrer"
      title={manifest.title}
      className={className}
      style={{ ...layoutStyle(manifest, height), ...style }}
      onLoad={() => console.info('[bundle/frame] iframe load fired', { entryUrl })}
    />
  );
}
