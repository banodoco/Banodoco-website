# 15 — The Merge: from layered dev build to one beautiful structure

**What this covers:** how we take what exists today — the frozen hero page, the
`journey-v6/` build layered on top of it, and eleven local commits — and merge
it into a single, structurally honest codebase that ships as *the* Banodoco
site. "Beautiful" here is not decoration; it is the set of structural rules
that would have made this week's hardest bug impossible.

---

## 1. Where we actually are

Three strata, accreted in order:

| Stratum | What it is | Why it exists |
|---|---|---|
| **The hero** | `golden-mushroom-page.html` + `mushroom-scene.js` — one monolithic page, one 2,100-line scene module. Frozen all week (byte-identical, regression-gated). | It was the approved artifact; freezing it was the correct safety call for an additive build. |
| **The journey layer** | `journey-v6/` — a copy of the hero page plus `core/` (state, scroll, director, seams, lens, ui) and `chapters/`, which manipulate the hero's scene *from outside*: overwriting its spore positions after its own animator, rewriting its color buffers with byte-exact restore, dimming its point clouds by traversal, skewing `performance.now` to fast-forward its intro. | The freeze made "reach in from outside" the only legal way to extend. Every reach-in is disciplined (restore proofs, checksums) — but it is still a second world acting on the first. |
| **The plan shell** | `journey-v6-plan/` — specs, ADRs, budgets, decision log, execution log, baseline, reference images. | The project's memory. Keep permanently. |

### The lesson the spore saga taught us

Six fixes failed for one structural reason: **two worlds owned one visual
idea.** The mushroom's own spores (hero world) and the chapter's plumes
(journey world) were separate systems pretending, with ever-better
choreography, to be one thing. Every seam between them — timing, sector,
brightness, hover state, camera staging — leaked, one leak per review round.
The camera choreography was a third independent system, so even perfect
particle unity could be betrayed by staging. And our verification harness
couldn't perceive what a human with a mouse and motion perception sees.

"Structurally beautiful" therefore means, concretely:

1. **One owner per visual idea.** Every particle, strand, glow, and camera
   move has exactly one module that owns it. No system may exist twice
   (once "real," once "for the journey").
2. **Extension by API, not by reach-in.** If the journey needs to drive the
   organism's spores, the organism *exposes a spore-driver seat* — it does
   not get its buffers overwritten from outside.
3. **Choreography lives with what it choreographs.** A chapter owns its
   camera leg, its reveals, and its anatomy in one place, so "where the
   camera goes" and "what lights up" can never be authored against different
   truths.
4. **Nothing self-ignites** (Hannah's law, D16): visible things brighten or
   grow from visible things. Fade-in-from-nothing is a banned primitive
   *on screen* — streaming a chapter in behind genuine occlusion (under the
   cap, below the soil) is exempt, because the viewer cannot watch it happen.
5. **State changes happen in place** (the locus law, D17): when a visual
   idea changes state — drift organizing into braids, bodies kindling — the
   light stays in the volume it already occupied. Identity lives in *where
   the light is*; relocation reads as replacement, however continuous the
   particles.
6. **Taste is a dialed number, not a guess.** Perceptual intensities
   (TRANSFORM, handheld amplitude, commit blend, snap bias) are named
   constants with live dials for the taste owner; the shipped default is the
   number she chose, recorded in the decision log. Eight rebuilt guesses
   taught us this one.
7. **Human-sentence acceptance.** Every merge gate includes at least one
   test phrased in the taste owner's own words, checked by a human or by a
   harness that can actually perceive it (cursor present, motion rendered).

---

## 2. Target structure

```
glowshroom/
├── index.html                  ← THE site (today's journey-v6/index.html, promoted)
├── serve.py                    ← dev server (no-store; production hosting sets the same headers)
├── organism/                   ← the mushroom, as a library (from mushroom-scene.js)
│   ├── organism.js             ← createOrganism(): geometry, materials, ambient life
│   ├── spores.js               ← THE one spore system + driver seat (see §3)
│   ├── intro.js                ← growth choreography + accelerate() (clock-skew becomes an API)
│   └── furniture.js            ← callouts/scrim/spill with linked opacity+hit-test state
├── journey/
│   ├── state.js  scroll.js  director.js  seams.js  lens.js  ui.js
│   └── chapters/
│       ├── inspire/            ← chapter = one folder: choreography + anatomy + geometry
│       │   ├── index.js        ←   the chapter contract (armed/reveal/update/nodes)
│       │   ├── camera.js       ←   ITS OWN leg keys (director composes chapter legs)
│       │   └── anatomy.js      ←   ITS sector truths (exits live here, nowhere else)
│       ├── connect/  owned/  final/
├── content/                    ← single content source (unchanged)
├── static/                     ← Tier-3 journey + captures (unchanged)
├── tools/                      ← capture.py, regression checks
└── archive/                    ← golden-mushroom-page.html (retired hero), old journey/, spikes
```

Key inversions vs today:

- **`organism/` is a library, not a frozen artifact.** The hero page retires
  *into* the archive; the organism module renders the identical Mission pose
  as its default state. The freeze served the build phase; the merge ends it.
  The regression baseline (BASELINE.md) remains the acceptance oracle — the
  organism must reproduce the approved hero frame exactly — but the *file*
  stops being load-bearing.
- **`spores.js` is the only spore system in existence.** It owns the 4,200
  particles AND the braid/plume behaviours as *modes of the same dots*
  (ambient drift ⇄ delta split ⇄ braids ⇄ detail sharpening). The chapter
  requests modes through the driver seat; it brings no particles of its own.
  The 5,100-particle GPU layer either merges into this system's detail mode
  or is deleted. Two-population bugs become unrepresentable.
- **Chapters own their camera legs.** `director.js` becomes a composer that
  sequences chapter-owned legs and guarantees the global motion language
  (handheld, seams, no-roll), instead of a monolith holding every key. The
  Inspire restage (camera goes *to the stream*) is then a chapter-local
  truth, physically adjacent to the exits it frames.
- **`furniture.js` fixes the class of the hover-trap bug**: opacity and
  hit-testability become one state, changed together, by construction.
- **`intro.js` absorbs the fast-forward**: clock-skewing from outside becomes
  `intro.accelerate()`, owned by the intro itself.

---

## 3. The one spore system (the heart of the merge)

Today, after all fixes: hero shed (positions overwritten by the takeover,
colors by the dimmer) + chapter GPU layer (rest-detail only) + chapter
furniture (filaments/beads/wisps). Post-merge:

```js
organism.spores = createSpores({
  modes: { drift, split, braid, detail },   // all operate on THE SAME 4,200 dots
  driver: null,                             // journey claims the seat; null = pure ambient
})
```

- `drift` — today's hero behaviour, byte-identical when the seat is empty.
- `split/braid` — the takeover's steering, promoted from buffer-overwriting
  to first-class mode. Conservation and reversibility are properties of the
  system, not promises of an external patch.
- `detail` — pearls as per-dot brightness, ribbons as grown lines, scaled by
  the TRANSFORM dial; braid axes follow the drift's own lean (locus law).
- Under-rim furniture becomes `braid`-mode adornment that grows along the
  paths the dots actually travel — it cannot ignite independently because it
  has no independent existence.

**Status update (2026-08-03): the hard half of §3 already happened live.**
The 5,100-dot GPU layer is deleted; pearls run as brightness on the real
dots; braids are re-axised in place (D17); intensity is Hannah's dial
(TRANSFORM, `localStorage journey-v6.transform`). What §3 still owes at M3
is *housing*: moving the takeover/dimmer logic from external
buffer-overwriters into `organism/spores.js` as the system itself, and
baking Hannah's chosen T as the shipped default.

**Acceptance for §3, in Hannah's words:** watching the right-side spores
while scrolling in, you never see a spore appear that wasn't already there,
and the stream never becomes a different thing or a different place — held
by construction and by the locus measurements, at her chosen intensity.

---

## 4. Merge sequence (each step lands green or reverts)

Prereq: the in-flight Inspire restage (D16 agent) lands and Hannah accepts
the ride. Do not start the merge with a red review outstanding.

| Step | What happens | Gate |
|---|---|---|
| **M0 tag** | Tag current state (`v6-prepromote`); final tarball snapshot. | Tags exist |
| **M1 promote** | `journey-v6/index.html` becomes `glowshroom/index.html`; `golden-mushroom-page.html` moves to `archive/` with a redirect stub; `/journey/` old build keeps its red banner in `archive/`. All internal paths re-based. | Site serves at `/`; old URLs redirect; full ride green |
| **M2 organism extraction** | `mushroom-scene.js` → `organism/` modules **without behaviour change** (mechanical split; exports unchanged plus the new seats). | BASELINE regression oracle passes (structural counts + frozen-intro perceptual diff); p=0 checksum |
| **M3 spore housing** | §3's remainder: absorb the takeover/dimmer logic into `organism/spores.js` (the GPU layer is already deleted, live); bake Hannah's dialed T as the shipped default (keep the dial behind a QA flag). | The Hannah-sentence test, human-verified; checksum; rest frame at her T |
| **M4 chapter foldering** | Chapters become folders owning camera+anatomy+geometry; director becomes composer; anatomy mirrors deduped (one source of sector truth); **migrate `driveInspire` out of journey.js** (Inspire's reveal drive is currently split across two files — exactly the split rule 3 bans). | Full-journey scrub audit (the 31-point suite) green both directions |
| **M5 debt burn-down** | The catalogued leftovers: **delete the dead flight machinery in journeyState (all navigation is direct jumps now)**; frame-loop error isolation (one bad chapter can't freeze UI); scroll.js key-routing edge cases; hero `:focus-visible` styles + skip link; `?capture=` freeze param; **a no-self-ignition + locus audit of Connect/Owned/Final's on-screen transitions** (their occluded streaming is exempt; anything visible when it arms is not); a taste-dial registry (one pattern for TRANSFORM-class knobs); D11 wiring once decided; delete `assets/test-portraits/` before any public deploy (consent rule). | Each item checked off in EXECUTION.md |
| **M6 repo merge** | Push the full local history to `origin/main` (needs the fresh token). Tag `journey-v6-merged`. CI hook: `capture.py` + regression check on every scene-touching commit. | Push succeeds; tags on origin |

Rules while merging: one step per commit series; every step reversible by
tag; the regression oracle runs at every step; no new features ride along
with structural moves (behaviour-preserving steps must prove preservation,
behaviour-changing steps must name the change).

---

## 5. What stays beautiful afterwards (maintenance invariants)

- A new chapter = a new folder implementing the contract + its own camera
  leg. It gets organism access only through seats. If it needs a new seat,
  the organism grows one — reach-ins stay banned.
- The decision log, budgets, and execution log continue: every taste call
  gets a D-number, every knob gets a named constant, every "clever" trick
  (clock skew, buffer seats) lives behind an API with its rationale in the
  doc-comment.
- The review loop keeps the two hard-won habits: a human ride for anything
  motion-perceptual, and the no-self-ignition audit as a standing checklist
  item for any new luminous element, in any chapter.

*Written 2026-08-03, after the spore saga, so the next build never has one.*
