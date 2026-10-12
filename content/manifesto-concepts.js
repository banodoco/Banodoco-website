// Match authored phrases, not fixed word offsets, so copy edits keep their pairs.
const PAIRS = [
  { id: 'sun', organism: 'plants', contribution: 'energy from the sun' },
  { id: 'soil', organism: 'fungi', contribution: 'nutrients from the soil' },
  { id: 'passage', organism: 'animals', contribution: 'passage to new ground' },
];
const PHRASES = [
  { id: 'kinship', phrase: 'collectively shape share and reshape open models' },
  { id: 'vitality', phrase: 'bustles with creative life' },
  { id: 'imagination', phrase: 'beauty we have not yet dared to imagine' },
];
// The authored em dash joins life—with; only 'life' carries the accent.
const normalized = word => word.split('—')[0].toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '');

export function manifestoConcepts(words) {
  const tokens = words.map(normalized);
  const matches = new Map();
  for (const { id, organism, contribution } of PAIRS) {
    const phrase = contribution.split(' ');
    const start = tokens.findIndex((_, i) => phrase.every((word, j) => tokens[i + j] === word));
    const noun = tokens.indexOf(organism);
    if (start < 0 || noun < 0) continue;
    matches.set(noun, { id, role: 'organism', pairBeat: start });
    phrase.forEach((_, i) => matches.set(start + i, { id, role: 'contribution', pairBeat: start }));
  }
  for (const { id, phrase } of PHRASES) {
    const phraseWords = phrase.toLowerCase().split(' ');
    const start = tokens.findIndex((_, i) => phraseWords.every((word, j) => tokens[i + j] === word));
    if (start < 0) continue;
    let characterOffset = 0;
    phraseWords.forEach((_, offset) => {
      const word = words[start + offset];
      const ink = word.match(/^[A-Za-z]+/)?.[0] || word;
      matches.set(start + offset, {
        id, role: 'phrase', offset, ink, suffix: word.slice(ink.length),
        start, end: start + phraseWords.length - 1, characterOffset,
      });
      characterOffset += ink.length + 1;
    });
  }
  return matches;
}
