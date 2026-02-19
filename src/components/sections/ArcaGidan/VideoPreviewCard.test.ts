import * as moduleUnderTest from './VideoPreviewCard';

if (!moduleUnderTest) {
  throw new Error('Module failed to load in smoke test');
}

export const smokeTestPassed = true;
