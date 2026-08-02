# 11 — Product Systems: Nav, Routing, State, Motion Layers (P4, Lane C)

**Objective:** the connective tissue: one canonical journey state driving camera, nav, routes, copy, and detail states — the handoff names DOM/canvas synchronization as a top-four risk, and the cure is a single source of truth.

**Owner:** Frontend + Tech Lead.

## State model

- [ ] PS-1.1 One canonical journey progress value (donor `journeyState.js`, adapted) owns the camera. Scroll scrubs it; nav clicks and deep links *move it*; nothing commands the camera independently.
- [ ] PS-1.2 Detail state (open spotlight/card/profile) is part of the same store; travel-resume closes it first.
- [ ] PS-1.3 Chapter ranges for five chapters (Equip range deleted); rest bands per the grey-box decisions.

## Navigation

- [ ] PS-2.1 Persistent chapter nav: **Mission · Inspire · Connect · Owned**, active chapter softly highlighted; Final never appears (Owned stays active during the epilogue).
- [ ] PS-2.2 Nav click → camera flight along the spatial route (no page load); manual scroll cancels the flight immediately.
- [ ] PS-2.3 Paired 2RP / Discord control top-right: one grouped element, independent hover states, unchanged destinations (2RP → the publication directly). Not a conversion funnel — stable ecosystem destinations.
- [ ] PS-2.4 Hero callouts per decision D6 (see README) — if re-pointed, they become deep-link entries into the journey.

## Routing

- [ ] PS-3.1 Shareable URLs for every chapter and meaningful detail state.
- [ ] PS-3.2 Deep link → camera placed at the resting pose, detail opened, no journey replay.
- [ ] PS-3.3 Browser Back closes detail state before moving to the previous chapter state.

## Motion system (three layers, per the handoff)

- [ ] PS-4.1 **Ambient layer:** continuous, low-amplitude, randomized phase; local causality only. Global synchronized breathing is prohibited — enforce with a review pass per chapter. Nothing ambient moves fast enough to compete with interaction or travel.
- [ ] PS-4.2 **Micro-interaction layer:** immediate soft feedback; responses reveal real structure (transport fibres, gill regions, routes, strands, growth front); interaction temporarily dominates local ambient, then releases. Focus states visually equal hover states — nothing meaningful lives only behind hover.
- [ ] PS-4.3 **Travel layer:** continuous, reversible camera progress; overlays fade during major travel, re-anchor at rests; fast scroll takes the same accelerated path.
- [ ] PS-4.4 **The micro-motion rule as a review tool:** every motion must answer *what is transported / what connects / what environmental force acts*. Schedule one "decorative-motion cull" pass per chapter before G4.

## Footer & document

- [ ] PS-5.1 Conventional footer after the epilogue: plain-text links, social, contact, legal, and an accessible crawlable index of the content.
- [ ] PS-5.2 Real DOM headings/copy/controls form the accessible document; canvas is `aria-hidden` (details in `12`).

## Acceptance
- State desync is untestable-bad: nav, URL, camera, copy, and detail state can never disagree in any manual test sequence (scroll-during-flight, back-during-detail, deep-link-then-scroll, fast reverse).
- All copy strings match the locked table in `13` exactly.
