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
// Note on the back beats: the `contact` camera (data/camera.js) cranes UP to y≈2.05 and looks
// DOWN at the Wanderer, so a far-background bird must sit LOW in world Y to read HIGH on screen
// (world height is invisible; screen composition is what matters). Hence Y peaks mid-arc through
// exploration, then settles as the camera tilts down — keeping the fire framed in the upper
// background at the summit instead of sailing off the top of the frame. Verified live (Playwright
// projection probe) at the discovery/exploration/contact shots.
export const FLIGHT = [
  { at: 0.5, pos: [-4.6, 0.6, 0.1] }, // faint ember: low, far, just behind him
  { at: 0.62, pos: [-4.0, 1.0, 0.5] }, // lifts and drifts +Z into the discovery view
  { at: 0.74, pos: [-3.4, 1.3, 0.3] }, // arc peak through exploration (kept off the top edge)
  { at: 0.88, pos: [-3.0, 0.65, 0.0] }, // settling as the contact camera cranes up and tilts down
  { at: 1.0, pos: [-2.6, 0.2, -0.3] }, // fire at the summit — framed in the upper background
];

// Emission ramp: ember glow -> fire. Scales emissiveIntensity on the feather material.
// (Body material has no emission, so it is left untouched.)
export const EMBER_INTENSITY = 0.8;
export const FIRE_INTENSITY = 3.2;

// Flap speed (AnimationAction.timeScale): a slow ember wingbeat that quickens as it ignites.
export const FLAP_SLOW = 0.6;
export const FLAP_FAST = 1.6;

// Scale: small/distant -> modest growth as it ascends, so it always reads as a far bird
// rather than a foreground prop.
export const SCALE_MIN = 0.55;
export const SCALE_MAX = 1.0;

// Yaw applied so the bird banks along the path tangent. HEADING_OFFSET corrects for the
// model's neutral facing in its own space (0 = its forward already matches +scroll travel);
// tune live if it flies backwards.
export const HEADING_OFFSET = 0;

// Selective-bloom glow (three's UnrealBloomPass, no new dependency). The site background is
// light cream, so bloom is masked to the phoenix only (see three/SelectiveBloom.jsx). threshold
// sits above the body's lit luminance so just the HDR ember/fire feathers glow; strength/radius
// shape the halo. Tune live like the flight path.
export const BLOOM = { strength: 0.75, radius: 0.5, threshold: 0.5 };

// Pointer interaction (Noomo-style) — alive only during the phoenix beat and gated by reduced
// motion. The bird drifts and banks toward the cursor; the engagement that scales it ramps with
// the ember->fire ramp, so it's barely-there at the spark and fully responsive at the summit.
// Position stays scroll-locked; pointer only adds a small offset/tilt on top of the flight path.
export const POINTER = {
  drift: [0.4, 0.28], // max world-metre offset toward the cursor [x, y]
  bank: 0.28, // max roll (radians) toward cursor.x — a lean, not a swerve
  yaw: 0.2, // max extra yaw toward cursor.x, on top of the path heading
  ease: 4.0, // exponential follow (higher = snappier tracking of the cursor)
};

// Scroll-velocity ember flair — flavour only, never moves the bird (mirrors Noomo's scrollSpeed
// state). |Lenis velocity| maps to extra emission + wingbeat: scroll faster, the ember flares.
export const SCROLL_FLAIR = {
  ref: 18, // Lenis velocity that reads as "fast" (normalizes to 1)
  emberBoost: 1.4, // added emissiveIntensity at full speed
  flapBoost: 0.8, // added wingbeat timeScale at full speed
  ease: 5.0, // smoothing so the flare rises/falls smoothly, not jittery
};
