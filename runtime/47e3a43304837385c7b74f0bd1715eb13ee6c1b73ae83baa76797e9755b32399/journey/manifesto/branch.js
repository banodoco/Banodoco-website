import { createManifestoFit } from './fit.js';
import { manifestoLinks } from '../../content/manifesto-links.js';
import { attachManifestoLinkTooltip } from '../../manifesto-link-tooltip.js';
import { createHeroBodyFogClaim } from '../chapters/hero-body-fog.js';
import { claimInput, releaseInput } from '../ownership.js';
import { createReturnFlight, sampleReturnFlight, returnVelocity } from './return-flight.js';
import { applyCameraRoll } from '../camera-roll.js';
import { attachManifestoNote } from '../../manifesto-note.js';
import { CONTENT } from '../../content/content.js';
import { manifestoConcepts } from '../../content/manifesto-concepts.js';
import { manifestoPose, mobileFieldCenter, isMobileManifesto, smoother, ascentAt, descentU, returnSecondsFrom, awaySecondsFrom, lineSecondsFor, mobileReadingSchedule, CAMERA_SECONDS, TITLE_SECONDS, WORD_STAGGER_SECONDS, WORD_REVEAL_SECONDS, WORD_VISIBLE_SECONDS } from './pose.js';

// The opening beat the navigation rides when the camera starts on Purpose's
// own rest, and the longer departure when it starts from another section.
// 2.2 -> 3.0 (2026-10-06 — Hannah: the row "closes in ... too quick"),
// level with the ~3 s flight down to Ownership.
const RAIL_OPEN_SECONDS = 3.0;
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
export function createManifestoBranch(sceneApi, { onTravelLock = () => {}, onReturn = null, onNavigate = null, scroll = null, field = null } = {}) {
  const root = document.createElement('section');
  root.className = 'j-manifesto';
  root.style.setProperty('--stagger', `${WORD_STAGGER_SECONDS}s`);
  root.style.setProperty('--word-reveal-duration', `${WORD_REVEAL_SECONDS}s`);
  root.id = 'manifesto';
  root.hidden = true;
  root.setAttribute('aria-label', CONTENT.manifesto.title);
  root.innerHTML = `
    <div class="j-manifesto-panel" role="region" aria-labelledby="j-manifesto-title" tabindex="-1">
      <h1 id="j-manifesto-title"></h1>
      <div class="j-manifesto-lines"></div>
    </div>`;
  const title = root.querySelector('#j-manifesto-title');
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
  // The approved body is five paragraph beats, with its animated words
  // in the accessibility tree so the inline note is keyboard accessible.
  // One line per entry of CONTENT.manifesto.lines (a line may hold two
  // sentences); falls back to one line per sentence of the body.
  const sentences = CONTENT.manifesto.lines
    || CONTENT.manifesto.body.match(/[^.!?]+[.!?]+/g) || [CONTENT.manifesto.body];
  const lineEls = [];
  const lastWordBeats = [];
  const chapterLinks = [];
  let note = null;
  for (const sentence of sentences) {
    const line = document.createElement('p');
    line.className = 'j-manifesto-line';
    // Keep the inline citation before the first paragraph's closing punctuation.
    const closingPunctuation = lineEls.length === 0 && CONTENT.manifesto.note ? sentence.match(/[.!?]+$/)?.[0] || '' : '';
    const words = (closingPunctuation ? sentence.slice(0, -closingPunctuation.length) : sentence).trim().split(/\s+/);
    const concepts = manifestoConcepts(words);
    const destinations = lineEls.length === sentences.length - 1 ? manifestoLinks(words) : new Map();
    // Highlight the brand name within the manifesto.
    const isName = (i) => /^Mycelial\b/.test(words[i] || '');
    let phraseThread = null, chapterLink = null;
    let lastWordBeat = 0;
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = isName(i) ? 'j-manifesto-word is-name' : 'j-manifesto-word';
      // Multiword names share their first word’s warm reveal beat.
      const beat = isName(i) && i > 0 && isName(i - 1) ? i - 1 : i;
      span.setAttribute('style', `--w:${beat}`);
      lastWordBeat = Math.max(lastWordBeat, beat);
      // The space rides inside an (inline) span, so wrapping is unchanged —
      // on the word BEFORE it normally, but after the name it opens the next
      // word instead, keeping the name grouped through its reveal.
      const lead = i > 0 && isName(i - 1) && !isName(i) ? ' ' : '';
      const concept = concepts.get(i);
      const destination = destinations.get(i);
      const endsThread = concept?.id === 'kinship' && i === concept.end;
      const trail = i < words.length - 1 && !(isName(i) && !isName(i + 1)) ? ' ' : '';
      if (concept) {
        // The outer span keeps the existing ink/opacity clock. Only the inner
        // ink changes colour, so a paired pulse cannot reveal future words.
        const ink = document.createElement('span');
        ink.className = `manifesto-concept concept-${concept.id} concept-${concept.role} concept-position-${concept.offset || 0}`;
        ink.style.setProperty('--concept-index', concept.offset || 0);
        if (concept.id === 'imagination' || concept.id === 'vitality' || concept.id === 'synthesis') {
          [...concept.ink].forEach((character, characterIndex) => {
            const glyph = document.createElement('span');
            glyph.className = concept.id === 'synthesis' ? 'manifesto-synthesis-glyph'
              : concept.id === 'imagination' ? 'manifesto-spectrum-glyph' : 'manifesto-vitality-glyph';
            if (concept.id === 'synthesis') glyph.style.setProperty('--synthesis-position', `${100 * (concept.characterOffset + characterIndex) / (concept.characterTotal - 1)}%`);
            glyph.style.setProperty('--spectrum-index', concept.characterOffset + characterIndex);
            glyph.style.setProperty('--glyph-delay', `${characterIndex * 24}ms`);
            glyph.style.setProperty('--jitter-phase', `${((concept.characterOffset + characterIndex) * 47) % 173}ms`);
            glyph.textContent = character;
            ink.appendChild(glyph);
          });
        } else {
          ink.textContent = concept.ink || word;
        }
        span.append(lead, ink, endsThread ? '' : concept.suffix || '', endsThread ? '' : trail);
      } else if (destination) {
        if (i === destination.start) {
          const link = document.createElement('a');
          link.className = 'manifesto-chapter-link is-phrase' + (destination.end > destination.start ? ' is-connected' : '');
          link.href = `#/${destination.chapter}`;
          link.setAttribute('aria-disabled', 'true');
          link.tabIndex = -1;
          const hint = attachManifestoLinkTooltip(link, destination.label);
          link.addEventListener('click', event => {
            if (!onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            if (link.getAttribute('aria-disabled') !== 'true') onNavigate(destination.chapter);
          });
          chapterLinks.push({ link, hint, paragraph: lineEls.length, beat: destination.end });
          chapterLink = link;
          line.appendChild(link);
        }
        const ink = document.createElement('span');
        ink.className = 'manifesto-link-ink';
        const text = word.match(/^[A-Za-z]+/)?.[0] || word;
        ink.textContent = (i > destination.start ? ' ' : '') + text;
        span.append(lead, ink);
      } else {
        span.textContent = `${lead}${word}${trail}`;
      }
      // A single inline decoration flows across words and line breaks. It is
      // outside word opacity, so the thread is never chopped into word pulses.
      if (concept?.id === 'kinship' && i === concept.start) {
        phraseThread = document.createElement('span');
        phraseThread.className = 'manifesto-phrase-thread';
        phraseThread.style.setProperty('--phrase-beat', concept.start);
        line.appendChild(phraseThread);
      }
      (phraseThread || chapterLink || line).appendChild(span);
      if (destination && i === destination.end) {
        chapterLink = null;
        // Punctuation follows the same word clock, outside the decorated link.
        const suffix = word.replace(/^[A-Za-z]+/, '');
        if (suffix) {
          const punctuation = document.createElement('span');
          punctuation.className = 'j-manifesto-word';
          punctuation.style.setProperty('--w', beat);
          punctuation.textContent = suffix;
          line.appendChild(punctuation);
        }
        // The inter-word space belongs to the link; the following space does not.
        if (trail) line.append(trail);
      }
      if (endsThread) {
        phraseThread = null;
        if (concept.suffix) {
          const punctuation = document.createElement('span');
          punctuation.className = 'j-manifesto-word';
          punctuation.style.setProperty('--w', beat);
          punctuation.textContent = concept.suffix;
          line.appendChild(punctuation);
        }
        // Keep punctuation and the following separator outside the decorated phrase.
        if (trail) line.append(trail);
      }
    });
    if (lineEls.length === 0 && CONTENT.manifesto.note) {
      const marker = document.createElement('span');
      marker.className = 'j-manifesto-word manifesto-note-marker';
      marker.style.setProperty('--w', words.length);
      lastWordBeat = words.length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'manifesto-note-trigger';
      button.textContent = '1';
      button.setAttribute('aria-label', 'Read note 1 about fungi');
      marker.append(button, closingPunctuation);
      line.appendChild(marker);
      note = attachManifestoNote(button, CONTENT.manifesto.note);
    }
    lines.appendChild(line);
    lineEls.push(line);
    lastWordBeats.push(lastWordBeat);
  }
  /* NO CONTROLS ON THE PAGE (2026-10-03/04 — Hannah: "remove pause in
     general", then "remove the return button and just leave a reveal all
     button", then "let's just remove reveal all too"). The reading is one
     uninterrupted gesture; Escape, the logo and the navigation row all leave
     it. Focus rests on the reading region itself. */
  const panel = root.querySelector('.j-manifesto-panel');
  document.body.appendChild(root);
  const fitDesktop = createManifestoFit(root, panel, lines, lineEls);
  const fitLoadedFont = () => { if (active && !root.hidden) fitDesktop(true); };
  document.fonts?.addEventListener('loadingdone', fitLoadedFont);
  let fontPendingTimer = null;
  // Warm both manuscript weights before the first ink, within a bounded wait,
  // to avoid rewrapping visible desktop paragraphs on ordinary font arrivals.
  if (document.fonts?.load) {
    root.classList.add('is-font-pending');
    const releaseFontPending = () => {
      clearTimeout(fontPendingTimer);
      fontPendingTimer = null;
      if (!root.isConnected) return;
      fitLoadedFont();
      root.classList.remove('is-font-pending');
    };
    // A stalled download must still admit readable fallback ink. loadingdone
    // keeps the fit current if the requested font eventually becomes usable.
    fontPendingTimer = setTimeout(releaseFontPending, 2500);
    const fontSources = [lineEls[0], lines.querySelector('.is-name')].filter(Boolean);
    const fonts = new Set(fontSources.map(element => {
      const style = getComputedStyle(element);
      return `${style.fontStyle} ${style.fontWeight} 17px ${style.fontFamily}`;
    }));
    Promise.allSettled([...fonts].map(font => document.fonts.load(font, lines.textContent)))
      .then(releaseFontPending);
  }
  const wordCounts = sentences.map(s => s.trim().split(/\s+/).length);
  const lineSeconds = lineSecondsFor(wordCounts);
  const mobileSchedule = mobileReadingSchedule(lineSeconds, lastWordBeats);
  let readingStarts = lineSeconds, readingAdmissions = lineSeconds;
  let cameraSeconds = CAMERA_SECONDS;
  let scrollReading = false;

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
  let returnFlight = null, flightStartK = 0;
  let presentedPose = null, presentedVelocity = null;
  let returnRate = 1;       // per second; slowed by a late retarget
  // A destination pressed mid-descent bends the fall toward it rather than
  // landing first and flying on: `landPrev` is the landing being left and
  // `landRe` the blend already spent on it, so the new aim starts from the
  // pose on screen. `stay` (Purpose's world) blends from `stay0` likewise.
  let landPrev = null;
  let landRe = 0;
  let stay0 = 1, stayTo = 1;
  const bodyFog = createHeroBodyFogClaim(sceneApi);
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
  let shownLines = 0, admittedLines = 0;
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
      roll: camera.userData?.journeyRoll || 0,
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
    pose.roll = (pose.roll || 0) + ((there.roll || 0) - (pose.roll || 0)) * w;
  }
  function apply(value, frameSeconds = 0) {
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
    if (returnFlight && direction < 0) {
      const flight = sampleReturnFlight(returnFlight,
        (returnK - flightStartK) / Math.max(1e-9, 1 - flightStartK));
      for (const key of ['position', 'target', 'fov', 'roll', 'up', 'viewAngles']) pose[key] = flight[key];
    }
    if (presentedPose && frameSeconds > 0) presentedVelocity = returnVelocity(presentedPose, pose, frameSeconds);
    presentedPose = pose;
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    controls.target.set(pose.target.x, pose.target.y, pose.target.z);
    camera.fov = pose.fov;
    camera.far = Math.max(from.far, pose.position.y * 3);
    camera.updateProjectionMatrix();
    if (pose.up) {
      // This flight owns its complete orientation, including through a
      // vertical direction. World-up lookAt would flip its yaw at the pole.
      camera.up.set(pose.up.x, pose.up.y, pose.up.z);
      camera.userData ||= {};
      camera.userData.journeyRoll = pose.roll;
      camera.lookAt(controls.target);
    } else applyCameraRoll(camera, controls.target, pose.roll);
    // Keep the outer field legible through the settled frame. The previous
    // range let the perimeter disappear into fog before its scheduled
    // arrivals could read as a continuous surround.
    const far = Math.max(190, pose.position.y * 2.8);
    if (sceneApi.scene.fog) {
      sceneApi.scene.fog.near = fogNear0 + (far * 0.55 - fogNear0) * pose.atmosphere;
      sceneApi.scene.fog.far = fogFar0 + (far - fogFar0) * pose.atmosphere;
    }
    const mobileBodyFog = isMobileManifesto(camera.aspect);
    bodyFog.set(mobileBodyFog ? pose.atmosphere : 0, far * 0.55, far);
    for (const { slot, key, base } of fogSlots) {
      if (mobileBodyFog && bodyFog.owns(slot)) continue;
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
     the visitor to scroll a box. Measured when the count, viewport, or text layout changes; per frame
     it is two number compares. */
  let liftKey = '';
  function liftColumn() {
    if (window.innerWidth > 720) {
      lines.style.setProperty('--lift', '0px');
      lines.classList.remove('is-lifted');
      return;
    }
    if (scrollReading) {
      lines.style.setProperty('--lift', '0px');
      lines.classList.remove('is-lifted');
      return;
    }
    const key = `${shownLines}|${window.innerWidth}x${window.innerHeight}`;
    if (key === liftKey) return;
    liftKey = key;
    const last = lineEls[shownLines - 1];
    // Keep fractional layout geometry: offsetTop/clientHeight round separately,
    // and a phantom 1px overflow used to enable a 3.2rem fade over fitting text.
    // All paragraphs share the same animated translate, so subtracting their
    // rects cancels it, including while the previous lift is still easing.
    const box = lines.getBoundingClientRect().height;
    const padding = parseFloat(getComputedStyle(lines).paddingTop) || 0;
    const bottom = last
      ? last.getBoundingClientRect().bottom - lineEls[0].getBoundingClientRect().top + padding
      : 0;
    const overflow = bottom - box;
    const lift = Number.isFinite(overflow) && overflow > 1 ? Math.ceil(overflow) : 0;
    if (lines.style && lines.style.setProperty) lines.style.setProperty('--lift', `${-lift}px`);
    lines.classList.toggle('is-lifted', lift > 0);
  }
  let followEnabled = false;
  let followFrom = 0, followTo = 0, followStart = 0, followEnd = 0;
  const FOLLOW_SECONDS = 2.8;
  const FOLLOW_IDLE_SECONDS = 3;
  let followResumeAt = Infinity;
  let readingHeld = false, readingTouchHeld = false;
  let readingInsetConsumed = 0, readingTopPadding = 0;
  let readingInsetRetired = false;
  function measureReadingPadding() {
    if (!scrollReading || reduceMotion.matches || !(lines.clientHeight > 0)) return;
    if (admittedLines <= 0) {
      lines.style.setProperty('--reading-pad-top', '0px');
      lines.style.setProperty('--reading-pad-bottom', '0px');
      return;
    }
    const first = lineEls[0].getBoundingClientRect().height;
    // Centre the opening paragraph. Later copy enters at the bottom,
    // retaining the preceding text above without padding for future copy.
    const last = lineEls[admittedLines - 1].getBoundingClientRect().height;
    readingTopPadding = readingInsetRetired ? 0
      : Math.max(0, Math.max(24, (lines.clientHeight - first) / 2) - readingInsetConsumed);
    lines.style.setProperty('--reading-pad-top', `${readingTopPadding}px`);
    lines.style.setProperty('--reading-pad-bottom', `${admittedLines === 1 ? Math.max(24, (lines.clientHeight - last) / 2) : 12}px`);
  }
  // The opening inset centres the first paragraph, but is not permanent
  // scrollable content. Consume it as the reader moves past it, subtracting
  // the same amount from scroll and follow coordinates to hold visible ink
  // still. Returning to the top later then reaches the actual first line.
  function consumeReadingInset() {
    if (!scrollReading || !followEnabled || readingHeld || admittedLines < 2 || readingTopPadding <= 0) return;
    const consumed = Math.min(readingTopPadding, Math.max(0, lines.scrollTop));
    if (!(consumed > 0)) return;
    const top = lines.scrollTop;
    readingInsetConsumed += consumed;
    readingTopPadding -= consumed;
    if (readingTopPadding <= 0) readingInsetRetired = true;
    followFrom -= consumed;
    followTo -= consumed;
    lines.style.setProperty('--reading-pad-top', `${readingTopPadding}px`);
    lines.scrollTop = top - consumed;
  }
  function followParagraph(mode = 'reveal') {
    if (!followEnabled || admittedLines <= 0) return;
    const box = lines.getBoundingClientRect();
    const paragraph = lineEls[admittedLines - 1].getBoundingClientRect();
    followFrom = lines.scrollTop;
    const target = admittedLines === 1
      ? followFrom + paragraph.top - box.top + paragraph.height / 2 - lines.clientHeight / 2
      : followFrom + paragraph.bottom - box.top - lines.clientHeight + 24;
    followTo = Math.max(0, Math.min(lines.scrollHeight - lines.clientHeight, target));
    if (mode === 'reveal') {
      const index = admittedLines - 1;
      // Admit layout once the previous paragraph is visibly readable.
      // Scroll leads the original incoming ink beat by up to two seconds.
      followStart = elapsed;
      followEnd = Math.max(readingAdmissions[index] + FOLLOW_SECONDS, followStart + 0.6);
    } else if (mode === 'catchup') {
      // A reader returning from manual scrolling gets a fresh gentle move,
      // even when the scheduled reveal deadline is long past.
      followStart = elapsed;
      followEnd = elapsed + FOLLOW_SECONDS;
    } else {
      // Remeasure without postponing the existing deadline. Rebase on the
      // visible position so font/layout changes cannot introduce a jump.
      followStart = Math.max(followStart, elapsed);
    }
  }
  function updateReadingFollow() {
    if (!followEnabled && !readingHeld && elapsed >= followResumeAt) {
      followEnabled = true;
      followResumeAt = Infinity;
      // Retire the inset only after native touch/momentum has yielded.
      consumeReadingInset();
      followParagraph('catchup');
    }
    if (!followEnabled || admittedLines <= 0 || !(lines.clientHeight > 0)) return;
    lines.scrollTop = followFrom + (followTo - followFrom) * smoother(followEnd > followStart ? (elapsed - followStart) / (followEnd - followStart) : 1);
    consumeReadingInset();
    updateReadingEdges();
  }
  // Yield during a gesture and its momentum, then gently rejoin the current
  // reveal after three quiet seconds. Never take over while a finger is held.
  function stopReadingFollow(event) {
    if (event.type === 'keydown' && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
    if (!scrollReading || reduceMotion.matches) return;
    followEnabled = false;
    if (event.type === 'touchstart') readingTouchHeld = true;
    if (event.type === 'touchstart' || event.type === 'pointerdown') readingHeld = true;
    followResumeAt = elapsed + FOLLOW_IDLE_SECONDS;
  }
  function releaseReadingHold(event) {
    if (event.touches?.length) return;
    // Native panning cancels the PointerEvent while the touch is still held.
    if (event.type.startsWith('pointer') && readingTouchHeld) return;
    readingTouchHeld = false;
    readingHeld = false;
    if (!followEnabled && Number.isFinite(followResumeAt)) followResumeAt = elapsed + FOLLOW_IDLE_SECONDS;
  }
  const readingEnds = ['touchend', 'touchcancel', 'pointerup', 'pointercancel'];
  readingEnds.forEach(type => window.addEventListener(type, releaseReadingHold, { passive: true }));
  const readingInputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  readingInputs.forEach(type => panel.addEventListener(type, stopReadingFollow, { passive: true }));
  function updateReadingEdges() {
    root.classList.toggle('has-reading-above', scrollReading && lines.scrollTop > 2);
    root.classList.toggle('has-reading-below', scrollReading && lines.scrollTop + lines.clientHeight < lines.scrollHeight - 2);
  }
  function onReadingScroll() {
    consumeReadingInset();
    if (!followEnabled && Number.isFinite(followResumeAt)) followResumeAt = elapsed + FOLLOW_IDLE_SECONDS;
    updateReadingEdges();
  }
  lines.addEventListener('scroll', onReadingScroll, { passive: true });
  // Font loading and flex reflow can change the reading box without changing
  // either the viewport or the number of revealed paragraphs.
  const refreshLayout = () => {
    liftKey = '';
    if (active && !root.hidden && scrollReading !== (window.innerWidth <= 720)) {
      scrollReading = window.innerWidth <= 720;
      root.classList.toggle('is-scroll-reading', scrollReading);
      followEnabled = scrollReading && !reduceMotion.matches;
      if (scrollReading) claimInput(panel, { modal: true }); else releaseInput(panel);
      lineEls.forEach((line, i) => { line.hidden = scrollReading && i >= admittedLines; });
      lines.scrollTop = 0;
    }
    if (active && !root.hidden) { fitDesktop(); liftColumn(); measureReadingPadding(); followParagraph('resize'); updateReadingEdges(); }
  };
  const layoutObserver = new ResizeObserver(refreshLayout);
  window.addEventListener('resize', refreshLayout);
  // The content box shrinks/grows whenever we consume centering padding.
  // That is not a viewport resize: observing it rebases the easing every
  // frame and makes automatic scrolling hesitate against its own motion.
  layoutObserver.observe(lines, { box: 'border-box' });
  lineEls.forEach(line => layoutObserver.observe(line));
  function paintChapterLinks(on = true) {
    for (const entry of chapterLinks) {
      const { link, hint, paragraph, beat } = entry;
      const available = on && active && direction >= 0 && (reduceMotion.matches ||
        elapsed >= readingStarts[paragraph] + beat * WORD_STAGGER_SECONDS + WORD_VISIBLE_SECONDS);
      if (entry.available === available) continue;
      entry.available = available;
      link.setAttribute('aria-disabled', String(!available));
      link.tabIndex = available ? 0 : -1;
      if (!available) hint.close();
    }
  }
  function paintLines(count, admitted = count) {
    paintChapterLinks();
    const next = Math.max(0, Math.min(sentences.length, count));
    const nextAdmitted = Math.max(next, Math.min(sentences.length, admitted));
    if (next === shownLines && nextAdmitted === admittedLines && lineEls.length) { liftColumn(); return; }
    const previous = shownLines;
    const layoutChanged = nextAdmitted !== admittedLines;
    shownLines = next;
    admittedLines = nextAdmitted;
    lineEls.forEach((line, i) => {
      if (i >= previous && i < shownLines) {
        // A frame may cross the scheduled beat by a few milliseconds. Catch
        // CSS up to that same clock so its final fade ends with the camera.
        line.style.setProperty('--reveal-lateness', `${Math.max(0, elapsed - readingStarts[i])}s`);
      }
      line.hidden = scrollReading && i >= admittedLines;
      line.classList.toggle('shown', i < shownLines);
    });
    liftColumn();
    measureReadingPadding();
    if (layoutChanged) followParagraph();
    updateReadingEdges();
  }
  /** Open the branch. `anchor` (a pose plus its fog) is the rest the flight
   *  is authored from when the camera is not already standing on it;
   *  `departFrom` is the presented pose the camera eases off. */
  function begin({ anchor = null, departFrom = null } = {}) {
    if (active) return;
    active = true;
    scrollReading = window.innerWidth <= 720;
    root.classList.toggle('is-scroll-reading', scrollReading);
    const timedMobile = scrollReading && !reduceMotion.matches;
    readingStarts = timedMobile ? mobileSchedule.reveal : lineSeconds;
    readingAdmissions = timedMobile ? mobileSchedule.admit : lineSeconds;
    cameraSeconds = timedMobile ? mobileSchedule.seconds : CAMERA_SECONDS;
    followEnabled = window.innerWidth <= 720 && !reduceMotion.matches;
    followFrom = followTo = followStart = followEnd = 0;
    followResumeAt = Infinity;
    readingHeld = readingTouchHeld = false;
    readingInsetConsumed = readingTopPadding = 0;
    readingInsetRetired = false;
    if (scrollReading) claimInput(panel, { modal: true });
    lines.scrollTop = 0;
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
      fov: anchor.fov, roll: anchor.roll || 0, fogNear: anchor.fogNear, fogFar: anchor.fogFar } : here;
    from.fieldCenter = mobileFieldCenter(field?.seats, from.target);
    depart = anchor && !reduceMotion.matches ? here : null;
    departW = depart ? 1 : 0;
    landing = null; landW = 0;
    returnFlight = null; flightStartK = 0;
    presentedPose = here; presentedVelocity = null;
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
    fitDesktop(true);
    liftKey = '';
    liftColumn();
    measureReadingPadding();
    followParagraph();
    updateReadingEdges();
    panel.focus({ preventScroll: true });
    if (reduceMotion.matches) { u = 1; apply(1); }
  }
  /** The share of the CURRENT aim spent so far: landW renormalised from the
   *  moment the aim was last set, so a retarget starts at 0 on screen. */
  function retargetW() {
    if (landRe <= 0) return landW;
    return landRe >= 1 ? 1 : Math.max(0, Math.min(1, (landW - landRe) / (1 - landRe)));
  }
  const landingOf = (land) => land ? { ...from, position: land.position, target: land.target, fov: land.fov, roll: land.roll || 0,
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
    const extendedRemaining = (1 - returnK) / returnRate;
    if (extendedRemaining > remaining) {
      // Changing transition-duration does not retime an in-flight transition.
      // Retime only the reading shade, preserving its exact painted frame.
      // The words keep their ordinary departure pace even if the flight grows.
      for (const animation of root.getAnimations?.() || []) {
        if (!['opacity', 'filter', 'transform'].includes(animation.transitionProperty)) continue;
        animation.updatePlaybackRate(animation.playbackRate * remaining / extendedRemaining);
      }
    }
    // Retarget the displayed orientation on every viewport. Blending two
    // look-at targets can cancel their horizontal directions at the pole.
    flightStartK = returnK;
    returnFlight = createReturnFlight(presentedPose || capture(), landing,
      extendedRemaining, presentedVelocity);
    return true;
  }
  function returnTo(onFinish = null, { land = null } = {}) {
    note?.close();
    paintChapterLinks(false);
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
    returnFlight = land
      ? createReturnFlight(presentedPose || capture(), landing, 1 / returnRate, presentedVelocity) : null;
    flightStartK = 0;
    // The reading shade follows the whole fall; the words have their own
    // shorter departure in site.css, matching ordinary section copy.
    root.style.setProperty('--manifesto-return-s', `${(1 / returnRate).toFixed(2)}s`);
    direction = -1;
    paused = false;
  }
  function exit() {
    releaseInput(panel);
    note?.close();
    paintChapterLinks(false);
    active = false;
    direction = 0;
    u = 0;
    root.hidden = true;
    root.classList.remove('is-open', 'is-returning');
    releaseChrome();
    if (field) field.setManifesto(null);
    for (const { slot, base } of fogSlots) {
      if (!isMobileManifesto(camera.aspect) || !bodyFog.owns(slot)) slot.value = base;
    }
    bodyFog.clear();
    const rest = landing || from;
    if (sceneApi.scene.fog) { sceneApi.scene.fog.near = rest.fogNear; sceneApi.scene.fog.far = rest.fogFar; }
    camera.position.set(rest.position.x, rest.position.y, rest.position.z);
    controls.target.set(rest.target.x, rest.target.y, rest.target.z);
    camera.fov = rest.fov;
    landing = null; landW = 0; landPrev = null; landRe = 0; stay0 = 1; stayTo = 1;
    returnFlight = null; presentedPose = null; presentedVelocity = null;
    depart = null; departW = 0; departAtReturn = 0;
    camera.far = from.far;
    camera.updateProjectionMatrix();
    applyCameraRoll(camera, controls.target, rest.roll);
    /* SYNC THE CONTROLS WITHOUT LETTING THEM MOVE THE CAMERA (2026-10-04 —
       Hannah: into Ownership from the Manifesto "the contents jumps forward
       and moves back"). OrbitControls.update() clamps the camera's distance
       to [minDistance, maxDistance] (3.5..18, organism/renderer.js), and
       Ownership's rest stands 3.2 from its target. This frame is the last
       the branch owns, so nothing recomposed after it: the landing was shown
       pushed back 0.3 units, for one frame, and the director put it back on
       the next. Equip's upward-looking pose also exceeds maxPolarAngle: restoring only
       distance still moved its camera 2.2 units on the handoff frame. All
       orbit limits are for a visitor's gesture, not an authored landing. */
    const limits = {};
    for (const key of ['minDistance', 'maxDistance', 'minPolarAngle', 'maxPolarAngle', 'minAzimuthAngle', 'maxAzimuthAngle']) {
      limits[key] = controls[key];
    }
    controls.minDistance = 0;
    controls.maxDistance = Infinity;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.update();
    Object.assign(controls, limits);
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
    let frameSeconds = 0;
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
      frameSeconds = step;
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
        u = Math.min(1, elapsed / cameraSeconds);
        root.classList.toggle('title-shown', elapsed >= TITLE_SECONDS);
        paintLines(readingStarts.filter(s => elapsed >= s).length,
          readingAdmissions.filter(s => elapsed >= s).length);
        updateReadingFollow();
        if (u >= 1) direction = 0;
      } else {
        returnK = Math.min(1, returnK + step * returnRate);
        const k = returnK;
        u = reduceMotion.matches ? 0 : descentU(returnStart, k, camera.aspect, from.position.y);
        landW = reduceMotion.matches ? 1 : smoother(k);
        // a flight that had not finished leaving its departure pose hands
        // that remainder back over the same descent
        departW = departAtReturn * (1 - landW);
        seatLight = reduceMotion.matches ? 0 : seatAtReturn * (1 - smoother(k / 0.7));
        if (landW >= CHROME_RELEASE) releaseChrome();
        if (u <= 0) { apply(0); exit(); return; }
      }
    }
    apply(u, frameSeconds);
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
      const a0 = ascentAt(beat * CAMERA_SECONDS / cameraSeconds, camera.aspect);
      return Math.max(0, Math.min(1, (ascentAt(u * CAMERA_SECONDS, camera.aspect) - a0) / (1 - a0)));
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
      clearTimeout(fontPendingTimer);
      layoutObserver.disconnect();
      window.removeEventListener('resize', refreshLayout);
      document.fonts?.removeEventListener('loadingdone', fitLoadedFont);
      note?.destroy();
      chapterLinks.forEach(({ hint }) => hint.destroy());
      releaseInput(panel);
      lines.removeEventListener('scroll', onReadingScroll);
      readingEnds.forEach(type => window.removeEventListener(type, releaseReadingHold));
      readingInputs.forEach(type => panel.removeEventListener(type, stopReadingFollow));
      window.removeEventListener('keydown', handleKey);
      root.remove();
      if (active) exit();
    },
  };
}
