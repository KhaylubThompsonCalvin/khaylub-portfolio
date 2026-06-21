// Phoenix choreography — "Spark of the Summit".
// The phoenix is a SECONDARY accent, never the centerpiece: a faint ember that wakes
// near the midpoint, arcs through the far background behind the Wanderer, and resolves
// into fire as the journey reaches the summit. Like camera.js and stages.js, this is
// choreography-as-data — PhoenixFlap.jsx is a generic sampler that reads these values by
// scrollProgress and never re-renders (the getState()-in-useFrame idiom).
//
// World frame (matches camera.js): the Wanderer is fixed at the origin, ~1 m tall, facing
// +X (the summit gaze direction). Through the back beats the camera sits on the +X side
// looking back toward the origin (discovery 0.57 / exploration 0.77 / contact 0.94), so the
// phoenix lives in the FAR background on the −X side and climbs in +Y — behind and above the
// Wanderer from every one of those angles, so it never crosses his face or competes with him.

// The scroll window (all values are scrollProgress 0..1).
export const PHOENIX = {
  spark: 0.5, // ember fades in here — after the discovery face-reveal has begun, never across it
  rampFrom: 0.5, // emission + flap-speed ramp start
  rampTo: 0.98, // ...and finish; the fire peak then holds through the contact close
  emergeSpan: 0.04, // quick fade/scale-in so the spark ignites rather than popping on
};

// Flight path — keyframed world positions sampled with a Catmull-Rom curve (the plan's
// chosen interpolation; mirrors how the camera keyframes its shots). Each point is
// { at: scrollFraction, pos: [x, y, z] }. X stays negative the whole way (never reaches the
// Wanderer at x=0) while Y climbs: an upward arc that reads as a distant bird rising toward
// the summit light. Z gives it a little lateral drift into the discovery/exploration views.
// First-pass values — the spec is approved; nudge these live (Playwright + __seek) if needed.
export const FLIGHT = [
  { at: 0.5, pos: [-4.2, 0.3, 0.2] }, // faint ember: low, far, just behind him
  { at: 0.64, pos: [-3.6, 1.1, 1.1] }, // lifts and drifts +Z into the discovery view
  { at: 0.78, pos: [-3.0, 2.2, 0.6] }, // climbing through exploration
  { at: 0.9, pos: [-2.6, 3.2, -0.1] }, // high behind him as the camera cranes up
  { at: 1.0, pos: [-2.4, 4.2, -0.4] }, // exits high — fire at the summit
];

// Emission ramp: ember glow -> fire. Scales emissiveIntensity on the feather material.
// (Body material has no emission, so it is left untouched.)
export const EMBER_INTENSITY = 1.0;
export const FIRE_INTENSITY = 5.5;

// Flap speed (AnimationAction.timeScale): a slow ember wingbeat that quickens as it ignites.
export const FLAP_SLOW = 0.6;
export const FLAP_FAST = 1.6;

// Scale: small/distant -> modest growth as it ascends, so it always reads as a far bird
// rather than a foreground prop.
export const SCALE_MIN = 0.8;
export const SCALE_MAX = 1.4;

// Yaw applied so the bird banks along the path tangent. HEADING_OFFSET corrects for the
// model's neutral facing in its own space (0 = its forward already matches +scroll travel);
// tune live if it flies backwards.
export const HEADING_OFFSET = 0;
