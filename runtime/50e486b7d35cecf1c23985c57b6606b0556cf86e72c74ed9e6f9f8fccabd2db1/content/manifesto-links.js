// The closing sentence connects the manifesto to its lived chapters.
export const MANIFESTO_LINKS = [
  { phrase: 'seeding', chapter: 'inspire', label: 'Jump to the Inspire section' },
  { phrase: 'nourishing', chapter: 'equip', label: 'Jump to the Equip section' },
  { phrase: 'holding together', chapter: 'connect', label: 'Jump to the Connect section' },
];
export function manifestoLinks(words) {
  const tokens = words.map(word => word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, ''));
  const matches = new Map();
  for (const destination of MANIFESTO_LINKS) {
    const phrase = destination.phrase.split(' ');
    const start = tokens.findIndex((_, i) => phrase.every((word, offset) => tokens[i + offset] === word));
    if (start >= 0) phrase.forEach((_, offset) => matches.set(start + offset, {
      ...destination, start, end: start + phrase.length - 1,
    }));
  }
  return matches;
}
