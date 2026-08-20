import assert from 'node:assert/strict';
import {
  startChapterEntry, snapChapterLandings, snapChapterPlacements,
} from '../journey/chapter-entry.js';

const events = [];
const chapter = {
  entryDuration: 3.2,
  beginEntry() { events.push('begin'); },
  driveEntry() {},
  snapLanding() { events.push('landing'); },
  snap() { events.push('placement'); },
};
const chapters = { example: chapter };

const ticket = startChapterEntry('example', chapter);
assert.deepEqual(ticket, { id: 'example', f: 0, t: 0, dur: 3.2 });
assert.deepEqual(events, ['begin'], 'a fresh nav entry is explicitly re-armed');

snapChapterLandings(chapters);
assert.deepEqual(events, ['begin', 'landing'],
  'camera landing must not invoke the full placement snap');

snapChapterPlacements(chapters);
assert.deepEqual(events, ['begin', 'landing', 'placement'],
  'deep links/captures retain the full settled placement contract');

const passive = { beginEntry() { events.push('passive-begin'); } };
assert.equal(startChapterEntry('passive', passive), null,
  'chapters can re-arm retained UI state without owning a local drive clock');
assert.equal(events.at(-1), 'passive-begin');

console.log('chapter entry lifecycle: PASS');
