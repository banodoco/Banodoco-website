/**
 * Vibe Mode preview — pure HTML-shape transform.
 *
 * Exported from its own module so the React component in
 * `VibePreviewFrame.tsx` can own a single component export (keeps
 * react-refresh happy), and so T18's `previewFrame.test.ts` can
 * exercise the transform without mounting React.
 *
 * This transform is the PRIMARY XSS / malformed-HTML defence per doc
 * §Step 10.2 — the agent's system prompt that says "no pre-head
 * content" is a secondary best-effort. Do NOT collapse the two.
 */

// Kept byte-identical to the Service Worker-served CSP in T9
// (`public/vibe-preview-sw.js` doesn't reference this constant
// directly — T18 asserts equality against the documented spec string).
export const PREVIEW_CSP_META =
  "default-src * data: blob:; script-src 'unsafe-inline' 'unsafe-eval' *; style-src 'unsafe-inline' *; connect-src *; form-action 'none'; base-uri 'none';";

const BOM = '﻿';

export type HtmlShape = 'A' | 'B' | 'C' | 'D';

export interface ComposedPreview {
  readonly html: string;
  readonly shape: HtmlShape;
}

/**
 * Peel "pre-doctype" nuisance from the head of `html` in a fixed-point
 * loop until no further progress is made:
 *   - UTF-8 BOM
 *   - Leading whitespace (spaces, tabs, newlines)
 *   - XML prologue `<?xml ...?>`
 *   - HTML comment `<!-- ... -->`
 *   - Stray leading `<script>...</script>` (PRIMARY XSS defence)
 *   - Stray leading `<style>...</style>` (observed edge case)
 *
 * Then discards every byte before the earliest case-insensitive
 * `<!doctype`/`<html`/`<head`. Well-formed documents pass through
 * unchanged.
 */
export const trimPreDoctype = (html: string): string => {
  let out = html;
  for (;;) {
    const before = out;
    if (out.startsWith(BOM)) out = out.slice(BOM.length);
    out = out.replace(/^\s+/, '');
    out = out.replace(/^<\?xml[^?]*\?>/i, '');
    out = out.replace(/^<!--[\s\S]*?-->/, '');
    out = out.replace(/^<script\b[^>]*>[\s\S]*?<\/script\s*>/i, '');
    out = out.replace(/^<style\b[^>]*>[\s\S]*?<\/style\s*>/i, '');
    if (out === before) break;
  }

  const lower = out.toLowerCase();
  const markers = ['<!doctype', '<html', '<head'];
  let earliest = -1;
  for (const m of markers) {
    const idx = lower.indexOf(m);
    if (idx >= 0 && (earliest === -1 || idx < earliest)) earliest = idx;
  }
  if (earliest > 0) out = out.slice(earliest);
  return out;
};

// Inline script forwarded into every preview so iframe-side errors and
// resource-load failures surface in the PARENT page console. The parent
// listens on `window.addEventListener('message', …)` and re-logs these
// under `[vibe/iframe …]`.
const IFRAME_CONSOLE_PROXY = `
<script>(function(){
  var post = function(level, args){
    try { parent.postMessage({ __vibeIframeLog: true, level: level, args: args }, '*'); } catch(e){}
  };
  ['log','info','warn','error','debug'].forEach(function(lvl){
    var orig = console[lvl] ? console[lvl].bind(console) : function(){};
    console[lvl] = function(){
      var args = Array.prototype.slice.call(arguments).map(function(a){
        try { return typeof a === 'object' ? JSON.parse(JSON.stringify(a)) : a; } catch(e){ return String(a); }
      });
      post(lvl, args);
      orig.apply(null, arguments);
    };
  });
  window.addEventListener('error', function(e){
    post('error', ['[vibe/iframe] window.error:', e.message || String(e), 'at', (e.filename||'') + ':' + (e.lineno||0)]);
  });
  window.addEventListener('unhandledrejection', function(e){
    post('error', ['[vibe/iframe] unhandledrejection:', e.reason && (e.reason.message || String(e.reason))]);
  });
  // Resource-load errors (img/script/link failing) bubble through the
  // capturing phase on the window.
  window.addEventListener('error', function(e){
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) {
      post('error', ['[vibe/iframe] resource failed to load:', t.src || t.href, 'on', (t.tagName || 'unknown').toLowerCase()]);
    }
  }, true);
  post('info', ['[vibe/iframe] console proxy active · base=' + (document.querySelector('base') && document.querySelector('base').href)]);
})();</script>
`.trim();

const buildInjection = (swScope: string): string =>
  `<base href="${swScope}"><meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP_META}">${IFRAME_CONSOLE_PROXY}`;

const classifyShape = (html: string): HtmlShape => {
  const lower = html.toLowerCase();
  if (lower.includes('<head')) return 'A';
  if (lower.includes('<html')) return 'B';
  if (lower.startsWith('<!doctype')) return 'C';
  return 'D';
};

const injectIntoHead = (html: string, injection: string): string =>
  html.replace(/<head\b[^>]*>/i, (match) => `${match}${injection}`);

const injectAfterHtml = (html: string, injection: string): string =>
  html.replace(/<html\b[^>]*>/i, (match) => `${match}<head>${injection}</head>`);

const wrapDoctypeOnly = (html: string, injection: string): string => {
  const match = html.match(/^<!doctype[^>]*>/i);
  if (!match) return html;
  const doctype = match[0];
  const rest = html.slice(doctype.length);
  return `${doctype}<html><head>${injection}</head>${rest}</html>`;
};

const wrapBareFragment = (html: string, injection: string): string =>
  `<!doctype html><html><head>${injection}</head><body>${html}</body></html>`;

/**
 * Compose the final srcdoc string for the preview iframe.
 *
 * Pipeline: raw → trimPreDoctype → classifyShape → inject <base> + CSP <meta>.
 *
 * Returns `{html, shape}` where `shape` is one of 'A'..'D' (useful for
 * tests and debugging): A = `<head>` present (inject as first head
 * children); B = `<html>` but no `<head>` (build head right after
 * `<html>`); C = doctype only (wrap with `<html><head>`); D = bare body
 * fragment (prepend `<!doctype html><html><head>...</head><body>`).
 *
 * The injected pair is ALWAYS:
 *
 *     <base href="{swScope}"><meta http-equiv="Content-Security-Policy" content="...">
 *
 * where the CSP string is byte-identical to `PREVIEW_CSP_META`.
 */
export const composePreviewHtml = (rawHtml: string, swScope: string): ComposedPreview => {
  const trimmed = trimPreDoctype(rawHtml);
  const shape = classifyShape(trimmed);
  const injection = buildInjection(swScope);
  let html: string;
  switch (shape) {
    case 'A':
      html = injectIntoHead(trimmed, injection);
      break;
    case 'B':
      html = injectAfterHtml(trimmed, injection);
      break;
    case 'C':
      html = wrapDoctypeOnly(trimmed, injection);
      break;
    case 'D':
      html = wrapBareFragment(trimmed, injection);
      break;
  }
  return { html, shape };
};
