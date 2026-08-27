#!/usr/bin/env python3
"""tools/trace/brake-tail.py — the landing-tail trace rig for a released glide.

WHY THIS EXISTS
---------------
`docs/code-health/evidence/2026-08-21-elegance-run-01/owned-pass/probe-entry.py`
measured the Connect -> Owned entry once, for one direction, and printed a raw
row dump that a human then read marks out of. This is that same rig, kept
verbatim where it was right (the virtual-clock recipe, the one-wheel-event-per-
virtual-frame gesture, the `?nointro=1&p=<rest>&steady=1` boot) and generalised
in the three ways DEFECT-04 needs:

  1. EITHER DIRECTION. `--dir back` boots at the arriving rest and flicks the
     other way, so "the backward traversal is untouched" is a measurement and
     not an argument from the name of a table.
  2. ANY LEG. `--from` / `--to` are chapter ids resolved through the live
     `REST_STOPS`, so `inspire>connect` (the boundary that must NOT move) is
     traced by the same code that traces `connect>owned`.
  3. MARKS, NOT ROWS. The rig derives the timeline the order asks for —
     camera finish, dead-beat span, copy 10/50/90%, hotspot ramp — from the
     recorded stream, so a before/after pair is comparable without re-reading
     a 500-row table by eye.

The camera-finish definition is the previous order's, kept deliberately so the
numbers are on the same scale: the last virtual-frame timestamp at which the
camera's WORLD TRANSLATION per frame is still >= 4% of that run's peak.

Translation alone, and not a composite of translation/gaze/fov each normalised
by its own peak — that composite was tried first here and it reads 2300 ms on
the same stream that translation reads 1883 ms on. The reason is a measurement
trap worth naming: fov's whole authored excursion on this leg is ~1 degree, so
normalising it by its own peak turns quantisation noise in the last decimal
into "4% of peak motion" and the finish mark chases the fov readout instead of
the picture. The dive is a translation; measure the translation.

Read-only. Serves nothing, writes nothing outside the file named by `--out`.
"""
import sys, os, json, time, math, tempfile, atexit, argparse

REPO = "/Users/hannahomalley/nigel/ados-paris/banodoco-website"
sys.path.insert(0, os.path.join(REPO, "tools"))
import capture as C  # noqa: E402

VT_INJECT = """
(() => {
  window.__vt = { now: 0 };
  const orig = performance.now.bind(performance);
  window.__vt.real = orig;
  performance.now = () => window.__vt.now;
})()
"""

# One wheel event per virtual frame for the gesture, then free frames. Every
# per-frame read is a plain getter on already-published state; nothing here
# drives the page except the wheel events.
RUN_JS = """
(async () => {
  const FRAME = 1000 / 60;
  const NOTCHES = %(notches)d;
  const DELTA = %(delta)f;
  const FRAMES = %(frames)d;
  const TARGET = %(target)f;
  const ARRIVING = '%(arriving)s';
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const j = window.journey;
  const cam = window.sceneApi.camera;
  const blk = () => document.querySelector('.j-block[data-chapter="' + ARRIVING + '"]');
  const head = () => {
    const b = blk();
    return b ? b.querySelector('h1, h2, .j-h, [data-role="heading"]') : null;
  };
  const hot = () => document.querySelector('.j-hotspots');
  const chip = () => document.querySelector('.j-hotspots .j-chip, .j-hotspots [data-node]');
  const rows = [];
  for (let i = 0; i < 5; i++) { window.__vt.now += FRAME; await raf(); }
  let restSeen = -1;
  for (let f = 0; f < FRAMES; f++) {
    window.__vt.now += FRAME;
    if (f < NOTCHES) {
      window.dispatchEvent(new WheelEvent('wheel', {
        deltaY: DELTA, deltaMode: 0, cancelable: true, bubbles: true }));
    }
    await raf();
    const cp = cam.position, q = cam.quaternion;
    const b = blk(), h = head(), hs = hot(), cp2 = chip();
    const bs = b ? getComputedStyle(b) : null;
    const hsS = hs ? getComputedStyle(hs) : null;
    let dbg = null;
    try {
      const d = j.debug || (j.ui && j.ui.debug) || null;
      dbg = d && d.copy ? d.copy : (d || null);
    } catch (e) {}
    rows.push({
      vt: +(window.__vt.now).toFixed(2),
      p: +j.p.toFixed(6),
      travelP: +j.travelP.toFixed(6),
      x: +cp.x.toFixed(5), y: +cp.y.toFixed(5), z: +cp.z.toFixed(5),
      qx: +q.x.toFixed(7), qy: +q.y.toFixed(7), qz: +q.z.toFixed(7), qw: +q.w.toFixed(7),
      fov: +cam.fov.toFixed(4),
      chapter: j.chapter,
      blockOp: bs ? +bs.opacity : -1,
      headOp: h ? +getComputedStyle(h).opacity : -1,
      hotOp: hsS ? +hsS.opacity : -1,
      chipOp: cp2 ? +getComputedStyle(cp2).opacity : -1,
      pSpeed: dbg && Number.isFinite(dbg.pSpeed) ? +dbg.pSpeed.toFixed(6) : null,
      settled: dbg && Number.isFinite(dbg.settled) ? +dbg.settled.toFixed(5) : null,
    });
    if (Math.abs(j.p - TARGET) < 1e-9) {
      if (restSeen < 0) restSeen = f;
      if (f - restSeen > 90) break;
    }
  }
  return JSON.stringify({ rows });
})()
"""


def marks(rows, target, release_vt):
    """Derive the order's timeline from the recorded stream."""
    out = {}
    lin, rot, fovd = [0.0], [0.0], [0.0]
    for i in range(1, len(rows)):
        a, b = rows[i - 1], rows[i]
        lin.append(math.dist((a["x"], a["y"], a["z"]), (b["x"], b["y"], b["z"])))
        dot = abs(a["qx"] * b["qx"] + a["qy"] * b["qy"] + a["qz"] * b["qz"] + a["qw"] * b["qw"])
        rot.append(2.0 * math.acos(min(1.0, dot)))
        fovd.append(abs(b["fov"] - a["fov"]))
    peak = max(lin) or 1.0
    out["cam_peak_lin_per_frame"] = round(peak, 6)
    out["cam_peak_rot_per_frame"] = round(max(rot), 6)
    out["cam_fov_span_deg"] = round(max(r["fov"] for r in rows) - min(r["fov"] for r in rows), 4)
    # last frame at or above 4% of peak translation — the previous order's mark
    last = 0
    for i, v in enumerate(lin):
        if v >= 0.04 * peak:
            last = i
    out["cam_finish_vt"] = rows[last]["vt"]
    out["cam_finish_p"] = rows[last]["p"]
    # a stricter reading: the last frame carrying 1% of peak translation
    lastm = 0
    for i, v in enumerate(lin):
        if v >= 0.01 * peak:
            lastm = i
    out["cam_1pct_vt"] = rows[lastm]["vt"]

    # --- the p-servo settle: first frame that lands exactly on the anchor ---
    settle = None
    settle_i = None
    for i, r in enumerate(rows):
        if abs(r["p"] - target) < 1e-9:
            settle, settle_i = r["vt"], i
            break
    out["p_settle_vt"] = settle
    out["dead_beat_ms"] = None if settle is None else round(settle - out["cam_finish_vt"], 1)

    # --- the brake window itself: where |err| starts decaying at a fixed rate ---
    # K_eff = (dp/dt) / |err| is ~0 during the ramp-in, rises through the
    # cruise as |err| shrinks at a fixed rate, and PLATEAUS the moment the
    # exponential brake takes the resolution over. Walk back from the settle
    # while the plateau holds; the frame it breaks at is the engage.
    if settle_i is not None and settle_i > 12:
        keff = [None] * len(rows)
        for i in range(1, settle_i):
            err = abs(target - rows[i]["p"])
            dp = abs(rows[i]["p"] - rows[i - 1]["p"])
            keff[i] = (dp * 60.0 / err) if err > 1e-9 else None
        tail_vals = [v for v in keff[max(1, settle_i - 6):settle_i] if v]
        plateau = sorted(tail_vals)[len(tail_vals) // 2] if tail_vals else None
        engage_i = None
        if plateau:
            i = settle_i - 1
            while i > 1 and keff[i] and abs(keff[i] - plateau) / plateau < 0.05:
                engage_i = i
                i -= 1
        if engage_i is not None:
            out["brake_engage_vt"] = rows[engage_i]["vt"]
            out["brake_engage_err"] = round(abs(target - rows[engage_i]["p"]), 6)
            out["brake_K_eff"] = round(plateau, 3)
            out["brake_tail_ms"] = round(settle - rows[engage_i]["vt"], 1)

    # --- copy fade crossings (the arriving chapter's own block) ---
    def cross(key, frac):
        if key not in rows[0]:
            return None
        lo = min(r[key] for r in rows)
        hi = max(r[key] for r in rows)
        if hi - lo < 0.05:
            return None
        thr = lo + frac * (hi - lo)
        for i in range(1, len(rows)):
            if rows[i - 1][key] < thr <= rows[i][key]:
                a, b = rows[i - 1], rows[i]
                t = (thr - a[key]) / (b[key] - a[key]) if b[key] != a[key] else 0
                return round(a["vt"] + t * (b["vt"] - a["vt"]), 1)
        return None
    for frac, name in ((0.10, "10"), (0.50, "50"), (0.90, "90")):
        out["copy_%s_vt" % name] = cross("blockOp", frac)
        out["chip_%s_vt" % name] = cross("chipOp", frac)
    out["copy_final_op"] = rows[-1]["blockOp"]
    out["chip_final_op"] = rows[-1].get("chipOp")
    out["hot_layer_op_span"] = [min(r["hotOp"] for r in rows), max(r["hotOp"] for r in rows)]

    out["release_vt"] = release_vt
    out["last_vt"] = rows[-1]["vt"]
    out["final_p"] = rows[-1]["p"]
    out["final_chapter"] = rows[-1]["chapter"]
    # the visible gap the owner named: picture done -> copy essentially in
    if out.get("copy_90_vt") is not None:
        out["picture_to_copy90_ms"] = round(out["copy_90_vt"] - out["cam_finish_vt"], 1)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="src", default="connect")
    ap.add_argument("--to", dest="dst", default="owned")
    ap.add_argument("--dir", dest="direction", choices=["fwd", "back"], default="fwd")
    ap.add_argument("--notches", type=int, default=12)
    ap.add_argument("--delta", type=float, default=120.0)
    ap.add_argument("--frames", type=int, default=600)
    ap.add_argument("--port", type=int, default=8177)
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--out", default=None)
    ap.add_argument("--rows", action="store_true", help="include the raw stream in --out")
    ap.add_argument("--reanalyze", default=None,
                    help="re-derive marks from a saved --rows file instead of driving Chrome")
    a = ap.parse_args()

    if a.reanalyze:
        doc = json.load(open(a.reanalyze))
        doc["marks"] = marks(doc["rows"], doc["target_p"], doc["marks"]["release_vt"])
        with open(a.reanalyze, "w") as f:
            f.write(json.dumps(doc, indent=2) + "\n")
        print(json.dumps({"leg": doc["leg"], "dir": doc["dir"], "marks": doc["marks"]}, indent=2))
        return

    C.BASE_URL = "http://localhost:%d/index.html" % a.port

    owners = ["mission", "inspire", "connect", "owned", "final"]
    stops = [0, 0.26, 0.523, 0.725, 0.97]
    i, k = owners.index(a.src), owners.index(a.dst)
    start_p, target_p = (stops[i], stops[k]) if a.direction == "fwd" else (stops[k], stops[i])
    arriving = a.dst if a.direction == "fwd" else a.src
    delta = a.delta if (target_p > start_p) else -a.delta

    profile = tempfile.mkdtemp(prefix="brake-tail-chrome-",
                               dir=os.environ.get("TRACE01_SCRATCH") or None)
    port = C.free_port()
    proc = C.launch_chrome(profile, port, False)
    atexit.register(C.reap_chrome, proc)
    cdp = C.CDP(C.page_ws_url(port))
    cdp.call("Page.enable"); cdp.call("Runtime.enable")
    C.wait_webgl_stable(cdp)
    cdp.call("Emulation.setDeviceMetricsOverride", {
        "width": a.width, "height": a.height, "deviceScaleFactor": 1, "mobile": False})
    cdp.call("Page.addScriptToEvaluateOnNewDocument", {"source": VT_INJECT})
    C.navigate_fresh(cdp, C.BASE_URL + "?nointro=1&p=%s&steady=1" % start_p)
    deadline = time.time() + 90
    while time.time() < deadline:
        if cdp.eval(C.READY_JS) in owners:
            break
        time.sleep(0.4)
    else:
        raise RuntimeError("journey never ready")
    time.sleep(1.0)
    raw = cdp.eval(RUN_JS % {"notches": a.notches, "delta": delta, "frames": a.frames,
                             "target": target_p, "arriving": arriving}, timeout_s=240.0)
    rows = json.loads(raw)["rows"]
    cdp.close()

    release_vt = round(5 * (1000 / 60) + a.notches * (1000 / 60), 1)
    m = marks(rows, target_p, release_vt)
    doc = {
        "leg": "%s>%s" % (a.src, a.dst), "dir": a.direction,
        "start_p": start_p, "target_p": target_p, "arriving": arriving,
        "notches": a.notches, "delta": delta,
        "viewport": [a.width, a.height], "frames_recorded": len(rows),
        "marks": m,
    }
    if a.rows:
        doc["rows"] = rows
    text = json.dumps(doc, indent=2)
    if a.out:
        with open(a.out, "w") as f:
            f.write(text + "\n")
    print(json.dumps({"leg": doc["leg"], "dir": doc["dir"], "marks": m}, indent=2))


if __name__ == "__main__":
    main()
