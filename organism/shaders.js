export const DRAW_GLSL = `
      uniform float uProg;
      uniform vec2 uWin;
      uniform float uClampY;
      attribute float aDraw;
      varying float vDraw;
      float drawAt(vec3 p) {
        float dp = clamp((uProg - uWin.x) / (uWin.y - uWin.x), 0.0, 1.0);
        float head = smoothstep(0.0, 0.012, dp - aDraw);
        float tip = smoothstep(0.03, 0.0, abs(dp - aDraw)) * smoothstep(0.0, 0.01, dp) * (1.0 - step(0.999, dp));
        // intro-only lid: strokes stop below uClampY while drawing (the artist
        // doesn't ink what the cap will bury); parked (uProg=2) it lifts, and
        // by then the shells occlude the joint, so nothing visibly changes
        vec4 wp = modelMatrix * vec4(p, 1.0);
        float lid = 1.0 - smoothstep(uClampY - 0.2, uClampY, wp.y) * (1.0 - smoothstep(1.05, 1.6, uProg));
        return (head + tip * 1.7) * lid;
      }
`;

export const PULSE_GLSL = `
      uniform vec3 uPulseC;
      uniform float uPulseT;
      uniform vec3 uPulseP; // x: wave speed, y: range falloff, z: amplitude
      float pulseAt(vec3 wp) {
        float d = distance(wp, uPulseC);
        float w = uPulseP.x * (0.15 + 0.21 * uPulseT);
        // rb*rb, never pow(rb, 2.0): the base goes negative on every vertex
        // once the ring has passed (and permanently at the parked rest), and
        // pow() with a negative base is undefined GLSL — Metal folds it to
        // rb*rb so the Mac never sees it, but D3D11/Mali may return NaN,
        // which the TAA sanitise would then flush to black every frame.
        float rb = (d - uPulseP.x * uPulseT) / w;
        float ring = exp(-(rb * rb));
        return 1.0 + uPulseP.z * ring * exp(-1.15 * uPulseT) * exp(-d * uPulseP.y);
      }
`;
