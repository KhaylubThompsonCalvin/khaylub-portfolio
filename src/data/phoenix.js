// Phoenix choreography — "Spark of the Summit".
// The phoenix is a SECONDARY accent, never the centerpiece: a faint ember that wakes
// near the midpoint, arcs through the far background behind the Wanderer, and resolves
// into fire as the journey reaches the summit. Like camera.js and stages.js, this is
// choreography-as-data — PhoenixFlap.jsx is a generic sampler that reads these values by
// scrollProgress and never re-renders (the getState()-in-useFrame idiom).
//
// World frame (matches camera.js): the Wanderer is fixed at the origin, ~1 m tall, facing
// +X (the summit gaze direction). The camera sits on the +X side looking back toward the origin
// (discovery 0.57 / exploration 0.77 / contact 0.94). The firebird is FELT in philosophy as a swept
// shadow (unseen), then at the spark IGNITES and sweeps visibly into the upper frame from the right
// (see FLIGHT), arcing across and climbing out to the far −X summit perch — a large firebird above
// and behind him through the summit.

// The scroll window (all values are scrollProgress 0..1).
export const PHOENIX = {
  spark: 0.5, // ember fades in here — after the discovery face-reveal has begun, never across it
  rampFrom: 0.5, // emission + flap-speed ramp start
  rampTo: 0.98, // ...and finish; the fire peak then holds through the contact close
  emergeSpan: 0.04, // quick fade/scale-in so the spark ignites rather than popping on
};

// Philosophy foreshadow — the spark is FELT before it's seen. Through the philosophy beat
// (~0.12–0.34, "the best systems are built one layer at a time") the phoenix is UNSEEN: instead of
// a visible ember-bird in the sky (removed — Kt: "you shouldn't see the phoenix straight on here"),
// its shadow sweeps DOWN the Wanderer's back, as if something just passed overhead. The camera is
// behind him through this beat, so a soft pool swept down his back reads as that shadow.
// Implemented in three/ForeshadowShadow.jsx (reuses Ground's contact-shadow texture).
// Through philosophy the Wanderer is a near-black silhouette, so a shadow on his dark back would be
// invisible — it only reads where it falls on the LIT grass. So the foreshadow is a soft ground
// pool that sweeps in from ahead (+X, where the spark later returns), passes over him, and on past
// toward the camera behind — the unseen bird crossing overhead. It does cross his back on the way.
export const FORESHADOW = {
  from: 0.12,
  peak: 0.21,
  to: 0.34,
  maxOpacity: 0.6, // darker — it has to read over the textured, lit dawn grass
  xFrom: 3.4, // sweeps in from ahead on the trail...
  xTo: -4.2, // ...crossing directly OVER him (origin) at the peak, then on past behind
  z: 0.1,
  size: 3.4, // soft pool diameter (m)
};

// Flight path — keyframed world positions sampled with a Catmull-Rom curve (the plan's chosen
// interpolation; mirrors how the camera keyframes its shots). Each point is { at, pos:[x,y,z] }.
//
// The firebird must be SEEN coming into frame at the spark (an earlier "overhead pass" flew it
// directly above the camera, where it clipped off the top edge and was never visible — the spark
// beat had no bird). It is FELT earlier in philosophy as a swept shadow (ForeshadowShadow); at the
// spark it ignites and is SEEN. Three beats:
//   1. ENTRY (0.50→0.66): ignites into the upper-right of frame and sweeps across the upper sky —
//      positions solved live by unprojecting upper-frame screen points (~11–12 m out) at the
//      discovery/exploration cameras, so it reads as a large firebird arriving, not a clipped blur.
//   2. CLIMB-OUT (0.66→0.77): arcs up and recedes toward the far summit perch.
//   3. SUMMIT → ASCENT (0.77→1.0): crisp against the clean blue, upper-left of the sun, then it
//      CLIMBS — world Y rises 2→5.8 — and the camera tilts up to follow it (data/camera.js FINALE),
//      the rising-phoenix finale. Slow-flaps to a freeze as it ascends.
// Heading follows the path tangent; x is monotonic −X and z monotonic +z through the entry, so no
// flip there (watch the existing curve reversal ~0.85). Re-tune via __seek + the __cam unproject.
export const FLIGHT = [
  { at: 0.5, pos: [-1.46, 0.33, -10.25] }, // spark — ignites into the upper-right of frame
  { at: 0.57, pos: [-5.67, 1.1, -6.49] }, // sweeps in, upper-right — a visible firebird arriving
  { at: 0.66, pos: [-8.57, 1.39, -0.19] }, // arcs across the upper frame
  { at: 0.77, pos: [-12.8, 2.09, 2.98] }, // exploration — far upper-right, climbing out
  { at: 0.88, pos: [-13.05, 2.0, 1.4] }, // the ascent begins — the camera starts tilting up to follow
  { at: 0.94, pos: [-12.0, 3.4, 3.0] }, // climbing into the sky, upper-left, away from the sun
  { at: 1.0, pos: [-11.0, 5.8, 4.0] }, // ascends high — the rising-phoenix finale (slow-flap freeze)
];

// Moving fly-over shadow (three/FlyoverShadow.jsx) — the firebird's shadow sweeping over the
// Wanderer during the overhead pass. A soft projected pool reusing Ground's radial-gradient
// contact-shadow texture, NOT a real shadow map: Ground.jsx notes shadow maps would fight the
// selective-bloom render takeover, so this follows the cheaper painted-shadow pattern. It tracks
// the bird's published ground position (store.phoenixPos) and is gated to the pass window so it's
// gone once the bird has climbed away. A higher bird casts a larger, fainter pool.
export const SHADOW = {
  from: 0.5, // pass window — matches the first FLIGHT beat
  peak: 0.57, // darkest as it crosses directly overhead (≈ x:0, the discovery beat)
  to: 0.72,
  maxOpacity: 0.55,
  baseSize: 1.4, // shadow diameter (m) at a low pass — kept tight so it reads as a ground pool, not
  sizePerHeight: 0.3, // a smudge climbing him at the shallow camera angle (+ diameter per m of altitude)
  softnessHeight: 8, // altitude (m) by which opacity has faded toward `highFade`
  highFade: 0.45, // opacity multiplier when the bird is high (fainter, larger)
};

// Emission ramp: ember glow -> fire. Drives BOTH the emissive colour and intensity on the feather
// material (the body material has no emission, so it is left untouched). PhoenixFlap overrides the
// baked emissive with these so the bird reads as FIRE, not a normally-lit pale bird — the climax
// must out-glow the early glimpse, not under-glow it.
export const EMBER_INTENSITY = 1.0;
// Pushed up from 1.5: at the old value the huge firebird read as a dull grey/white bird of prey at
// the summit instead of fire. The emissive COLOUR (below) stays saturated orange, so the higher
// intensity blooms into a white-hot core with a fiery halo rather than washing the whole bird white.
export const FIRE_INTENSITY = 2.8;
// Ember -> fire colour. Saturated warm hues so the bloom halo reads as fire (orange/gold), never a
// cold white glow. Lerped by the same ramp that drives intensity.
export const EMBER_COLOR = '#ff5a1e'; // deep ember orange at the spark
export const FIRE_COLOR = '#ffb24a'; // bright gold-orange fire at the summit

// A gentle forward glide pitch (radians) so the bird reads as soaring rather than hanging with its
// talons dangling straight down. Eased to 0 by the summit so the locked freeze pose is untouched.
export const GLIDE_PITCH = 0.22;

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

// Summit feathers — glowing feathers that fall slowly from the phoenix at the summit (Kt's
// request). A time-based gentle fall (not scroll-locked) so they keep drifting while you rest at
// the summit; spawned from the live phoenixPos, recycled, warm + on the bloom layer so they glow.
// Gated by reduced motion. three/Feathers.jsx.
export const FEATHERS = {
  from: 0.88, // fade in across the summit approach, full by ~0.95
  fadeSpan: 0.07,
  count: 12,
  size: 1.0, // metres (the phoenix is ~6 m and ~10 m out, so a feather this size reads small)
  fall: 0.5, // world metres/sec downward drift
  sway: 0.6, // horizontal sway amplitude (metres)
  spin: 0.5, // radians/sec flutter
  spread: 3.2, // spawn radius around the phoenix
  drop: 7, // metres a feather falls before it recycles back up to the bird
  color: '#ffd49a', // warm gold ember
};

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
  emberBoost: 1.8, // cursor engagement also brightens the embers — the mouse "fans the fire"
};

// Scroll-velocity ember flair — flavour only, never moves the bird (mirrors Noomo's scrollSpeed
// state). |Lenis velocity| maps to extra emission + wingbeat: scroll faster, the ember flares.
export const SCROLL_FLAIR = {
  ref: 18, // Lenis velocity that reads as "fast" (normalizes to 1)
  emberBoost: 1.4, // added emissiveIntensity at full speed
  flapBoost: 0.8, // added wingbeat timeScale at full speed
  ease: 5.0, // smoothing so the flare rises/falls smoothly, not jittery
};
