// journey/cards/soon-icons.js — pictographs for the two unbuilt Equip chips
// (2026-10-05, Hannah: "for the equip one, I'd like for the bottom one to have
// ... a robot icon, the top one to have like a toolset icon").
//
// These use the shared initiative marker, with their names withheld by a
// blur. Kept separate as the icons for the two unfinished tools. Same drawing
// vocabulary as icons.js: 12-unit grid, single hairline, round joins.

const I = (paths) =>
  `<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">${paths}</svg>`;

export const SOON_ICONS = {
  // a small robot head — the agent (the LOWER Equip chip)
  quark: I('<path d="M6 1.25v1.6"/><rect x="2.5" y="2.85" width="7" height="6.1" rx="1.5"/><circle cx="4.55" cy="5.6" r="0.6"/><circle cx="7.45" cy="5.6" r="0.6"/><path d="M4.85 7.45h2.3M1.35 5.05v1.75M10.65 5.05v1.75"/>'),
  // a toolbox — the toolset (the UPPER Equip chip)
  brotchen: I('<path d="M4.45 4.1V2.95c0-.4.3-.7.7-.7h1.7c.4 0 .7.3.7.7V4.1"/><rect x="1.7" y="4.1" width="8.6" height="5.75" rx="1"/><path d="M1.7 6.75h3.35M6.95 6.75h3.35"/><rect x="5.05" y="6.05" width="1.9" height="1.4" rx="0.35"/>'),
};
