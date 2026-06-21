// Tonal color progression — the journey told in background colour: dawn → alpine → summit
// (the palette locked in REBUILD_BLUEPRINT). Every stop stays LIGHT on purpose, so the dark
// `--ink` text keeps WCAG AA contrast over the canvas and no per-beat text-colour flip is needed
// (the accessible alternative to Noomo's dark `sectionColor`). Atmosphere.jsx samples these by
// scrollProgress and writes scene.background + fog colour, so the whole world warms then cools
// then clears as you climb. Choreography-as-data — edit here to retune the mood.
export const SKY = [
  { at: 0.0, color: '#e9e1d6' }, // dawn — warm sand, the morning trailhead (matches --bg)
  { at: 0.28, color: '#ece0cd' }, // dawn gold — sun higher, still warm
  { at: 0.5, color: '#e6e3da' }, // the turn — warm neutral as the air cools
  { at: 0.72, color: '#dbe2ec' }, // alpine — cool fog-grey, thinner air
  { at: 0.9, color: '#e8eef6' }, // summit light — clear and high
  { at: 1.0, color: '#eef3fa' }, // summit — bright, above the clouds
];
