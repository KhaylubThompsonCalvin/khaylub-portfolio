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

// Threaded-motif foreshadow: a faint, distant ember GLIMPSE during the philosophy beat
// (~0.12–0.33, "the best systems are built one layer at a time") — the spark of what's coming.
// It rises in the far +X sky AHEAD of him (where the camera looks at that beat and where the
// summit fire pays off), kept small and dim so it never steals the Wanderer's establishing
// beats, then recedes through `focus` before the real spark at 0.50. Its own short path so it
// doesn't perturb the main FLIGHT's Catmull tangents.
export const GLIMPSE = {
  from: 0.12,
  peak: 0.22,
  to: 0.33,
  scale: 0.85, // small + far (+X ~8) so it reads as a distant SPARK, not a detailed bird
  intensity: 4.0, // bright enough to bloom into a glowing spark against the dawn sky
  // Positions solved live (unproject) to ride the upper-centre sky ahead, rising as it fades.
  path: [
    { at: 0.12, pos: [7.82, 0.46, -3.63] }, // appears far in the sky ahead
    { at: 0.22, pos: [8.07, 1.73, -3.09] }, // rises through centre
    { at: 0.33, pos: [7.63, 2.33, -4.23] }, // climbs away as it fades
  ],
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
// At the ~3 m scale the bird flies ~10 m out (far -X) so it reads as a large bird far away, not a
// giant beside him; positions were solved live (unproject of the target screen point at the chosen
// distance, per camera shot) to hold on-screen height ~20%→33% spark→summit. World Y goes negative
// at the back because the contact camera cranes up and tilts down (screen comp, not world height).
// Sized HUGE per the reference (SCALE peaks at ~6.5 → a ~6 m firebird). Positions solved live so
// it GROWS from a modest ember (~25% of frame height) to a dominating hero at the summit (~70%),
// held upper-right so it crowns the scene without burying the centre Wanderer.
export const FLIGHT = [
  { at: 0.5, pos: [-14.5, -0.8, -4.5] }, // spark: enters far/low in the sky behind
  { at: 0.57, pos: [-14.1, -0.51, -4.17] }, // discovery — ember
  { at: 0.66, pos: [-13.55, 0.97, 0.93] }, // rising
  { at: 0.77, pos: [-12.8, 2.09, 2.98] }, // exploration — arc peak, upper-right
  { at: 0.88, pos: [-13.05, 0.97, 0.79] }, // swelling toward the summit
  { at: 0.94, pos: [-12.16, 0.28, -0.93] }, // contact — huge against the cool sky
  { at: 1.0, pos: [-11.63, 0.09, -1.13] }, // fire at the summit — the hero firebird
];

// Emission ramp: ember glow -> fire. Scales emissiveIntensity on the feather material.
// (Body material has no emission, so it is left untouched.)
export const EMBER_INTENSITY = 0.8;
// Low on purpose: the HUGE firebird (~6 m) has a vast emissive area that blooms hard at the peak,
// so a modest per-pixel fire intensity keeps the wing/body form crisp instead of a white blob.
export const FIRE_INTENSITY = 1.5;

// Flap speed (AnimationAction.timeScale): a slow ember wingbeat that quickens as it ignites.
export const FLAP_SLOW = 0.6;
export const FLAP_FAST = 1.6;

// Scale: the GLB is ~0.98 m at its largest dim (Wanderer is ~0.98 m tall), so these multipliers
// set the real-world size of the bird. ~3.0 at the fire peak = a ~3 m firebird (3x the Wanderer);
// it stays distant (far -X in FLIGHT) so on screen it reads as a large bird far away, not a giant
// looming over him. Grows from a smaller, fainter ember as it ascends.
export const SCALE_MIN = 2.6;
export const SCALE_MAX = 6.5;

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
// Steering — the cursor flies the firebird. Tuned for real influence (it's ~10 m out, so these
// world-metre offsets read as clear screen movement) while staying in the far sky behind the
// Wanderer. Scaled by the climb ramp, so it wakes to the cursor as the bird ignites; the glimpse
// stays hands-off.
export const POINTER = {
  drift: [1.8, 1.1], // max world-metre offset toward the cursor [x, y] — the bird follows
  bank: 0.5, // max roll (radians) toward cursor.x — banks into the turn
  yaw: 0.35, // max extra yaw toward cursor.x, on top of the path heading
  ease: 3.2, // exponential follow (lower = a touch of lag, so it glides rather than snaps)
};

// Scroll-velocity ember flair — flavour only, never moves the bird (mirrors Noomo's scrollSpeed
// state). |Lenis velocity| maps to extra emission + wingbeat: scroll faster, the ember flares.
export const SCROLL_FLAIR = {
  ref: 18, // Lenis velocity that reads as "fast" (normalizes to 1)
  emberBoost: 1.4, // added emissiveIntensity at full speed
  flapBoost: 0.8, // added wingbeat timeScale at full speed
  ease: 5.0, // smoothing so the flare rises/falls smoothly, not jittery
};
