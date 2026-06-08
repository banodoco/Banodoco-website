import type { Section, Stage } from './types';

const clampIndex = (section: Section, index: number, role: string): number => {
  if (!Number.isInteger(index) || index < 0 || index >= section.stages.length) {
    throw new Error(`Section ${section.id} has invalid ${role} stage index ${index}`);
  }
  return index;
};

export const getStage = (section: Section, index: number, role: string): Stage => {
  const clamped = clampIndex(section, index, role);
  const stage = section.stages[clamped];
  if (!stage) {
    throw new Error(`Section ${section.id} is missing ${role} stage ${clamped}`);
  }
  return stage;
};

export const getEntryStage = (section: Section): Stage =>
  getStage(section, section.entryStageIndex ?? 0, 'entry');

export const getJumpStage = (section: Section): Stage =>
  getStage(section, section.jumpStageIndex ?? section.entryStageIndex ?? 0, 'jump');

export const getSettledStage = (section: Section): Stage =>
  getStage(section, section.settledStageIndex ?? section.stages.length - 1, 'settled');

export const getCatchUpStage = (section: Section): Stage =>
  getStage(
    section,
    section.catchUpStageIndex ?? section.settledStageIndex ?? section.stages.length - 1,
    'catch-up'
  );

export const getReverseEntryStage = (section: Section): Stage =>
  getStage(
    section,
    section.reverseEntryStageIndex ?? section.entryStageIndex ?? 0,
    'reverse entry'
  );
