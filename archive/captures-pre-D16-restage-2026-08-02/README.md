# Retired goldens (pre-D16-restage, shot 2026-08-02)

These are the ten Tier-3 capture PNGs + manifest.json that lived at
`static/captures/` before the M6 golden re-shoot
(`journey-v6-plan/15-merge-and-architecture.md` M6 row;
`journey-v6-plan/EXECUTION.md`'s M6 entry, 2026-08-04).

**Why retired:** shot 2026-08-02, via the pre-freeze live-scrub path
(`?nointro=1&pose=<id>`, `"frozen": false` in the manifest) — before the D16
Inspire restage (`04a7d21`, `c098e23`) and the spore-unification pass
(`ae1750e`) changed what the Inspire rest actually looks like. `capture.py
--check` against them read inspire MAE ≈22/255, a stale-golden false
positive, not real drift (flagged at M5, `18f160f`'s EXECUTION.md entry).

**Superseded by:** `static/captures/` now holds goldens shot through the
`?capture=` freeze (M5, `3badf8b`) at the merged, Hannah-era-approved tip —
reproducible pixel targets (`"frozen": true`), not one honest frame of a
moving scene. See that directory's `manifest.json` for the commit hash and
reason recorded at shoot time, and `tools/capture.py`'s header comment for
how the frozen path works.

Kept for the record, not as a rollback target — do not point any tooling
back at this directory.
