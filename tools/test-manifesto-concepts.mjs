import assert from 'node:assert/strict';
import { CONTENT } from '../content/content.js';
import { manifestoConcepts } from '../content/manifesto-concepts.js';
const words = CONTENT.manifesto.lines[2].split(/\s+/), matches = manifestoConcepts(words);
for (const [noun, id] of [['painter', 'sun'], ['model', 'soil'], ['engineer', 'passage']]) {
  const entries = [...matches].filter(([, match]) => match.id === id);
  assert.equal(entries.length, 1, `${id} accents only its partner noun`);
  assert.equal(entries[0][1].ink, noun);
  assert.equal(entries[0][1].role, 'organism', 'reuse the existing slow concept pulse');
}
const phrase = [...matches].filter(([, match]) => match.id === 'synthesis');
assert.deepEqual(phrase.map(([, match]) => match.ink), ['garden', 'you', 'can', 'walk', 'through']);
assert.equal(phrase[1][1].characterOffset, phrase[0][1].ink.length + 1, 'palette continues through the separating space');
assert.equal(phrase.at(-1)[1].characterOffset + phrase.at(-1)[1].ink.length, phrase[0][1].characterTotal,
  'palette reaches its final partner color at the last glyph');
assert.equal(matches.get(words.indexOf('open')), undefined, 'only model, not open model, receives the fungi accent');
assert.ok(![...manifestoConcepts(CONTENT.manifesto.lines[1].split(/\s+/)).values()].some(match => match.id === 'soil'),
  'ordinary model mentions in other paragraphs do not acquire this narrative accent');
assert.ok(![...manifestoConcepts(CONTENT.manifesto.lines[3].split(/\s+/)).values()].some(match => match.id === 'imagination'),
  'beauty and ambition stays ordinary body text');
console.log('PASS manifesto partner nouns and continuous three-color synthesis mapping.');
