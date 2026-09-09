// The six-beat scroll timeline. Each beat owns a slice of scrollProgress (0..1).
// Weighted unequally, Noomo-style: big beats get more room.
// All systems (camera, character, atmosphere, UI) read from these ranges.
//
// 2026-07-05 retarget: the old near-duplicate "Project Discovery" + "Project Exploration"
// beats (40% of the scroll on the same card section - the dead middle) became ONE `camps`
// beat, and the freed slot became `spark` - a short beat that gives the phoenix ignition
// (data/phoenix.js PHOENIX.spark = 0.5) its one acknowledgment in words. The camera keyframes
// (data/camera.js) sample absolute scroll values, not these ranges, so the shots are untouched.

export const STAGES = [
  { id: 'arrival', label: 'The Trailhead', from: 0.0, to: 0.12 },
  { id: 'philosophy', label: 'The First Ember', from: 0.12, to: 0.3 },
  { id: 'focus', label: 'Footholds', from: 0.3, to: 0.48 },
  { id: 'spark', label: 'The Spark Wakes', from: 0.48, to: 0.58 },
  { id: 'camps', label: 'The Camps', from: 0.58, to: 0.88 },
  { id: 'contact', label: 'The Summit', from: 0.88, to: 1.0 },
];

// Total scroll height of the experience, in viewport-heights: story sections
// (84+126+126+70+210 = 616vh) + a 184vh contact/sky section = 800vh. Keep this equal to the sum
// of the section min-heights in index.css.
export const SCROLL_VH = 800;

// Fraction of the PAGE scroll that plays the STORY - the walk, the firebird's flight, and the
// camera spinning around to the head-on FRONT view. The remaining (1 − STORY_FRAC) of the page is
// the HELD SKY TAIL: useScrollSetup clamps scrollProgress to 1 there, so the camera holds the front
// view and the still-flying, front-on firebird becomes the sky the closing copy + footer scroll
// over (Kt: "as the camera spins around… the finished scroll should show the phoenix flying… front
// view in the sky"). Tuned so the whole walk keeps its original ~600vh of scroll feel
// (0.86 × 700vh of scrollable page = 602vh, within 0.5% of the pre-trim 604.8vh) and the spin
// keeps its room, then ~1 viewport (98vh) of held sky follows - trimmed from the original ~150vh,
// which read as dead scroll past the contact links. The #contact section height provides the tail.
export const STORY_FRAC = 0.86;

export function stageAt(p) {
  return STAGES.find((s) => p >= s.from && p < s.to) || STAGES[STAGES.length - 1];
}

// local 0..1 progress *within* the current stage
export function localProgress(p, stage) {
  const span = stage.to - stage.from || 1;
  return Math.min(1, Math.max(0, (p - stage.from) / span));
}
