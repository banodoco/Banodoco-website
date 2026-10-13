import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const noteSource = readFileSync(new URL('../journey/boot/scene-note.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
function element(tagName) {
  return { tagName, style: {}, children: [], attributes: {}, textContent: '',
    setAttribute(name, value) { this.attributes[name] = value; },
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); },
    set innerHTML(value) { this.html = value; this.children = []; },
    get innerHTML() { return this.html; } };
}
const body = element('body');
const document = { body, createElement: element };
let reloads = 0;
const window = { location: { reload() { reloads++; } } };
const makeNote = new Function('document', 'window', 'console', 'DEBUG_OVERLAY',
  '' + noteSource.slice(noteSource.indexOf('export function createSceneNote')).replace('export function', 'function') + '\nreturn createSceneNote;');
const note = makeNote(document, window, { error() {} })();
const owner = Symbol('context loss');
const surface = note.show('context lost', owner);
assert.equal(note.hide(owner), true);
note.show('context lost', owner);
const message = 'driver <img onerror=oops>';
note.showFailure('journey failed <a href="./static/">Static journey</a>', 'loading journey modules', new Error(message));
assert.equal(note.hide(owner), false, 'old context owner cannot clear a newer failure');
assert.equal(surface.style.display, '');
assert.equal(body.children.length, 1, 'all stories share one note');
const details = surface.children[0];
assert.equal(details.tagName, 'details');
assert.equal(details.attributes.open, undefined, 'diagnostics start collapsed');
assert.equal(details.children[0].textContent, 'Technical details');
assert.ok(details.children[1].textContent.includes('Stage: loading journey modules'));
assert.ok(details.children[1].textContent.includes(message), 'error is assigned as text');
assert.equal(surface.children[1].textContent, 'Reload to try again');
surface.children[1].onclick();
assert.equal(reloads, 1, 'explicit reload recovers the rejected module cache');
assert.equal(window.__pageErrors, 1);

// Drive the actual page context handlers, including their grace timer.
const handlers = new Map(), timers = new Map();
let nextTimer = 0;
const rendering = [], history = [];
const sceneApi = { renderer: { domElement: { addEventListener(type, callback) { handlers.set(type, callback); } } },
  setRenderEnabled(value) { rendering.push(value); }, invalidateFrameHistory() { history.push('clear'); } };
const contextNote = makeNote(document, window, { error() {} })();
const contextSurface = contextNote.show('ordinary note');
const contextStart = mainSource.indexOf('  const canvas = sceneApi.renderer.domElement;');
const contextEnd = mainSource.indexOf('\n}', contextStart);
assert.ok(contextStart > 0 && contextEnd > contextStart);
new Function('sceneApi', 'note', 'NOTE', 'setTimeout', 'clearTimeout', mainSource.slice(contextStart, contextEnd))(
  sceneApi, contextNote, { contextLost: 'context lost' },
  (callback) => { const id = ++nextTimer; timers.set(id, callback); return id; }, id => timers.delete(id));
const lose = () => handlers.get('webglcontextlost')({ preventDefault() {} });
const restore = () => handlers.get('webglcontextrestored')();
const fire = () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } };
lose(); restore(); fire();
assert.equal(contextSurface.html, 'ordinary note', 'restore within grace leaves the earlier note alone');
lose(); fire();
assert.equal(contextSurface.html, 'context lost');
restore();
assert.equal(contextSurface.style.display, 'none', 'restoration clears the notice it owns');
lose(); lose(); restore(); fire();
assert.equal(contextSurface.style.display, 'none', 'duplicate losses leave no orphaned note timer');
assert.equal(timers.size, 0);

// Both orderings retain terminal errors: transient -> failure -> restore and
// failure -> delayed transient -> restore. Diagnostics must survive both.
lose(); fire();
contextNote.showFailure('new journey failure', 'activating navigation and intro handoff', new Error('activation'));
restore();
assert.equal(contextSurface.html, 'new journey failure');
assert.equal(contextSurface.style.display, '');
lose(); fire();
assert.equal(contextSurface.html, 'new journey failure', 'delayed context notice cannot replace terminal failure');
restore();
assert.equal(contextSurface.html, 'new journey failure');
assert.equal(contextSurface.style.display, '', 'restore after suppressed notice cannot hide terminal failure');
assert.equal(contextSurface.children[0].children[1].textContent.includes('activation'), true);
assert.equal(contextSurface.children[1].textContent, 'Reload to try again');
assert.equal(history.length, 5);
assert.equal(rendering.at(-1), true, 'restoration still resumes graphics');

// Debug messages remain recorded without replacing terminal recovery controls.
const debugNote = makeNote(document, window, { error() {} }, true)();
const debugSurface = debugNote.showFailure('terminal diagnostics', 'preparing journey GPU', new Error('real failure'));
debugNote.recordError('later unrelated error');
assert.equal(debugSurface.html, 'terminal diagnostics');
assert.equal(debugSurface.children[1].textContent, 'Reload to try again');

// Execute the production activate/failStartup methods with a refusing
// navigation effect. No public readiness or input enabling may precede it.
const journey = readFileSync(new URL('../journey/journey.js', import.meta.url), 'utf8');
const activateStart = journey.indexOf('    activate({ entry: activationEntry = null } = {}) {');
const activateEnd = journey.indexOf('    /** A blocked scroll gesture', activateStart);
assert.ok(activateStart > 0 && activateEnd > activateStart);
const makeState = new Function('scroll', 'window', 'warmHiddenChapters', 'navigateFromControl', 'sceneApi', 'reveal',
  'let activated = false, startupFailed = false, queuedEntry = null;\nconst state = { revealRail: reveal,\n' + journey.slice(activateStart, activateEnd) + '}; return state;');
let warmed = 0, retired = 0;
const scroll = { enabled: false }, compatibility = {};
const state = makeState(scroll, compatibility, () => { warmed++; }, () => { throw new Error('destination failed'); },
  { addAnimator(name) { assert.equal(name, 'journey'); retired++; } }, () => {});
assert.throws(() => state.activate({ entry: 'connect' }), /destination failed/);
assert.equal(scroll.enabled, false);
assert.equal(compatibility.journey, undefined, 'failed activation never publishes a public journey');
state.failStartup(); state.activate({ entry: 'connect' });
assert.equal(warmed, 1, 'failed state cannot be reactivated');
assert.equal(retired, 1);
let destinations = 0;
const normal = makeState(scroll, compatibility, () => { warmed++; }, () => { destinations++; }, { addAnimator() {} }, () => {});
normal.activate({ entry: 'connect' }); normal.activate({ entry: 'equip' });
assert.equal(scroll.enabled, true);
assert.equal(compatibility.journey, normal);
assert.equal(destinations, 1, 'successful activation remains idempotent');
normal.failStartup();
assert.equal(scroll.enabled, false);
assert.equal(compatibility.journey, undefined, 'a later startup fault retires even a partially published handle');
console.log('startup recovery: note ownership, original diagnostics, reload, context-loss grace and transactional journey publication passed');
