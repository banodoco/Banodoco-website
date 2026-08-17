# shots.py — the coverage shot registry for film.py. NOT shipped.
# Authored against probe.json (pose atlas + scene graph) and recon.md.
# Each entry: see the shot model comment in film.py.

import math
from film import (  # noqa: F401 — helpers for shot authors
    smooth, smoother, ease_in, ease_out, lerp, v_lerp, remap, catmull, orbit,
    clamp01,
)


def _cam(pos, look, fov=38.0, roll=0.0):
    return {
        "px": pos[0], "py": pos[1], "pz": pos[2],
        "lx": look[0], "ly": look[1], "lz": look[2],
        "fov": fov, "roll": roll,
    }


# ---------------------------------------------------------------------------
# Authoring helpers (top-level only — no closure-in-loop pitfalls).
# ---------------------------------------------------------------------------

def _p_ride(a, b):
    """Ride journey progress a -> b with a smoothstep ease in/out."""
    def fn(u):
        return lerp(a, b, smooth(u))
    return fn


def _p_hold(p):
    """Hold journey progress at a fixed value."""
    def fn(u):
        return p
    return fn


# Catmull waypoint tables (world coordinates from probe.json).
_S03 = [
    [16.0, 0.7, 9.0],
    [11.0, 0.55, 5.5],
    [6.5, 0.5, 3.2],
    [3.2, 0.6, 1.6],
    [2.0, 0.8, 1.0],
]

_S04 = [
    [1.0, -0.8, 2.0],
    [3.5, -1.3, 4.5],
    [6.0, -0.7, 2.0],
    [4.0, -1.5, -2.0],
    [1.0, -0.9, -4.0],
    [-1.5, -1.2, -1.5],
]

_S13 = [
    [3.4, 3.6, -0.4],
    [7.0, 4.4, 0.8],
    [11.0, 5.2, 1.6],
    [15.0, 6.0, 2.6],
]

_S16 = [
    [3.4, 3.1, -1.8],
    [1.2, 3.3, 0.6],
    [-0.8, 2.7, -1.9],
]

_S16_LOOK = [
    [2.16, 2.94, -0.98],
    [1.89, 3.31, 1.5],
    [0.01, 2.49, -2.41],
]

_S17 = [
    [-12.0, 0.9, -4.0],
    [-6.0, 0.85, 0.0],
    [0.0, 0.8, 6.0],
    [7.0, 0.9, 4.0],
    [13.0, 1.0, -2.0],
]

_S19 = [
    [3.6, -0.4, 2.6],
    [1.5, -0.8, 1.6],
    [-0.6, -1.2, 1.0],
    [-2.2, -1.0, 1.8],
    [-3.4, -0.9, 2.4],
]

_S24 = [
    [12.0, 13.0, -6.0],
    [6.0, 13.8, 2.0],
    [-6.0, 14.0, 9.0],
]

# Ring clone aims (spread across the kindled ring; probe.json
# counts.final.ringMembers — i1, i2, i3, i4, i5).
_RING5 = [
    [-2.15, 1.881, 6.44],
    [-5.185, 1.749, 6.957],
    [-7.766, 1.388, 6.283],
    [-8.587, 1.373, 3.184],
    [-5.738, 1.834, -5.793],
]


def _inset(aim, off=1.5, y=1.4):
    """Pull an aim point 'off' units toward the hero axis, at camera height y."""
    x, _, z = aim
    r = math.hypot(x, z)
    k = (r - off) / r if r > 1e-6 else 0.0
    return [x * k, y, z * k]


_S22 = [_inset(a) for a in _RING5]

_S29 = [
    [1.8, 14.0, 1.2],
    [2.2, 7.5, 1.4],
    [2.6, 3.4, 1.7],
    [4.2, 1.3, 2.8],
    [7.5, 0.9, 4.6],
]

_S30 = [
    [13.0, 2.2, 6.0],
    [6.0, 2.0, 3.6],
    [2.6, 2.3, 0.9],
    [-1.2, 2.5, -2.3],
    [-4.5, 2.7, -3.6],
    [-9.0, 3.0, -5.0],
]

_S32 = [
    [14.0, 4.5, -8.0],
    [6.0, 2.2, -7.0],
    [-1.0, 1.4, -6.2],
    [-6.8, 1.5, -2.5],
    [-8.3, 1.8, 2.3],   # z nudged -0.7 (from 3.0) to clear the 0.7 ring-aim clearance (A4)
    [-4.6, 2.2, 6.6],
    [0.5, 2.8, 7.5],
]

_S34 = [
    [4.5, 3.2, 3.0],
    [2.8, 1.2, 2.2],
    [1.6, -0.4, 1.6],
    [0.8, -1.2, 1.0],
    [-0.8, -1.35, 0.4],
]


# --- smoke test: slow half-orbit of the hero at journey start ----------------
def _smoke_cam(u):
    az = lerp(-0.6, 0.9, smooth(u))
    pos = orbit(0.0, 0.0, 11.0, az, 3.2)
    return _cam(pos, [0.0, 2.2, 0.0], fov=38.0)


# ---------------------------------------------------------------------------
# Camera curves (one top-level function per shot).
# ---------------------------------------------------------------------------

def _s01_cam(u):
    e = smooth(u)
    pos = v_lerp([3.2, 0.65, 1.8], [5.4, 0.55, 3.2], e)
    # Glide looking down into the web: gaze ~2.2 units ahead along the travel
    # direction (horizontal) with the look point buried just below grade.
    dx, dz = 2.2, 1.4
    n = math.hypot(dx, dz)
    look = [pos[0] + 2.2 * dx / n, -0.15, pos[2] + 2.2 * dz / n]
    return _cam(pos, look, fov=34.0)


def _s02_cam(u):
    e = smooth(u)
    pos = [0.4, lerp(9.0, 12.0, e), 0.6]
    # v2: as the rise completes, the gaze tilts up from the straight-down
    # mandala toward the horizon — the network reveals itself stretching out
    # v3: the tilt-up lands on an OBLIQUE view of hero + web (a horizon look
    # had no lit geometry and went black) — camera drifts sideways as it tilts
    t = smooth(remap(u, 0.55, 1.0))
    pos = v_lerp(pos, [7.5, 11.5, 5.5], t)
    look = v_lerp([0.0, 0.0, 0.2], [0.0, 1.8, 0.0], t)
    return _cam(pos, look, fov=50.0)


def _s03_cam(u):
    e = u * 0.85
    pos = catmull(_S03, e)
    look = v_lerp([0.0, 1.0, 0.0], [0.0, 2.6, 0.0], smooth(u))
    return _cam(pos, look, fov=58.0)


def _s04_cam(u):
    e = smooth(u) * 0.84
    pos = catmull(_S04, e)
    # gaze stays inside the dense substrate cluster (~x 0-3, z 0-3, y -1)
    # instead of along-path, so the frame never empties out
    look = v_lerp([2.2, -0.9, 2.4], [0.2, -1.0, 0.2], smooth(u))
    return _cam(pos, look, fov=50.0)


def _s05_cam(u):
    e = smooth(u)
    pos = v_lerp([16.0, 0.6, 7.0], [2.5, 0.5, 1.4], e)
    look = v_lerp([5.0, 0.2, 3.0], [0.0, 2.6, 0.0], e)
    return _cam(pos, look, fov=44.0)


def _s06_cam(u):
    e = smooth(u)
    y = lerp(-1.4, 5.2, e)
    pos = [lerp(0.7, 2.6, e), y, lerp(0.9, 2.0, e)]
    look = v_lerp([0.0, -0.9, 0.0], [0.0, 2.4, 0.0], e)
    return _cam(pos, look, fov=46.0)


def _s07_cam(u):
    e = smooth(u)
    az = lerp(1.107, 1.893, e)
    r = lerp(4.5, 3.0, e)
    y = lerp(0.4, 3.4, e)
    pos = orbit(0.0, 0.0, r, az, y)
    look = [0.0, lerp(0.4, 2.6, e), 0.0]
    return _cam(pos, look, fov=38.0)


def _s08_cam(u):
    e = smooth(u)
    pos = v_lerp([6.5, 0.35, 4.0], [5.2, 0.5, 3.2], e)
    return _cam(pos, [0.0, 1.6, 0.0], fov=44.0)


def _s09_cam(u):
    e = smooth(u)
    az = lerp(0.5, 1.35, e)
    r = lerp(5.5, 4.6, e)
    y = lerp(3.4, 4.1, e)
    pos = orbit(0.0, 0.0, r, az, y)
    return _cam(pos, [0.0, 2.9, 0.0], fov=36.0)


def _s10_cam(u):
    e = smooth(u)
    pos = [0.5, lerp(8.5, 10.5, e), 0.4]
    return _cam(pos, [0.0, 3.0, 0.0], fov=40.0)


def _s11_cam(u):
    e = smooth(u)
    az = lerp(0.0, 2.6, e)
    y = lerp(2.15, 2.85, e)
    pos = orbit(0.0, 0.0, 1.7, az, y)
    return _cam(pos, [0.0, 3.05, 0.0], fov=40.0)


def _s12_cam(u):
    e = smooth(u)
    az = lerp(-0.6, 0.6, e)
    pos = orbit(0.0, 0.0, 2.75, az, 2.95)
    look = orbit(0.0, 0.0, 2.3, az + 0.5, 2.95)
    return _cam(pos, look, fov=27.0)


def _s13_cam(u):
    e = smooth(u) * 0.7
    pos = catmull(_S13, e)
    look = v_lerp([0.0, 3.0, 0.0], [0.0, 2.4, 0.0], smooth(u))
    return _cam(pos, look, fov=46.0)


def _s14_cam(u):
    e = smooth(u)
    pos = v_lerp([2.6, 3.3, 0.4], [9.0, 4.8, 3.0], e)
    pos[1] += 0.25 * math.sin(u * 2.0 * math.pi * 1.5)
    look = v_lerp([0.0, 3.0, 0.0], [0.0, 2.2, 0.0], smooth(u))
    roll = 0.12 * math.sin(u * 2.0 * math.pi)
    return _cam(pos, look, fov=50.0, roll=roll)


def _s15_cam(u):
    az = lerp(0.0, 2.0 * math.pi, u)
    pos = orbit(0.0, 0.0, 11.0, az, 3.4)
    return _cam(pos, [0.0, 2.3, 0.0], fov=40.0)


def _s16_cam(u):
    e = smooth(u)
    pos = catmull(_S16, e)
    look = catmull(_S16_LOOK, e)
    return _cam(pos, look, fov=42.0)


def _s17_cam(u):
    az = lerp(-2.2, -0.4, u)
    r = lerp(13.0, 7.0, smooth(u))
    pos = orbit(0.0, 0.0, r, az, 1.15)
    return _cam(pos, [0.0, 1.5, 0.0], fov=55.0)


def _s18_cam(u):
    e = smooth(u)
    az = lerp(-0.8, 0.8, e)
    y = lerp(0.4, 0.7, e)
    pos = orbit(5.0, -2.6, 1.1, az, y)
    return _cam(pos, [5.0, 0.18, -2.6], fov=28.0)


def _s19_cam(u):
    e = smooth(u) * 0.86
    pos = catmull(_S19, e)
    look = catmull(_S19, e + 0.14)
    return _cam(pos, look, fov=48.0)


def _s20_cam(u):
    e = smooth(u)
    pos = v_lerp([3.2, -0.95, 2.6], [0.9, -1.05, 1.1], e)
    look = v_lerp([0.5, -0.9, 0.6], [-0.6, -1.0, -0.2], e)
    return _cam(pos, look, fov=44.0)


def _s21_cam(u):
    e = smooth(u)
    pos = v_lerp([-0.6, 1.1, 4.6], [-3.6, 2.2, 4.9], e)
    return _cam(pos, [-2.15, 1.6, 6.44], fov=36.0)


def _s22_cam(u):
    e = u * 0.85
    pos = catmull(_S22, e)
    look = catmull(_S22, e + 0.15)
    return _cam(pos, look, fov=44.0)


def _s23_cam(u):
    e = smoother(u)
    az = lerp(1.0517, -1.1071, e)
    r = lerp(3.225, 22.361, e)
    y = lerp(2.4, 8.5, e)
    pos = orbit(0.0, 0.0, r, az, y)
    look = v_lerp([0.0, 2.6, 0.0], [0.0, 1.8, 1.0], e)
    fov = lerp(36.0, 46.0, e)
    return _cam(pos, look, fov=fov)


def _s24_cam(u):
    e = smooth(u)
    pos = catmull(_S24, e)
    return _cam(pos, [0.0, 0.5, 1.0], fov=48.0)


def _s25_cam(u):
    e = smooth(u)
    pos = v_lerp([1.9, 2.8, 0.3], [14.0, 5.5, 8.0], e)
    look = v_lerp([0.0, 2.95, 0.0], [0.0, 2.2, 0.0], e)
    fov = lerp(28.0, 47.0, e)
    return _cam(pos, look, fov=fov)


def _s26_cam(u):
    az = lerp(math.pi, 2.0 * math.pi + 0.3, u)
    pos = orbit(0.0, 0.0, 17.0, az, 3.2)
    return _cam(pos, [0.0, 1.9, 0.0], fov=45.0)


def _s27_cam(u):
    e = smooth(u)
    pos = v_lerp([11.0, 2.6, 8.0], [9.6, 2.7, 7.0], e)
    return _cam(pos, [0.0, 2.0, 0.0], fov=42.0)


def _s28_cam(u):
    e = smooth(u)
    pos = v_lerp([8.0, 4.6, 1.0], [10.0, 4.7, 1.4], e)
    roll = 0.06 * math.sin(u * 2.0 * math.pi)
    # v2: gaze back at the hero through the stream (outward look was murk —
    # the world-design law: the lens must always hold lit geometry)
    look = v_lerp([0.0, 3.1, 0.0], [0.0, 2.6, -0.4], e)
    return _cam(pos, look, fov=52.0, roll=roll)

def _s29_cam(u):
    e = ease_in(u, 1.6)
    pos = catmull(_S29, e)
    look = v_lerp([0.4, 0.5, 0.3], [12.0, 0.4, 7.0], smooth(remap(u, 0.55, 0.9)))
    return _cam(pos, look, fov=58.0)


def _s30_cam(u):
    e = u * 0.85
    pos = catmull(_S30, e)
    look = v_lerp([0.0, 2.3, 0.0], [0.0, 2.7, 0.0], smooth(u))
    roll = -0.22 * math.sin(math.pi * smooth(remap(u, 0.25, 0.75)))
    return _cam(pos, look, fov=60.0, roll=roll)


def _s31_cam(u):
    e = smooth(u)
    pos = v_lerp([1.6, 3.9, 0.6], [2.8, 4.4, 1.1], e)
    look = v_lerp([0.0, 3.1, 0.0], [10.0, 5.2, 2.4], smooth(remap(u, 0.3, 1.0)))
    roll = 0.05 * math.sin(u * 2.0 * math.pi)
    return _cam(pos, look, fov=46.0, roll=roll)


def _s32_cam(u):
    e = u * 0.86
    pos = catmull(_S32, e)
    look = catmull(_S32, e + 0.14)
    roll = -0.18 * math.sin(2.0 * math.pi * u) * smooth(remap(u, 0.1, 0.4))
    return _cam(pos, look, fov=60.0, roll=roll)


_S43 = [
    [18.0, 1.1, 2.0],
    [11.0, 1.0, 6.5],
    [4.0, 0.9, 8.2],
    [-3.5, 1.0, 7.6],
    [-9.5, 1.2, 4.0],
    [-11.5, 1.4, -1.5],
]

_S46 = [
    [-14.0, 3.8, -9.0],
    [-9.0, 2.4, -6.5],
    [-4.0, 1.6, -6.0],
    [1.5, 1.5, -6.8],
    [7.0, 1.9, -4.5],
    [10.5, 2.4, 0.5],
]


def _s43_cam(u):
    # ground-level racer: skim the ring plane while the ladder kindles
    e = u * 0.85
    pos = catmull(_S43, e)
    lead = catmull(_S43, e + 0.15)
    w = smooth(remap(u, 0.18, 0.42))
    look = v_lerp([0.0, 2.0, 0.0], lead, w)
    roll = -0.2 * math.sin(2.0 * math.pi * u) * smooth(remap(u, 0.12, 0.4))
    return _cam(pos, look, fov=60.0, roll=roll)


def _s44_cam(u):
    # rise with the reveal: spiral up and over the waking ring
    e = smooth(u)
    az = lerp(2.6, 5.4, e)
    r = lerp(20.0, 9.5, e)
    y = lerp(1.5, 14.5, smoother(u))
    pos = orbit(0.0, 0.0, r, az, y)
    look = v_lerp([0.0, 1.8, 0.0], [0.0, 0.6, 0.4], e)
    return _cam(pos, look, fov=50.0)


def _s45_cam(u):
    # fly backwards ahead of the ignition wave, hero receding through the ring
    e = smooth(u)
    pos = v_lerp([-2.2, 1.5, 2.2], [-19.0, 2.6, 8.5], e)
    look = v_lerp([0.0, 2.4, 0.0], [0.0, 1.9, 0.0], e)
    return _cam(pos, look, fov=54.0)


def _s46_cam(u):
    # far-side slalom with a slow-mo dip at closest clone approach (see timescale)
    e = u * 0.85
    pos = catmull(_S46, e)
    lead = catmull(_S46, e + 0.15)
    w = smooth(remap(u, 0.2, 0.45))
    look = v_lerp([0.0, 2.1, 0.0], lead, w)
    roll = -0.16 * math.sin(2.0 * math.pi * u) * smooth(remap(u, 0.15, 0.5))
    return _cam(pos, look, fov=62.0, roll=roll)


def _s46_ts(u):
    # rush, linger at the closest clone pass (~u 0.5), rush out
    return 1.15 - 0.75 * math.exp(-((u - 0.5) / 0.13) ** 2)


def _s42_cam(u):
    # Thread the ring while the kindle ladder plays (p rides 0.86->1.0).
    # Gaze opens on the always-lit hero, then hands off to the flight path
    # once enough of the ring has ignited to carry the frame.
    e = u * 0.86
    pos = catmull(_S32, e)
    lead = catmull(_S32, e + 0.14)
    w = smooth(remap(u, 0.22, 0.5))
    look = v_lerp([0.0, 2.2, 0.0], lead, w)
    roll = -0.15 * math.sin(2.0 * math.pi * u) * smooth(remap(u, 0.15, 0.45))
    return _cam(pos, look, fov=58.0, roll=roll)


def _s33_cam(u):
    az = lerp(0.0, 5.0 * math.pi, u)
    r = lerp(3.2, 2.0, u)
    y = lerp(0.3, 4.6, ease_out(u, 1.4))
    pos = orbit(0.0, 0.0, r, az, y)
    look = [0.0, y * 0.8, 0.0]
    roll = 0.1 * math.sin(az)
    return _cam(pos, look, fov=44.0, roll=roll)


def _s34_cam(u):
    e = ease_in(u, 1.35)
    pos = catmull(_S34, e)
    look = v_lerp([0.5, 0.6, 0.6], [0.0, -1.0, 0.0], smooth(remap(u, 0.0, 0.55)))
    return _cam(pos, look, fov=52.0)


def _s35_cam(u):
    e = smooth(u)
    az = lerp(0.4, 4.2, e)
    r = lerp(7.5, 5.6, e)
    y = lerp(1.6, 3.2, e)
    pos = orbit(0.0, 0.0, r, az, y)
    look = [0.0, lerp(1.6, 2.6, e), 0.0]
    roll = -0.08 * math.sin(az)
    return _cam(pos, look, fov=46.0, roll=roll)


def _s36_cam(u):
    e = smooth(u)
    # v3: the sketch strands arc through a wide volume — hold a wider frame
    # on the whole birth space instead of chasing them with a tight macro
    pos = v_lerp([5.2, 3.4, 2.4], [4.4, 3.3, 1.6], e)
    return _cam(pos, [0.8, 3.3, -0.2], fov=40.0)


def _s37_cam(u):
    e = smooth(u)
    az = lerp(-0.9, 1.3, e)
    r = lerp(5.2, 3.6, e)
    y = lerp(0.55, 0.9, e)
    pos = orbit(0.0, 0.0, r, az, y)
    return _cam(pos, [0.0, 0.75, 0.0], fov=48.0)

def _s38_cam(u):
    e = smooth(u)
    pos = v_lerp([6.8, 0.5, 2.2], [6.2, 3.4, 2.0], e)
    look = v_lerp([0.0, 0.7, 0.0], [0.0, 3.0, 0.0], e)
    return _cam(pos, look, fov=40.0)


def _s39_cam(u):
    e = smooth(u)
    pos = v_lerp([-7.5, 1.1, -4.6], [-5.0, 1.5, -3.1], e)
    return _cam(pos, [0.0, 2.2, 0.0], fov=42.0)


def _s40_cam(u):
    e = smooth(u)
    az = lerp(0.0, 1.9, e)
    pos = orbit(0.0, 0.0, 2.5, az, 20.5)
    return _cam(pos, [0.0, 0.5, 0.3], fov=55.0)


def _s41_cam(u):
    e = smooth(u)
    az = lerp(2.4, 3.6, e)
    y = lerp(2.2, 3.4, e)
    pos = orbit(0.0, 0.0, 23.0, az, y)
    return _cam(pos, [0.0, 1.6, 0.0], fov=52.0)


# ---------------------------------------------------------------------------
# Shot registry
# ---------------------------------------------------------------------------

_INTRO_URL = "steady=1&nosnap=1"


SHOTS = [
    {
        "name": "00_smoke_hero_orbit",
        "note": "pipeline smoke test — half orbit of the hero mushroom",
        "dur": 3.0,
        "fps": 12,
        "url": "nointro=1&steady=1&nosnap=1&p=0",
        "p": lambda u: 0.0,
        "mode": "ride",
        "cam": _smoke_cam,
        "warmup": 1.0,
    },
    {
        "name": "01_mycelium_dawn_macro",
        "note": "low glide looking down into the web near a hub, riding the draw-in",
        "dur": 10.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.44",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.44,
        "p": _p_ride(0.44, 0.58),
        "mode": "ride",
        "cam": _s01_cam,
    },
    {
        "name": "02_network_awakening_topdown",
        "note": "top-down rise while the web races outward beneath",
        "dur": 10.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.39",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.40,
        "p": _p_ride(0.39, 0.60),
        "mode": "ride",
        "cam": _s02_cam,
    },
    {
        "name": "03_mycelium_tip_chase",
        "note": "network rush — fast chase into the organism, hero glow anchoring the frame",
        "dur": 7.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.42",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.42,
        "p": lambda u: lerp(0.42, 0.58, u),
        "mode": "ride",
        "timescale": lambda u: 0.6 + 0.6 * smooth(remap(u, 0.0, 0.5)),
        "cam": _s03_cam,
    },
    {
        "name": "04_underground_city_flythrough",
        "note": "weave through the subterranean root-world, looking ahead",
        "dur": 12.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.73",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.73,
        "p": _p_hold(0.73),
        "mode": "ride",
        "cam": _s04_cam,
    },
    {
        "name": "05_filament_home_return",
        "note": "glide inward along the ground network; the connections lead home",
        "dur": 11.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.58",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.58,
        "p": _p_hold(0.58),
        "mode": "ride",
        "cam": _s05_cam,
    },
    {
        "name": "06_soil_breach_ascent",
        "note": "rise from below ground past the soil line; underground gives way to hero",
        "dur": 10.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.82",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.82,
        "p": _p_ride(0.82, 0.85),
        "mode": "ride",
        "cam": _s06_cam,
    },
    {
        "name": "07_stalk_ascent_intro",
        "note": "intro replay — tight quarter-spiral beside the stalk as it grows",
        "dur": 9.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 0.0,
        "cam": _s07_cam,
    },
    {
        "name": "08_ground_emergence_low",
        "note": "intro replay — soil-level wide; the mushroom rises into frame",
        "dur": 9.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 0.0,
        "cam": _s08_cam,
    },
    {
        "name": "09_cap_birth_closeup",
        "note": "intro replay — birth quarter view, whole crown assembling outside the cap",
        "dur": 9.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 1.2,
        "timescale": lambda u: 0.55,
        "cam": _s09_cam,
    },
    {
        "name": "10_cap_topdown_bloom",
        "note": "intro replay — top-down rise as the cap blooms outward beneath",
        "dur": 9.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 0.0,
        "cam": _s10_cam,
    },
    {
        "name": "11_under_cap_cathedral",
        "note": "slow spiral among the gills beneath the cap",
        "dur": 11.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.05,
        "p": _p_hold(0.0),
        "mode": "ride",
        "cam": _s11_cam,
    },
    {
        "name": "12_gill_rim_macro",
        "note": "macro orbit at the cap rim, focus on the gill edge ahead",
        "dur": 9.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.05,
        "p": _p_hold(0.0),
        "mode": "ride",
        "cam": _s12_cam,
    },
    {
        "name": "13_spore_stream_flythrough",
        "note": "fly with the spores, looking back at the receding cap the whole flight",
        "dur": 11.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.05,
        "p": _p_hold(0.0),
        "mode": "ride",
        "cam": _s13_cam,
    },
    {
        "name": "14_spore_pov_drift",
        "note": "POV of a drifting spore — slow tumble and vertical bob",
        "dur": 13.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.05,
        "p": _p_hold(0.0),
        "mode": "ride",
        "cam": _s14_cam,
    },
    {
        "name": "15_orbit_grand_hero",
        "note": "one full majestic orbit of the hero at constant speed",
        "dur": 15.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.05,
        "p": _p_hold(0.0),
        "mode": "ride",
        "cam": _s15_cam,
    },
    {
        "name": "16_inspire_wisps",
        "note": "drift among the wisp sprites while they wake",
        "dur": 10.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.17",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.17,
        "p": _p_ride(0.17, 0.33),
        "mode": "ride",
        "cam": _s16_cam,
    },
    {
        "name": "17_network_surf",
        "note": "high-speed surf above the drawn web at constant speed",
        "dur": 9.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.58",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.58,
        "p": _p_hold(0.58),
        "mode": "ride",
        "cam": _s17_cam,
    },
    {
        "name": "18_hub_glint_macro",
        "note": "extreme close parallax arc around a network hub sprite",
        "dur": 9.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.58",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.58,
        "p": _p_hold(0.58),
        "mode": "ride",
        "cam": _s18_cam,
    },
    {
        "name": "19_portrait_field_pass",
        "note": "lateral glide through the underground portrait field",
        "dur": 11.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.63",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.63,
        "p": _p_ride(0.63, 0.79),
        "mode": "ride",
        "cam": _s19_cam,
    },
    {
        "name": "20_substrate_canopy",
        "note": "horizontal drift along the substrate reef, hero glow anchoring the frame",
        "dur": 9.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.74",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.74,
        "p": _p_hold(0.74),
        "mode": "ride",
        "cam": _s20_cam,
    },
    {
        "name": "21_clone_birth",
        "note": "intimate arc as the ring clone kindles to life",
        "dur": 10.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.86",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.87,
        "p": _p_ride(0.88, 0.96),  # was 0.86-0.94: first 3s were black before this clone's kindle rung
        "mode": "ride",
        "cam": _s21_cam,
    },
    {
        "name": "22_ring_procession",
        "note": "constant-speed tracking past several kindled ring clones",
        "dur": 13.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.97",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.97,
        "p": _p_hold(0.97),
        "mode": "ride",
        "cam": _s22_cam,
    },
    {
        "name": "23_ecosystem_pullback",
        "note": "the reveal — pull back along a rising arc until the whole ecosystem is visible",
        "dur": 15.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.86",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.865,
        "p": _p_ride(0.86, 1.0),
        "mode": "ride",
        "cam": _s23_cam,
    },
    {
        "name": "24_ecosystem_aerial",
        "note": "high slow aerial drift over the revealed ecosystem",
        "dur": 12.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=1",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.98,
        "p": _p_hold(1.0),
        "mode": "ride",
        "cam": _s24_cam,
    },
    {
        "name": "25_scale_transition_pullback",
        "note": "from gill macro texture to the whole organism",
        "dur": 13.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.05,
        "p": _p_hold(0.0),
        "mode": "ride",
        "cam": _s25_cam,
    },
    {
        "name": "26_wrap_home_arc",
        "note": "half-circle arc around the whole ecosystem at constant speed",
        "dur": 13.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=1",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.98,
        "p": _p_hold(1.0),
        "mode": "ride",
        "cam": _s26_cam,
    },
    {
        "name": "27_intro_growth_wide",
        "note": "intro replay — the whole birth in one wide frame",
        "dur": 9.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 0.0,
        "cam": _s27_cam,
    },
    {
        "name": "28_spore_cloud_immersion",
        "note": "parked inside the spore stream; particles cross the lens, hero glowing behind",
        "dur": 12.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.05,
        "p": _p_hold(0.0),
        "mode": "ride",
        "cam": _s28_cam,
    },
    {
        "name": "29_web_dive_bomb",
        "note": "vertical plummet past the cap rim, then a low skim out",
        "dur": 8.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.55",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.55,
        "p": _p_hold(0.55),
        "mode": "ride",
        "timescale": lambda u: 1.0,
        "cam": _s29_cam,
    },
    {
        "name": "30_cap_flyby_whip",
        "note": "pod-race wrap around the stalk, then slingshot out",
        "dur": 7.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.05,
        "p": _p_hold(0.0),
        "mode": "ride",
        "timescale": lambda u: 0.7 + 0.5 * smooth(u),
        "cam": _s30_cam,
    },
    {
        "name": "31_spore_burst_eruption",
        "note": "spore burst erupting from inside the cap, camera parked above",
        "dur": 10.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.05,
        "p": _p_hold(0.0),
        "mode": "ride",
        "setup_js": "window.sceneApi.spores.shedSpores(900)",
        "timescale": lambda u: 0.35 + 0.85 * smooth(remap(u, 0.15, 0.6)),
        "cam": _s31_cam,
    },
    {
        "name": "32_ecosystem_swoop",
        "note": "high-speed S-curve through the final clone ring at flying height",
        "dur": 9.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=1",
        "speed": 1.0,
        "warmup": 2.0,
        "warmup_p": 0.98,
        "p": _p_hold(1.0),
        "mode": "ride",
        "timescale": lambda u: 1.0,
        "cam": _s32_cam,
    },
    {
        "name": "33_stalk_corkscrew_rush",
        "note": "spiral climb up the growing stalk as the organism grows",
        "dur": 9.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 0.0,
        "cam": _s33_cam,
    },
    {
        "name": "34_underworld_plunge",
        "note": "dive from open air through the surface into the underground network",
        "dur": 8.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.63",
        "speed": 1.0,
        "warmup": 1.0,
        "warmup_p": 0.63,
        "p": _p_ride(0.63, 0.75),
        "mode": "ride",
        "timescale": lambda u: 0.65 + 0.55 * ease_in(u, 1.5),
        "cam": _s34_cam,
    },
    {
        "name": "35_birth_light_race",
        "note": "fast orbit around the half-drawn organism with a slow-mo dip at the unfurl",
        "dur": 10.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 1.0,
        "timescale": lambda u: 1.15 - 0.8 * math.exp(-((u - 0.45) / 0.16) ** 2),
        "cam": _s35_cam,
    },
    {
        "name": "36_strand_sketch_macro",
        "note": "slow-mo macro of the first light-strands drawing the cap out of nothing",
        "dur": 8.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 0.35,
        "timescale": lambda u: 0.32,
        "cam": _s36_cam,
    },
    {
        "name": "37_ignition_sweep",
        "note": "low arc around the base as the ground network ignites outward",
        "dur": 8.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 4.2,
        "timescale": lambda u: 0.55 + 0.35 * smooth(u),
        "cam": _s37_cam,
    },
    {
        "name": "38_birth_frontal_rise",
        "note": "intro replay — rise with the draw-front as the organism assembles itself",
        "dur": 9.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 0.8,
        "timescale": lambda u: 0.75,
        "cam": _s38_cam,
    },
    {
        "name": "39_birth_quarter_low",
        "note": "intro replay — opposite-side three-quarter low push-in as it grows",
        "dur": 9.0,
        "fps": 24,
        "url": _INTRO_URL,
        "speed": 1.0,
        "warmup": 1.0,
        "timescale": lambda u: 0.7,
        "cam": _s39_cam,
    },
    {
        "name": "40_fairy_ring_mandala",
        "note": "final chapter — entire fairy ring from straight above, slow azimuth parallax",
        "dur": 12.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=1",
        "speed": 1.0,
        "warmup": 2.5,
        "warmup_p": 1.0,
        "p": _p_hold(1.0),
        "mode": "ride",
        "cam": _s40_cam,
    },
    {
        "name": "41_fairy_ring_panorama",
        "note": "final chapter — the whole ring in one wide low frame, slow stately arc",
        "dur": 13.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=1",
        "speed": 1.0,
        "warmup": 2.5,
        "warmup_p": 1.0,
        "p": _p_hold(1.0),
        "mode": "ride",
        "cam": _s41_cam,
    },
    {
        "name": "42_ring_ignition_flythrough",
        "note": "fly through the fairy ring WHILE the clones kindle — the reveal plays around the camera",
        "dur": 12.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.86",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.86,
        "p": _p_ride(0.86, 1.0),
        "mode": "ride",
        "cam": _s42_cam,
    },
    {
        "name": "43_ring_ignition_low_racer",
        "note": "ground-level speed run through the waking ring, banking past clones as they ignite",
        "dur": 10.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.86",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.86,
        "p": _p_ride(0.86, 1.0),
        "mode": "ride",
        "cam": _s43_cam,
    },
    {
        "name": "44_ring_ignition_riser",
        "note": "spiral up and over the ring as it wakes, ending on the lit mandala from above",
        "dur": 13.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.86",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.86,
        "p": _p_ride(0.86, 1.0),
        "mode": "ride",
        "cam": _s44_cam,
    },
    {
        "name": "45_ring_ignition_backwards_pull",
        "note": "fly backwards ahead of the ignition wave — the lighting-up chases the camera out through the ring",
        "dur": 11.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.86",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.86,
        "p": _p_ride(0.86, 1.0),
        "mode": "ride",
        "cam": _s45_cam,
    },
    {
        "name": "46_ring_ignition_slalom_slowmo",
        "note": "far-side slalom through the kindling ring with a slow-mo dip at the closest clone pass",
        "dur": 11.0,
        "fps": 24,
        "url": "nointro=1&steady=1&nosnap=1&p=0.86",
        "speed": 1.0,
        "warmup": 1.5,
        "warmup_p": 0.86,
        "p": _p_ride(0.86, 1.0),
        "mode": "ride",
        "cam": _s46_cam,
        "timescale": _s46_ts,
    },
]
