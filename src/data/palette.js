// Tonal color progression — the journey told in background colour: dawn → alpine → summit
// (the palette locked in REBUILD_BLUEPRINT). Every stop stays LIGHT on purpose, so the dark
// `--ink` text keeps WCAG AA contrast over the canvas and no per-beat text-colour flip is needed
// (the accessible alternative to Noomo's dark `sectionColor`). Atmosphere.jsx samples these by
// scrollProgress and writes scene.background + fog colour, so the whole world warms then cools
// then clears as you climb. Choreography-as-data — edit here to retune the mood.
// Night → sunny: the climb begins in the dark and breaks into a brilliant sunny summit where the
// phoenix flies into the sun. Because the early stops are dark, the DOM text colour flips with it
// (see App.jsx → --ink/--muted) so it stays readable — light text at night, dark text by day.
export const SKY = [
  { at: 0.0, color: '#0e1526' }, // deep night — the trailhead in the dark
  { at: 0.18, color: '#1b2238' }, // night, the climb begins
  { at: 0.38, color: '#46415c' }, // first light, pre-dawn
  { at: 0.56, color: '#9a7560' }, // sunrise — warm light breaks
  { at: 0.74, color: '#d8b48c' }, // golden morning on the climb
  { at: 0.9, color: '#b9c2c8' }, // the sky opens — warm gives to cool
  { at: 1.0, color: '#8ab6e2' }, // brilliant sunny BLUE sky — so the white-fire phoenix pops
];

// Day factor 0→1 (night→day) used to flip text colour + ramp scene lighting. Crosses around the
// sunrise so the bright sections get dark text and the dark sections get light text.
export function dayAt(p) {
  const t = Math.min(1, Math.max(0, (p - 0.4) / 0.22));
  return t * t * (3 - 2 * t);
}
