# Wave 3C C2 — input ownership, accessibility, and responsive behavior

## Scope and disposition

This is a source-only inspection. No browser, server, or application process was
launched. The evidence below is from the current tree and the existing Wave 1/2
and Wave 3B findings. Reduced-motion **startup** is deliberately not re-adjudicated:
Wave 3B L2a and the Sol fallback record it as a no-finding, and the current source
has an explicit static/reduced-motion path. This report covers the input, semantics,
and viewport consequences around that path.

The strongest results are two input-owner defects already identified in Wave 1 and
one responsive camera defect. Accessibility ownership is otherwise unusually
explicit: the defects are boundary omissions, not evidence that every overlay or
control is unsafe.

## Ranked findings

### 1. High confidence — the open menu scrim does not own wheel/touch input

**Proven source behavior.** The menu claims only the `aside` (`journey/rail.js:1081-1088`)
through `claimInput(menu, { modal: true })`. The full-screen scrim is a separate
`div` (`journey/rail.js:599-601`) and becomes hit-testable when open
(`journey/site.css:519-532`). The journey's capture handlers exempt only an
ancestor returned by `ownerOf(e.target)` (`journey/scroll.js:100-107`): wheel then
calls `preventDefault()`/`push()` for any unowned target (`journey/scroll.js:843-852`),
and touch ownership is likewise decided from the initial target
(`journey/scroll.js:915-927`). There is no scrim claim or modal-wide guard for
wheel/touch. Keyboard travel is protected by `modalLive()` (`journey/scroll.js:959-965`),
so this is specifically a pointer/touch boundary hole.

**Impact.** Wheel or a drag over the visible backdrop can scrub the journey behind
an open dialog; on touch it can also be `preventDefault()`ed by the journey surface.
That contradicts the menu's own contract (“never travel” in `journey/rail.js:1081-1085`)
and makes the visual modal boundary different from the input boundary.

**Existing evidence.** Wave 1 L5 classified this as a high/high-confidence finding
and gave the direct reproduction (“open Menu, wheel/drag over scrim”). Wave 2 S1
and S4 retain it as a high-priority input risk. The source path is sufficient to
establish the missing ownership; an interaction trace is still needed to quantify
the visible progress delta on the current build.

### 2. High confidence — lifting one touch clears a surviving first-finger scrub

**Proven source behavior.** A second `touchstart` and all multi-touch moves return
without modifying `touchY`, as intended for pinch (`journey/scroll.js:915-934`).
However, every `touchend` unconditionally calls `endTouchContact()`
(`journey/scroll.js:939`), with no check of `e.touches.length` or changed-touch
identity. Therefore, if finger B joins finger A and B lifts first, finger A's
tracked contact is cleared; its subsequent one-finger moves cannot continue the
scrub (`journey/scroll.js:910-938`).

**Impact.** A normal drag that briefly becomes multi-touch can stop responding or
lose its gesture state. This is a real ownership/lifecycle inconsistency, separate
from reduced-motion and separate from the organism's controls policy.

**Existing evidence.** Wave 1 L5 records the same sequence as a high/high-confidence
finding; Wave 2 S1/S4 keep it in the high input-risk set. This report does not claim
a newly observed browser trace.

### 3. Medium-high confidence — same-mode tablet/compact resizes can leave the
camera composition stale

**Proven source behavior.** `getMode()` distinguishes portrait tablet/mobile from
landscape compact using viewport dimensions (`main.js:201-208`). `viewFor()` uses
height-derived landscape correction and converts the Mission shift through
`innerHeight` (`main.js:213-253`). The debounced resize handler reapplies
`setView(viewFor(mode), 0.6)` only for `desktop`, `deskNarrow`, and `mobile`
(`main.js:721-737`); same-mode `tablet` and `compact` skip that camera update.
The organism does resize its renderer/camera/render targets on every resize
(`organism/organism.js:1836-1858`), so the drawing buffer can reflect the new
viewport while the camera remains on the old height-dependent composition.

**Impact.** Browser chrome changes, split view, or rotation that stays inside the
tablet/compact mode can produce a correctly sized canvas with stale framing. A
mode transition may mask the issue, which is why a same-mode test is required.

**Existing evidence.** Wave 1 L5 and Wave 2 S3 independently identify this as a
medium/high-confidence responsive candidate. The control flow proves the skipped
camera update; the visible displacement and whether a particular browser emits a
same-mode resize need measurement.

### 4. Medium confidence hypothesis — square viewports use different JS and CSS
orientation policies

**Proven mismatch, user-visible defect unproven.** JavaScript defines portrait as
strictly `h > w` (`main.js:201-208`), so a square viewport is treated as landscape.
The stylesheet's portrait media rules include square dimensions because CSS
`orientation: portrait` is true when height is equal to width (for example the
portrait rail/card rules in `hero.css:867-931`, plus the mobile rail boundary in
`journey/site.css:3594-3601`). Thus a square viewport can receive the CSS mobile/
portrait treatment while `main.js` chooses a non-portrait camera/mode.

**Impact.** Possible camera/rail/copy mismatch at exact squares. This is not a
source proof that every square composition is visibly broken: the final rail CSS
also uses the independent `(max-width: 900px)` boundary, and the actual layout
must be inspected.

**Existing evidence.** Wave 1 L5 and Wave 2 S3 list 620x620/800x800 checks as the
missing evidence. Rank remains below the three source-proven boundary defects.

### 5. Medium-low confidence hypothesis — intentional breakpoint families can
disagree during responsive transitions

There are several documented, individually coherent boundaries: scene mode uses
`620`/`900` and strict portrait (`main.js:201-208`), the card sheet uses coarse
pointer or `720px` (`journey/ui.js:53-59`), and the rail uses coarse pointer or
`900px` (`journey/rail.js:410-420`). The sheet and touch-target CSS repeat the
720px condition (`journey/site.css:1889-1892,2020-2023`), while the final mobile
rail cascade repeats 900px (`journey/site.css:3594-3601`). This is not by itself a
bug: the rail and sheet are different components with different intended widths.
It is a coupling risk at 721–900px, where the camera can be in tablet mode, the
rail can be mobile, and a committed card can still be a side card on a fine
pointer. Dynamic sheet changes are handled (`journey/ui.js:3109-3132`), so this is
a bounded compatibility hypothesis, not a finding.

### 6. Medium-low confidence hypothesis — resize bursts amplify expensive render
and camera work

The organism immediately resizes renderer, composer targets, TAA/bloom, and
material resolution (`organism/organism.js:1836-1858`); main debounces its camera/
rail work for 150ms (`main.js:721-737`), but the organism listener is independent.
On mobile URL-bar, orientation, or split-view changes, multiple resize events may
therefore cause repeated GPU-resource work before the main debounce fires. This is
a measurable performance risk, not proof of a user-visible failure. Wave 2 S3
already requests event/allocation measurement.

## What is currently healthy / no finding

* Journey keyboard handling gives focused native controls and scrollable ancestors
  precedence (`journey/scroll.js:157-168`), suppresses travel keys while a modal
  owner is live (`journey/scroll.js:959-971`), and ignores modified/composing keys
  (`journey/scroll.js:946-958`). The scrim exception above is why this does not
  generalize to “keyboard ownership is broken.”
* The menu has a real named button and dialog semantics
  (`journey/rail.js:560-575,603-609`), opens by claiming modal input and inerting
  the rail (`journey/rail.js:1066-1093`), and closes by releasing ownership and
  returning focus (`journey/rail.js:1096-1118`). Its focus trap/Escape handling is
  local (`journey/rail.js:1121-1221`).
* Committed cards use `role=dialog`, `aria-modal`, focus trapping, inert state,
  and modal input ownership (`journey/ui.js:1401-1412,1509-1524,1962-1965,1999-2015`).
  Their sheet body is a bounded native scroll container with overscroll containment
  and safe-area padding (`journey/site.css:1896-1955`). The sheet gesture uses a
  44px grip and pointer capture (`journey/site.css:1923-1931`; `journey/ui.js:1526-1542`).
* Hotspots are real buttons with `aria-haspopup`/`aria-expanded` for committed
  cards, while transient hover reveals do not claim modal input or trap focus
  (`journey/ui.js:825-932,1414-1475`). This is the right semantic split for
  pointer/keyboard users.
* The canvas is not an accidental OrbitControls competitor: journey mode disables
  rotate/zoom/pan at the organism policy boundary and retains `pan-y pinch-zoom`
  (`organism/organism.js:1996-2027`).
* The entry document provides a first-focus skip link, a labeled decorative stage,
  real links, and an inert/aria-hidden preboot rail (`index.html:63-80,89-114,
  134-151`). Ownership tabs implement tablist/tab/tabpanel keyboard semantics and
  roving focus (`ownership/ownership.js:9-38`; `ownership/index.html:164-181`).
* Reduced-motion behavior is a no-finding for this C2: journey transitions and
  animations are disabled while state remains available (`journey/site.css:3023-3045`),
  and the ownership mycelium draws once with no rAF in reduced mode
  (`ownership/mycelium.js:15-20,100-105,148-160,194-203`). This does not reopen
  Wave 3B's rejected startup hypothesis.

## Smallest exclusive-browser probes

Each probe should run in a fresh page/context and must not combine scenarios; log
viewport width/height, DPR, current journey progress, active element, and the
relevant `aria`/inert state before and after the action.

1. **Scrim ownership (distinguishes finding 1).** Open the menu with its named
   button. Record `window.journey.p` (or the existing journey readback) and
   `defaultPrevented` for one wheel over `.j-menu-scrim`; repeat with the same
   delta inside `#j-menu`. A progress delta/prevented wheel on the scrim but not
   inside the dialog confirms the missing scrim owner. No resize or other input.

2. **Surviving-finger lifecycle (distinguishes finding 2).** On a touch-capable
   context, dispatch/drive: A `touchstart`, one single-finger `touchmove`, B
   `touchstart`, B-only `touchend` while A remains, then another A-only
   `touchmove`. Compare progress and the final `touchmove`'s journey effect with
   the control sequence A start → A moves only. A stops after B lifts only in the
   defective path. This must record touch lists/changedTouches so a synthetic
   multi-touch event is not mistaken for a second independent gesture.

3. **Same-mode camera resize (distinguishes finding 3).** Start at 768x1024
   (portrait tablet), settle at Mission, then resize only to 768x900 (still
   tablet), wait at least the 150ms main debounce plus one frame, and capture the
   camera/target readback and canvas drawing-buffer size. A changed drawing buffer
   with unchanged height-dependent camera composition confirms the skipped
   tablet camera update. Repeat 768x1024 → 768x900 with a forced mode transition
   as a control; do not combine with a journey jump.

4. **Square policy (distinguishes finding 4).** At 620x620 and 800x800 separately,
   capture body mode classes, `matchMedia('(orientation: portrait)').matches`,
   rail geometry, card/sheet class, and camera readback after settle. A portrait
   CSS result paired with the JS landscape mode is the proven policy mismatch;
   only a geometry/camera displacement beyond the authored tolerance upgrades it
   to a product defect.

5. **Breakpoint matrix (distinguishes finding 5).** Use one page per viewport at
   620, 621, 720, 721, 900, and 901px, with both coarse and fine pointer emulation
   where available. Open one committed card and one menu, then resize across one
   boundary at a time. Record `body` mode, `.sheet`, rail layout, `aria-expanded`,
   inert, focus, and journey progress. This isolates an actual cross-boundary
   interaction from the mere fact that the constants differ.

6. **Resize amplification (distinguishes finding 6).** In a fresh page, emit a
   controlled burst of N resizes without changing content, and instrument only
   existing resize/render readbacks (event count, canvas buffer dimensions,
   frame timing, and any exposed render-target dimensions). Compare one resize
   against the same N-event burst. A linear resource/frame cost is evidence of
   the independent organism listener doing work before main's debounce; it is not
   a correctness failure unless the trace also shows missed frames or stale output.

7. **Accessibility control path (regression control, not a finding).** Tab to a
   hotspot, activate with Enter/Space, verify dialog focus/`aria-expanded`/inert,
   cycle Tab and Shift+Tab, press Arrow/Page keys, close with Escape, and confirm
   focus return and unchanged journey progress. Repeat with a sheet and its body
   scroll. This validates the healthy ownership claims while keeping scrim and
   multi-touch probes exclusive.

## [XHARD] assessment

**[XHARD] NO.** C2 is bounded source analysis with two source-proven input-owner
defects, one source-proven responsive skip, and narrow browser probes that separate
visible defects from policy mismatches and performance hypotheses. It does not need
exceptional Oracle judgment or a broad rewrite. No implementation recommendation
is made here; the next evidence is the exclusive probes above.
