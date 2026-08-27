// tools/trace/mobile/gate-assert.mjs — MOBILE-GATE-01. The assertion vocabulary
// the three analyzers beside it share, so that each one grew a --assert mode in
// ~20 lines instead of restating this three times.
//
// EVERY THRESHOLD PASSED IN CARRIES ITS MEASUREMENT. `cite` is not decoration:
// a threshold whose provenance is not written beside it is the pin class this
// program has now converted twice (D124/D193), and the next reader has to be
// able to see both the shipped value and the fault value the number sits
// between. The analyzers print `tag  value  op  limit  (cite)` on every check,
// pass or fail, so a run is a measurement table AND a verdict.
//
// D118: the analyzer file IS the invocation. `finish()` calls process.exit, so
// the code comes from node on the process you spawned — never from a wrapper.
const checks = [];
/** ok: boolean. tag: the fault this check exists for. cite: where the number
 *  came from, verbatim enough to find. */
export function A(ok, tag, shown, cite) {
  checks.push({ ok, tag, shown, cite });
  return ok;
}
export function near(v, want, tol) { return Math.abs(v - want) <= tol; }
export function finish(label) {
  const bad = checks.filter((c) => !c.ok);
  for (const c of checks) console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.tag}: ${c.shown}   [${c.cite}]`);
  console.log(`${label}: ${checks.length - bad.length}/${checks.length} pass`);
  if (!checks.length) { console.log(`${label}: FAIL no checks ran — the assert mode is vacuous`); process.exit(3); }
  process.exit(bad.length ? 1 : 0);
}
