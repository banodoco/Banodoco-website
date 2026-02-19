import * as moduleUnderTest from './RiverVisualization';

if (!moduleUnderTest) {
  throw new Error('Module failed to load in smoke test');
}

export const smokeTestPassed = true;
