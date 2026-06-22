// Camera choreography — one keyframed "shot" per stage, sampled by scrollProgress.
// The Wanderer walks in place at the origin (+X = his facing). The camera moves
// around him so the journey reads through composition:
//   behind (arrival) -> eases back (philosophy) -> swings to his side (focus)
//   -> orbits to his FRONT as he arrives (discovery) -> holds, off-centre so the
//   project cards get the other half (exploration) -> cranes up at the close (contact).
// All values in metres/world space. He is ~1.0m tall (head 0.98). Tuned live in-browser.

export const SHOTS = [
  // The climb has to read in the CAMERA, not just the palette: the opening was nearly static
  // (arrival ≈ philosophy), so the first third never ascended. Now it starts LOW and close behind
  // him — intimate, in the dark, the trail looming — then RISES and draws back through philosophy
  // so the journey visibly opens up ahead. (Noomo: every beat earns its motion; the big opening
  // gets room and movement, not a hold.)
  { id: 'arrival', at: 0.0, pos: [-2.4, 0.95, 0.25], look: [2.6, 0.5, -0.6] },
  { id: 'philosophy', at: 0.21, pos: [-3.2, 1.65, 0.55], look: [1.9, 1.0, -0.9] },
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
export const FINALE = {
  from: 0.88, // begin following the ascent here
  lift: 1.4, // metres the camera cranes up across the finale
  lookLerp: 0.92, // how fully the look swings onto the ascending phoenix (1 = locked on)
  pull: 6, // metres the camera draws BACK along the view, so the WHOLE firebird frames with headroom
};
