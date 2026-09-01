/* ==================================================================== *
 * journey/boot/handoff.js — THE JOURNEY PREPARATION AND HANDOFF OWNER.
 *
 * JOURNEY PREPARATION — the canvas stays on the organism's own empty
 * frame. The left copy and CTA are already live; chapter construction,
 * portrait atlases, shader compilation and real first GPU draws finish
 * before the mushroom's visible clock starts. There is no fixed loading
 * duration.
 *
 * WHY THIS IS THE ONE REGION OF main.js THAT HAD TO MOVE. Everything
 * else in that file is wiring: a listener, a table, a query param, a
 * class. This is a MACHINE — thirteen mutable bindings, five ordered
 * transitions, an async preparation that can fail at four points, a
 * gesture buffer replayed into a scroll surface that does not exist yet,
 * and the preboot -> live rail handoff that decides first paint. It sat
 * unnamed inside `if (sceneApi) { ... }`, 286 code lines deep, and the
 * page entry is not where a reader should have to meet it.
 *
 * THE MACHINE (G3).
 *
 *   States, in the order a normal load walks them:
 *     PREPARING     the module graph, baked geometry and chapters are
 *                   being built; the hero has not started drawing.
 *     INTRO-LIVE    `introReleased` — the specimen's 5.4s draw is
 *                   running. Reached by releaseIntro().
 *     FAST-DEPART   `fastHandoffStarted` — a gesture or a queued entry
 *                   asked to leave early; the intro is accelerating.
 *     ACTIVE        `journeyActive` — the journey owns input. Terminal.
 *     FALLBACK      preparation threw; the hero scene is live, the orbit
 *                   camera is handed back and the visitor is pointed at
 *                   the static tier. Terminal.
 *
 *   The three booleans above are the state encoding, and each is a
 *   one-way latch with exactly one write site — which is why none of
 *   them needs a guard beyond its own `if (x) return;`.
 *
 *   Events: a buffered wheel / touch / key gesture during the intro
 *   (collectBootInput), a queued chapter entry from the page's controls
 *   or the preboot rail (entryQueue), the specimen reporting its intro
 *   complete, the preparation promise settling, and two timers —
 *   `activationTimer` (the defensive 7.6s fallback) and
 *   `railRevealTimer` (the rail's early entrance).
 *
 * WHAT IS PROTECTED HERE, and must not be redesigned by a later tidy:
 * index.html authors a preboot rail SHELL and this module removes it at
 * boot, continuing the hero's already-running fade across the DOM swap
 * by handing the live rail the shell's exact painted opacity. Breaking
 * that changes first paint. It is inside loadJourney(), moved verbatim.
 *
 * THE ONE BOUNDED REGISTRATION IN THE PAGE lives here: the intro input
 * capture attaches six capture-phase listeners and stopIntroInputCapture()
 * takes all six back off on every exit path. J05's register in main.js
 * classifies that file's registrations as PAGE / GATED / BOUNDED; the
 * single BOUNDED one came with the machine that bounds it, because a
 * lifecycle split from its owner is how a leak gets written. Every PAGE
 * registration stayed in main.js. tools/test-page-lifetime.mjs section B
 * scans both files and requires the union to be the same site set.
 *
 * A HAZARD THE CODE ROUTES AROUND, kept where a reader will meet it:
 * organism/intro.js permanently skews performance.now() by ~8.3s while
 * fast-forwarding and never restores it. It stays monotonic, so
 * DIFFERENCES are sound, but mixing sources is not — which is why
 * observeBootInput() times the finger off `e.timeStamp` and says so.
 *
 * `readyState` holds the journey's public handle, written once per boot
 * and never cleared, because this page boots exactly one journey and
 * keeps it until the tab closes. It was recorded here as a recreation
 * hazard while the tree still carried a disposer; it is not one now.
 * See docs/code-health/DISPOSAL-REMOVED.md.
 * ==================================================================== */

import { FREE_CAM } from '../../flags.js';
import { NOTE } from './scene-note.js';
// The preload atmosphere's singleton (ESM cache: same instance the page
// booted). Consulted for ONE thing — the prelude's ignition contract:
// the normal release below waits for the prelude's convergence pulse to
// reach the mushroom origin along the woken ground skeleton, so the
// growth reads as caused by the landings that woke it.
import { heroSpores } from '../../organism/hero-spores.js';

/**
 * @param scene           the organism's scene handle (never null — the
 *                        caller only builds this when the scene started)
 * @param entryQueue      journey/boot/entry-queue.js, shared with the
 *                        page's own hero controls
 * @param note            journey/boot/scene-note.js
 * @param journeyModule   the in-flight dynamic import of journey.js,
 *                        started at main.js's module scope so the fetch
 *                        has the whole intro as runway. Passed in rather
 *                        than started here: a module-scope import in
 *                        THIS file would begin during import resolution,
 *                        which is earlier, and the runway comment in
 *                        main.js would stop being true.
 *
 *                        (The specifier is deliberately NOT quoted in
 *                        this comment. tools/test-page-lifetime.mjs's D1
 *                        scans raw text for specifier literals with no
 *                        comment filter, so a prose mention of a relative
 *                        specifier mints a module that is not on disk —
 *                        measured here, and the first such phantom in the
 *                        tree. Its own cardinality caught it.)
 * @param bakedGeomReady  the baked-geometry fetch, same reasoning
 * @param skipIntro       ?nointro / ?capture / prefers-reduced-motion
 * @param frozen          ?introat — the choreography is pinned at a
 *                        progress and nothing should animate off it
 * @param introSeconds    the hero entry choreography length
 */
export function createJourneyHandoff({ scene, entryQueue, note, journeyModule,
  bakedGeomReady, skipIntro, frozen, introSeconds }) {
  // Input policy: the journey owns scroll and pointer gestures, so user
  // orbit/zoom/pan are disabled at the source (organism/organism.js
  // setInputPolicy — the DOM event shield this replaces is gone). Taps still
  // reach the organism's own tap handler; DOM links/nav are untouched.
  // ?free=1 keeps the hero's fully interactive camera (and the grab cursor,
  // via body.free-cam in journey/site.css).
  if (FREE_CAM) document.body.classList.add('free-cam');
  else scene.setInputPolicy('journey');

  // The organism reports its own real completion after the 5.4s draw and
  // 0.7s shell restore. This old page-level duration remains only as a
  // defensive fallback for a suspended/missing animation frame.
  const HERO_INTRO_MS = 7600;
  const HERO_SCENE_COMPLETE_MS = introSeconds * 1000 + 700;
  // Let the navigation form over the mushroom's quiet final settle instead of
  // waiting until the journey becomes interactive. Input remains gated until
  // activateJourney(); this changes only the visual entrance.
  const RAIL_REVEAL_LEAD_MS = 1200;

  let journeyInputRequested = false;
  let journeyLoadP = null;
  let readyState = null;
  let earlyRail = null;
  let journeyActive = false;
  let introReleased = false;
  let fastHandoffStarted = false;
  let activationTimer = null;
  let railRevealTimer = null;
  let bootInput = null;
  let pendingTouch = null;
  let introCaptureLive = false;
  let onIntroInput = null;
  const INTRO_INPUT_EVENTS = ['wheel', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'keydown'];

  function stopIntroInputCapture() {
    if (!introCaptureLive) return;
    introCaptureLive = false;
    for (const type of INTRO_INPUT_EVENTS) removeEventListener(type, onIntroInput, true);
  }

  function touchById(list, id) {
    if (!list) return null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  }

  /* THE GESTURE BUFFER, in three named parts rather than one. Buffer input
     independently from module loading: the journey's listeners do not exist
     while an early gesture is asking the intro to finish, so boot consumes
     this one observed physical input only after scroll.attach().

     `observeBootInput` answers ONE question — what does this event say about
     the finger, the wheel or the key — and returns the buffer it would open,
     or null. `collectBootInput` answers the OTHER — is this the first one, so
     should the fast handoff begin. `takeBootInput` drains.

     That split is not decoration; it is what gives each of the two bindings
     below exactly two write sites instead of five and three. The arithmetic
     inside is unchanged, line for line: every `return false` became `return
     null`, and every `bootInput = X; return true;` became `return X;`. */
  function observeBootInput(e) {
    // Event timestamps stay on the browser's physical input clock. The intro
    // deliberately skews performance.now() while fast-forwarding, so using it
    // after the first move would falsely add several seconds to the finger's
    // duration and erase the real swipe rate.
    const now = Number.isFinite(e.timeStamp) ? e.timeStamp : performance.now();
    if (e.type === 'touchstart') {
      if (!bootInput && e.touches && e.touches.length === 1) {
        const touch = e.touches[0];
        pendingTouch = { identifier: touch.identifier,
          startY: touch.clientY, latestY: touch.clientY,
          startedAt: now, latestAt: now, active: true };
      }
      return null;
    }
    if (e.type === 'touchmove') {
      if (!pendingTouch || !e.touches || e.touches.length !== 1) return null;
      const touch = touchById(e.touches, pendingTouch.identifier);
      if (!touch) return null;
      pendingTouch.latestY = touch.clientY;
      pendingTouch.latestAt = now;
      if (!bootInput) return { kind: 'touch', contact: pendingTouch };
      return null;
    }
    if (e.type === 'touchend' || e.type === 'touchcancel') {
      if (pendingTouch) {
        const touch = touchById(e.changedTouches, pendingTouch.identifier);
        if (touch) pendingTouch.latestY = touch.clientY;
        pendingTouch.latestAt = now;
        pendingTouch.active = false;
      }
      return null;
    }
    if (e.type === 'wheel') {
      if (bootInput && bootInput.kind === 'wheel') {
        bootInput.samples.push({ deltaY: e.deltaY, deltaMode: e.deltaMode });
        return null;
      }
      if (!bootInput) {
        return { kind: 'wheel', samples: [{ deltaY: e.deltaY, deltaMode: e.deltaMode }] };
      }
      return null;
    }
    if (e.type === 'keydown' && !bootInput) return { kind: 'key', key: e.key };
    return null;
  }

  /** True when this event OPENED the buffer — which is the signal to begin
   *  the fast handoff, and the reason this returns a boolean at all. */
  function collectBootInput(e) {
    const opened = observeBootInput(e);
    if (!opened) return false;
    bootInput = opened;
    return true;
  }

  /** THE DRAIN. Both callers cleared both bindings by hand before; one of
   *  them wanted the value and one only wanted the clear, which is why the
   *  same two lines appeared twice. The contact goes with the buffer: a
   *  half-drained gesture — no buffer but a live finger still tracked — is a
   *  state nothing here wants and nothing here checks for. */
  function takeBootInput() {
    const input = bootInput;
    bootInput = null;
    pendingTouch = null;
    return input;
  }

  function replayBootInput(state) {
    const input = takeBootInput();
    if (!input || !state) return;
    // Scroll is an instruction request now, not journey travel. The early
    // gesture may still accelerate the intro so the controls arrive promptly,
    // but none of its buffered distance is replayed into progress.
    if (state.cueNavigation) state.cueNavigation(input.kind);
  }

  function releaseIntro() {
    if (introReleased) return;
    introReleased = true;
    document.body.classList.remove('scene-preparing');
    document.body.classList.add('scene-intro-live');
    // THE STRIKE: the prelude's convergence pulse arrives on this same
    // frame — the origin pool swells and the pre-network hands its light
    // to the real web's own converging draw-on. The normal path timed
    // this call to the pulse's arrival; the fast and fallback paths fire
    // it with the pulse mostly arrived.
    heroSpores.preludeStrike();
    scene.intro.start();
    performance.mark('hero-intro-start');
  }

  function activateJourney() {
    if (journeyActive || !readyState) return;
    journeyActive = true;
    clearTimeout(activationTimer);
    clearTimeout(railRevealTimer);
    const entry = entryQueue.take();
    readyState.activate({ entry });
    stopIntroInputCapture();
    performance.mark('journey-interactive');
    if (entry && entry !== 'mission') {
      // a direct navigation supersedes any gesture buffered during the intro
      takeBootInput();
    } else {
      replayBootInput(readyState);
    }
  }

  /** The specimen, rather than a second page timer, owns the normal handoff.
   *  This removes the old ~1.5s pause that belonged to hero callouts which
   *  are no longer part of this navigation iteration. */
  function activateWhenIntroComplete() {
    if (journeyActive || !readyState) return;
    if (scene.intro.complete) {
      activateJourney();
      return;
    }
    requestAnimationFrame(activateWhenIntroComplete);
  }

  function beginFastHandoff() {
    journeyInputRequested = true;
    if (!readyState || fastHandoffStarted) return;
    fastHandoffStarted = true;
    clearTimeout(activationTimer);
    const departMs = window.innerWidth <= 620 ? 220 : 480;
    document.body.classList.add('intro-fast');
    releaseIntro();
    const accelerated = scene.intro.accelerate({
      totalMs: HERO_INTRO_MS + 900,
      rampMs: departMs,
    });
    // Do not install a second visual departure while the live journey is
    // still preparing. The queued destination is state, not paint: once
    // activateJourney() drains it, the normal camera/copy/rail ticket owns
    // the whole departure from the frame that is actually on screen.
    setTimeout(activateJourney, accelerated ? departMs : 80);
  }
  entryQueue.whenRequested(beginFastHandoff);

  function loadJourney() {
    if (journeyLoadP) return journeyLoadP;
    journeyLoadP = (async () => {
      try {
        performance.mark('journey-prepare-start');
        // Give the DOM copy one paint, then construct one chapter per task.
        // The scene is blank, but the button remains responsive between slices.
        const nextTask = () => new Promise(resolve =>
          requestAnimationFrame(() => setTimeout(resolve, 0)));
        await nextTask();
        // Build the lightweight navigation as soon as its module graph is
        // ready, before chapter geometry/GPU preparation. Its own fade now
        // shares the hero copy's opening beat instead of arriving after the
        // mushroom has already finished drawing.
        const m = await journeyModule;
        earlyRail = m.prepareRail ? m.prepareRail((chapter) => {
          entryQueue.request(chapter);
        }) : null;
        if (earlyRail && earlyRail.reveal) {
          const shell = document.querySelector('.j-rail-preboot');
          const shellOpacity = shell ? parseFloat(getComputedStyle(shell).opacity) : 0;
          earlyRail.reveal();
          if (shell) {
            // Continue the hero's already-running fade across the DOM swap.
            // The live rail takes the shell's exact painted opacity, then
            // completes only the unspent portion of the shared 0.9s beat.
            const from = Number.isFinite(shellOpacity) ? shellOpacity : 0;
            earlyRail.root.style.transition = 'none';
            earlyRail.root.style.opacity = String(from);
            void earlyRail.root.offsetWidth;
            shell.remove();
            const finishWithHero = () => {
              const heroLine = document.querySelector('h1 .hl');
              const heroOpacity = heroLine
                ? parseFloat(getComputedStyle(heroLine).opacity)
                : 1;
              earlyRail.root.style.opacity = String(Number.isFinite(heroOpacity) ? heroOpacity : 1);
              if (heroOpacity < 0.999) {
                requestAnimationFrame(finishWithHero);
              } else {
                earlyRail.root.style.opacity = '1';
                requestAnimationFrame(() => { earlyRail.root.style.transition = ''; });
              }
            };
            requestAnimationFrame(finishWithHero);
          }
        }
        await bakedGeomReady;
        let remaining = m.prepareChapter ? m.prepareChapter(scene) : 0;
        while (remaining > 0) {
          await nextTask();
          remaining = m.prepareChapter ? m.prepareChapter(scene) : 0;
        }
        await nextTask();
        const state = m.boot({ heroIntroSkipped: !!skipIntro,
          heroFrozen: frozen, deferActivation: true,
          rail: earlyRail,
          onEntry: (chapter) => {
            entryQueue.request(chapter);
          } });
        if (!state) throw new Error('Journey boot returned no state');
        await state.ready;
        readyState = state;

        if (skipIntro || frozen) {
          document.body.classList.remove('scene-preparing');
          document.body.classList.add('scene-static');
          // no intro, so no strike to wait for — the prelude leaves quietly
          heroSpores.preludeDismiss();
          scene.intro.finish();
          activateJourney();
        } else if (journeyInputRequested || entryQueue.peek()) {
          beginFastHandoff();
        } else {
          /* THE IGNITION WAIT. The prelude's hero spores have been
             landing on the growth point and waking the ground skeleton
             the whole load; asking for the strike here arms the
             convergence pulse to arrive at the mushroom origin exactly
             when the release fires, which is what makes the growth read
             as CAUSED by the landings instead of coincident with a
             download. Bounded by construction — a landed ground answers
             within the pulse's own travel (<= ~1.2 s), and even a load
             so fast that nothing has landed yet compresses the remaining
             peel to a ~2.3 s worst case — and the whole release beat
             (rail reveal, activation poll, defensive timer) shifts by
             the same wait, so their offsets from the intro's start are
             exactly what they were. A gesture during the wait takes
             beginFastHandoff() as ever; the guard below then yields. */
          const strikeMs = heroSpores.preludeMsUntilStrike();
          const releaseOnStrike = () => {
            if (fastHandoffStarted || journeyActive) return;
            releaseIntro();
            railRevealTimer = setTimeout(() => {
              if (readyState && readyState.revealRail) readyState.revealRail();
            }, Math.max(0, HERO_SCENE_COMPLETE_MS - RAIL_REVEAL_LEAD_MS));
            requestAnimationFrame(activateWhenIntroComplete);
            activationTimer = setTimeout(activateJourney, HERO_INTRO_MS);
          };
          if (strikeMs > 0) setTimeout(releaseOnStrike, strikeMs);
          else releaseOnStrike();
        }
        return state;
      } catch (err) {
        stopIntroInputCapture();
        document.body.classList.remove('scene-preparing');
        document.body.classList.add('scene-intro-live');
        heroSpores.preludeStrike();
        scene.intro.start();
        performance.mark('journey-fallback');
        console.error('[journey-v6] failed to load', err);
        // the hero scene is still live but was left holding the journey's
        // input policy (set above) — hand the orbit camera back and point the
        // visitor at the static tier.
        scene.setInputPolicy('free');
        note.show(NOTE.journeyFailed);
        return null;
      }
    })();
    return journeyLoadP;
  }

  onIntroInput = (e) => {
    if (e.type === 'keydown') {
      if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Spacebar',
        'Home', 'End'].includes(e.key)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    }
    if (e.type === 'touchmove' && (!e.touches || e.touches.length !== 1)) return;
    if ((e.type === 'wheel' || e.type === 'touchmove' || e.type === 'keydown')
        && e.cancelable) e.preventDefault();
    if (collectBootInput(e)) beginFastHandoff();
  };
  introCaptureLive = true;
  for (const type of INTRO_INPUT_EVENTS) {
    const passive = type !== 'wheel' && type !== 'touchmove' && type !== 'keydown';
    addEventListener(type, onIntroInput, { capture: true, passive });
  }

  // Preparation begins now, not after the old 7.6s timer. Its first heavy
  // slice is still held until the left-hand DOM has painted once.
  loadJourney();
}
