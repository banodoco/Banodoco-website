// tools/trace/mobile/analyze-gatesweep.mjs — QA-ONLY analyzer for the mobile probes
// beside it. Adopted 2026-08-24 (PHONE-01) with the probes; see
// posefield.mjs's header for why this instrument set is kept.
// analyze2.mjs — icon-chain onsets from the live gate sweeps.
import { readFileSync } from 'node:fs';
const scratchOr = (name) => (process.env.PHONE_SCRATCH
  ? `${process.env.PHONE_SCRATCH}/${name}`
  : new URL(`./out/${name}`, import.meta.url).pathname);

const ids = ['ados', 'hivemind', 'discord'];
for (const mode of ['desktop', 'phone']) {
  const D = JSON.parse(readFileSync(scratchOr(`gatesweep-${mode}.json`)));
  console.log(`\n===== ${mode} (${D.vw}x${D.vh}) legPx=${(D.px.connectRest - D.px.inspireRest).toFixed(0)}`);
  const rows = D.rows;
  const cross = (get, thr, dir = 1) => {
    for (let i = 1; i < rows.length; i++) {
      const a = get(rows[i - 1]), b = get(rows[i]);
      if (dir > 0 ? (a < thr && b >= thr) : (a > thr && b <= thr)) {
        return rows[i - 1].p + (rows[i].p - rows[i - 1].p) * (thr - a) / (b - a);
      }
    }
    return null;
  };
  ids.forEach((id, k) => {
    const gOn = cross((r) => r.reveal[k], 0.02);       // gate first stirs (dot begins)
    const gHalf = cross((r) => r.reveal[k], 0.40);
    const g72 = cross((r) => r.reveal[k], 0.72);       // chip floor
    const g95 = cross((r) => r.reveal[k], 0.95);
    const vis = cross((r) => (r.chips[k] && r.chips[k].vis ? 1 : 0), 0.5);
    const lbl50 = cross((r) => (r.chips[k] ? r.chips[k].labelIn : -1), 0.5);
    const lblEnd = cross((r) => (r.chips[k] ? r.chips[k].labelIn : -1), 0.98);
    const gMax = Math.max(...rows.map((r) => r.reveal[k]));
    console.log(` ${id.padEnd(8)} dotStir p=${gOn?.toFixed(4)}  gate0.40 p=${gHalf?.toFixed(4)}  gate0.72(chipOn) p=${g72 ? g72.toFixed(4) : 'NEVER'}  gate0.95 p=${g95 ? g95.toFixed(4) : 'NEVER'}  chipVis p=${vis ? vis.toFixed(4) : 'never'}  label50% p=${lbl50 ? lbl50.toFixed(4) : 'NEVER'}  labelDone p=${lblEnd ? lblEnd.toFixed(4) : 'NEVER'}  gateMax=${gMax.toFixed(3)}`);
  });
  // at-rest state
  const rest = rows.reduce((b, r) => Math.abs(r.p - 0.523) < Math.abs(b.p - 0.523) ? r : b);
  console.log(' at rest p=0.523:', ids.map((id, k) => `${id}: gate=${rest.reveal[k].toFixed(3)} labelIn=${rest.chips[k]?.labelIn} icoS=${rest.chips[k]?.icoS} op=${rest.chips[k]?.op}`).join(' | '));
  console.log(' copy: firstVisible p=', cross((r) => (r.copyVis === 'visible' ? 1 : 0), 0.5)?.toFixed(4),
    ' cop50 p=', cross((r) => r.copyOp ?? 0, 0.5)?.toFixed(4));
  // px cost between dot stir and chip-on for each hub (what the finger travels between them)
  // p->px linear interp over recorded landmarks is not available per-p here; report p only.
}

/* ==== --assert (MOBILE-GATE-01) ===================================== *
 * The chip chain, on the live emulated phone, against the desktop control
 * taken in the SAME run. Two of PHONE-01's four measured consequences are
 * gated here — (b) three beats not one cluster, and (d) no chip frozen
 * mid-formation at the rest. The other two ((a) gate floor, (c) label lag)
 * are consequences of these and of A1's resolve, and are not separately
 * pinned: a beat gap and a formation variable are properties; a lag in
 * SECONDS is preset-dependent (phone-01 §3(c) says so explicitly) and would
 * have been a recording.
 * ==================================================================== */
if (process.argv.includes('--assert')) {
  const { A, finish } = await import('./gate-assert.mjs');
  const load = (m) => JSON.parse(readFileSync(scratchOr(`gatesweep-${m}.json`)));
  const P = load('phone'), K = load('desktop');
  const chipOn = (D) => {
    const rows = D.rows;
    return ids.map((_, k) => {
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1].reveal[k], b = rows[i].reveal[k];
        if (a < 0.72 && b >= 0.72) return rows[i - 1].p + (rows[i].p - rows[i - 1].p) * (0.72 - a) / (b - a);
      }
      return null;
    });
  };
  const restOf = (D) => D.rows.reduce((b, r) => (Math.abs(r.p - 0.523) < Math.abs(b.p - 0.523) ? r : b));
  A(P.vw === 430 && K.vw === 1440, 'emulation', `phone vw ${P.vw} / desktop vw ${K.vw}`,
    'gatesweep.mjs contexts — a sweep taken at the wrong width proves nothing');

  // (d) frozen chips. Every formation variable is an identity value at rest.
  const rest = restOf(P), kRest = restOf(K);
  ids.forEach((id, k) => {
    const c = rest.chips[k], d = kRest.chips[k];
    A(rest.reveal[k] >= 0.9999, `A3/gate-at-rest ${id}`, `${rest.reveal[k].toFixed(4)} >= 0.9999`,
      'phone-01 §3(d): 0.9267 before / 1.000 after');
    A(c && c.labelIn === 1, `A3/label-at-rest ${id}`, `labelIn ${c && c.labelIn} === 1`,
      'phone-01 §3(d): 0.780 before / 1.000 after — the label finished as you left');
    A(c && c.icoS === 1, `A3/icon-scale-at-rest ${id}`, `icoS ${c && c.icoS} === 1`,
      'phone-01 §3(d): 1.048 before (4.8% oversized, mid-breath) / 1.000 after');
    A(c && c.op >= 0.999, `A3/opacity-at-rest ${id}`, `opacity ${c && c.op} >= 0.999`,
      'phone-01 §3(d): 0.830 before / 1 after');
    A(d && d.labelIn === 1, `A3/desktop-control ${id}`, `desktop labelIn ${d && d.labelIn} === 1`,
      'phone-01 §3(d) desktop control column — if this reds the fault is not phone-only');
  });

  // (b) the phone's cadence IS the desktop's. Not a pinned p — a per-hub gap
  // against a control measured in the same run, so a legitimate re-key of the
  // whole leg moves both sides and this stays green.
  const pOn = chipOn(P), kOn = chipOn(K);
  ids.forEach((id, k) => {
    const ok = pOn[k] !== null && kOn[k] !== null;
    A(ok && Math.abs(pOn[k] - kOn[k]) <= 0.005, `A2/beat-parity ${id}`,
      `phone ${pOn[k] && pOn[k].toFixed(4)} vs desktop ${kOn[k] && kOn[k].toFixed(4)} — d ${ok ? Math.abs(pOn[k] - kOn[k]).toFixed(4) : 'n/a'} <= 0.005`,
      'phone-01 §3(b): hivemind was 0.4767 phone vs 0.4279 desktop (d 0.0488); after, within 0.002 on every hub');
  });
  const spread = Math.max(...pOn) - Math.min(...pOn);
  A(spread >= 0.03, 'A2/three-beats', `chip-on spread ${spread.toFixed(4)} >= 0.03`,
    'phone-01 §3(b): 0.0145 before (two hubs coincident) / 0.0600 after / 0.0620 desktop');
  finish('gatesweep');
}
