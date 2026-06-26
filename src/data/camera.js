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
  follow: 8, // camera-settle speed during the finale (vs base 3) — keeps up with the climbing bird
  orbitTo: 0.97, // the 360° loop COMPLETES here, then holds the front view to 1.0 so the camera
  // settles to a clean head-on landing (the "stops at front view") before the held interactive tail
  orbitDist: 13, // camera distance from the bird while orbiting (smaller = closer/more filling)
  orbitHeight: 3.2, // camera height above the bird's centre so the full body clears the frame
};
