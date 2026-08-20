import { createInspire } from './chapters/inspire/index.js';
import { createConnect } from './chapters/connect/index.js';
import { createOwned } from './chapters/owned/index.js';
import { createFinal } from './chapters/final/index.js';
import { CONTENT } from '../content/content.js';
import {
  JOURNEY_SCHEMA, RUNTIME_CHAPTER_IDS, validateJourneyStructure,
} from './structure.js';

const CHAPTER_FACTORIES = {
  inspire: (sceneApi) => createInspire(sceneApi),
  connect: (sceneApi) => createConnect(sceneApi),
  owned: (sceneApi) => createOwned(sceneApi, CONTENT),
  final: (sceneApi) => createFinal(sceneApi),
};

const CHAPTER_BUILDERS = Object.fromEntries(
  RUNTIME_CHAPTER_IDS.map((id) => [id, CHAPTER_FACTORIES[id]]),
);
validateJourneyStructure(JOURNEY_SCHEMA, { builders: CHAPTER_BUILDERS });

const preparedChapters = {};

/** Build the next not-yet-built chapter; returns how many remain. */
export function prepareChapter(sceneApi) {
  for (const id of Object.keys(CHAPTER_BUILDERS)) {
    if (!preparedChapters[id]) {
      preparedChapters[id] = CHAPTER_BUILDERS[id](sceneApi);
      break;
    }
  }
  return Object.keys(CHAPTER_BUILDERS).filter((id) => !preparedChapters[id]).length;
}

/** Complete the registry synchronously, reusing any chapters prepared earlier. */
export function buildChapters(sceneApi) {
  const chapters = {};
  for (const id of Object.keys(CHAPTER_BUILDERS)) {
    chapters[id] = preparedChapters[id] || CHAPTER_BUILDERS[id](sceneApi);
  }
  return chapters;
}
