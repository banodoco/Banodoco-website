import * as moduleUnderTest from './EventContent';

if (!moduleUnderTest) {
  throw new Error('Module failed to load in smoke test');
}

export const smokeTestPassed = true;
