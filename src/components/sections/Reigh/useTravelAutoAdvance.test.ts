import * as moduleUnderTest from './useTravelAutoAdvance';

if (!moduleUnderTest) {
  throw new Error('Module failed to load in smoke test');
}

export const smokeTestPassed = true;
