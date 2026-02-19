import * as moduleUnderTest from './useEventsAutoAdvance';

if (!moduleUnderTest) {
  throw new Error('Module failed to load in smoke test');
}

export const smokeTestPassed = true;
