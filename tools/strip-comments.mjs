/* ==================================================================== *
 * tools/strip-comments.mjs — the single comment stripper (S-3 / D67).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Five separate regex comment-strippers shipped in this repository, all
 * wrong in the same way: none tracked string, template or regex-literal
 * state, so a `/*` or `//` appearing inside a string constant, a template
 * literal or a regex literal opened a PHANTOM COMMENT that blanked live
 * code. The failure is silent by construction — the stripper blanks a
 * region, the scan finds nothing there, and under D46 "0 hits" is the
 * PASSING answer.
 *
 * Measured damage before this module existed is recorded in
 * docs/code-health/evidence/2026-08-21-elegance-run-01/qa-04/.
 *
 * PROVENANCE
 * ----------
 * The construction is the character-level scanner written during QA-03's
 * R1 review ("tracks string, template and regex-literal state, so a `//`
 * inside a string is not treated as a comment, blanks only real comments,
 * preserves length and newlines"). H03 re-derived the same shape in
 * tools/test-ring-split.mjs after measuring 148 wrongly-blanked lines in
 * its own file; this module extends it with a real template-interpolation
 * stack so that `${ ... }` is scanned as CODE and nested templates nest.
 *
 * Placed in tools/ and not in an evidence directory: D52 / D65.
 *
 * THE INVARIANTS, both asserted by tools/test-comment-stripper.mjs
 * ----------------------------------------------------------------
 *   1. LENGTH-PRESERVING  — out.length === src.length, always. V8 coverage
 *      ranges are byte offsets into the ORIGINAL text; a stripper that
 *      shortens the text re-points every offset. (QA-03's first coverage
 *      pass measured 7 uncovered sites instead of 30 for exactly this.)
 *   2. LINE-PRESERVING    — out.split('\n').length === src.split('\n').length.
 *      Every consumer derives a line number from the stripped text and then
 *      reads that line out of the ORIGINAL. R1's F-5 named this as the term
 *      PC-0 was missing.
 *
 * Comments become spaces; newlines inside them survive. So a comment that
 * merely MENTIONS a scanned pattern is not a hit, and column numbers hold.
 * ==================================================================== */

/** Characters after which a `/` begins a regex literal rather than a
 *  division. The standard last-significant-token heuristic. */
const REGEX_MAY_FOLLOW = new Set([
  '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';',
  '+', '-', '*', '%', '~', '^', '<', '>', '\n',
]);

/** Keywords after which a `/` begins a regex literal. `return /x/.test(s)`
 *  is a regex; `count / x` is not, and `count` is not in this list. */
const REGEX_KEYWORDS = [
  'return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void',
  'instanceof', 'do', 'else', 'yield', 'await',
];

/** Every non-newline character becomes a space. Length preserved exactly. */
const blank = (s) => s.replace(/[^\n]/g, ' ');

/**
 * Blank the comments in a JavaScript source text.
 *
 * @param {string} src  the source text
 * @param {{ blankStrings?: boolean }} [opts]
 *   blankStrings — also blank the CONTENTS of string and template literals,
 *   keeping their delimiters. Needed by scans whose own positive controls
 *   are source-shaped strings (a control that reads `"L.check('x', true)"`
 *   must not register as a hit on itself). Template INTERPOLATIONS are left
 *   intact and scanned as code, because they are code.
 *   Scans whose subject IS a string — an import-specifier scan, say — must
 *   leave this off.
 * @returns {string} same length, same line count, comments blanked
 */
export function stripComments(src, { blankStrings = false } = {}) {
  if (typeof src !== 'string') {
    throw new TypeError('stripComments: src must be a string');
  }
  let out = '';
  let i = 0;

  // The mode stack. Bottom is always code. A template literal pushes
  // { kind: 'template' }; a `${` inside one pushes { kind: 'code', depth: 0 },
  // and the matching `}` pops it. This is what makes nested templates and
  // interpolated code work, rather than "scan to the next backtick".
  const stack = [{ kind: 'code', depth: 0 }];
  const top = () => stack[stack.length - 1];

  /** Is the `/` at the cursor a regex literal, judged from the last
   *  significant character already emitted? Blanked comments are spaces,
   *  so they are skipped here for free. */
  const regexHere = () => {
    let k = out.length - 1;
    while (k >= 0 && (out[k] === ' ' || out[k] === '\t')) k--;
    if (k < 0) return true;
    const c = out[k];
    if (REGEX_MAY_FOLLOW.has(c)) return true;
    if (/[A-Za-z_$]/.test(c)) {
      let s = k;
      while (s >= 0 && /[\w$]/.test(out[s])) s--;
      return REGEX_KEYWORDS.includes(out.slice(s + 1, k + 1));
    }
    return false;
  };

  while (i < src.length) {
    const mode = top();

    /* ---- inside a template literal's literal text ------------------ */
    if (mode.kind === 'template') {
      const c = src[i];
      if (c === '\\') {
        // An escape. Two characters, and the second one is NOT a delimiter
        // however much it looks like one. `\`` inside a template, `\'`
        // inside a string — this is the case that let a `/*` after an
        // escaped quote open a phantom comment in every prior stripper.
        const pair = src.slice(i, i + 2);
        out += blankStrings ? blank(pair) : pair;
        i += 2;
        continue;
      }
      if (c === '`') { out += c; i++; stack.pop(); continue; }
      if (c === '$' && src[i + 1] === '{') {
        out += '${'; i += 2;
        stack.push({ kind: 'code', depth: 0 });
        continue;
      }
      // Ordinary template text. Newlines are legal here and are preserved
      // by `blank`, so the line count survives a multi-line template.
      out += blankStrings ? blank(c) : c;
      i++;
      continue;
    }

    /* ---- code ------------------------------------------------------ */
    if (src.startsWith('//', i)) {
      const j = src.indexOf('\n', i);
      const end = j === -1 ? src.length : j;
      out += blank(src.slice(i, end));
      i = end;
      continue;
    }
    if (src.startsWith('/*', i)) {
      const j = src.indexOf('*/', i + 2);
      const end = j === -1 ? src.length : j + 2;
      out += blank(src.slice(i, end));
      i = end;
      continue;
    }
    if (src[i] === '/' && regexHere()) {
      // A regex literal. Its body is copied through verbatim: it is neither
      // a comment nor a string, and a `//` or `/*` inside a character class
      // is the third shape D67 names.
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < src.length) {
        const c = src[j];
        if (c === '\\') { j += 2; continue; }
        if (c === '\n') break;              // unterminated — not a regex
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) { j++; closed = true; break; }
        j++;
      }
      if (closed) {
        while (j < src.length && /[dgimsuvy]/.test(src[j])) j++;
        out += src.slice(i, j);
        i = j;
        continue;
      }
      // Not a regex after all: fall through and emit the bare `/`.
      out += '/';
      i++;
      continue;
    }
    if (src[i] === '`') {
      out += '`'; i++;
      stack.push({ kind: 'template' });
      continue;
    }
    if (src[i] === '"' || src[i] === "'") {
      const q = src[i];
      let j = i + 1;
      let closed = false;
      while (j < src.length) {
        const c = src[j];
        if (c === '\\') { j += 2; continue; }
        // A raw newline terminates a single- or double-quoted string in
        // real JS. Stopping here keeps an unterminated quote — an
        // apostrophe in a comment that was itself inside a string, say —
        // from swallowing the rest of the file.
        if (c === '\n') break;
        if (c === q) { closed = true; break; }
        j++;
      }
      if (!closed) { out += q; i++; continue; }
      out += blankStrings
        ? q + blank(src.slice(i + 1, j)) + q
        : src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (src[i] === '{') { mode.depth++; out += '{'; i++; continue; }
    if (src[i] === '}') {
      if (mode.depth === 0 && stack.length > 1) {
        // Closes a `${ … }` interpolation; back to template text.
        out += '}'; i++; stack.pop();
        continue;
      }
      if (mode.depth > 0) mode.depth--;
      out += '}'; i++;
      continue;
    }
    out += src[i];
    i++;
  }
  return out;
}

/**
 * The two invariants, checked. Consumers call this once on their own
 * subject so that a future edit to this module cannot silently re-point
 * their offsets or their line numbers (D53: grade over service life).
 *
 * @returns {{ length: boolean, lines: boolean, ok: boolean }}
 */
export function stripInvariants(src, opts) {
  const out = stripComments(src, opts);
  const length = out.length === src.length;
  const lines = out.split('\n').length === src.split('\n').length;
  return { length, lines, ok: length && lines };
}
