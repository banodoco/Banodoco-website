// A broad spatial wave gives neighboring mushrooms related exit windows.
// Each owner's skin, light, spores and ground links use the same presence.
// The ascent and ordinary Purpose presentation retain their authored gates.
export const COLONY_RETIREMENT_GLSL = `
  uniform float uColonyRetiring, uColonyRetirementStart;
  float colonyPresence(float amount, vec2 foot) {
    float rank = 0.5 + 0.5 * sin(foot.x * 0.071 + foot.y * 0.043);
    float low = 0.03 + 0.60 * rank;
    return mix(amount, uColonyRetirementStart * smoothstep(low, low + 0.33, amount / max(0.000001, uColonyRetirementStart)), uColonyRetiring);
  }
`;
