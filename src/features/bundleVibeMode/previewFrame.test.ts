import { describe, expect, test } from 'vitest';
import { composePreviewHtml, PREVIEW_CSP_META, trimPreDoctype } from './previewFrameCompose';

const SW_SCOPE = '/submit/post/vibe-preview/test-id/';

/** Assert that the injected <base> + CSP <meta> both appear and arrive BEFORE
 *  any user body content, per spec ("first children of <head>"). */
const assertInjectionPosition = (html: string): void => {
  const baseIdx = html.indexOf(`<base href="${SW_SCOPE}">`);
  const cspIdx = html.indexOf('<meta http-equiv="Content-Security-Policy"');
  expect(baseIdx).toBeGreaterThan(-1);
  expect(cspIdx).toBeGreaterThan(baseIdx);
  expect(html).toContain(PREVIEW_CSP_META);
};

describe('composePreviewHtml — four HTML shape cases (A/B/C/D)', () => {
  test('A: <head> present → injection lands as first children of <head>', () => {
    const raw = '<!doctype html><html><head><title>x</title></head><body>hi</body></html>';
    const { html, shape } = composePreviewHtml(raw, SW_SCOPE);
    expect(shape).toBe('A');
    // <base> should appear after opening <head> but before the user's <title>.
    const headOpen = html.indexOf('<head>');
    const baseIdx = html.indexOf('<base');
    const titleIdx = html.indexOf('<title>');
    expect(headOpen).toBeLessThan(baseIdx);
    expect(baseIdx).toBeLessThan(titleIdx);
    assertInjectionPosition(html);
  });

  test('B: <html> present, no <head> → <head> wrapper is synthesised', () => {
    const raw = '<!doctype html><html><body>hi</body></html>';
    const { html, shape } = composePreviewHtml(raw, SW_SCOPE);
    expect(shape).toBe('B');
    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    // Injection sits inside the synthesised <head>.
    const headOpen = html.indexOf('<head>');
    const baseIdx = html.indexOf('<base');
    const headClose = html.indexOf('</head>');
    expect(headOpen).toBeLessThan(baseIdx);
    expect(baseIdx).toBeLessThan(headClose);
    assertInjectionPosition(html);
  });

  test('C: doctype only → wrapped in <html><head>…</head>...</html>', () => {
    const raw = '<!doctype html>just a doctype';
    const { html, shape } = composePreviewHtml(raw, SW_SCOPE);
    expect(shape).toBe('C');
    expect(html.toLowerCase()).toMatch(/^<!doctype html>/);
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
    expect(html).toContain('just a doctype');
    assertInjectionPosition(html);
  });

  test('D: bare body fragment → doctype + html wrapper prepended', () => {
    const raw = '<div class="bare">fragment</div>';
    const { html, shape } = composePreviewHtml(raw, SW_SCOPE);
    expect(shape).toBe('D');
    expect(html.toLowerCase()).toMatch(/^<!doctype html>/);
    expect(html).toContain('<div class="bare">fragment</div>');
    assertInjectionPosition(html);
  });
});

describe('composePreviewHtml — pre-doctype trim (PRIMARY XSS defence)', () => {
  test('strips stray <script> BEFORE doctype (spec FIFTH test case)', () => {
    const raw = '<script>alert(1)</script><!doctype html><html><head></head><body>x</body></html>';
    const { html } = composePreviewHtml(raw, SW_SCOPE);
    expect(html).not.toContain('alert(1)');
    expect(html.toLowerCase()).toMatch(/^<!doctype html>/);
    // <base> + CSP still inject at first children of <head>.
    assertInjectionPosition(html);
  });

  test('strips leading HTML comment', () => {
    const raw = '<!-- editor footer was here --><!doctype html><html><head></head><body>ok</body></html>';
    const { html } = composePreviewHtml(raw, SW_SCOPE);
    expect(html).not.toContain('editor footer was here');
    expect(html.toLowerCase()).toMatch(/^<!doctype html>/);
  });

  test('strips XML prologue', () => {
    const raw = '<?xml version="1.0"?><!doctype html><html><head></head><body>ok</body></html>';
    const { html } = composePreviewHtml(raw, SW_SCOPE);
    expect(html).not.toContain('<?xml');
    expect(html.toLowerCase()).toMatch(/^<!doctype html>/);
  });

  test('strips UTF-8 BOM', () => {
    const raw = '﻿<!doctype html><html><head></head><body>ok</body></html>';
    const { html } = composePreviewHtml(raw, SW_SCOPE);
    expect(html.charCodeAt(0)).not.toBe(0xfeff);
    expect(html.toLowerCase()).toMatch(/^<!doctype html>/);
  });

  test('strips stacked BOM + comment + script before doctype', () => {
    const raw =
      '﻿<!-- lead --><script>x=1</script><!doctype html><html><head></head><body>ok</body></html>';
    const { html } = composePreviewHtml(raw, SW_SCOPE);
    expect(html).not.toContain('lead');
    expect(html).not.toContain('x=1');
    expect(html.toLowerCase()).toMatch(/^<!doctype html>/);
    assertInjectionPosition(html);
  });

  test('trimPreDoctype is idempotent on well-formed input', () => {
    const raw = '<!doctype html><html><head></head><body>x</body></html>';
    expect(trimPreDoctype(raw)).toBe(raw);
  });
});
