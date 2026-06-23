// The five-phase scroll timeline (master prompt). Each phase owns a slice of
// scrollProgress (0..1). Weighted unequally, Noomo-style: big beats get more room.
// All systems (camera, character, atmosphere, UI) read from these ranges.

export const STAGES = [
  { id: 'arrival', label: 'Arrival', from: 0.0, to: 0.12 },
  { id: 'philosophy', label: 'Philosophy', from: 0.12, to: 0.3 },
  { id: 'focus', label: 'Areas of Focus', from: 0.3, to: 0.48 },
  { id: 'discovery', label: 'Project Discovery', from: 0.48, to: 0.66 },
  { id: 'exploration', label: 'Project Exploration', from: 0.66, to: 0.88 },
  { id: 'contact', label: 'Contact', from: 0.88, to: 1.0 },
];

// Total scroll height of the experience, in viewport-heights. Grown to add a tall closing "sky
// tail": story sections (84+126+126+280 = 616vh) + a 240vh contact/sky section = 856vh. Keep this
// equal to the sum of the section min-heights in index.css.
export const SCROLL_VH = 856;

// Fraction of the PAGE scroll that plays the STORY — the walk, the firebird's flight, and the
// camera spinning around to the head-on FRONT view. The remaining (1 − STORY_FRAC) of the page is
// the HELD SKY TAIL: useScrollSetup clamps scrollProgress to 1 there, so the camera holds the front
// view and the still-flying, front-on firebird becomes the sky the closing copy + footer scroll
// over (Kt: "as the camera spins around… the finished scroll should show the phoenix flying… front
// view in the sky"). Tuned so the whole walk keeps its original ~600vh of scroll feel and the spin
// keeps its room, then ~150vh of held sky follows. The #contact section height provides the tail.
export const STORY_FRAC = 0.8;

export function stageAt(p) {
  return STAGES.find((s) => p >= s.from && p < s.to) || STAGES[STAGES.length - 1];
}

// local 0..1 progress *within* the current stage
export function localProgress(p, stage) {
  const span = stage.to - stage.from || 1;
  return Math.min(1, Math.max(0, (p - stage.from) / span));
}
