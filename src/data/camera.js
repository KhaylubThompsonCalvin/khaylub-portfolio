// Camera choreography — one keyframed "shot" per stage, sampled by scrollProgress.
// The Wanderer walks in place at the origin (+X = his facing). The camera moves
// around him so the journey reads through composition:
//   behind (arrival) -> eases back (philosophy) -> swings to his side (focus)
//   -> orbits to his FRONT as he arrives (discovery) -> holds, off-centre so the
//   project cards get the other half (exploration) -> cranes up at the close (contact).
// All values in metres/world space. He is ~1.0m tall (head 0.98). Tuned live in-browser.

export const SHOTS = [
  { id: 'arrival',     at: 0.00, pos: [-1.55, 1.05,  0.15], look: [6.0, 0.75, -1.6] },
  { id: 'philosophy',  at: 0.21, pos: [-2.30, 1.35,  0.50], look: [2.0, 0.75, -1.0] },
  { id: 'focus',       at: 0.39, pos: [-1.40, 1.20,  1.90], look: [0.2, 0.70, -0.3] },
  { id: 'discovery',   at: 0.57, pos: [ 2.40, 1.15,  1.20], look: [0.0, 0.72,  0.0] },
  { id: 'exploration', at: 0.77, pos: [ 2.60, 1.05, -1.50], look: [0.0, 0.70,  0.3] },
  { id: 'contact',     at: 0.94, pos: [ 2.05, 2.05, -0.25], look: [0.0, 0.62,  0.0] },
];
