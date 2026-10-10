// The Climb's journey: six stages of a heroic soul's passage, from a desert night to the golden fields
// (spec 2026-10-09). Pure data and math, shared by the world and the page.
export const STAGES = [
  { slug: 'the-ordinary-world', name: 'The Ordinary World', step: 'Where every journey starts', climate: 'Sonoran desert', time: 'Deep night', line: 'Saguaros under the stars. Home.' },
  { slug: 'the-call', name: 'The Call', step: 'Something stirs', climate: 'Pine forest', time: 'Blue hour', line: 'A first ember on the wind.' },
  { slug: 'the-threshold', name: 'The Threshold', step: 'Crossing over', climate: 'River in mist', time: 'Dawn', line: 'Through the arch, over the water.' },
  { slug: 'the-trials', name: 'The Trials', step: 'The hard climb', climate: 'Wind and rain on the ridge', time: 'Grey day', line: 'Hands on the rope.' },
  { slug: 'the-ordeal', name: 'The Ordeal', step: 'The darkest point', climate: 'Snowfield', time: 'Dusk into night', line: 'Out of the cold, the phoenix rises.' },
  { slug: 'the-harvest', name: 'The Harvest', step: 'Rest, earned', climate: 'Golden wheat', time: 'Golden hour', line: 'Golden wheat at golden hour.' },
];

export const MOODS = [
  { zenith: '#05070f', horizon: '#1b2338', glow: '#3a4466', cloudLit: '#272d40', cloudShade: '#0a0d16', fog: '#111626', light: '#9fb2d8', sun: [0.2, 0.26, -1], sunI: 0.5, hemi: 0.4, exposure: 1.1, stars: 1 },
  { zenith: '#1a2a48', horizon: '#6d8cb4', glow: '#b0a8d4', cloudLit: '#8c9cb8', cloudShade: '#2c3850', fog: '#3a4a63', light: '#a8bedb', sun: [-0.5, -0.05, -1], sunI: 0.8, hemi: 0.6, exposure: 1.15, stars: 0.5 },
  { zenith: '#5f7189', horizon: '#ecc3a0', glow: '#f7cda6', cloudLit: '#f4ece2', cloudShade: '#9aa2ad', fog: '#c9c3bb', light: '#ffe0bf', sun: [0.4, 0.012, -1], sunI: 1.6, hemi: 0.95, exposure: 1.1, stars: 0 },
  { zenith: '#4f5862', horizon: '#9aa1a8', glow: '#8f979e', cloudLit: '#c5c9cd', cloudShade: '#6d747b', fog: '#868d94', light: '#d6dee6', sun: [0.12, 1, -0.3], sunI: 0.9, hemi: 1.35, exposure: 1.05, stars: 0 },
  { zenith: '#151a2c', horizon: '#a84f3c', glow: '#c96a4e', cloudLit: '#c9a7a0', cloudShade: '#3a3a4c', fog: '#4a4658', light: '#e8b49a', sun: [-0.6, -0.07, -1], sunI: 0.9, hemi: 0.55, exposure: 1.15, stars: 0.4 },
  { zenith: '#5e4a36', horizon: '#ffbb6e', glow: '#ffa95a', cloudLit: '#fff1d6', cloudShade: '#b59a76', fog: '#e9c99a', light: '#ffd9a0', sun: [0.0, 0.06, -1], sunI: 3.4, hemi: 1.1, exposure: 1.1, stars: 0 },
];

const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function stageAt(progress) {
  const p = clamp01(progress) * STAGES.length;
  const index = Math.min(STAGES.length - 1, Math.floor(p));
  return { index, t: clamp01(p - index) };
}

export function progressFromScroll(scrollY, tops, viewport) {
  const n = tops.length;
  const centre = scrollY + viewport / 2;
  if (centre <= tops[0]) return 0;
  for (let i = 0; i < n; i++) {
    const a = tops[i], b = i + 1 < n ? tops[i + 1] : a + (a - (tops[i - 1] ?? a - viewport));
    if (centre < b) return clamp01((i + (centre - a) / (b - a)) / n);
  }
  return 1;
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const lerp = (a, b, t) => a + (b - a) * t;

export function blendMood(a, b, t) {
  const out = {};
  for (const k of Object.keys(b)) {
    if (k === 'sun') {
      const v = a.sun.map((x, i) => lerp(x, b.sun[i], t)); const l = Math.hypot(...v) || 1;
      out.sun = v.map((x) => x / l);
    } else if (typeof b[k] === 'number') out[k] = lerp(a[k], b[k], t);
    else { const ca = hex(a[k]), cb = hex(b[k]); out[k] = toHex(ca.map((x, i) => lerp(x, cb[i], t))); }
  }
  return out;
}
