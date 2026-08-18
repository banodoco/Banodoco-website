#!/usr/bin/env python3
# ==============================================================================
# capture.py — Tier-3 stills + CI regression gate, generated FROM THE LIVE
# SCENE through the deterministic ?capture= freeze (frozen mode, default).
#
#   python3 tools/capture.py             # (re)shoot the golden list, frozen
#   python3 tools/capture.py --check     # re-capture + diff vs goldens — REAL
#                                         # gate: exit 1 on MAE > FAIL_MAE
#   python3 tools/capture.py --pose inspire --size desktop
#   python3 tools/capture.py --live      # old unfrozen scrub path (?pose=),
#                                         # sanity-check only; --check --live
#                                         # stays advisory (scene is noisy)
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
# FROZEN-CAPTURE ERA (M6, 2026-08-04) — see journey-v6-plan/15-merge-and-
# architecture.md M6 row + EXECUTION.md's M6 entry for the full record.
# ------------------------------------------------------------------------------
# `?capture=<p | chapterId>` landed in the build at M5 (commit `3badf8b`):
# main.js calls `sceneApi.freezeTime(0)` before the scene boots, which latches
# every time-driven system (breeze/gust sway, the 4,200-spore drift integrator,
# tap ring-down, handheld drift, region-highlight breathing, TAA's Halton
# sample index) to a single fixed phase — nothing left advances after the
# journey places itself at the requested progress with the dt=0 deep-link
# path. Verified at M5: two CDP shutters 5 s apart at the same `?capture=`
# URL are PIXEL-IDENTICAL (diff bbox None @1440x900).
#
# This script now shoots through THAT path by default — `build_url()` emits
# `?capture=<pose_id>` (pose ids are chapter ids, which the freeze accepts
# directly and resolves to that chapter's rest progress) instead of the old
# live-scrub `?pose=<id>`. Consequences:
#
#   · Goldens are REPRODUCIBLE pixel targets, not "one honest frame of a
#     living scene" — the frozen frame IS the scene, held still.
#   · `--check` is a REAL gate: CHECK_IS_ADVISORY is False in frozen mode,
#     and a MAE over FAIL_MAE exits 1. The threshold is derived from measured
#     frozen-frame determinism (shoot the same golden twice, back to back;
#     see EXECUTION.md's M6 entry for the measured spread), not the old ADR
#     percentages — those were sized for an unfrozen scene and are far too
#     loose now.
#   · The pre-freeze live-scrub path (`?nointro=1&pose=<id>`, ~1-3 MAE/255
#     run-to-run noise by construction) is kept behind `--live` because it is
#     cheap to keep and useful as a sanity check that the frozen and live
#     rests actually agree visually — but it is never the golden source and
#     `--check --live` stays advisory (an unfrozen scene cannot pass a tight
#     pixel gate; see BASELINE.md §8).
# ==============================================================================

import argparse
import atexit
import base64
import json
import os
import shutil
import signal
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
JOURNEY_DIR = os.path.dirname(HERE)                      # .../glowshroom (M4: tools/ lives at the site root)
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
#
#   FROZEN (default): capture=<pose_id> — pose ids are chapter ids, which the
#   ?capture= handler (journey.js) resolves via restProgress() to that
#   chapter's exact rest progress, under the dt=0 deep-link path. main.js
#   also freezes the organism's shared clock (freezeTime(0)) and skips the
#   intro the moment it sees ?capture on the URL — one query param buys
#   "place here, stop time, don't animate in."
#
#   LIVE (--live): nointro=1&pose=<id> — the pre-freeze scrub path. Journey
#   progress is pinned but breeze/spores/TAA/handheld all keep running, so
#   run-to-run variance is ~1-3 MAE/255 by construction (BASELINE.md §8).
#   Kept only as a cheap sanity check that frozen and live rests agree.
def POSE_QUERY(pose_id, live=False):
    if live:
        return {"nointro": "1", "pose": pose_id}
    return {"capture": pose_id}


# Seconds of real time to let the scene settle AFTER window.journey reports the
# pose, before the shutter fires.
#
# FROZEN mode: there is no accumulation left to wait for — freezeTime(0) pins
# TAA to a single held Halton sample rather than accumulating over frames, so
# the frame is exact as soon as it's painted. SETTLE_S_FROZEN only needs to
# cover one rAF tick for the composer to actually paint the post-freeze,
# post-hide-chrome state; measured empirically (capture.py --check twice
# back to back at this settle: identical goldens, MAE 0.00/255 every file —
# see EXECUTION.md's M6 entry for the full spread table). Kept well above
# the minimum needed as cheap insurance, since it costs ~10s total across
# the golden list.
#
# LIVE mode (--live): unchanged from the pre-freeze pipeline — covers the
# deep-link placeAt() double applyFrame, seam arming, inspire.snap(), TAA
# history filling (8 Halton samples), and the spore field reaching drift
# equilibrium. Measured: below ~1.5s the TAA history is visibly
# under-accumulated (thin, sparkly strands); 2.5s is comfortably past.
SETTLE_S_FROZEN = 0.6
SETTLE_S_LIVE = 2.5
SETTLE_S = SETTLE_S_FROZEN   # kept as the default-mode alias other code reads

READY_TIMEOUT_S = 25.0     # how long to wait for window.journey to reach the pose
# Headless Chrome's GPU process is not ready when /json/version first answers.
# createScene() in main.js constructs THREE.WebGLRenderer synchronously on
# module evaluate — if that races a still-spawning (or just-crashed) GPU
# process, the constructor throws, sceneApi stays null, and the readiness
# poll sits on 'no-scene' for the rest of READY_TIMEOUT_S. Waiting for a
# real WebGL context on about:blank BEFORE the first ?capture= navigation
# is what makes attempt 1 reliable under load. See wait_webgl().
WEBGL_TIMEOUT_S = 45.0
CHROME_PORT_TIMEOUT_S = 60.0
DPR = 1                    # --force-device-scale-factor. See --dpr.

# Elements hidden at capture time so the still is PURE SCENE. Tier 3 renders
# every one of these as real, accessible HTML (../static/index.html), so baking
# them into the image would duplicate all the copy on screen.
# `--chrome` keeps them, which is what a full-page regression golden wants.
HIDE_SELECTORS = [
    ".ui",          # hero nav + wordmark + h1 + sub + CTA
    ".callouts",    # the three world-tracked hero callouts
    ".j-copy",      # journey chapter copy blocks
    ".j-hotspots",  # node hotspot proxies
    ".j-card",      # detail card
    # The right-side navigator (journey/rail.js; 2026-08-09 redux of the
    # 2026-08-07 side rail) and its site-map panel. It used to be inside `.ui`
    # as the `.j-nav` row and was covered by the first entry; it is a sibling
    # landmark on <body> now, so it needs naming. Tier 3 renders its own copy
    # of the rail as real HTML over the still, exactly as it does for the nav
    # row this replaced, so a baked-in one would double it. (The old footer
    # and its epilogue cue were removed by the same redux — nothing of theirs
    # is left to hide.)
    ".j-rail",
    ".j-menu",
    ".j-menu-scrim",
]

# --check thresholds.
#
# FROZEN mode (default, real gate): derived from measured frozen-frame
# determinism, NOT the old ADR percentages (those were sized for a scene in
# permanent motion and are ~100x too loose to catch anything now that the
# frame is reproducible). Method: shoot the golden list, then run --check
# immediately after (re-shoots the same ?capture= URLs and diffs against the
# goldens just written) — that IS "shoot the same golden twice." Measured
# 2026-08-04 (see EXECUTION.md's M6 entry for the full per-file table): TWO
# back-to-back `capture.py --check` runs against the freshly-shot goldens
# (all 5 poses x 2 sizes = 10 files) reported MAE 0.00/255 and 0.0% px>8 on
# EVERY file, both runs — the freeze really does produce a bit-identical
# frame, not just a low-noise one. FROZEN_MEASURED_SPREAD is therefore 0.0
# to the precision this script reports; FAIL_MAE = max(3x that spread,
# floor 1.0) collapses to the floor, per the plan's own rule (M6 row) — the
# floor exists precisely so a genuinely-zero measured spread doesn't produce
# a zero-tolerance gate that trips on font-hinting/GPU-driver noise across
# machines.
FROZEN_MEASURED_SPREAD = 0.0        # measured, not a placeholder — see comment above
FAIL_MAE_FROZEN = max(3.0 * FROZEN_MEASURED_SPREAD, 1.0)
WARN_MAE_FROZEN = FAIL_MAE_FROZEN / 2.0

# LIVE mode (--live, advisory only): the original ADR D5 percentages, sized
# for an unfrozen, permanently-moving scene.
WARN_MAE_LIVE = 0.5 * 255 / 100.0     # ADR: "warn > 0.5%"
FAIL_MAE_LIVE = 2.0 * 255 / 100.0     # ADR: "fail > 2%"


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


def reap_chrome(proc):
    """SIGTERM/SIGKILL the whole session, not just the browser PID.

    Chrome on macOS spawns gpu / renderer / utility helpers in the same
    process group. `proc.terminate()` only signals the browser; if this
    script is killed before Browser.close, helpers get reparented to
    launchd (PPID 1) and keep a Metal GPU process alive. The next capture
    then races that leftover allocator — the ANGLE warning "Trying to load
    the allocator multiple times" — and createScene throws. start_new_session
    in launch_chrome makes proc.pid the group leader, so killpg is safe.
    """
    if proc is None:
        return
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except Exception:
        try:
            proc.terminate()
        except Exception:
            pass
    try:
        proc.wait(timeout=8)
        return
    except Exception:
        pass
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass
    try:
        proc.wait(timeout=3)
    except Exception:
        pass


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
        "--disable-gpu-process-crash-limit",  # GPU helper dies under load; let it come back
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        # These do not change GL output. They stop Chrome from spawning
        # GoogleUpdater / OnDeviceModel / GCM mid-run — observed to collide
        # with createScene() and leave readiness at 'no-scene'.
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-sync",
        "--disable-breakpad",
        "--mute-audio",
        "--disable-features=OnDeviceModel,Translate,MediaRouter,OptimizationHints",
        "--force-device-scale-factor=%d" % DPR,
        "about:blank",
    ]
    proc = subprocess.Popen(
        args,
        stdout=(None if verbose else subprocess.DEVNULL),
        stderr=(None if verbose else subprocess.DEVNULL),
        start_new_session=True,          # own process group — see reap_chrome()
    )
    # Wait for the debugging endpoint. Under load the network-service helper
    # can crash on spawn ("Network service crashed or was terminated") and
    # Chrome restarts it; a 1s HTTP timeout also expires before the
    # scheduler runs the browser process. Stay patient, and do not treat a
    # single refused connect as "Chrome is dead."
    deadline = time.time() + CHROME_PORT_TIMEOUT_S
    last_err = None
    while time.time() < deadline:
        if proc.poll() is not None:
            last_err = "chrome exited %s" % proc.returncode
            break
        try:
            with urllib.request.urlopen(
                "http://127.0.0.1:%d/json/version" % port, timeout=5
            ) as r:
                json.loads(r.read().decode())
                return proc
        except Exception as e:
            last_err = e
            time.sleep(0.25)
    reap_chrome(proc)
    sys.exit("Chrome did not open a debugging port on %d (%s)" % (port, last_err))


WEBGL_JS = """
(() => {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', {antialias: true, powerPreference: 'high-performance'})
            || c.getContext('webgl',  {antialias: true, powerPreference: 'high-performance'});
    if (!gl) return 'no-gl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return renderer || 'ok';
  } catch (e) {
    return 'err:' + e.message;
  }
})()
"""


def wait_webgl(cdp, timeout_s=WEBGL_TIMEOUT_S, verbose=False):
    """Block until about:blank can construct the same WebGL context createScene uses.

    The ANGLE Metal line "Trying to load the allocator multiple times" is
    printed when the GPU process restarts and re-inits the Metal backend.
    That restart is recoverable — this wait is the recovery. Navigating to
    ?capture= before it finishes is what produced 'no-scene': main.js
    catches the thrown WebGLRenderer and never assigns window.sceneApi.
    """
    deadline = time.time() + timeout_s
    state = None
    t0 = time.time()
    while time.time() < deadline:
        try:
            state = cdp.eval(WEBGL_JS)
        except Exception as e:
            state = "eval-error: %s" % e
        if isinstance(state, str) and state and not state.startswith(
            ("no-gl", "err:", "eval-error")
        ):
            if verbose:
                print("  webgl   : %s (%.1fs)" % (state, time.time() - t0))
            return state
        time.sleep(0.25)
    if verbose:
        print("  webgl   : NOT READY (%s) after %.1fs" % (state, time.time() - t0))
    return None


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

def build_url(pose_id, live=False):
    q = POSE_QUERY(pose_id, live=live)
    return BASE_URL + "?" + "&".join("%s=%s" % (k, v) for k, v in q.items())


def navigate_fresh(cdp, url):
    """Navigate and block until the NEW document is the one we will poll.

    `Page.navigate` only acknowledges the command. The previous document
    stays live until the next commit, so a readiness poll can read the
    leftover `window.journey.chapter` — especially on the same-URL size
    switch (mission desktop → mission mobile). Under load the race window
    is tens of seconds wide and looks like a WebGL flake: we shutter a
    page that is still booting (or showing the journey-failed note).

    A per-navigation `_n=` nonce is ignored by the scene (flags.js only
    reads named keys / the notaa|nofade|dbg|tkdbg substrings) and is the
    commit signal: when `location.href` contains it, the old JS world is
    gone. Same-URL navigations also become real loads.
    """
    nonce = "_n=%d" % int(time.time() * 1000)
    target = url + ("&" if "?" in url else "?") + nonce
    cdp.call("Page.navigate", {"url": target})
    deadline = time.time() + 15.0
    while time.time() < deadline:
        try:
            href = cdp.eval("location.href") or ""
        except Exception:
            href = ""
        if nonce in href:
            return target
        time.sleep(0.05)
    return target


HIDE_JS = """
(() => {
  const sel = %s;
  const st = document.createElement('style');
  st.id = '__capture_hide__';
  st.textContent = sel.map(s => s + '{opacity:0 !important;visibility:hidden !important;}').join('\\n');
  document.head.appendChild(st);
  const unmatched = sel.filter(s => !document.querySelector(s));
  return { matched: sel.length - unmatched.length, unmatched };
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


# Set True after any pose in this Chrome session has reached its chapter.
# Later poses then treat a long 'no-journey' as a hung boot (reload), not a
# cold module-graph wait — the first pose still gets the full READY_TIMEOUT_S.
_JOURNEY_SEEN = False


def capture_one(cdp, pose, size_key, hide_chrome, settle_s, verbose, quantize=False, live=False):
    global _JOURNEY_SEEN
    size = SIZES[size_key]
    # Tear down the previous WebGL document BEFORE changing the viewport.
    # setDeviceMetricsOverride on a live THREE canvas produces
    # SharedImage/ProduceOverlay errors; the next createScene then throws
    # and readiness sits at 'no-scene'. about:blank is cheap and leaves
    # the GPU process up (wait_webgl confirms).
    try:
        cdp.call("Page.navigate", {"url": "about:blank"})
    except Exception:
        pass
    cdp.call("Emulation.setDeviceMetricsOverride", {
        "width": size["w"], "height": size["h"],
        "deviceScaleFactor": DPR, "mobile": size["mobile"],
    })
    wait_webgl(cdp, timeout_s=10.0, verbose=verbose)
    url = build_url(pose["id"], live=live)

    # Readiness: the journey itself declares the pose. No sleep-and-hope.
    # Attempt 1 MUST navigate — a previous retry loop accidentally left
    # attempt 1 polling about:blank (or the previous pose) for the full
    # READY_TIMEOUT_S, which is why "retry usually succeeds" and every
    # first try burned 25s.
    #
    # 'no-scene' after document.complete means createScene() already threw
    # (WebGL context missing). Polling that document for the rest of the
    # timeout cannot recover it — give up after 2s and reload. The retry
    # goes about:blank → wait_webgl → navigate so the GPU process is up
    # before main.js evaluates again. A pose that boots but still drifts
    # later fails the gate as before.
    state = None
    last_logged = None
    for attempt in (1, 2):
        if attempt == 1:
            navigate_fresh(cdp, url)
        else:
            print("      retrying %s@%s (boot didn't reach %r — attempt 2)"
                  % (pose["id"], size_key, pose["chapter"]))
            try:
                cdp.call("Page.navigate", {"url": "about:blank"})
                wait_webgl(cdp, timeout_s=15.0, verbose=verbose)
            except Exception:
                pass
            navigate_fresh(cdp, url)
        deadline = time.time() + READY_TIMEOUT_S
        no_scene_since = None
        no_journey_since = None
        while time.time() < deadline:
            try:
                state = cdp.eval(READY_JS)
            except Exception as e:
                state = "eval-error: %s" % e
            if verbose and state != last_logged:
                print("      readiness: %s (attempt %d)" % (state, attempt))
                last_logged = state
            if state == pose["chapter"]:
                break
            if state == "no-scene":
                if no_scene_since is None:
                    no_scene_since = time.time()
                elif time.time() - no_scene_since >= 2.0:
                    break
            else:
                no_scene_since = None
            # After this Chrome has booted the journey once, a later pose
            # stuck on no-journey is a hung load, not a cold graph.
            if _JOURNEY_SEEN and state == "no-journey":
                if no_journey_since is None:
                    no_journey_since = time.time()
                elif time.time() - no_journey_since >= 8.0:
                    break
            else:
                no_journey_since = None
            time.sleep(0.25)
        ready = state == pose["chapter"]
        if ready:
            _JOURNEY_SEEN = True
            break
    if verbose and last_logged != state:
        print("      readiness: %s" % state)

    if hide_chrome:
        hide = cdp.eval(HIDE_JS % json.dumps(HIDE_SELECTORS)) or {}
        # A renamed class would silently stop being hidden and bake chrome into
        # the golden — warn (never fail) so the drift surfaces.
        if hide.get("unmatched"):
            print("  WARNING: chrome-hide selector(s) matched nothing — chrome may "
                  "have been baked into the golden: %s"
                  % ", ".join(hide["unmatched"]))

    # Settle: in frozen mode this only needs to cover one paint after the
    # freeze + chrome-hide land (see SETTLE_S_FROZEN's comment); in --live
    # mode it's the full pre-freeze accumulation wait.
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

def git_head(cwd=None):
    """Short-circuit to None on any git trouble — never blocks a capture run."""
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=cwd or HERE,
            stderr=subprocess.DEVNULL,
        )
        return out.decode().strip()
    except Exception:
        return None


def main():
    global DPR
    ap = argparse.ArgumentParser(description="Tier-3 capture + CI regression gate (PL-3.3 / ADR D5 / M6)")
    ap.add_argument("--pose", action="append", help="pose id; repeatable (default: all five)")
    ap.add_argument("--size", action="append", choices=sorted(SIZES), help="viewport; repeatable (default: both)")
    ap.add_argument("--dpr", type=int, default=DPR, help="device scale factor (default 1)")
    ap.add_argument("--settle", type=float, default=None,
                    help="settle seconds after readiness (default %.1f frozen / %.1f --live)"
                         % (SETTLE_S_FROZEN, SETTLE_S_LIVE))
    ap.add_argument("--chrome", action="store_true", help="keep the page's own nav/copy/hotspots in the still")
    ap.add_argument("--quantize", action="store_true",
                    help="256-colour palette PNG: ~50%% smaller, MAE 1.10/255 (below scene noise)")
    ap.add_argument("--check", action="store_true", help="re-capture beside the existing goldens and report drift")
    ap.add_argument("--live", action="store_true",
                    help="use the pre-freeze scrub path (?pose=) instead of the ?capture= freeze; "
                         "--check --live stays advisory (unfrozen scene, ~1-3 MAE noise by construction)")
    ap.add_argument("--note", default=None, help="reason recorded in manifest.json (goldens run only)")
    ap.add_argument("--out", default=OUT_DIR, help="output directory")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    DPR = args.dpr
    out_dir = args.out
    settle = args.settle if args.settle is not None else (SETTLE_S_LIVE if args.live else SETTLE_S_FROZEN)
    fail_mae = FAIL_MAE_LIVE if args.live else FAIL_MAE_FROZEN
    warn_mae = WARN_MAE_LIVE if args.live else WARN_MAE_FROZEN
    check_is_advisory = bool(args.live)   # frozen --check is a REAL gate; --live stays advisory
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
            "start the static server first — run this from the glowshroom directory:\n"
            "  python3 serve.py\n"
            "  (serve.py sends no-store headers; plain http.server serves stale\n"
            "   cached ES modules — the exact trap those headers exist to prevent)"
            % (BASE_URL, e)
        )

    os.makedirs(out_dir, exist_ok=True)
    check_dir = os.path.join(out_dir, "_check")
    if args.check:
        os.makedirs(check_dir, exist_ok=True)

    profile = tempfile.mkdtemp(prefix="capture-chrome-")
    port = free_port()
    print("capture.py — %d pose(s) x %d size(s), dpr %d, settle %.1fs, mode %s"
          % (len(poses), len(sizes), DPR, settle, "LIVE (unfrozen)" if args.live else "FROZEN (?capture=)"))
    print("  source : %s" % BASE_URL)
    print("  output : %s" % out_dir)
    if not args.chrome:
        print("  chrome : hidden (pure scene; Tier 3 renders the copy as HTML)")
    proc = launch_chrome(profile, port, args.verbose)
    atexit.register(reap_chrome, proc)
    global _JOURNEY_SEEN
    _JOURNEY_SEEN = False
    results = []
    try:
        cdp = CDP(page_ws_url(port), args.verbose)
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        # Do not navigate to ?capture= until Metal/WebGL actually answers.
        # createScene() is synchronous; a too-early load is a permanent
        # no-scene for that document, and READY_TIMEOUT_S cannot recover it.
        gl = wait_webgl(cdp, verbose=args.verbose)
        if not gl:
            print("  webgl never became ready on about:blank — relaunching Chrome once")
            try:
                cdp.call("Browser.close", timeout_s=5)
            except Exception:
                pass
            try:
                cdp.close()
            except Exception:
                pass
            reap_chrome(proc)
            shutil.rmtree(profile, ignore_errors=True)
            profile = tempfile.mkdtemp(prefix="capture-chrome-")
            port = free_port()
            proc = launch_chrome(profile, port, args.verbose)
            atexit.register(reap_chrome, proc)
            _JOURNEY_SEEN = False
            cdp = CDP(page_ws_url(port), args.verbose)
            cdp.call("Page.enable")
            cdp.call("Runtime.enable")
            gl = wait_webgl(cdp, verbose=args.verbose)
            if not gl:
                sys.exit("Chrome WebGL context never became ready (ANGLE Metal). "
                         "Another headless Chrome may be holding the GPU — "
                         "reap leftover capture-chrome processes and retry.")
        for pose in poses:
            for size_key in sizes:
                t0 = time.time()
                print("  · %-8s %-7s " % (pose["id"], size_key), end="", flush=True)
                target_dir = check_dir if args.check else out_dir
                saved_out = OUT_DIR
                try:
                    globals()["OUT_DIR"] = target_dir
                    r = capture_one(cdp, pose, size_key, not args.chrome,
                                    settle, args.verbose, args.quantize, live=args.live)
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
        reap_chrome(proc)
        shutil.rmtree(profile, ignore_errors=True)

    if args.check:
        mode_line = ("ADVISORY: --live, scene is not frozen; see file header"
                     if check_is_advisory else
                     "REAL GATE: frozen captures, exit 1 on FAIL-band")
        print("\n--- drift check (%s) ---" % mode_line)
        worst = 0.0
        missing = False
        failed = False
        for r in results:
            golden = os.path.join(out_dir, r["file"])
            fresh = os.path.join(check_dir, r["file"])
            if not os.path.exists(golden):
                print("  · %-22s no golden on disk — run without --check first" % r["file"])
                missing = True
                continue
            m, pct = mae(golden, fresh)
            if m is None:
                print("  · %-22s size mismatch" % r["file"])
                failed = True
                continue
            worst = max(worst, m)
            is_fail = m > fail_mae
            is_warn = (not is_fail) and m > warn_mae
            band = "FAIL-band" if is_fail else ("warn-band" if is_warn else "within")
            if is_fail:
                failed = True
            print("  · %-22s MAE %5.2f/255  %5.1f%% px >8   [%s]" % (r["file"], m, pct, band))
        print("\n  worst MAE %.2f/255. Thresholds warn>%.2f fail>%.2f." % (worst, warn_mae, fail_mae))
        if check_is_advisory:
            print("  Exit code forced to 0: --live scene is unfrozen, per-run variance is ~1-3 MAE")
            print("  by construction (BASELINE.md §8). Drop --live for the real frozen gate.")
            return 0
        if missing:
            print("  FAIL: golden(s) missing — run 'capture.py' (no --check) first.")
            return 1
        if failed:
            print("  FAIL: drift exceeds the frozen-frame threshold — see FAIL-band rows above.")
            return 1
        print("  PASS: all captures within the frozen-frame determinism threshold.")
        return 0

    # ------------------------------------------------------------------
    # manifest.json — the Tier-3 page and any future <picture>/srcset wiring
    # read this instead of hard-coding filenames (ADR D5 "Where they land").
    # Also the CI gate's provenance record: date + commit + why this golden
    # set exists (M6, journey-v6-plan/15-merge-and-architecture.md).
    # ------------------------------------------------------------------
    frozen = not args.live
    manifest = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "commit": git_head(),
        "reason": args.note or (
            "pre-restage goldens retired; frozen-capture era begins (M6) — "
            "shot through ?capture= at the merged, Hannah-era-approved tip"
            if frozen else
            "live (--live) sanity-check set, not a golden source"
        ),
        "source": BASE_URL,
        "note": (
            "Generated by tools/capture.py from the live scene through the "
            "?capture= freeze (main.js freezeTime(0) + journey.js dt=0 "
            "placement). Do not hand-edit these PNGs. Frozen frames are "
            "reproducible pixel targets — see FAIL_MAE_FROZEN in this file "
            "for the gate threshold and EXECUTION.md's M6 entry for how it "
            "was measured."
            if frozen else
            "Generated by tools/capture.py --live from the live scene via "
            "the pre-freeze scrub path. Do not hand-edit these PNGs. The "
            "scene is NOT frozen at capture time, so these are one honest "
            "frame of a moving scene, not a reproducible pixel target — "
            "advisory sanity-check only, never the golden source."
        ),
        "frozen": frozen,
        "dpr": DPR,
        "chromeHidden": not args.chrome,
        "quantized": bool(args.quantize),
        "settleSeconds": settle,
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
