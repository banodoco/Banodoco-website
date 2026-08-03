#!/usr/bin/env python3
# ==============================================================================
# capture.py — Tier-3 stills, generated FROM THE LIVE SCENE.
#
#   python3 journey-v6/tools/capture.py            # capture the golden list
#   python3 journey-v6/tools/capture.py --check    # re-capture + diff (advisory)
#   python3 journey-v6/tools/capture.py --pose inspire --size desktop
#
# Implements PL-3.3 and ADR AR-4 / D5 (adr-d5-tier3-captures.md): the Tier-3
# fallback stills are screenshots of the shipping page, never hand-authored
# artwork, so the static journey cannot drift away from the real one.
#
# ------------------------------------------------------------------------------
# WHY CDP AND NOT `--headless=new --screenshot`
# ------------------------------------------------------------------------------
# The ADR proposed the one-shot `--screenshot` form. Measured on this machine
# (2026-08-02) it is not usable as the pipeline, for three reasons:
#
#   1. `--virtual-time-budget=<ms>` HANGS on this page. Virtual time only
#      advances when the renderer runs out of pending work, and the scene's
#      rAF loop plus the journey animator never drain — Chrome sat past a
#      120 s wall timeout without writing a file.
#   2. Plain `--screenshot` (no virtual time) DOES write a correct PNG, but
#      Chrome then never exits, so the script has to poll for the file and
#      kill the process — and there is no way to say "settle for N seconds
#      after the journey reports it is at the pose" before the shutter fires.
#   3. There is no injection point, so every still would bake the live page's
#      own nav / heading / sub / hotspot chrome into the image. Tier 3 renders
#      all of that as real HTML on top of the still (see ../static/index.html),
#      so baked-in copy would double every string on screen.
#
# So this script speaks the DevTools Protocol over a hand-rolled WebSocket
# (stdlib `socket` + `base64` + `json` — no Node, no selenium, no pip installs
# beyond Pillow, which is already present at 11.3.0). That buys an explicit
# readiness gate (`window.journey.chapter === <pose>`), an explicit settle
# window, runtime-only CSS injection, and a clean `Browser.close`.
#
# Nothing here writes to, patches, or monkey-patches any shipped file. The CSS
# injected at capture time lives in this script and dies with the tab.
#
# ------------------------------------------------------------------------------
# ⚠ TODO — PIXEL STABILITY BLOCKS ON THE `?capture=` FREEZE (NOT YET IN THE BUILD)
# ------------------------------------------------------------------------------
# As of 2026-08-02 the live build has NO `?capture=<pose>` parameter — grep
# the site's index.html and journey-v6/{journey.js,constants.js,core,chapters} for "capture="
# and you get only event-listener `{capture: true}` hits. The scene is therefore
# in permanent motion while the shutter is open:
#
#     breeze/gust sway  ·  4,200 drifting spores  ·  TAA (Halton 8) jitter
#     handheld camera drift  ·  region-highlight breathing
#
# BASELINE.md §8 and the ADR both measured this: run-to-run variance is ~1-3 MAE
# /255 with ~8% of pixels differing by >8, on IDENTICAL urls. That is not noise
# this script can average away — it is the scene doing its job.
#
# Consequences, stated plainly:
#   · These stills are CORRECT and SHIP-QUALITY for Tier 3. A visitor sees one
#     frozen frame of a living scene, which is exactly the intent.
#   · `--check` is ADVISORY ONLY. It prints MAE and %-differing and never
#     returns a failing exit code, because a pass/fail gate on an unfrozen
#     scene would fail 100% of the time and teach everyone to ignore it.
#   · The moment `?capture=<pose>` lands (owner: the motion/core pass — see
#     ../tools/TIER-WIRING.md §2 for exactly what it must freeze), do TWO
#     things here: (a) add `capture=<pose>` to POSE_QUERY below, and (b) flip
#     CHECK_IS_ADVISORY to False and enforce the ADR thresholds already encoded
#     in FAIL_MAE / WARN_MAE. No other change is needed.
#
# DO NOT "fix" this by editing core/ to add the freeze from here. core/ is owned
# by the motion pass; this file's boundary is tools/ + static/.
# ==============================================================================

import argparse
import base64
import json
import os
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request

from PIL import Image, ImageChops, ImageStat

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__))
JOURNEY_DIR = os.path.dirname(HERE)                      # .../glowshroom/journey-v6
OUT_DIR = os.path.join(JOURNEY_DIR, "static", "captures")

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE_URL = "http://localhost:8137/index.html"  # M1: promoted to the site root

# The golden list — the five resting poses (12-platforms.md tier table, ADR D5).
# `chapter` is what window.journey.chapter must report before the shutter fires.
POSES = [
    {"id": "mission", "chapter": "mission", "label": "Mission"},
    {"id": "inspire", "chapter": "inspire", "label": "Inspire"},
    {"id": "connect", "chapter": "connect", "label": "Connect"},
    {"id": "owned",   "chapter": "owned",   "label": "Owned"},
    {"id": "final",   "chapter": "final",   "label": "Final pullback"},
]

# Two viewports. Desktop is the spec's primary review size (BASELINE.md §5 #1).
# Mobile is 430x932 — iPhone 15 Pro Max logical portrait, the size named in the
# W4-F brief. (The ADR says 390x844; the brief supersedes it. Both land in the
# scene's `mobile` ANCHORS mode, w <= 620 and portrait, so the framing is the
# deliberate portrait pose and not a squeezed desktop frame — PL-1.1.)
SIZES = {
    "desktop": {"w": 1440, "h": 900,  "mobile": False},
    "mobile":  {"w": 430,  "h": 932,  "mobile": True},
}

# Query params handed to the live page for every capture.
#   nointro=1  skips the entry choreography (existing hero QA param)
#   pose=<id>  pins journey progress to that chapter's resting p (journey.js)
# TODO(freeze): append "capture": pose_id here once ?capture= exists.
def POSE_QUERY(pose_id):
    return {"nointro": "1", "pose": pose_id}


# Seconds of real time to let the scene settle AFTER window.journey reports the
# pose. Covers: the deep-link placeAt() double applyFrame, seam arming, the
# inspire.snap(), TAA history filling (8 Halton samples), and the spore field
# reaching its drift equilibrium. Measured: below ~1.5 s the TAA history is
# visibly under-accumulated (thin, sparkly strands); 2.5 s is comfortably past.
SETTLE_S = 2.5

READY_TIMEOUT_S = 25.0     # how long to wait for window.journey to reach the pose
DPR = 1                    # --force-device-scale-factor. See --dpr.

# Elements hidden at capture time so the still is PURE SCENE. Tier 3 renders
# every one of these as real, accessible HTML (../static/index.html), so baking
# them into the image would duplicate all the copy on screen.
# `--chrome` keeps them, which is what a full-page regression golden wants.
HIDE_SELECTORS = [
    ".ui",          # hero nav + wordmark + h1 + sub + CTA, and the journey nav
    ".callouts",    # the three world-tracked hero callouts
    ".j-copy",      # journey chapter copy blocks
    ".j-hotspots",  # node hotspot proxies
    ".j-card",      # detail card
]

# ADR D5 thresholds. Inert until the freeze lands — see the TODO banner.
CHECK_IS_ADVISORY = True
WARN_MAE = 0.5 * 255 / 100.0     # ADR: "warn > 0.5%"
FAIL_MAE = 2.0 * 255 / 100.0     # ADR: "fail > 2%"


# ==============================================================================
# Minimal WebSocket client (RFC 6455, client side, text + binary, masked)
# ==============================================================================

class WebSocket(object):
    """Just enough WebSocket to carry CDP. No compression, no extensions."""

    def __init__(self, url, timeout=30.0):
        # ws://host:port/path
        assert url.startswith("ws://"), url
        rest = url[len("ws://"):]
        hostport, _, path = rest.partition("/")
        host, _, port = hostport.partition(":")
        port = int(port or 80)
        self.sock = socket.create_connection((host, port), timeout=timeout)
        self.sock.settimeout(timeout)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            "GET /%s HTTP/1.1\r\n"
            "Host: %s\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Key: %s\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        ) % (path, hostport, key)
        self.sock.sendall(req.encode())
        self._buf = b""
        while b"\r\n\r\n" not in self._buf:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise RuntimeError("websocket handshake closed early")
            self._buf += chunk
        head, _, self._buf = self._buf.partition(b"\r\n\r\n")
        if b"101" not in head.split(b"\r\n")[0]:
            raise RuntimeError("websocket handshake failed: %r" % head[:200])

    # -- framing ---------------------------------------------------------------

    def _recv_exact(self, n):
        while len(self._buf) < n:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise RuntimeError("websocket closed")
            self._buf += chunk
        out, self._buf = self._buf[:n], self._buf[n:]
        return out

    def send(self, text):
        payload = text.encode("utf-8")
        header = bytearray([0x81])                       # FIN + text
        n = len(payload)
        mask_bit = 0x80
        if n < 126:
            header.append(mask_bit | n)
        elif n < (1 << 16):
            header.append(mask_bit | 126)
            header += struct.pack(">H", n)
        else:
            header.append(mask_bit | 127)
            header += struct.pack(">Q", n)
        mask = os.urandom(4)
        header += mask
        masked = bytearray(payload)
        for i in range(n):
            masked[i] ^= mask[i & 3]
        self.sock.sendall(bytes(header) + bytes(masked))

    def recv(self):
        """Return one complete message as str, reassembling continuations."""
        chunks = []
        while True:
            b0, b1 = self._recv_exact(2)
            fin = b0 & 0x80
            opcode = b0 & 0x0F
            length = b1 & 0x7F
            if length == 126:
                length = struct.unpack(">H", self._recv_exact(2))[0]
            elif length == 127:
                length = struct.unpack(">Q", self._recv_exact(8))[0]
            data = self._recv_exact(length) if length else b""
            if opcode == 0x9:                            # ping -> pong
                self.sock.sendall(b"\x8a\x80" + os.urandom(4))
                continue
            if opcode == 0x8:                            # close
                raise RuntimeError("websocket closed by peer")
            if opcode == 0xA:                            # pong
                continue
            chunks.append(data)
            if fin:
                return b"".join(chunks).decode("utf-8", "replace")

    def close(self):
        try:
            self.sock.close()
        except Exception:
            pass


# ==============================================================================
# CDP session
# ==============================================================================

class CDP(object):
    def __init__(self, ws_url, verbose=False):
        self.ws = WebSocket(ws_url)
        self._id = 0
        self.verbose = verbose

    def call(self, method, params=None, timeout_s=60.0):
        self._id += 1
        mid = self._id
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError("%s: %s" % (method, msg["error"]))
                return msg.get("result", {})
            # any event in between is ignored: this script polls, never listens
        raise RuntimeError("timeout waiting for %s" % method)

    def eval(self, expression, timeout_s=30.0):
        r = self.call("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True,
        }, timeout_s=timeout_s)
        if r.get("exceptionDetails"):
            raise RuntimeError("JS error: %s" % json.dumps(r["exceptionDetails"])[:400])
        return r.get("result", {}).get("value")

    def close(self):
        self.ws.close()


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def launch_chrome(profile_dir, port, verbose=False):
    if not os.path.exists(CHROME):
        sys.exit("Chrome not found at %s" % CHROME)
    args = [
        CHROME,
        "--headless=new",
        "--remote-debugging-port=%d" % port,
        "--user-data-dir=%s" % profile_dir,
        "--disable-gpu-sandbox",
        "--use-angle=metal",             # ANGLE Metal — the Tier-1 reference path
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--force-device-scale-factor=%d" % DPR,
        "about:blank",
    ]
    proc = subprocess.Popen(
        args,
        stdout=(None if verbose else subprocess.DEVNULL),
        stderr=(None if verbose else subprocess.DEVNULL),
    )
    # Wait for the debugging endpoint.
    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            with urllib.request.urlopen("http://127.0.0.1:%d/json/version" % port, timeout=1) as r:
                json.loads(r.read().decode())
                return proc
        except Exception:
            time.sleep(0.15)
    proc.kill()
    sys.exit("Chrome did not open a debugging port on %d" % port)


def page_ws_url(port):
    deadline = time.time() + 15
    while time.time() < deadline:
        with urllib.request.urlopen("http://127.0.0.1:%d/json/list" % port, timeout=2) as r:
            targets = json.loads(r.read().decode())
        for t in targets:
            if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                return t["webSocketDebuggerUrl"]
        time.sleep(0.2)
    raise RuntimeError("no page target on port %d" % port)


# ==============================================================================
# Capture
# ==============================================================================

def build_url(pose_id):
    q = POSE_QUERY(pose_id)
    return BASE_URL + "?" + "&".join("%s=%s" % (k, v) for k, v in q.items())


HIDE_JS = """
(() => {
  const sel = %s;
  const st = document.createElement('style');
  st.id = '__capture_hide__';
  st.textContent = sel.map(s => s + '{opacity:0 !important;visibility:hidden !important;}').join('\\n');
  document.head.appendChild(st);
  return sel.length;
})()
"""

READY_JS = """
(() => {
  if (document.readyState !== 'complete') return 'loading';
  if (!window.sceneApi) return 'no-scene';
  if (!window.journey) return 'no-journey';
  try { return window.journey.chapter || 'no-chapter'; }
  catch (e) { return 'err:' + e.message; }
})()
"""


def capture_one(cdp, pose, size_key, hide_chrome, settle_s, verbose, quantize=False):
    size = SIZES[size_key]
    cdp.call("Emulation.setDeviceMetricsOverride", {
        "width": size["w"], "height": size["h"],
        "deviceScaleFactor": DPR, "mobile": size["mobile"],
    })
    url = build_url(pose["id"])
    cdp.call("Page.navigate", {"url": url})

    # Readiness: the journey itself declares the pose. No sleep-and-hope.
    deadline = time.time() + READY_TIMEOUT_S
    state = None
    while time.time() < deadline:
        try:
            state = cdp.eval(READY_JS)
        except Exception as e:
            state = "eval-error: %s" % e
        if state == pose["chapter"]:
            break
        time.sleep(0.25)
    ready = state == pose["chapter"]
    if verbose:
        print("      readiness: %s" % state)

    if hide_chrome:
        cdp.eval(HIDE_JS % json.dumps(HIDE_SELECTORS))

    # Settle. Everything below this line is the part that ?capture= will make
    # unnecessary (see the TODO banner at the top of this file).
    time.sleep(settle_s)

    shot = cdp.call("Page.captureScreenshot", {
        "format": "png", "captureBeyondViewport": False, "fromSurface": True,
    }, timeout_s=90.0)
    raw = base64.b64decode(shot["data"])

    # Post-process with Pillow: assert the true pixel size, drop the alpha
    # channel (the stills are opaque backgrounds; RGBA costs ~25% for nothing),
    # and re-encode optimized.
    import io
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    want = (size["w"] * DPR, size["h"] * DPR)
    if im.size != want:
        im = im.resize(want, Image.LANCZOS)

    name = "%s@%dx%d.png" % (pose["id"], size["w"], size["h"])
    path = os.path.join(OUT_DIR, name)
    out_im = im
    if quantize:
        # Measured on inspire@1440x900 (2026-08-02): 2109 KB -> 1040 KB, MAE
        # 1.10/255 against the lossless original. That is BELOW the scene's own
        # run-to-run variance (1-3 MAE, BASELINE.md §8) — i.e. the palette costs
        # less fidelity than re-running the capture does. Still off by default:
        # the G5 tier-identity review should compare against lossless bytes, and
        # the decision to trade fidelity for weight belongs to the integrator,
        # not to this script's default. See tools/TIER-WIRING.md §5.
        out_im = im.quantize(colors=256, method=Image.MEDIANCUT,
                             dither=Image.FLOYDSTEINBERG)
    out_im.save(path, "PNG", optimize=True)

    stat = ImageStat.Stat(im)
    mean = sum(stat.mean) / 3.0
    return {
        "pose": pose["id"], "chapter": pose["chapter"], "label": pose["label"],
        "size": size_key, "file": name, "w": size["w"], "h": size["h"], "dpr": DPR,
        "bytes": os.path.getsize(path), "mean": round(mean, 2),
        "ready": ready, "readiness": state, "url": url,
    }


def mae(a_path, b_path):
    a = Image.open(a_path).convert("RGB")
    b = Image.open(b_path).convert("RGB")
    if a.size != b.size:
        return None, None
    diff = ImageChops.difference(a, b)
    m = sum(ImageStat.Stat(diff).mean) / 3.0
    gray = diff.convert("L")
    hist = gray.histogram()
    over8 = sum(hist[9:]) / float(a.size[0] * a.size[1])
    return m, over8 * 100.0


# ==============================================================================
# main
# ==============================================================================

def main():
    global DPR
    ap = argparse.ArgumentParser(description="Tier-3 capture pipeline (PL-3.3 / ADR D5)")
    ap.add_argument("--pose", action="append", help="pose id; repeatable (default: all five)")
    ap.add_argument("--size", action="append", choices=sorted(SIZES), help="viewport; repeatable (default: both)")
    ap.add_argument("--dpr", type=int, default=DPR, help="device scale factor (default 1)")
    ap.add_argument("--settle", type=float, default=SETTLE_S, help="settle seconds after readiness (default %.1f)" % SETTLE_S)
    ap.add_argument("--chrome", action="store_true", help="keep the page's own nav/copy/hotspots in the still")
    ap.add_argument("--quantize", action="store_true",
                    help="256-colour palette PNG: ~50%% smaller, MAE 1.10/255 (below scene noise)")
    ap.add_argument("--check", action="store_true", help="re-capture beside the existing goldens and report drift (ADVISORY)")
    ap.add_argument("--out", default=OUT_DIR, help="output directory")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    DPR = args.dpr
    out_dir = args.out
    poses = [p for p in POSES if not args.pose or p["id"] in args.pose]
    sizes = args.size or list(SIZES)
    if not poses:
        sys.exit("no matching pose; known: %s" % ", ".join(p["id"] for p in POSES))

    # The server must already be up (BASELINE.md §machine: port 8137 rooted at
    # glowshroom/). This script never starts or stops it.
    try:
        with urllib.request.urlopen(BASE_URL, timeout=3) as r:
            r.read(64)
    except Exception as e:
        sys.exit(
            "cannot reach %s (%s)\n"
            "start the static server first:\n"
            "  python3 -m http.server 8137 --directory "
            "/Users/hannahomalley/nigel/ados-paris/glowshroom" % (BASE_URL, e)
        )

    os.makedirs(out_dir, exist_ok=True)
    check_dir = os.path.join(out_dir, "_check")
    if args.check:
        os.makedirs(check_dir, exist_ok=True)

    profile = tempfile.mkdtemp(prefix="capture-chrome-")
    port = free_port()
    print("capture.py — %d pose(s) x %d size(s), dpr %d, settle %.1fs"
          % (len(poses), len(sizes), DPR, args.settle))
    print("  source : %s" % BASE_URL)
    print("  output : %s" % out_dir)
    if not args.chrome:
        print("  chrome : hidden (pure scene; Tier 3 renders the copy as HTML)")
    proc = launch_chrome(profile, port, args.verbose)
    results = []
    try:
        cdp = CDP(page_ws_url(port), args.verbose)
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        for pose in poses:
            for size_key in sizes:
                t0 = time.time()
                print("  · %-8s %-7s " % (pose["id"], size_key), end="", flush=True)
                target_dir = check_dir if args.check else out_dir
                saved_out = OUT_DIR
                try:
                    globals()["OUT_DIR"] = target_dir
                    r = capture_one(cdp, pose, size_key, not args.chrome,
                                    args.settle, args.verbose, args.quantize)
                finally:
                    globals()["OUT_DIR"] = saved_out
                r["dir"] = target_dir
                results.append(r)
                flag = "ok " if r["ready"] else "POSE NOT CONFIRMED (%s) " % r["readiness"]
                black = " ⚠ BLACK/near-empty" if r["mean"] < 3.0 else ""
                print("%s %6.1f KB  mean %5.1f  %4.1fs%s"
                      % (flag, r["bytes"] / 1024.0, r["mean"], time.time() - t0, black))
        try:
            cdp.call("Browser.close", timeout_s=5)
        except Exception:
            pass
        cdp.close()
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=8)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)

    if args.check:
        print("\n--- drift check (ADVISORY: the scene is not frozen; see file header) ---")
        worst = 0.0
        for r in results:
            golden = os.path.join(out_dir, r["file"])
            fresh = os.path.join(check_dir, r["file"])
            if not os.path.exists(golden):
                print("  · %-22s no golden on disk — run without --check first" % r["file"])
                continue
            m, pct = mae(golden, fresh)
            if m is None:
                print("  · %-22s size mismatch" % r["file"])
                continue
            worst = max(worst, m)
            band = "FAIL-band" if m > FAIL_MAE else ("warn-band" if m > WARN_MAE else "within")
            print("  · %-22s MAE %5.2f/255  %5.1f%% px >8   [%s]" % (r["file"], m, pct, band))
        print("\n  worst MAE %.2f/255. Thresholds warn>%.2f fail>%.2f." % (worst, WARN_MAE, FAIL_MAE))
        if CHECK_IS_ADVISORY:
            print("  Exit code forced to 0: unfrozen scene, per-run variance is ~1-3 MAE by")
            print("  construction (BASELINE.md §8). Flip CHECK_IS_ADVISORY once ?capture= lands.")
        return 0

    # ------------------------------------------------------------------
    # manifest.json — the Tier-3 page and any future <picture>/srcset wiring
    # read this instead of hard-coding filenames (ADR D5 "Where they land").
    # ------------------------------------------------------------------
    manifest = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "source": BASE_URL,
        "note": (
            "Generated by journey-v6/tools/capture.py from the live scene. "
            "Do not hand-edit these PNGs. The scene was NOT frozen at capture "
            "time (?capture= does not exist yet), so these are one frame of a "
            "moving scene, not a reproducible pixel target."
        ),
        "frozen": False,
        "dpr": DPR,
        "chromeHidden": not args.chrome,
        "quantized": bool(args.quantize),
        "settleSeconds": args.settle,
        "poses": {},
    }
    for r in results:
        entry = manifest["poses"].setdefault(r["pose"], {
            "chapter": r["chapter"], "label": r["label"], "sizes": {},
        })
        entry["sizes"][r["size"]] = {
            "src": "captures/" + r["file"], "w": r["w"], "h": r["h"],
            "bytes": r["bytes"], "mean": r["mean"], "poseConfirmed": r["ready"],
        }
    with open(os.path.join(out_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")

    bad = [r for r in results if not r["ready"] or r["mean"] < 3.0]
    total = sum(r["bytes"] for r in results)
    print("\n  wrote %d PNG(s), %.1f MB total, + manifest.json" % (len(results), total / 1048576.0))
    if bad:
        print("  ⚠ %d capture(s) need attention: %s"
              % (len(bad), ", ".join(r["file"] for r in bad)))
        return 1
    print("  all poses confirmed by window.journey.chapter, none black.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
