/**
 * Vibe Mode — client-side preview lint.
 *
 * Runs after every `tool_result` application (i.e. after each Anthropic
 * turn updates the virtual file tree). Each finding surfaces as a
 * non-blocking `system_notice` `ChatPart` appended by `useVibeSession`
 * so the author can self-correct before Ship It. Lint findings NEVER
 * block a turn.
 *
 * The three rules are the exact pre-plan-guidance regexes (do not
 * tune without a reviewer flag):
 *
 *   (1) Missing resize snippet when `manifest.layout.mode === 'inline-auto'`
 *       - no `postMessage.*banodoco:resize` in any `.html`/`.js` file → warn.
 *   (2) External fetch without `external_origins` declaration
 *       - `fetch\(['"]https?:\/\/[^'"]+['"]` in code AND the matched
 *         origin is NOT declared in `manifest.external_origins` → warn.
 *   (3) Asset reference with no matching asset
 *       - `assets\/[^'"\s)]+` that doesn't resolve to an entry in the
 *         virtual tree → warn.
 */

import type { VirtualFile, VirtualFileTree } from '@/types/vibe';
import type { BundleManifestV1 } from '@/types/post';

const RESIZE_SNIPPET_RE = /postMessage.*banodoco:resize/;
const EXTERNAL_FETCH_RE = /fetch\(['"]https?:\/\/[^'"]+['"]/g;
const ASSET_REF_RE = /assets\/[^'"\s)]+/g;

export interface LintFinding {
  readonly rule: 'missing_resize_snippet' | 'undeclared_external_fetch' | 'unresolved_asset_ref';
  readonly path: string;
  readonly message: string;
}

const isCodeFile = (path: string): boolean => /\.(html?|m?js)$/i.test(path);

const declaredOrigins = (manifest: BundleManifestV1 | null | undefined): Set<string> => {
  const set = new Set<string>();
  if (!manifest) return set;
  const raw = (manifest as unknown as Record<string, unknown>).external_origins;
  if (!Array.isArray(raw)) return set;
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    try {
      set.add(new URL(entry).origin);
    } catch {
      // Treat as literal match if not a full URL.
      set.add(entry);
    }
  }
  return set;
};

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const stripQuotes = (value: string): string => value.replace(/^['"]|['"]$/g, '');

export const lintTree = (
  tree: VirtualFileTree,
  manifest: BundleManifestV1 | null | undefined,
): LintFinding[] => {
  const findings: LintFinding[] = [];
  const treePaths = new Set(Object.keys(tree));

  // --- Rule 1: missing resize snippet (only when inline-auto layout) -------
  if (manifest?.layout?.mode === 'inline-auto') {
    const codePaths = Object.keys(tree).filter(isCodeFile);
    const anyHasSnippet = codePaths.some((p) => {
      const file: VirtualFile = tree[p];
      return file.kind === 'text' && typeof file.content === 'string' && RESIZE_SNIPPET_RE.test(file.content);
    });
    if (!anyHasSnippet) {
      findings.push({
        rule: 'missing_resize_snippet',
        path: '(manifest)',
        message:
          "manifest.layout.mode is 'inline-auto' but no file posts 'banodoco:resize' — the host page cannot size the iframe to content. Add a `window.parent.postMessage({type: 'banodoco:resize', v: 1, height}, '*')` call in any .html/.js file.",
      });
    }
  }

  const origins = declaredOrigins(manifest);

  // --- Rule 2 + Rule 3 iterated once per text file --------------------------
  for (const path of Object.keys(tree).sort()) {
    const file = tree[path];
    if (file.kind !== 'text' || typeof file.content !== 'string') continue;
    if (!isCodeFile(path)) {
      // Rule 2/3 only apply to code-style files; non-code text files (.json,
      // .css, .svg) can legitimately reference asset paths without fetch().
      // Asset-ref rule still applies to .css but for v1 keep the check
      // focused on .html/.js to match pre-plan guidance literally.
      continue;
    }
    const { content } = file;

    // Rule 2: external fetch not in manifest.external_origins
    const fetchMatches = content.match(EXTERNAL_FETCH_RE);
    if (fetchMatches) {
      for (const match of fetchMatches) {
        const urlMatch = match.match(/['"](https?:\/\/[^'"]+)['"]/);
        if (!urlMatch) continue;
        const origin = originOf(urlMatch[1]);
        if (!origin) continue;
        if (origins.has(origin) || origins.has(urlMatch[1])) continue;
        findings.push({
          rule: 'undeclared_external_fetch',
          path,
          message: `${path} calls fetch('${urlMatch[1]}') but origin ${origin} is not declared in manifest.external_origins.`,
        });
      }
    }

    // Rule 3: assets/… reference with no matching tree entry
    const assetMatches = content.match(ASSET_REF_RE);
    if (assetMatches) {
      for (const rawMatch of assetMatches) {
        const ref = stripQuotes(rawMatch);
        // Direct tree lookup; also try `assets/<name>` as a prefix.
        if (treePaths.has(ref)) continue;
        // Tree entries may live under a different top-level prefix; only
        // report if NO tree path ends with the ref's basename.
        const baseName = ref.split('/').pop() ?? ref;
        const anyMatch = Array.from(treePaths).some((p) => p === ref || p.endsWith('/' + baseName));
        if (anyMatch) continue;
        findings.push({
          rule: 'unresolved_asset_ref',
          path,
          message: `${path} references \`${ref}\` but no matching asset is in the tree. Drop the file into the AssetTray or patch the reference.`,
        });
      }
    }
  }

  return findings;
};
