import { manifestoPose } from './pose.js';
import { createReturnFlight, sampleReturnFlight, returnVelocity, returnChannels } from './return-flight.js';

// Join the rising shot at a future frame, with its velocity. Blending a
// stationary departure into the live ascent instead made two unrelated
// movements compete, and forced every chapter through Purpose's low orbit.
export const ENTRY_JOIN_SECONDS = 8.5;
export function createEntryFlight(depart, anchor, aspect) {
  const seconds = ENTRY_JOIN_SECONDS, dt = 1 / 240;
  const to = manifestoPose(anchor, seconds, aspect);
  const before = manifestoPose(anchor, seconds - dt, aspect);
  const after = manifestoPose(anchor, seconds + dt, aspect);
  const velocity = returnVelocity(before, after, 2 * dt);
  const va = returnVelocity(before, to, dt), vb = returnVelocity(to, after, dt);
  const acceleration = Object.fromEntries(Object.keys(va).map(key => [key, (vb[key] - va[key]) / dt]));
  const pitch = returnChannels(depart).pitch;
  return createReturnFlight(depart, to, seconds, {},
    { entryFraming: pitch > -.6, pitchLead: pitch > .4, aim: false, rootDeparture: depart.position.y < 0, terminalVelocity: velocity, terminalAcceleration: acceleration });
}
export function sampleEntryFlight(flight, seconds) {
  return sampleReturnFlight(flight, seconds / flight.seconds);
}
