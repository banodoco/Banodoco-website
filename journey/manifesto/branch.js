import { CONTENT } from '../../content/content.js';
import { manifestoPose, smoother, ascentAt, descentU, returnSecondsFrom, awaySecondsFrom, lineSecondsFor, CAMERA_SECONDS, TITLE_SECONDS } from './pose.js';

// The opening beat the navigation rides when the camera starts on Purpose's
// own rest, and the longer departure when it starts from another section.
const RAIL_OPEN_SECONDS = 2.2;
const DEPART_SECONDS = 3.2;
// the least time a descent may take to swing onto a destination pressed late
const RETARGET_SECONDS = 1.8;
// how long the colony's copies of the epilogue's bodies take to rise in
const SEAT_IN_SECONDS = 3.0;
// the share of the descent after which the page's copy starts arriving, and
// how long it takes (keep CHROME_FADE_MS in step with site.css)
const CHROME_RELEASE = 0.72;
const CHROME_FADE_MS = 1600;

/**
 * Manifesto is a reversible branch of the existing scene. Its single progress
 * value is stepped by journey.js inside the journey animator; this module owns
 * no timer, renderer, or animation loop.
 */
export function createManifestoBranch(sceneApi, { onTravelLock = () => {}, onReturn = null, scroll = null, field = null } = {}) {
  const root = document.createElement('section');
  root.className = 'j-manifesto';
  root.id = 'manifesto';
  root.hidden = true;
  root.setAttribute('aria-label', 'Manifesto');
  root.innerHTML = `
    <div class="j-manifesto-panel" role="region" aria-labelledby="j-manifesto-title" tabindex="-1">
      <h1 id="j-manifesto-title"></h1>
      <p class="j-manifesto-sr-only"></p>
      <div class="j-manifesto-lines" aria-hidden="true"></div>
    </div>`;
  const title = root.querySelector('#j-manifesto-title');
  const srBody = root.querySelector('.j-manifesto-sr-only');
  const lines = root.querySelector('.j-manifesto-lines');
  // The title is inscribed letter by letter and the body word by word (see
  // "WRITTEN IN LIGHT" in journey/site.css): each piece is its own span,
  // carrying its index as --w so the stylesheet staggers the reveal. The
  // heading's accessible name stays the plain title.
  title.setAttribute('aria-label', CONTENT.manifesto.title);
  for (const [i, ch] of [...CONTENT.manifesto.title].entries()) {
    const glyph = document.createElement('span');
    glyph.className = 'j-manifesto-glyph';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.setAttribute('style', `--w:${i}`);
    glyph.textContent = ch;
    title.appendChild(glyph);
  }
  srBody.textContent = CONTENT.manifesto.body;
  // The approved body is five line beats. Keep the visual duplication
  // out of the accessibility tree; screen readers get the exact full copy once.
  // One line per entry of CONTENT.manifesto.lines (a line may hold two
  // sentences); falls back to one line per sentence of the body.
  const sentences = CONTENT.manifesto.lines
    || CONTENT.manifesto.body.match(/[^.!?]+[.!?]+/g) || [CONTENT.manifesto.body];
  const lineEls = [];
  for (const sentence of sentences) {
    const line = document.createElement('p');
    line.className = 'j-manifesto-line';
    const words = sentence.trim().split(/\s+/);
    // "True Union" is the name the whole text is about: both of its words
    // carry .is-name, which inks them in with a lingering highlight
    const isName = (i) => (/^True$/.test(words[i]) && /^Union\b/.test(words[i + 1] || ''))
      || (/^Union\b/.test(words[i]) && words[i - 1] === 'True');
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = isName(i) ? 'j-manifesto-word is-name' : 'j-manifesto-word';
      // both words of the name share the first word's beat, so they light
      // and underline together as one name rather than one word after another
      const beat = isName(i) && i > 0 && isName(i - 1) ? i - 1 : i;
      span.setAttribute('style', `--w:${beat}`);
      // The space rides inside an (inline) span, so wrapping is unchanged —
      // on the word BEFORE it normally, but after the name it opens the next
      // word instead, so the name's highlight hairline ends at "Union".
      const lead = i > 0 && isName(i - 1) && !isName(i) ? ' ' : '';
      const trail = i < words.length - 1 && !(isName(i) && !isName(i + 1)) ? ' ' : '';
      span.textContent = `${lead}${word}${trail}`;
      line.appendChild(span);
    });
    lines.appendChild(line);
    lineEls.push(line);
  }
  /* NO CONTROLS ON THE PAGE (2026-10-03/04 — Hannah: "remove pause in
     general", then "remove the return button and just leave a reveal all
     button", then "let's just remove reveal all too"). The reading is one
     uninterrupted gesture; Escape, the logo and the navigation row all leave
     it. Focus rests on the reading region itself. */
  const panel = root.querySelector('.j-manifesto-panel');
  document.body.appendChild(root);
  const lineSeconds = lineSecondsFor(sentences.map(s => s.trim().split(/\s+/).length));

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const camera = sceneApi.camera;
  const controls = sceneApi.controls;
  let active = false;
  let paused = false;
  let direction = 0;
  let u = 0;
  let elapsed = 0;
  let lastWall = null;   // see update(): the flight keeps wall time
  let returnStart = 0;
  let returnK = 0;          // the descent's own clock, 0 -> 1
  let returnRate = 1;       // per second; slowed by a late retarget
  // A destination pressed mid-descent bends the fall toward it rather than
  // landing first and flying on: `landPrev` is the landing being left and
  // `landRe` the blend already spent on it, so the new aim starts from the
  // pose on screen. `stay` (Purpose's world) blends from `stay0` likewise.
  let landPrev = null;
  let landRe = 0;
  let stay0 = 1, stayTo = 1;
  const fogSlots = [];
  const fogSeen = new Set();
  sceneApi.groups.sway.traverse((object) => {
    for (const material of [].concat(object.material || [])) {
      const uniforms = material.uniforms;
      for (const key of ['fogNear', 'fogFar']) {
        const slot = uniforms && uniforms[key];
        if (slot && !fogSeen.has(slot)) { fogSeen.add(slot); fogSlots.push({ slot, key, base: slot.value }); }
      }
    }
  });
  let from = null;
  let finish = null;
  // A Return may land somewhere other than where the branch was opened —
  // the logo's "home" lands on the hero. `landing` is that pose (shaped like
  // `from`), and landW blends the descent from one destination to the other.
  let landing = null;
  let landW = 0;
  // ...and it may DEPART from somewhere other than its anchor: opened from
  // another section, the flight is still authored from Purpose's rest pose
  // (`from`, where the colony is planned), and the camera eases off the pose
  // it was actually holding (`depart`) over the opening seconds.
  let depart = null;
  let departW = 0;
  let departAtReturn = 0;
  // The colony's copies of the epilogue ring: 1 aloft, fading out through
  // a Return (finished by 70% of the descent) while the real ring returns.
  let seatLight = 1;
  let seatAtReturn = 0.999;
  let previousScrollEnabled = true;
  let previousControlsEnabled = true;
  let shownLines = 0;
  let previousFocus = null;
  let closingTimer = 0;
  let chromeReleased = false;
  /* THE PAGE'S OWN COPY ARRIVES WITH THE CAMERA, NOT AFTER IT (2026-10-04 —
     Hannah: going home from the Manifesto, "the main text appears all of a
     sudden"). It used to be held hidden until touchdown and then faded in
     over 0.9s on an ease-out — half of it in the first 0.3s, on the very
     frame the camera stopped. It is now released over the descent's last
     stretch (CHROME_RELEASE of the fall), into a long ease-in-out
     (site.css j-manifesto-reenter), so it gathers while the camera settles
     — the same arrival an ordinary jump gives it. */
  function releaseChrome() {
    if (chromeReleased) return;
    chromeReleased = true;
    document.body.classList.remove('j-manifesto-open');
    document.body.classList.add('j-manifesto-closing');
    clearTimeout(closingTimer);
    closingTimer = setTimeout(() => document.body.classList.remove('j-manifesto-closing'), CHROME_FADE_MS + 100);
  }

  function capture() {
    return {
      position: camera.position.clone(),
      target: controls.target.clone(),
      up: camera.up.clone(),
      fov: camera.fov,
      far: camera.far,
      fogNear: sceneApi.scene.fog?.near,
      fogFar: sceneApi.scene.fog?.far,
    };
  }
  function blendToward(pose, there, w) {
    for (const k of ['position', 'target']) {
      for (const a of ['x', 'y', 'z']) pose[k][a] += (there[k][a] - pose[k][a]) * w;
    }
    pose.fov += (there.fov - pose.fov) * w;
  }
  function apply(value) {
    const pose = manifestoPose(from, value * CAMERA_SECONDS, camera.aspect);
    // the world's depth at the two ends of the flight, blended like the pose
    let fogNear0 = from.fogNear, fogFar0 = from.fogFar;
    if (landing && landW > 0) {
      let there = manifestoPose(landing, value * CAMERA_SECONDS, camera.aspect);
      let fogN = landing.fogNear, fogF = landing.fogFar;
      const w = retargetW();
      if (landPrev && w < 1) {
        const before = manifestoPose(landPrev, value * CAMERA_SECONDS, camera.aspect);
        blendToward(before, there, w);
        there = before;
        fogN = landPrev.fogNear + (fogN - landPrev.fogNear) * w;
        fogF = landPrev.fogFar + (fogF - landPrev.fogFar) * w;
      }
      blendToward(pose, there, landW);
      fogNear0 += (fogN - fogNear0) * landW;
      fogFar0 += (fogF - fogFar0) * landW;
    }
    if (depart && departW > 0) {
      blendToward(pose, depart, departW);
      fogNear0 += (depart.fogNear - fogNear0) * departW;
      fogFar0 += (depart.fogFar - fogFar0) * departW;
    }
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    controls.target.set(pose.target.x, pose.target.y, pose.target.z);
    camera.up.copy(from.up);
    camera.fov = pose.fov;
    camera.far = Math.max(from.far, pose.position.y * 3);
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    // Keep the outer field legible through the settled frame. The previous
    // range let the perimeter disappear into fog before its scheduled
    // arrivals could read as a continuous surround.
    const far = Math.max(190, pose.position.y * 2.8);
    if (sceneApi.scene.fog) {
      sceneApi.scene.fog.near = fogNear0 + (far * 0.55 - fogNear0) * pose.atmosphere;
      sceneApi.scene.fog.far = fogFar0 + (far - fogFar0) * pose.atmosphere;
    }
    for (const { slot, key, base } of fogSlots) {
      const end = key === 'fogNear' ? far * 0.55 : far;
      slot.value = base + (end - base) * pose.atmosphere;
    }
    // The field reads fog in this same composition slot, after the branch
    // expands it; the director resets the scene range before each frame.
    // landing elsewhere, Purpose's own world retires over the descent and is
    // gone before the camera reaches the destination's ground
    const stay = stay0 + (stayTo - stay0) * smoother(retargetW() / 0.8);
    if (field) field.setManifesto(pose.field, value * CAMERA_SECONDS, null, camera.aspect, seatLight, stay);
  }
  /* NOTHING HERE SCROLLS. Every line is laid out from the start (unshown
     lines are only uninked), so a new line never reflows the ones above it.
     When the newest inked line would fall below the reading box — short or
     narrow screens — the whole column LIFTS by exactly that overflow, on a
     slow ease, and the oldest lines dissolve through the box's top edge
     (`.is-lifted`'s mask). The text rises with the camera instead of asking
     the visitor to scroll a box. Measured only when the count or the
     viewport changes; per frame it is two number compares. */
  let liftKey = '';
  function liftColumn() {
    const key = `${shownLines}|${window.innerWidth}x${window.innerHeight}`;
    if (key === liftKey) return;
    liftKey = key;
    const last = lineEls[shownLines - 1];
    const box = lines.clientHeight;
    const bottom = last ? last.offsetTop + last.offsetHeight : 0;
    const lift = Number.isFinite(bottom - box) ? Math.max(0, Math.ceil(bottom - box)) : 0;
    if (lines.style && lines.style.setProperty) lines.style.setProperty('--lift', `${-lift}px`);
    lines.classList.toggle('is-lifted', lift > 0);
  }
  function paintLines(count) {
    const next = Math.max(0, Math.min(sentences.length, count));
    if (next === shownLines && lineEls.length) { liftColumn(); return; }
    shownLines = next;
    lineEls.forEach((line, i) => line.classList.toggle('shown', i < shownLines));
    liftColumn();
  }
  /** Open the branch. `anchor` (a pose plus its fog) is the rest the flight
   *  is authored from when the camera is not already standing on it;
   *  `departFrom` is the presented pose the camera eases off. */
  function begin({ anchor = null, departFrom = null } = {}) {
    if (active) return;
    active = true;
    paused = reduceMotion.matches;
    direction = reduceMotion.matches ? 0 : 1;
    u = 0;
    elapsed = 0;
    lastWall = null;
    // the colony's copies of the epilogue's bodies rise in over the lift
    // (SEAT_IN_SECONDS); Final keeps its own ring until they are fully up
    seatLight = reduceMotion.matches ? 1 : 0;
    // the pose actually on screen — the caller may have placed the journey
    // (and let the director write its pose) in this same tick
    const here = departFrom ? { ...capture(), ...departFrom } : capture();
    from = anchor ? { ...here, position: anchor.position.clone(), target: anchor.target.clone(),
      fov: anchor.fov, fogNear: anchor.fogNear, fogFar: anchor.fogFar } : here;
    depart = anchor && !reduceMotion.matches ? here : null;
    departW = depart ? 1 : 0;
    landing = null; landW = 0;
    finish = null;
    previousFocus = document.activeElement;
    // The menu closes before this branch opens; its former link may still
    // be active during the closing transition, but cannot receive Return.
    if (previousFocus === document.body || previousFocus?.closest?.('#j-menu')) {
      previousFocus = document.querySelector('.j-rail-menu') || previousFocus;
    }
    previousScrollEnabled = scroll ? !!scroll.enabled : true;
    previousControlsEnabled = controls.enabled;
    if (scroll) scroll.enabled = false;
    controls.enabled = false;
    onTravelLock(true);
    if (field) field.setManifesto(0, 0, from, camera.aspect, seatLight);
    // the title is written on the press itself (TITLE_SECONDS)
    root.classList.toggle('title-shown', reduceMotion.matches || TITLE_SECONDS <= 0);
    shownLines = -1; liftKey = '';
    paintLines(reduceMotion.matches ? sentences.length : 0);
    clearTimeout(closingTimer);
    chromeReleased = false;
    document.body.classList.remove('j-manifesto-closing');
    document.body.classList.add('j-manifesto-open');
    root.hidden = false;
    root.classList.add('is-open');
    panel.focus({ preventScroll: true });
    if (reduceMotion.matches) { u = 1; apply(1); }
  }
  /** The share of the CURRENT aim spent so far: landW renormalised from the
   *  moment the aim was last set, so a retarget starts at 0 on screen. */
  function retargetW() {
    if (landRe <= 0) return landW;
    return landRe >= 1 ? 1 : Math.max(0, Math.min(1, (landW - landRe) / (1 - landRe)));
  }
  const landingOf = (land) => land ? { ...from, position: land.position, target: land.target, fov: land.fov,
    fogNear: land.fogNear ?? from.fogNear, fogFar: land.fogFar ?? from.fogFar } : { ...from };
  /** Bend a descent already under way toward a new landing (`home` = it is
   *  the branch's own anchor, Purpose, whose world stays lit). */
  function retarget(onFinish, { land = null, home = !land } = {}) {
    if (!active || direction >= 0) return false;
    finish = onFinish;
    const w = retargetW();
    if (landPrev && w < 1) {
      // a second change of mind mid-bend: freeze the bend as the new origin
      const mixed = { ...landing };
      for (const k of ['position', 'target']) {
        mixed[k] = landPrev[k].clone().lerp(landing[k], w);
      }
      for (const k of ['fov', 'fogNear', 'fogFar']) mixed[k] = landPrev[k] + (landing[k] - landPrev[k]) * w;
      landPrev = mixed;
    } else {
      landPrev = landing;
    }
    stay0 = stay0 + (stayTo - stay0) * smoother(w / 0.8);
    stayTo = home ? 1 : 0;
    landing = landingOf(land);
    landRe = landW;
    // never swing onto the new aim in a few frames: what is left of the fall
    // takes at least RETARGET_SECONDS
    const remaining = (1 - returnK) / returnRate;
    if (remaining < RETARGET_SECONDS) returnRate = (1 - returnK) / RETARGET_SECONDS;
    // bent toward another section, the rest of the fall keeps that longer pace
    if (!home) returnRate = Math.min(returnRate, 1 / awaySecondsFrom(returnStart));
    return true;
  }
  function returnTo(onFinish = null, { land = null } = {}) {
    if (!active) { if (onFinish) onFinish(); return; }
    if (direction < 0) { retarget(onFinish, { land }); return; }
    finish = onFinish;
    seatAtReturn = Math.min(0.999, seatLight);   // the real ring is back from the Return's first frame
    seatLight = seatAtReturn;
    landing = landingOf(land);
    landPrev = null; landRe = 0;
    stay0 = 1; stayTo = land ? 0 : 1;
    landW = 0;
    departAtReturn = departW;
    // the words exhale first — they dissolve upward into the dark while the
    // camera begins to sink (see .is-returning in journey/site.css)
    root.classList.add('is-returning');
    returnStart = u;
    returnK = 0;
    returnRate = 1 / (land ? awaySecondsFrom(returnStart) : returnSecondsFrom(returnStart));
    direction = -1;
    paused = false;
  }
  function exit() {
    active = false;
    direction = 0;
    u = 0;
    root.hidden = true;
    root.classList.remove('is-open', 'is-returning');
    releaseChrome();
    if (field) field.setManifesto(null);
    for (const { slot, base } of fogSlots) slot.value = base;
    const rest = landing || from;
    if (sceneApi.scene.fog) { sceneApi.scene.fog.near = rest.fogNear; sceneApi.scene.fog.far = rest.fogFar; }
    camera.position.set(rest.position.x, rest.position.y, rest.position.z);
    controls.target.set(rest.target.x, rest.target.y, rest.target.z);
    camera.up.copy(from.up);
    camera.fov = rest.fov;
    landing = null; landW = 0; landPrev = null; landRe = 0; stay0 = 1; stayTo = 1;
    depart = null; departW = 0; departAtReturn = 0;
    camera.far = from.far;
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    /* SYNC THE CONTROLS WITHOUT LETTING THEM MOVE THE CAMERA (2026-10-04 —
       Hannah: into Ownership from the Manifesto "the contents jumps forward
       and moves back"). OrbitControls.update() clamps the camera's distance
       to [minDistance, maxDistance] (3.5..18, organism/renderer.js), and
       Ownership's rest stands 3.2 from its target. This frame is the last
       the branch owns, so nothing recomposed after it: the landing was shown
       pushed back 0.3 units, for one frame, and the director put it back on
       the next. The limits are for a visitor's orbit, not for a handoff. */
    const { minDistance, maxDistance } = controls;
    controls.minDistance = 0;
    controls.maxDistance = Infinity;
    controls.update();
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.enabled = previousControlsEnabled;
    if (scroll) scroll.enabled = previousScrollEnabled;
    onTravelLock(false);
    const callback = finish;
    finish = null;
    if (callback) callback();
    else if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function update(dt) {
    if (!active || !from) return;
    // The normal director still composes before this hook each frame. Reapply
    // the branch pose even while paused so the branch remains the sole camera
    // owner; reduced-motion uses the same path with u=1.
    if (paused) lastWall = null;
    else {
      /* THE FLIGHT KEEPS WALL TIME (2026-10-04 — Hannah: the end of the
         zoom-out "feels shaky or stuttery"). The page's animator hands every
         hook a dt clamped at 50 ms (organism/animation.js). Late in the
         climb the whole colony is drawn and frames run past 50 ms, so each
         slow frame lost time and the camera advanced a near-fixed distance
         per FRAME: long frames crawled, short ones jumped — and the 28 s
         climb ran over 34 s. A clamped frame now takes the real elapsed
         time (capped at 0.25 s against a backgrounded tab); a dt the
         animator did not clamp — including a frozen dt of 0 — is used as is. */
      const now = performance.now() / 1000;
      let step = Math.max(0, Math.min(dt, 0.05));
      if (dt >= 0.0499 && lastWall !== null) step = Math.min(0.25, Math.max(step, now - lastWall));
      lastWall = now;
      if (direction >= 0) {
        elapsed += step;
        departW = depart ? 1 - smoother(elapsed / DEPART_SECONDS) : 0;
        /* THE COPIES ARRIVE, THEY DO NOT SWITCH ON (2026-10-04 — Hannah:
           "all of a sudden like a hundred mushrooms show up"). The colony
           redraws every epilogue body as its own seat, brighter than the
           originals under the rest's fog; switching those on in one frame
           read as a crowd appearing. They now rise over the opening of the
           lift, on top of the originals, and only at full light does Final
           retire its own ring under them. */
        seatLight = smoother(elapsed / SEAT_IN_SECONDS);
        u = Math.min(1, elapsed / CAMERA_SECONDS);
        root.classList.toggle('title-shown', elapsed >= TITLE_SECONDS);
        paintLines(lineSeconds.filter(s => elapsed >= s).length);
        if (u >= 1) direction = 0;
      } else {
        returnK = Math.min(1, returnK + step * returnRate);
        const k = returnK;
        u = reduceMotion.matches ? 0 : descentU(returnStart, k);
        landW = reduceMotion.matches ? 1 : smoother(k);
        // a flight that had not finished leaving its departure pose hands
        // that remainder back over the same descent
        departW = departAtReturn * (1 - landW);
        seatLight = reduceMotion.matches ? 0 : seatAtReturn * (1 - smoother(k / 0.7));
        if (landW >= CHROME_RELEASE) releaseChrome();
        if (u <= 0) { apply(0); exit(); return; }
      }
    }
    apply(u);
  }
  function handleKey(event) {
    if (!active || event.key !== 'Escape') return;
    event.preventDefault();
    requestReturn();
  }
  // The page's own Return goes through the navigation when one is wired, so
  // the row travels back with the camera (journey.js leaveManifesto).
  function requestReturn() {
    if (onReturn) onReturn();
    else returnTo();
  }
  window.addEventListener('keydown', handleKey);

  return {
    begin,
    returnTo,
    retarget,
    update,
    get active() { return active; },
    get returning() { return active && direction < 0; },
    /** The navigation's clock for the way IN: the row and its dot travel to
     *  Manifesto over the flight's opening beat (or its departure, when it
     *  left another section), on this branch's own frame-stepped clock. */
    get openPhase() {
      if (!active) return 0;
      if (reduceMotion.matches) return 1;
      return smoother(elapsed / (depart ? DEPART_SECONDS : RAIL_OPEN_SECONDS));
    },
    /** The dot's last leg, up Purpose's branch to the Manifesto: from the
     *  end of the opening beat (the row has gathered and the dot waits in
     *  Purpose) to the top of the climb, on the camera's own ascent — so it
     *  moves while the camera rises and arrives as the camera does. */
    get arrivePhase() {
      if (!active) return 0;
      if (reduceMotion.matches) return 1;
      const beat = depart ? DEPART_SECONDS : RAIL_OPEN_SECONDS;
      const a0 = ascentAt(beat);
      return Math.max(0, Math.min(1, (ascentAt(elapsed) - a0) / (1 - a0)));
    },
    /** ...and for the way OUT: the descent's own eased progress. */
    get returnPhase() {
      if (!active) return 1;
      if (direction >= 0) return 0;
      return reduceMotion.matches ? 1 : retargetW();
    },
    /** How long the descent (started now, or what is left of it) takes —
     *  chapters pace their retires on it. */
    get returnSeconds() {
      if (reduceMotion.matches) return 0.05;
      return direction < 0 ? (1 - returnK) / returnRate : returnSecondsFrom(u);
    },
    /** how long a descent that lands on another section will take */
    get awaySeconds() {
      if (reduceMotion.matches) return 0.05;
      return direction < 0 ? (1 - returnK) / returnRate : awaySecondsFrom(u);
    },
    get progress() { return u; },
    get shownLines() { return shownLines; },
    destroy() {
      window.removeEventListener('keydown', handleKey);
      root.remove();
      if (active) exit();
    },
  };
}
