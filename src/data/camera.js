// Camera choreography — one keyframed "shot" per stage, sampled by scrollProgress.
// The Wanderer walks in place at the origin (+X = his facing). The camera moves
// around him so the journey reads through composition:
//   behind (arrival) -> eases back (philosophy) -> swings to his side (focus)
//   -> orbits to his FRONT as he arrives (discovery) -> holds, off-centre so the
//   project cards get the other half (exploration) -> cranes up at the close (contact).
// All values in metres/world space. He is ~1.0m tall (head 0.98). Tuned live in-browser.

export const SHOTS = [
  { id: 'arrival', at: 0.0, pos: [-2.5, 1.35, 0.3], look: [2.4, 0.55, -0.7] },
  { id: 'philosophy', at: 0.21, pos: [-2.3, 1.35, 0.5], look: [2.0, 0.75, -1.0] },
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

// Finale — the camera leaves the Wanderer orbit and closes up on the phoenix, circling it on all
// angles as it ascends into the sun (Noomo-style), the end of the progression. From `from` to 1.0
// it blends from the contact shot into a tight orbit around the live phoenix position: `radius`
// metres out, sweeping `sweep` radians (~200°) so the wings/feathers turn, `rise` lifting the eye
// a touch above the bird. Skipped under reduced motion (the contact hold stays).
export const FINALE = {
  from: 0.94,
  radius: 13, // far enough that the huge (~6 m) firebird frames whole as the camera circles it
  sweep: Math.PI * 1.15,
  startAngle: -0.35, // begins on the +X side, near where the contact camera already sits
  rise: 2.0,
};
