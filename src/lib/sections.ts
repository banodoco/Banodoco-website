// =============================================================================
// SECTION CONFIGURATION
// =============================================================================
// Centralized section IDs and metadata to avoid string duplication across components.

/** All homepage section IDs in scroll order */
export const SECTION_IDS = {
  hero: 'hero',
  community: 'community',
  reigh: 'reigh',
  arcaGidan: 'arca-gidan',
  ados: 'ados',
  ecosystem: 'ecosystem',
  ownership: 'ownership',
} as const;

export type SectionId = typeof SECTION_IDS[keyof typeof SECTION_IDS];

/** All section IDs as an array (for iteration) */
export const ALL_SECTION_IDS: SectionId[] = Object.values(SECTION_IDS);

/** Navigation items - sections that appear in the header nav */
export const NAV_SECTIONS = [
  { id: SECTION_IDS.community, label: 'Community' },
  { id: SECTION_IDS.reigh, label: 'Reigh' },
  { id: SECTION_IDS.arcaGidan, label: 'Arca Gidan' },
  { id: SECTION_IDS.ados, label: 'ADOS' },
] as const;

/** Section accent colors for active state (used in header) */
export const SECTION_COLORS: Partial<Record<SectionId, string>> = {
  [SECTION_IDS.community]: 'text-sky-400',
  [SECTION_IDS.reigh]: 'text-emerald-400',
  [SECTION_IDS.arcaGidan]: 'text-amber-400',
  [SECTION_IDS.ados]: 'text-rose-400',
};

/** Section hover colors (softer versions for gentle hover effect) */
export const SECTION_HOVER_COLORS: Partial<Record<SectionId, string>> = {
  [SECTION_IDS.community]: 'hover:text-sky-300/80',
  [SECTION_IDS.reigh]: 'hover:text-emerald-300/80',
  [SECTION_IDS.arcaGidan]: 'hover:text-amber-300/80',
  [SECTION_IDS.ados]: 'hover:text-rose-300/80',
};

/** 
 * Scrim background colors for header - matches each section's gradient start color.
 * Hero uses the light default scrim; all other sections use heavier scrims.
 */
export const SECTION_SCRIM_COLORS: Record<SectionId | 'footer', string> = {
  [SECTION_IDS.hero]: 'bg-black/5',
  [SECTION_IDS.community]: 'bg-[#0c1420]/90',
  [SECTION_IDS.reigh]: 'bg-[#0c1a14]/90',
  [SECTION_IDS.arcaGidan]: 'bg-[#201a0c]/90',
  [SECTION_IDS.ados]: 'bg-[#2a0a0f]/90',
  [SECTION_IDS.ecosystem]: 'bg-[#0a1218]/90',
  [SECTION_IDS.ownership]: 'bg-[#1a1614]/90',
  footer: 'bg-[#1a1614]/90', // Footer uses same as ownership
};

