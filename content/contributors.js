// The contributor pool — everyone the Owned field can deal a face from.
//
// PROVENANCE. Each entry joins two things Banodoco publishes about itself:
// its ownership ledger (banodoco.ai/ownership — who was granted, in which
// group, in which month) and the avatar sprite it renders on its own front
// page (banodoco.ai/profile-sprite.jpg, 20x10 tiles of 96px). `col`/`row` are
// that sprite's own coordinates for that person, copied from the site's
// `profilePicsManifest.ts`. Nobody here was invented, renamed, or given a role
// they were not granted in.
//
// WHY 120 AND NOT 198. The sprite carries 198 avatars; these are the ones whose
// username also matches a ledger row, so that a face can be shown with a real
// name AND a real group. The remainder are real contributors too — they simply
// spell their handle differently across the two sources, and guessing at that
// join would risk captioning someone's picture with someone else's name.
// Widening this list is a name-normalisation exercise against the same two
// files, not new data.
//
// ROLE is the ledger group that person was granted in most often. The ledger's
// four groups are core, infrastructure builders, knowledge sharers and artists
// (banodoco.ai/ownership: 0.25% per group per month since February 2024), and
// the distribution below is theirs, not a design choice — artists are the
// largest group because they are.
//
// NO COUNTS (13-content-ops.md CO-3.1): grant frequency decided each person's
// role, but no tally is published here. A hand-maintained number goes stale;
// a group does not.

/** One sentence per ledger group, shown under a dealt contributor's name. */
export const ROLE_BLURB = Object.freeze({
  'Artist': 'Makes work with open models and shows it to the community.',
  'Core': 'Core contributor to Banodoco itself.',
  'Knowledge Sharer': 'Shares the knowledge and tools the rest of the ecosystem builds on.',
  'Infrastructure': 'Builds the open-source infrastructure the ecosystem runs on.',
});

/** [name, role, spriteCol, spriteRow] — compact on purpose; 120 rows. */
export const CONTRIBUTOR_POOL = Object.freeze([
  ['0xmacbeth', 'Artist', 3, 0],
  ['_nic_h', 'Artist', 2, 0],
  ['aleksej623', 'Artist', 12, 0],
  ['AndyXR', 'Artist', 16, 0],
  ['anime_is_real', 'Artist', 17, 0],
  ['arc37us', 'Artist', 19, 0],
  ['baronvonnift33', 'Artist', 3, 1],
  ['BlueDangerX', 'Artist', 6, 1],
  ['BOLDTRON', 'Artist', 7, 1],
  ['ButchersBrain', 'Artist', 9, 1],
  ['byarlooo', 'Artist', 10, 1],
  ['cerspense', 'Artist', 13, 1],
  ['chinese_dream', 'Artist', 14, 1],
  ['dkamacho', 'Artist', 4, 2],
  ['earthstorm', 'Artist', 10, 2],
  ['emmacatnip', 'Artist', 11, 2],
  ['enigmatic_e', 'Artist', 12, 2],
  ['fabdream', 'Artist', 15, 2],
  ['felixturner', 'Artist', 19, 2],
  ['habibigonemad', 'Artist', 3, 3],
  ['Hannah Submarine', 'Artist', 4, 3],
  ['honestabe37', 'Artist', 8, 3],
  ['huwhitememes', 'Artist', 11, 3],
  ['hypereikon', 'Artist', 12, 3],
  ['Infinite Vibes', 'Artist', 18, 3],
  ['ingierlingsson', 'Artist', 19, 3],
  ['iskarioto', 'Artist', 0, 4],
  ['itsB34STW4RS', 'Artist', 1, 4],
  ['itspoidaman', 'Artist', 2, 4],
  ['jasblack', 'Artist', 5, 4],
  ['kajukabla', 'Artist', 14, 4],
  ['machinedelusions', 'Artist', 9, 5],
  ['makeitrad', 'Artist', 10, 5],
  ['Material_Rabbit', 'Artist', 14, 5],
  ['melih35x', 'Artist', 17, 5],
  ['minelauvart', 'Artist', 4, 6],
  ['mrboofy', 'Artist', 5, 6],
  ['NebSH', 'Artist', 10, 6],
  ['oumoumad', 'Artist', 17, 6],
  ['pajaritaflora', 'Artist', 18, 6],
  ['palpapalpa', 'Artist', 19, 6],
  ['PTMarks', 'Artist', 6, 7],
  ['purzbeats', 'Artist', 7, 7],
  ['pxlpshr', 'Artist', 8, 7],
  ['RainbowPilot', 'Artist', 10, 7],
  ['realsammyt', 'Artist', 11, 7],
  ['RemyCoup', 'Artist', 14, 7],
  ['RenderStorm', 'Artist', 15, 7],
  ['sagansagansagans', 'Artist', 18, 7],
  ['Scruntee', 'Artist', 0, 8],
  ['solus_fx', 'Artist', 5, 8],
  ['sorrymary', 'Artist', 6, 8],
  ['syntaxdiffusion', 'Artist', 8, 8],
  ['Teslanaut', 'Artist', 11, 8],
  ['thedorbrothers', 'Artist', 13, 8],
  ['timhannan', 'Artist', 18, 8],
  ['tobowers', 'Artist', 19, 8],
  ['tonon', 'Artist', 0, 9],
  ['traxxas25', 'Artist', 1, 9],
  ['trenthunter', 'Artist', 2, 9],
  ['Udart', 'Artist', 5, 9],
  ['VisualFrisson', 'Artist', 7, 9],
  ['wyzborrero', 'Artist', 9, 9],
  ['yvann_ba', 'Artist', 14, 9],
  ['Zlikwid', 'Artist', 15, 9],
  ['BadCRC', 'Core', 2, 1],
  ['Ian_G', 'Core', 13, 3],
  ['lone_samurai', 'Core', 6, 5],
  ['matt3o', 'Core', 15, 5],
  ['POM', 'Core', 5, 7],
  ['2kpr', 'Infrastructure', 5, 0],
  ['artchan', 'Infrastructure', 0, 1],
  ['Daxton Caylor', 'Infrastructure', 3, 2],
  ['Fannovel16', 'Infrastructure', 18, 2],
  ['jimblug', 'Infrastructure', 9, 4],
  ['Joviex', 'Infrastructure', 11, 4],
  ['Juxtapoz', 'Infrastructure', 12, 4],
  ['kairos4463', 'Infrastructure', 13, 4],
  ['Kijai', 'Infrastructure', 17, 4],
  ['Kosinkadink', 'Infrastructure', 1, 5],
  ['lilien86', 'Infrastructure', 5, 5],
  ['mel', 'Infrastructure', 19, 5],
  ['RedStrawberries', 'Infrastructure', 12, 7],
  ['wasasquatch', 'Infrastructure', 8, 9],
  ['3zm4n', 'Knowledge Sharer', 6, 0],
  ['Akumetsu971', 'Knowledge Sharer', 10, 0],
  ['brbbbq', 'Knowledge Sharer', 8, 1],
  ['byronimo', 'Knowledge Sharer', 11, 1],
  ['citizenplain', 'Knowledge Sharer', 15, 1],
  ['cubey', 'Knowledge Sharer', 19, 1],
  ['cyncratic', 'Knowledge Sharer', 0, 2],
  ['datarevised', 'Knowledge Sharer', 2, 2],
  ['drakenza', 'Knowledge Sharer', 6, 2],
  ['drex15704080', 'Knowledge Sharer', 8, 2],
  ['fakeitorleaveit', 'Knowledge Sharer', 17, 2],
  ['fictiverse', 'Knowledge Sharer', 0, 3],
  ['HeadOfOliver', 'Knowledge Sharer', 7, 3],
  ['huemin', 'Knowledge Sharer', 9, 3],
  ['iemesowum', 'Knowledge Sharer', 14, 3],
  ['jackg', 'Knowledge Sharer', 3, 4],
  ['Jerry Davos', 'Knowledge Sharer', 7, 4],
  ['johndopamine', 'Knowledge Sharer', 10, 4],
  ['Kewk', 'Knowledge Sharer', 16, 4],
  ['Klinter', 'Knowledge Sharer', 18, 4],
  ['lumifel', 'Knowledge Sharer', 8, 5],
  ['mgfxer', 'Knowledge Sharer', 0, 6],
  ['Mickmumpitz', 'Knowledge Sharer', 2, 6],
  ['neofuturist', 'Knowledge Sharer', 12, 6],
  ['nopeburger', 'Knowledge Sharer', 14, 6],
  ['Organoids', 'Knowledge Sharer', 15, 6],
  ['pln1', 'Knowledge Sharer', 3, 7],
  ['pollyannain4d', 'Knowledge Sharer', 4, 7],
  ['roman_anderson', 'Knowledge Sharer', 16, 7],
  ['ryanontheinside', 'Knowledge Sharer', 17, 7],
  ['semixd', 'Knowledge Sharer', 1, 8],
  ['the_shadow_nyc', 'Knowledge Sharer', 12, 8],
  ['xander6270', 'Knowledge Sharer', 11, 9],
  ['yo9otatara', 'Knowledge Sharer', 12, 9],
  ['yuvraj108c', 'Knowledge Sharer', 13, 9],
  ['zuko4230', 'Knowledge Sharer', 17, 9],
].map(Object.freeze));
