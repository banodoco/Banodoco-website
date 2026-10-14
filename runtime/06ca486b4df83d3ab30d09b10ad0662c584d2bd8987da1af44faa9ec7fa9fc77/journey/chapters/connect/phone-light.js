// The phone aerial view is roughly twice as far from the terrain as desktop.
// Retain readable route light at that distance, and give each existing arrival
// front more width and presence without changing its choreography.
const DESKTOP = Object.freeze({ far: 0.055, head: 0.55, tip: 0.032 });
const PHONE = Object.freeze({ far: 0.038, head: 0.95, tip: 0.046 });
export function connectLightProfile(phone) { return phone ? PHONE : DESKTOP; }

// A single swell as the arriving light reaches the marker's formation range.
// Pure in its existing reveal: no timer to replay late or persist at rest.
export function connectHubWelcome(reveal, phone) {
  if (!phone || reveal <= 0.72 || reveal >= 1) return 0;
  const phase = (reveal - 0.72) / 0.28;
  return Math.sin(Math.PI * phase) ** 2;
}
