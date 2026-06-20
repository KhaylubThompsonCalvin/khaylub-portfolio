// The five-phase scroll timeline (master prompt). Each phase owns a slice of
// scrollProgress (0..1). Weighted unequally, Noomo-style: big beats get more room.
// All systems (camera, character, atmosphere, UI) read from these ranges.

export const STAGES = [
  { id: 'arrival',     label: 'Arrival',           from: 0.00, to: 0.12 },
  { id: 'philosophy',  label: 'Philosophy',        from: 0.12, to: 0.30 },
  { id: 'focus',       label: 'Areas of Focus',    from: 0.30, to: 0.48 },
  { id: 'discovery',   label: 'Project Discovery', from: 0.48, to: 0.66 },
  { id: 'exploration', label: 'Project Exploration',from: 0.66, to: 0.88 },
  { id: 'contact',     label: 'Contact',           from: 0.88, to: 1.00 },
];

// total scroll height of the experience, in viewport-heights
export const SCROLL_VH = 700;

export function stageAt(p) {
  return STAGES.find((s) => p >= s.from && p < s.to) || STAGES[STAGES.length - 1];
}

// local 0..1 progress *within* the current stage
export function localProgress(p, stage) {
  const span = stage.to - stage.from || 1;
  return Math.min(1, Math.max(0, (p - stage.from) / span));
}
