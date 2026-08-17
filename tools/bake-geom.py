#!/usr/bin/env python3
# ==============================================================================
# bake-geom.py — the commit-time geometry baker. The other half of the runtime
# contract is journey/lib/baked.js, whose header documents the manifest/.bin
# format this script produces; read it first, it is the authority.
#
#   python3 tools/bake-geom.py                          # bake default ("owned")
#   python3 tools/bake-geom.py --chapter owned --chapter inspire
#   python3 tools/bake-geom.py --check                  # re-bake in memory +
#                                                        #   byte-diff vs the
#                                                        #   committed .bins —
#                                                        #   pre-commit gate
#
# ------------------------------------------------------------------------------
# WHY BAKE IN THE SAME HEADLESS CHROME THAT SHOOTS THE GOLDENS
# ------------------------------------------------------------------------------
# Chapter geometry is a pure function of seeds: the live builders (anatomy.js +
# each chapter's index.js) are deterministic, so the same seed stream yields the
# same BufferGeometry, bit for bit, on every run. That leaves exactly two ways
# to produce the shipped bytes:
#
#   1. re-implement the builders in Python and hope the float math matches, or
#   2. run the REAL builders once, in the REAL V8, and harvest the exact bytes
#      they would have produced on any visitor's machine.
#
# Only (2) is correct. By baking under ?bakedump=1 in the same headless Chrome
# capture.py drives for the pixel goldens, the .bin is bit-identical to a live
# build BY CONSTRUCTION — same V8, same Float32Array semantics, same determinism
# — not by approximation. A Python port would have to reproduce V8's exact float
# rounding, and the first NaN it missed would silently corrupt geometry on every
# visitor's machine while passing a locally-authored test. So we never port the
# math; we harvest it. This script therefore imports capture.py's CDP plumbing
# (its main() is guarded behind __name__ == "__main__", so the import is inert)
# and speaks the same WebSocket protocol, rather than owning a second copy.
#
# ------------------------------------------------------------------------------
# WHY --check IS THE PRE-COMMIT FRESHNESS GATE
# ------------------------------------------------------------------------------
# The baked .bin is committed, so a seed change to the builders that does NOT
# regenerate static/geom/ would leave the shipped fast path silently stale: the
# page would fetch the OLD bytes and never learn the builders had moved on.
# --check closes that hole — it re-runs the live builders under ?bakedump=1,
# repacks in memory, and byte-diffs against the committed .bin. Byte equality
# (not "close enough") is the entire point: geometry is deterministic, so any
# differing byte is a stale bake and the commit hook fails it. Same philosophy
# as capture.py --check's MAE gate — the machine re-derives the artifact and
# refuses to ship if it drifted. "Not baked yet" (no manifest, or no entry for
# this chapter) is a VALID state and does not fail: nothing committed can be
# stale until the first bake exists.
#
# ------------------------------------------------------------------------------
# THE 4-BYTE ALIGNMENT REQUIREMENT
# ------------------------------------------------------------------------------
# At load, baked.js wraps each attribute as a typed-array VIEW over its window
# of the chapter's .bin: new Float32Array(buffer, attr.byteOffset, len/4). The
# typed-array constructor THROWS if byteOffset is not a multiple of the element
# size (4). So every attr byteOffset MUST be 4-aligned, or the shipped path
# throws on load. All elements are 4 bytes, so packing attrs back-to-back keeps
# offsets aligned automatically — but we assert it while writing anyway: the
# assert is free and an unaligned .bin is a page that falls back to livebuild
# (or throws) for every visitor.
#
# Stdlib only below (json, base64, hashlib, argparse, socket, tempfile, …). The
# one non-stdlib in the transitive import is Pillow, which capture.py already
# requires (11.3.0) and which this script never touches.
# ==============================================================================

import argparse
import base64
import hashlib
import json
import os
import shutil
import sys
import tempfile
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # .../glowshroom (tools/ lives at the site root)
GEOM_DIR = os.path.join(ROOT, "static", "geom")
MANIFEST_PATH = os.path.join(GEOM_DIR, "manifest.json")

# Reuse capture.py's hand-rolled CDP client verbatim (import is safe: main()
# is guarded). Add its directory to sys.path so the import resolves regardless
# of where this script is invoked from.
sys.path.insert(0, HERE)
import capture as capture_mod  # noqa: E402  (deliberate import-after-path)

CHROME = capture_mod.CHROME
BASE_URL = capture_mod.BASE_URL            # http://localhost:8137/index.html
# &livebuild=1 is LOAD-BEARING (2026-08-17 forensics): without it the dump
# page fetches the EXISTING bake and the chapters build from bytes — the
# harvest becomes a copy of the previous bake instead of a fresh derivation
# from the real builders, and --check then compares the bake to itself and
# can never catch drift. The freshness gate is only a gate if every harvest
# runs the live builders.
BAKE_URL = BASE_URL + "?bakedump=1&nointro=1&livebuild=1"

DEFAULT_CHAPTERS = ["owned", "final", "connect"]
POLL_INTERVAL_S = 0.5
BAKE_TIMEOUT_S = 90.0                      # how long to wait for a chapter's .done

# Base64 ceiling below which an attribute is read in ONE Runtime.evaluate call;
# above it, the typed array is sliced in-page and read in several calls. Sized
# so each single read's base64 stays comfortably under CDP's comfortable message
# envelope (and under the task's 4 MB figure).
MAX_B64 = 4 * 1024 * 1024                  # 4 MiB of base64
RAW_BYTES_PER_CHUNK = 2 * 1024 * 1024      # 2 MiB raw -> ~2.8 MiB base64 per call
ELEMS_PER_CHUNK = RAW_BYTES_PER_CHUNK // 4 # elements are 4 bytes
# MUST be a multiple of 3 (2026-08-17, found by the owned-wiring agent's
# verification pass): btoa on a non-multiple-of-3 chunk emits interior '='
# padding, and Python's b64decode stops at the first internal '=' — the
# harvest silently truncated to one chunk. 49152 = 3 * 16384.
B64_CHUNK = 49152                          # btoa in-page chunk (bytes), per contract


# ------------------------------------------------------------------------------
# JS helpers. Every expression is a self-contained IIFE returning a plain,
# JSON-serializable value (or a base64 string) so returnByValue round-trips it.
# ------------------------------------------------------------------------------

def jsstr(value):
    """Render a Python value as a JS literal. json.dumps emits a valid JS
    string/number/bool/null — sufficient for the ASCII ids/names used here."""
    return json.dumps(value)


def done_js(chapter):
    """true iff window.__bake.chapters[<chapter>].done is set. Guards the whole
    chain so a mid-navigation evaluate returns false instead of throwing."""
    return (
        "(() => { const b = window.__bake;"
        " if (!b || !b.chapters) return false;"
        " const ch = b.chapters[%s];"
        " return !!(ch && ch.done); })()" % jsstr(chapter)
    )


def meta_js(chapter):
    """The chapter's key list with per-attr shape + byteLength, WITHOUT the
    arrays (a typed array can't returnByValue as bytes; we read those next)."""
    return (
        "(() => { const ch = window.__bake.chapters[%s];"
        " if (!ch) return [];"
        " return ch.keys.map((k) => ({ key: k.key,"
        "  attrs: k.attrs.map((a) => ({ name: a.name, itemSize: a.itemSize,"
        "   kind: a.kind, byteLength: a.array.byteLength })) })); })()"
        % jsstr(chapter)
    )


def payload_js(chapter):
    """The chapter's payload, JSON round-tripped in-page so what we store is
    guaranteed plain JSON (registerPayload merges 'JSON-serializable metadata',
    but a NaN/undefined would poison the manifest; stringify normalizes it)."""
    return "JSON.parse(JSON.stringify(window.__bake.chapters[%s].payload || {}))" % jsstr(chapter)


def attr_read_js(chapter, key, name, elem_start=None, elem_count=None):
    """Return base64 of one attribute's bytes. Whole array by default; with
    elem_start/elem_count, a typed-array slice is taken in-page first (the
    multi-call path for big arrays). bytes are marshalled through a Uint8Array
    view of the (sliced) array's buffer, btoa'd in 32 KB chunks."""
    finder = (
        "window.__bake.chapters[%s].keys.find((k) => k.key === %s)"
        ".attrs.find((a) => a.name === %s)"
        % (jsstr(chapter), jsstr(key), jsstr(name))
    )
    if elem_start is None:
        arr = "(%s).array" % finder
    else:
        arr = "(%s).array.slice(%d, %d)" % (finder, elem_start, elem_start + elem_count)
    return (
        "(() => { const typed = %s;"
        " const u8 = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);"
        " let out = '';"
        " for (let i = 0; i < u8.length; i += %d)"
        "   out += btoa(String.fromCharCode.apply(null, u8.subarray(i, i + %d)));"
        " return out; })()" % (arr, B64_CHUNK, B64_CHUNK)
    )


# ------------------------------------------------------------------------------
# Collection + packing
# ------------------------------------------------------------------------------

def wait_done(cdp, chapter):
    """Poll until the runtime signals this chapter has finished dumping. The
    journey is the source of truth — no sleep-and-hope, mirroring capture.py's
    readiness gate (window.journey.chapter)."""
    deadline = time.time() + BAKE_TIMEOUT_S
    while time.time() < deadline:
        try:
            if cdp.eval(done_js(chapter), timeout_s=30.0):
                return
        except Exception:
            pass  # mid-navigation / context-destroyed — retry after the poll gap
        time.sleep(POLL_INTERVAL_S)
    sys.exit(
        "timed out after %.0fs waiting for chapter %r bake "
        "(window.__bake.chapters[%r].done never became truthy)"
        % (BAKE_TIMEOUT_S, chapter, chapter)
    )


def read_attr(cdp, chapter, key, name, byte_length):
    """Fetch one attribute's raw little-endian bytes from the page. Small arrays
    come back in one evaluate; big ones are sliced in-page and reassembled."""
    b64_len = ((byte_length + 2) // 3) * 4
    if b64_len <= MAX_B64:
        return base64.b64decode(cdp.eval(attr_read_js(chapter, key, name), timeout_s=90.0))
    chunks = []
    elems = byte_length // 4
    for start in range(0, elems, ELEMS_PER_CHUNK):
        chunks.append(base64.b64decode(
            cdp.eval(attr_read_js(chapter, key, name, start, ELEMS_PER_CHUNK), timeout_s=90.0)
        ))
    return b"".join(chunks)


def pack_chapter(cdp, chapter, meta):
    """Pack a chapter's attrs into .bin bytes + its manifest `keys` list.
    Attrs are laid out back-to-back in manifest order, which is the order the
    dump recorded them (and therefore the order baked.js reads them back)."""
    bin_bytes = b""
    keys = []
    offset = 0
    for k in meta:
        attrs_out = []
        for a in k["attrs"]:
            raw = read_attr(cdp, chapter, k["key"], a["name"], a["byteLength"])
            if len(raw) != a["byteLength"]:
                sys.exit("byteLength mismatch for %s.%s: read %d bytes, expected %d"
                         % (k["key"], a["name"], len(raw), a["byteLength"]))
            # The alignment invariant (see header). Guaranteed by 4-byte elements
            # but asserted so a future non-f32/u32 attr can't slip in silently.
            assert offset % 4 == 0, "unaligned byteOffset %d for %s.%s" % (offset, k["key"], a["name"])
            assert a["byteLength"] % 4 == 0
            attrs_out.append({
                "name": a["name"],
                "itemSize": a["itemSize"],
                "byteOffset": offset,
                "byteLength": a["byteLength"],
                "kind": a["kind"],
            })
            bin_bytes += raw
            offset += a["byteLength"]
            assert offset % 4 == 0
        keys.append({"key": k["key"], "attrs": attrs_out})
    return bin_bytes, keys


def check_duplicate_keys(chapter, meta):
    """registerGeometry appends under key; the same key twice would make the
    manifest ambiguous, so fail loudly rather than write a bad bake."""
    seen = set()
    for k in meta:
        if k["key"] in seen:
            sys.exit("duplicate bake key %r in chapter %r — the runtime registered "
                     "the same geometry twice; the bake cannot be unambiguous"
                     % (k["key"], chapter))
        seen.add(k["key"])


# ------------------------------------------------------------------------------
# The two modes
# ------------------------------------------------------------------------------

def bake_mode(cdp, collected):
    """Pack each collected chapter, write its .bin, and merge the manifest
    (preserving other chapters; replacing only the ones baked this run)."""
    manifest = {"version": 1, "chapters": {}}
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH) as f:
            existing = json.load(f)
        if isinstance(existing, dict) and isinstance(existing.get("chapters"), dict):
            manifest["chapters"] = existing["chapters"]

    for chapter, (meta, payload) in collected.items():
        bin_bytes, keys = pack_chapter(cdp, chapter, meta)
        digest = hashlib.sha256(bin_bytes).hexdigest()
        fname = "%s.bin" % chapter
        with open(os.path.join(GEOM_DIR, fname), "wb") as f:
            f.write(bin_bytes)
        manifest["chapters"][chapter] = {
            "file": fname,
            "sha256": digest,
            "keys": keys,
            "payload": payload,
        }
        print("%s: baked %d bytes, %d key(s), sha256 %s" % (chapter, len(bin_bytes), len(keys), digest))

    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
    return 0


def check_mode(cdp, collected):
    """Re-bake in memory and byte-diff against the committed .bins. This is the
    pre-commit freshness gate: geometry is deterministic, so a single differing
    byte means the committed bake has drifted from the live builders."""
    if not os.path.exists(MANIFEST_PATH):
        for chapter in collected:
            print("%s: not baked yet" % chapter)
        return 0
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)
    chapters_manifest = manifest.get("chapters", {}) if isinstance(manifest, dict) else {}

    drift = False
    for chapter, (meta, _payload) in collected.items():
        entry = chapters_manifest.get(chapter)
        if not entry:
            print("%s: not baked yet" % chapter)
            continue
        fresh, _keys = pack_chapter(cdp, chapter, meta)
        fname = entry.get("file")
        bin_path = os.path.join(GEOM_DIR, fname) if fname else None
        if not bin_path or not os.path.exists(bin_path):
            print("%s: DRIFT (missing)" % chapter)
            drift = True
            continue
        with open(bin_path, "rb") as f:
            committed = f.read()
        if committed == fresh:
            print("%s: OK" % chapter)
        else:
            common = min(len(committed), len(fresh))
            n = sum(1 for a, b in zip(committed, fresh) if a != b)
            n += abs(len(committed) - len(fresh))
            print("%s: DRIFT (%d bytes differ)" % (chapter, n))
            drift = True
    return 1 if drift else 0


# ------------------------------------------------------------------------------
# main
# ------------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(
        description="Commit-time geometry baker — harvests ?bakedump=1 into static/geom/"
    )
    ap.add_argument("--chapter", action="append", default=None,
                    help="chapter id; repeatable (default: %s)" % ", ".join(DEFAULT_CHAPTERS))
    ap.add_argument("--check", action="store_true",
                    help="re-bake in memory and byte-diff vs the committed .bins; exit 1 on drift")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    chapters = args.chapter or list(DEFAULT_CHAPTERS)
    # de-dup preserving order (repeatable --chapter may repeat an id)
    seen = set()
    chapters = [c for c in chapters if not (c in seen or seen.add(c))]

    # The server must already be up (BASELINE.md §machine: port 8137 rooted at
    # glowshroom/). This script never starts or stops it — same contract as
    # capture.py, same message, so the two tools read identically.
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

    os.makedirs(GEOM_DIR, exist_ok=True)

    profile = tempfile.mkdtemp(prefix="bake-geom-chrome-")
    port = capture_mod.free_port()
    print("bake-geom.py — %d chapter(s): %s" % (len(chapters), ", ".join(chapters)))
    print("  source : %s" % BAKE_URL)
    print("  geom   : %s" % GEOM_DIR)
    proc = capture_mod.launch_chrome(profile, port, args.verbose)
    cdp = None
    try:
        cdp = capture_mod.CDP(capture_mod.page_ws_url(port), args.verbose)
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        cdp.call("Page.navigate", {"url": BAKE_URL})

        collected = {}
        for chapter in chapters:
            wait_done(cdp, chapter)
            meta = cdp.eval(meta_js(chapter), timeout_s=30.0)
            if not isinstance(meta, list):
                sys.exit("chapter %r: unexpected dump shape (keys is not a list)" % chapter)
            check_duplicate_keys(chapter, meta)
            payload = cdp.eval(payload_js(chapter), timeout_s=30.0)
            collected[chapter] = (meta, payload)

        return check_mode(cdp, collected) if args.check else bake_mode(cdp, collected)
    finally:
        # Clean shutdown, mirroring capture.py: close the browser via CDP first,
        # then kill the process and drop the profile. Best-effort throughout —
        # a hung renderer must not block the exit code.
        if cdp is not None:
            try:
                cdp.call("Browser.close", timeout_s=5)
            except Exception:
                pass
            cdp.close()
        try:
            proc.terminate()
            proc.wait(timeout=8)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
