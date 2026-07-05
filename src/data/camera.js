// Camera choreography — one keyframed "shot" per stage, sampled by scrollProgress.
// The Wanderer walks in place at the origin (+X = his facing). The camera moves
// around him so the journey reads through composition:
//   behind (arrival) -> eases back (philosophy) -> swings to his side (focus)
//   -> orbits to his FRONT as he arrives (discovery) -> holds, off-centre so the
//   project cards get the other half (exploration) -> cranes up at the close (contact).
// All values in metres/world space. He is ~1.0m tall (head 0.98). Tuned live in-browser.

export const SHOTS = [
  // The climb has to read in the CAMERA, not just the palette. Arrival starts LOW and
  // close behind him — ground-level, intimate, the trail ahead looming in the dark —
  // then the camera RISES hard through philosophy so the journey visibly opens up.
  // The first third now ascends. (Noomo: every beat earns its motion.)
  //
  // arrival — ground-level, close behind; Wanderer a silhouette against the dark sky
  { id: 'arrival', at: 0.0, pos: [-2.1, 0.48, 0.18], look: [2.6, 0.72, -0.5] },
  // philosophy — camera rises hard so you FEEL the climb starting; sky opens, world gets bigger
  { id: 'philosophy', at: 0.21, pos: [-3.8, 2.2, 0.65], look: [1.6, 1.05, -0.8] },
  { id: 'focus', at: 0.39, pos: [-1.4, 1.2, 1.9], look: [0.2, 0.7, -0.3] },
  { id: 'discovery', at: 0.57, pos: [2.4, 1.15, 1.2], look: [0.0, 0.72, 0.0] },
  { id: 'exploration', at: 0.77, pos: [2.6, 1.05, -1.5], look: [0.0, 0.7, 0.3] },
  { id: 'contact', at: 0.94, pos: [2.3, 1.6, -0.3], look: [0.0, 1.0, 0.0] },
];

// ---- Motion feel (2026-07-05 camera pass) -------------------------------------------------
// The audited defect: per-segment smoothstep lerp dead-stopped the camera at every shot and
// surged to 1.5x mean speed mid-segment — a stop-go cadence that read as unnatural, with the
// rotation rate peaking >10°/0.01p right at the 0.5 ignition. The path is now a non-uniform
// Catmull-Rom (cubic Hermite, finite-difference tangents in the SCROLL domain) THROUGH the
// same untouched keyframes: velocity is continuous across every seam, so the camera flows
// through beats instead of parking at them. A mild uniform ease per segment keeps a gentle
// slow-in/slow-out at each beat (~70% flow speed at the shot, never a stop); because the
// weight is uniform, both sides of a seam scale identically and C1 continuity is preserved.
export const EASE_WEIGHT = 0.2; // 0 = constant flow, 1 = full smoothstep (the old stop-go).
// 0.2 keeps the view-rotation rate through the face-reveal approach (~0.46–0.51, the ignition
// window) under the 8°-per-0.01-scroll whip threshold; 0.3 measured 8.3° at the peak.
export const segmentEase = (t) => {
  const s = t * t * (3 - 2 * t);
  return t + (s - t) * EASE_WEIGHT;
};

// Finite-difference tangent (units per scroll) at knot i for one component.
function tangentAt(vals, times, i) {
  const n = vals.length;
  if (i === 0) return (vals[1] - vals[0]) / (times[1] - times[0]);
  if (i === n - 1) return (vals[n - 1] - vals[n - 2]) / (times[n - 1] - times[n - 2]);
  const dtL = times[i] - times[i - 1];
  const dtR = times[i + 1] - times[i];
  const slopeL = (vals[i] - vals[i - 1]) / dtL;
  const slopeR = (vals[i + 1] - vals[i]) / dtR;
  // weighted so the shorter interval dominates — standard non-uniform finite difference
  return (slopeL * dtR + slopeR * dtL) / (dtL + dtR);
}

const TIMES = SHOTS.map((s) => s.at);
const CHANNELS = ['pos', 'look'].map((key) =>
  [0, 1, 2].map((axis) => {
    const vals = SHOTS.map((s) => s[key][axis]);
    return { vals, tans: TIMES.map((_, i) => tangentAt(vals, TIMES, i)) };
  })
);

// Sample the camera path at scrollProgress p. Pure data->numbers (no three.js) so the frame
// loop, tests, and audit tooling all share the exact same math. Writes [x,y,z] into out.pos
// and out.look.
export function samplePath(p, out) {
  const n = SHOTS.length;
  const clamped = Math.min(TIMES[n - 1], Math.max(TIMES[0], p));
  let i = 0;
  while (i < n - 2 && clamped >= TIMES[i + 1]) i++;
  const h = TIMES[i + 1] - TIMES[i];
  const s = segmentEase((clamped - TIMES[i]) / h);
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  for (let c = 0; c < 2; c++) {
    const target = c === 0 ? out.pos : out.look;
    for (let axis = 0; axis < 3; axis++) {
      const { vals, tans } = CHANNELS[c][axis];
      target[axis] =
        h00 * vals[i] + h10 * h * tans[i] + h01 * vals[i + 1] + h11 * h * tans[i + 1];
    }
  }
}

// Subtle pointer counter-drift during the phoenix beat (Noomo-style parallax). The camera offsets
// OPPOSITE the cursor by up to these world metres, so the scene gains a little depth as the mouse
// moves. Ramped by the phoenix engagement and gated by reduced motion (see CameraRig). Kept tiny
// on purpose — this is a whisper of parallax, not a free-look camera.
export const POINTER_PARALLAX = { x: 0.18, y: 0.12, ease: 3.0 };

// Finale — as the journey ends the firebird ASCENDS into the sky and the camera tilts UP to follow
// it (Noomo's rising-phoenix finale). NOT the old tight orbit (it swung the eye into the bright sun
// and washed white): from `from`→1.0 the camera cranes up `lift` metres and blends its LOOK target
// onto the live phoenix position (`lookLerp`), pitching up to track the bird climbing. The phoenix
// stays upper-LEFT while the sun sits upper-RIGHT, so following it tilts AWAY from the sun — no
// wash. Scroll-driven, so it honours reduced motion (no autonomous move, just the scroll story).
// Finale — the camera ORBITS the still-flying firebird a full 360° and lands HEAD-ON at the end of
// the scroll (Kt's design: "it should still look like flight, the camera does the rotating"). The
// bird keeps flying/flapping along its climb; the camera circles it on a ring of radius `orbitDist`
// at height `orbitHeight`, the orbit angle driven by scrollProgress from `from`→1.0 (one full loop
// that starts and ends on the bird's FRONT). Scroll-driven, so it honours reduced motion. The held
// front view at the end of the scroll is the interactive closing hero (links lit, fly-by-cursor).
export const FINALE = {
  from: 0.84, // the orbit engages here
  trackIn: 0.08, // scroll span to blend the orbit rig in from the exploration shot
  // The 360° spin waits this much scroll after `from` before it starts turning, so the
  // crane-out to the orbit ring is mostly done first. Measured: rotating during the handoff —
  // while the camera is still only halfway out to the 13 m ring — nearly doubled the peak
  // rotation rate (87°/0.01p); delaying the spin drops it to the orbit's natural ~33° mean.
  // The spin still completes at orbitTo, so the front-on landing is unchanged.
  spinDelay: 0.02,
  follow: 8, // camera-settle speed during the finale (vs base 3) — keeps up with the climbing bird
  orbitTo: 0.97, // the 360° loop COMPLETES here, then holds the front view to 1.0 so the camera
  // settles to a clean head-on landing (the "stops at front view") before the held interactive tail
  orbitDist: 13, // camera distance from the bird while orbiting (smaller = closer/more filling)
  orbitHeight: 3.2, // camera height above the bird's centre so the full body clears the frame
  // The model's head/beak is posed turned relative to its body, so landing the camera on the body's
  // facing shows the beak in PROFILE. Rotate the camera's front direction by this (radians) so it
  // lands in front of the BEAK — the viewer sees the full beak head-on at the freeze. Tuned live
  // (swept 0→1.7; 1.3 lands symmetric and head-on, wings even, the face toward the viewer).
  frontOffset: 1.3,
};
