#!/usr/bin/env python3
# ==============================================================================
# film.py — cinematic coverage renderer for the glowshroom world.
#
# NOT shipped: nothing imports it. Builds on tools/capture.py's CDP client.
#
# Unlike capture.py (frozen stills), this drives the LIVE scene deterministically
# by hijacking performance.now with a virtual clock injected before boot
# (Page.addScriptToEvaluateOnNewDocument). The organism's shared THREE.Clock
# reads performance.now, so advancing window.__vt.now by exactly 1000/fps ms per
# captured frame steps every time-driven system (breeze, spore drift integrator,
# shimmer, chapter phase clocks) by exactly one film frame — extra rAFs between
# steps see dt = 0 and render identical pixels, so capture pacing can be as slow
# as CDP screenshots are.
#
# Camera: an in-page 'zz-film' animator registered AFTER the whole journey boots
# runs last in the frame loop (Map insertion order) and overwrites the camera
# pose, so the journey spine/chapters still see the site's own camera (their
# reveal placement logic stays canonical) while the RENDERED frame uses our rig.
#
# Journey progress: per-frame journey.scroll.setProgress(p) (the smooth "ride"
# path — eased chapter states animate in over dt) or journey.scrollTo(p) (the
# placeAt snap path). Boot flags: ?nointro=1&p=<p>&steady=1&nosnap=1 for a live,
# unfrozen, handheld-free scene parked at arbitrary p.
#
#   python3 tools/film/film.py --probe            # dump pose atlas + scene graph
#   python3 tools/film/film.py --shot <name>      # render one clip
#   python3 tools/film/film.py --all              # render every shot
#   python3 tools/film/film.py --list
#
# Requires: serve.py already running on :8137 (never started/stopped here),
# imageio-ffmpeg (pip --user) for the bundled ffmpeg binary.
# ==============================================================================

import argparse
import base64
import inspect
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
sys.path.insert(0, TOOLS)
from capture import CDP, free_port, launch_chrome, page_ws_url  # noqa: E402

BASE_URL = "http://localhost:8137/index.html"
OUT_ROOT = os.environ.get(
    "FILM_OUT",
    os.path.expanduser("~/nigel/ados-paris/glowshroom-film"),
)

WIDTH, HEIGHT = 1920, 1080
FPS = 24

# Same chrome-hide list as capture.py: the footage must be pure scene.
HIDE_SELECTORS = [
    ".ui", ".callouts", ".j-copy", ".j-hotspots", ".j-card",
    ".j-rail", ".j-menu", ".j-menu-scrim",
]

VIRTUAL_CLOCK_JS = """
(() => {
  const real = performance.now.bind(performance);
  window.__vt = { now: 0, real };
  performance.now = () => window.__vt.now;
})();
"""

RIG_JS = """
(() => {
  if (window.__film) return 'already';
  const S = window.sceneApi, J = window.journey;
  if (!S || !J) return 'not-ready';
  const cam = S.camera;
  const film = { pose: null, applied: 0 };
  try { S.setInputPolicy('journey'); } catch (e) {}
  S.addAnimator('zz-film', () => {
    const p = film.pose;
    if (!p) return;
    cam.position.set(p.px, p.py, p.pz);
    cam.up.set(0, 1, 0);
    cam.lookAt(p.lx, p.ly, p.lz);
    if (p.roll) cam.rotateZ(p.roll);
    if (p.fov && Math.abs(cam.fov - p.fov) > 1e-4) {
      cam.fov = p.fov; cam.updateProjectionMatrix();
    }
    film.applied++;
  });
  film.frame = (spec) => new Promise((res) => {
    if (spec.dtMs) window.__vt.now += spec.dtMs;
    if (spec.p != null) {
      try {
        if (spec.mode === 'snap') J.scrollTo(spec.p);
        else J.scroll.setProgress(spec.p);
      } catch (e) {}
    }
    if (spec.cam) film.pose = spec.cam;
    if (spec.freeCam) film.pose = null;   // hand the camera back to the site
    requestAnimationFrame(() => requestAnimationFrame(() => {
      res(JSON.stringify({
        p: +J.p.toFixed(4), ch: J.chapter,
        cam: [+cam.position.x.toFixed(3), +cam.position.y.toFixed(3), +cam.position.z.toFixed(3)],
        fov: +cam.fov.toFixed(2), vt: window.__vt.now,
      }));
    }));
  });
  window.__film = film;
  return 'installed';
})()
"""

HIDE_JS = """
(() => {
  const sel = %s;
  if (document.getElementById('__film_hide__')) return 'already';
  const st = document.createElement('style');
  st.id = '__film_hide__';
  st.textContent = sel.map(s => s + '{opacity:0 !important;visibility:hidden !important;}').join('\\n')
    + '\\nhtml,body{cursor:none !important;}';
  document.head.appendChild(st);
  return 'hidden';
})()
"""

READY_JS = """
(() => {
  if (document.readyState !== 'complete') return 'loading';
  if (!window.sceneApi) return 'no-scene';
  if (!window.journey) return 'no-journey';
  try { return 'ready:' + window.journey.chapter; } catch (e) { return 'err:' + e.message; }
})()
"""

# The whole-scene probe: pose atlas along the spine + world geometry.
PROBE_JS = """
(async () => {
  const S = window.sceneApi, J = window.journey;
  const out = { consts: S.consts, chapters: {}, spine: [], graph: null };
  // Pose atlas: place at 101 progress points, record chapter + camera + fov + fog.
  for (let i = 0; i <= 100; i++) {
    const p = i / 100;
    J.scrollTo(p);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const c = S.camera;
    out.spine.push({
      p, ch: J.chapter,
      pos: [+c.position.x.toFixed(3), +c.position.y.toFixed(3), +c.position.z.toFixed(3)],
      fov: +c.fov.toFixed(2),
    });
    if (!(J.chapter in out.chapters)) out.chapters[J.chapter] = { first: p };
    out.chapters[J.chapter].last = p;
  }
  // Fully revealed world for the graph dump.
  J.scrollTo(1);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const seen = [];
  const walk = (o, depth) => {
    if (!o || depth > 4) return null;
    const e = {
      n: o.name || null, t: o.type,
      pos: o.position ? [+o.position.x.toFixed(2), +o.position.y.toFixed(2), +o.position.z.toFixed(2)] : null,
      scl: o.scale ? +o.scale.x.toFixed(3) : null,
      kids: o.children ? o.children.length : 0,
      c: [],
    };
    if (o.children && depth < 4) {
      for (const k of o.children.slice(0, 40)) {
        const w = walk(k, depth + 1);
        if (w) e.c.push(w);
      }
    }
    if (!e.c.length) delete e.c;
    return e;
  };
  out.graph = walk(S.scene || S.camera.parent, 0);
  out.groups = {};
  for (const [k, g] of Object.entries(S.groups || {})) {
    if (!g) continue;
    out.groups[k] = {
      pos: [+g.position.x.toFixed(2), +g.position.y.toFixed(2), +g.position.z.toFixed(2)],
      kids: g.children ? g.children.length : 0,
      types: g.children ? [...new Set(g.children.map(c => c.type))] : [],
      names: g.children ? [...new Set(g.children.map(c => c.name).filter(Boolean))].slice(0, 20) : [],
    };
  }
  const counts = {};
  for (const id of ['inspire', 'connect', 'owned', 'final']) {
    try { counts[id] = J.counts(id); } catch (e) { counts[id] = null; }
  }
  out.counts = counts;
  out.debug = J.debugState();
  return JSON.stringify(out);
})()
"""


# ------------------------------------------------------------------------------
# Easing / curve helpers for shot authoring
# ------------------------------------------------------------------------------

def clamp01(x):
    return max(0.0, min(1.0, x))

def smooth(u):
    """smoothstep — the default ease for anything that starts and ends at rest."""
    u = clamp01(u)
    return u * u * (3 - 2 * u)

def smoother(u):
    u = clamp01(u)
    return u * u * u * (u * (u * 6 - 15) + 10)

def ease_in(u, k=2.0):
    return clamp01(u) ** k

def ease_out(u, k=2.0):
    return 1 - (1 - clamp01(u)) ** k

def lerp(a, b, u):
    return a + (b - a) * u

def v_lerp(a, b, u):
    return [lerp(a[i], b[i], u) for i in range(3)]

def remap(u, a, b):
    """0..1 inside [a,b], clamped."""
    if b <= a:
        return 1.0 if u >= b else 0.0
    return clamp01((u - a) / (b - a))

def catmull(points, u):
    """Catmull-Rom through a list of 3D points, u in 0..1 over the whole path."""
    n = len(points)
    if n == 1:
        return list(points[0])
    u = clamp01(u) * (n - 1)
    i = min(int(u), n - 2)
    t = u - i
    p0 = points[max(i - 1, 0)]
    p1 = points[i]
    p2 = points[i + 1]
    p3 = points[min(i + 2, n - 1)]
    out = []
    for k in range(3):
        a = -0.5 * p0[k] + 1.5 * p1[k] - 1.5 * p2[k] + 0.5 * p3[k]
        b = p0[k] - 2.5 * p1[k] + 2 * p2[k] - 0.5 * p3[k]
        c = -0.5 * p0[k] + 0.5 * p2[k]
        d = p1[k]
        out.append(((a * t + b) * t + c) * t + d)
    return out

def orbit(cx, cz, r, az, y):
    """Point on a circle of radius r around (cx, z) at azimuth az (radians)."""
    return [cx + math.sin(az) * r, y, cz + math.cos(az) * r]


# ------------------------------------------------------------------------------
# Shot model
# ------------------------------------------------------------------------------
# A shot is a dict:
#   name      — file stem (NN_subject_move)
#   dur       — seconds of film time
#   fps       — frames per second (default FPS)
#   url       — query string for boot (default live scene at some p)
#   speed     — scene-seconds per film-second (default 1.0; dt clamp caps ~1.2 @24fps)
#   warmup    — scene-seconds to advance (and discard) before frame 0, letting
#               reveals/eases settle into motion
#   warmup_p  — progress during warmup (defaults to p(0))
#   p(u)      — journey progress at normalized shot time u (or None to leave alone)
#   mode      — 'ride' (smooth setProgress) or 'snap' (placeAt) for p writes
#   cam(u)    — dict(px,py,pz, lx,ly,lz, fov, roll) or None for the site's camera
# Shots are registered by shots.py (authored after --probe).

def load_shots():
    sys.path.insert(0, HERE)
    import shots as shots_mod  # noqa
    return shots_mod.SHOTS


# ------------------------------------------------------------------------------
# Driver
# ------------------------------------------------------------------------------

def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        p = shutil.which("ffmpeg")
        if p:
            return p
        sys.exit("no ffmpeg: pip3 install --user imageio-ffmpeg")


def wait_ready(cdp, timeout=40.0):
    deadline = time.time() + timeout
    state = None
    while time.time() < deadline:
        try:
            state = cdp.eval(READY_JS)
        except Exception as e:
            state = "eval-error: %s" % e
        if isinstance(state, str) and state.startswith("ready:"):
            return state
        time.sleep(0.25)
    raise RuntimeError("page never became ready: %s" % state)


class Session(object):
    """One headless Chrome with the virtual clock installed."""

    def __init__(self, width=WIDTH, height=HEIGHT, verbose=False):
        self.profile = tempfile.mkdtemp(prefix="film-chrome-")
        self.port = free_port()
        self.proc = launch_chrome(self.profile, self.port, verbose)
        self.cdp = CDP(page_ws_url(self.port), verbose)
        self.cdp.call("Page.enable")
        self.cdp.call("Runtime.enable")
        self.cdp.call("Emulation.setDeviceMetricsOverride", {
            "width": width, "height": height, "deviceScaleFactor": 1, "mobile": False,
        })
        self.cdp.call("Page.addScriptToEvaluateOnNewDocument", {"source": VIRTUAL_CLOCK_JS})

    def load(self, query):
        url = BASE_URL + ("?" + query if query else "")
        self.cdp.call("Page.navigate", {"url": url})
        wait_ready(self.cdp)
        r = self.cdp.eval(RIG_JS)
        if r not in ("installed", "already"):
            raise RuntimeError("rig install failed: %r" % r)
        self.cdp.eval(HIDE_JS % json.dumps(HIDE_SELECTORS))

    def frame(self, spec):
        js = "window.__film.frame(%s)" % json.dumps(spec)
        return json.loads(self.cdp.eval(js, timeout_s=30.0))

    def shoot_jpeg(self, path, quality=92):
        shot = self.cdp.call("Page.captureScreenshot", {
            "format": "jpeg", "quality": quality, "fromSurface": True,
        }, timeout_s=90.0)
        with open(path, "wb") as f:
            f.write(base64.b64decode(shot["data"]))

    def close(self):
        try:
            self.cdp.call("Browser.close", timeout_s=5)
        except Exception:
            pass
        try:
            self.cdp.close()
        except Exception:
            pass
        try:
            self.proc.terminate()
            self.proc.wait(timeout=8)
        except Exception:
            self.proc.kill()
        shutil.rmtree(self.profile, ignore_errors=True)


def render_shot(sess, shot, out_dir, verbose=False):
    name = shot["name"]
    fps = shot.get("fps", FPS)
    dur = shot["dur"]
    speed = shot.get("speed", 1.0)
    n = max(2, int(round(dur * fps)))
    dt_ms = 1000.0 * speed / fps
    if dt_ms > 49.0:
        print("  NOTE %s: dt %.1fms exceeds the organism's 50ms clamp — integrators will lag f(t) systems" % (name, dt_ms))

    sess.load(shot.get("url", "nointro=1&steady=1&nosnap=1&p=0"))
    if shot.get("setup_js"):
        sess.cdp.eval(shot["setup_js"])

    p_fn = shot.get("p")
    cam_fn = shot.get("cam")
    mode = shot.get("mode", "ride")

    # Warmup: advance scene time before the first captured frame (arming seams,
    # letting eased reveals get going, filling TAA history) at the shot's start p.
    warm_s = shot.get("warmup", 1.0)
    warm_p = shot.get("warmup_p", p_fn(0.0) if p_fn else None)
    warm_steps = max(1, int(warm_s * 30))
    for i in range(warm_steps):
        spec = {"dtMs": 1000.0 * warm_s / warm_steps}
        if warm_p is not None:
            spec["p"] = warm_p
            spec["mode"] = "snap" if i == 0 else mode
        if cam_fn:
            spec["cam"] = cam_fn(0.0)
        sess.frame(spec)

    frames_dir = os.path.join(out_dir, "_frames_" + name)
    os.makedirs(frames_dir, exist_ok=True)
    t0 = time.time()
    info = None
    ts_fn = shot.get("timescale")   # optional per-frame scene-time multiplier (speed ramps)
    for i in range(n):
        u = i / (n - 1)
        spec = {"dtMs": min(49.0, dt_ms * ts_fn(u)) if ts_fn else dt_ms}
        if p_fn:
            pv = p_fn(u)
            if pv is not None:
                spec["p"] = clamp01(pv)
                spec["mode"] = mode
        if cam_fn:
            spec["cam"] = cam_fn(u)
        else:
            spec["freeCam"] = True
        info = sess.frame(spec)
        sess.shoot_jpeg(os.path.join(frames_dir, "f_%05d.jpg" % i))
        if verbose and i % 24 == 0:
            print("    f%04d/%d  p=%s ch=%s cam=%s" % (i, n, info["p"], info["ch"], info["cam"]))

    wall = time.time() - t0
    # Takes are never overwritten: a re-render of an existing shot becomes _v2,
    # _v3, ... and every take carries a .json sidecar with its full recipe so
    # any clip can be tweaked and re-rendered later.
    mp4 = os.path.join(out_dir, name + ".mp4")
    take = 1
    while os.path.exists(mp4):
        take += 1
        mp4 = os.path.join(out_dir, "%s_v%d.mp4" % (name, take))

    def _describe(v):
        if callable(v):
            try:
                return inspect.getsource(v).strip()
            except Exception:
                return repr(v)
        return v

    sidecar = {
        "take": take,
        "rendered": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "frames": n, "width": WIDTH, "height": HEIGHT, "crf": 17,
        "wall_seconds": round(wall, 1),
        "settings": {k: _describe(v) for k, v in shot.items()},
    }
    with open(mp4[:-4] + ".json", "w") as f:
        json.dump(sidecar, f, indent=1)
        f.write("\n")
    enc = subprocess.run([
        ffmpeg_exe(), "-y", "-framerate", str(fps),
        "-i", os.path.join(frames_dir, "f_%05d.jpg"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium",
        "-movflags", "+faststart", mp4,
    ], capture_output=True)
    if enc.returncode != 0:
        print(enc.stderr.decode()[-800:])
        raise RuntimeError("ffmpeg failed for %s" % name)
    shutil.rmtree(frames_dir, ignore_errors=True)
    size_mb = os.path.getsize(mp4) / 1048576.0
    print("  ✓ %s — %d frames @ %dfps (%.1fs film), %.1f MB, %.0fs wall, ended p=%s ch=%s"
          % (os.path.basename(mp4), n, fps, dur, size_mb, wall, info["p"], info["ch"]))
    return mp4


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--probe", action="store_true")
    ap.add_argument("--shot", action="append")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--out", default=OUT_ROOT)
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    if args.probe:
        sess = Session(verbose=args.verbose)
        try:
            sess.load("nointro=1&steady=1&nosnap=1&p=0")
            # give the freshly-placed page a couple of stepped frames first
            for _ in range(10):
                sess.frame({"dtMs": 33.0})
            data = json.loads(sess.cdp.eval(PROBE_JS, timeout_s=120.0))
            path = os.path.join(args.out, "probe.json")
            with open(path, "w") as f:
                json.dump(data, f, indent=1)
            print("wrote %s" % path)
        finally:
            sess.close()
        return 0

    shots = load_shots()
    if args.list:
        for s in shots:
            print("%-40s %4.1fs  %s" % (s["name"], s["dur"], s.get("note", "")))
        return 0

    wanted = shots if args.all else [s for s in shots if args.shot and s["name"] in args.shot]
    if not wanted:
        sys.exit("no shots selected (--all or --shot <name>; --list to see)")

    sess = Session(verbose=args.verbose)
    ok, failed = [], []
    try:
        for s in wanted:
            print("shot: %s" % s["name"])
            try:
                ok.append(render_shot(sess, s, args.out, args.verbose))
            except Exception as e:
                print("  ✗ FAILED %s: %s" % (s["name"], e))
                failed.append(s["name"])
                # Chrome may be wedged — relaunch for the next shot.
                sess.close()
                sess = Session(verbose=args.verbose)
    finally:
        sess.close()
    print("\n%d ok, %d failed%s" % (len(ok), len(failed), (": " + ", ".join(failed)) if failed else ""))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
