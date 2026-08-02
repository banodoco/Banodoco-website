# 12 — Platforms: Mobile, Accessibility, Tiers, Loading (P5)

**Objective:** mobile, accessibility, reduced motion, and a complete non-WebGL fallback are **first-class requirements** — a parallel experience, not a degraded one.

**Owner:** Frontend + 3D Dev (tier scaling) + Motion (portrait poses).

## Mobile

- [ ] PL-1.1 Deliberate **portrait camera pose per chapter** (from the anatomy map page 2) — never the desktop frame squeezed.
- [ ] PL-1.2 Touch model: first tap focuses a node and shows the hover state; second tap opens the detail.
- [ ] PL-1.3 Desktop drawers/cards become bottom sheets: internal scrolling, drag-to-dismiss.
- [ ] PL-1.4 Named nodes remain; decorative density may drop to preserve **44px minimum touch targets**.
- [ ] PL-1.5 Owned on mobile: curated portrait subset + complete contributor list in a bottom-sheet index (OW-4.5).

## Accessibility

- [ ] PL-2.1 Canvas is presentational and `aria-hidden`; real DOM headings, copy, controls, drawers, profiles, links form the accessible document.
- [ ] PL-2.2 Keyboard order follows the narrative; Enter opens, Escape closes, focus returns to the triggering control; focus states = hover states.
- [ ] PL-2.3 Functional gold-on-black text meets **WCAG AA**; decorative glow never substitutes for contrast. Audit every text style at G5.
- [ ] PL-2.4 `prefers-reduced-motion` → the complete static journey: chapter stills, no ambient animation, no parallax. (Grain in stills is baked/frozen — the anti-banding benefit without motion.)

## Delivery tiers

| Tier | Definition | Target |
|---|---|---|
| 1 | Full real-time: complete particle density, full optics, continuous scrub | **60fps on M1-class MacBook Air** |
| 2 | Lightweight WebGL: reduced density, simpler shaders, baked glow sprites; grade identity preserved (LUT, roll-off, light grain, warm fog); aberration/streaks may drop | **60fps on the agreed mid-range Android** (30fps requires explicit approval, never silent) |
| 3 | Static journey: chapter stills (full finishing baked in) + CSS crossfades + complete HTML nav/drawers/profiles/links | Reduced motion, failed capability detection, WebGL init failure |

- [ ] PL-3.1 Implement `setQuality`-style honest Tier-2 scaling per chapter against the LA-7 budget table.
- [ ] PL-3.2 Runtime performance watchdog demotes Tier 1 → Tier 2 when necessary; **never** live-swap WebGL → static unless WebGL fails.
- [ ] PL-3.3 Tier-3 captures generated **automatically from the live scene** (per ADR AR-4) at the five resting poses + key detail states, wired into CI from the prototype stage so fallbacks never drift.
- [ ] PL-3.4 Tier identity review at G5: all three tiers read as the same place, same grade, same information.

## Loading & streaming

- [ ] PL-4.1 Hero loads exactly as today (MP-8); journey chapters lazy-load after hero stability while the visitor reads the opening.
- [ ] PL-4.2 Chapter-level streaming keyed to the three occlusion thresholds; when cap or substrate fills the frame: stream next cluster, retire distant detail, swap impostors/LOD, re-fog, reallocate the transparency budget toward the entered chapter.
- [ ] PL-4.3 Verify no threshold streaming ever causes a visible pop in either scroll direction.

## Acceptance
- Device-matrix pass (both reference devices + one older laptop + one iPhone Safari): tier targets met, touch model correct, bottom sheets usable.
- Keyboard-only and screen-reader walkthrough completes the full narrative and reaches every detail state.
- Tier 3 communicates every piece of information with no WebGL at all.
