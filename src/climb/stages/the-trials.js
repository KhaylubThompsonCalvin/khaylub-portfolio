// The Trials (stage 4): the hard climb, hands on the rope. A steep rocky ridge on a grey day of wind and rain: the camera
// stands on the crest where the fixed line starts; the ridge climbs away ahead into the cloud, the rope (a bright orange
// line) leading up its spine. Rain drives across the frame on the wind, gusts sweep veils of mist over the ridge, and
// ridge after ridge fades into the murk on either side. Flat, cool light from an overcast sky; no sun disc.
//
// Parts (about 11 draw calls of the stage's own, plus the Wanderer's ~33):
//   ridge     one heightfield along the ridge's curving spine (dense on the crest near the camera, coarse far off) with the
//             path on its crest; wet rock (sky reflected at grazing angles, puddles on the path), bedding bands, moss on
//             the ledges. groundAt reads the same height function, so the Wanderer walks on it.
//   rocks     boulders strewn on the crest edges and the flanks (one instanced mesh; the first is the gear ledge)
//   far       four ranges of ridges across the valleys, flat ribbons that each sit deeper in the haze (one merged mesh)
//   rope      the fixed line: a sagging rope on iron stakes up the spine, swaying in the gusts (one merged mesh)
//   overcast  the cloud deck: a dome over the stage drawn with the live sky's own colours plus a low, fast-moving scud,
//             which fades in only as the camera settles (so the stage's arrival never pops against the shared sky)
//   mist      wind-torn layers at 22, 55 and 120 m along every view ray (in the shaders), thickening with each gust
//   rain      up to 6,000 streaks (instanced quads) slanting with the wind, the slant and speed following the gusts
//   props     the coiled rope at the first stake, the ice axe and trekking poles on a ledge, a cairn up the crest (props,
//             scaled to real size, made a little glossy for the wet)
// The rock, rope, far ridges, cloud deck and mist are display-referred like the shared sky shader (no tone mapping), and the
// haze converges on exactly the sky's horizon colour (the live uniforms of the shared sky), so the ridge meets the sky
// without a seam at any point of the mood blend.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { dequantize } from '../../engine/dequantize.js';
import { MOODS } from '../journey.js';
import { LIFT } from '../path.js';

const MOOD = MOODS[3];
const RAIN = 6000, RAIN_SMALL = 4200, RAIN_LOW = 2200, LOW_BELOW = 0.7;
const ROCKS = 460, ROCKS_LOW = 220;
const HAZE_DIST = 260, CLOUD_BASE = 48;
const WIND = new THREE.Vector2(0.94, -0.34).normalize();   // from the left (the cliff side) across the ridge, a little away

// ---- the ridge's shape, shared by the mesh and groundAt (stage-local metres; the camera stands at z 40, looking toward -z)
const CAM_Z = 40;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// the integral of smoothstep(a, b, u) from 0 to u: a slope that eases in from flat to 1
const ramp = (u, a, b) => { if (u <= a) return 0; if (u >= b) return (b - a) * 0.5 + (u - b); const t = (u - a) / (b - a); return (b - a) * (t * t * t - t * t * t * t / 2); };
export function spineX(z) { const u = CAM_Z - z; return 1.4 + 3 * Math.sin(u * 0.013) + 40 * Math.sin(u * 0.0045) * smooth(15, 180, u); }
export function spineY(z) {
  const u = CAM_Z - z;
  if (u < 0) return u * 0.12;                                          // behind the camera the shoulder falls away gently
  return 0.34 * ramp(u, 8, 40) + 0.24 * ramp(u, 180, 450)
    + 1.4 * Math.sin(u * 0.11) * smooth(14, 40, u) + 4 * Math.sin(u * 0.031 + 1) * smooth(40, 110, u);
}
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function ridged(x, y) { let s = 0, amp = 0.5, f = 1; for (let o = 0; o < 4; o++) { s += amp * (1 - Math.abs(vnoise(x * f, y * f) * 2 - 1)); amp *= 0.5; f *= 2.03; } return s; }
// the height at a stage-local point
export function ridgeHeight(x, z) {
  const sx = spineX(z), d = x - sx, ad = Math.abs(d);
  const w = 3.0 + 1.3 * vnoise(z * 0.05, 3.7);                          // the crest's half width, 3 to 4.3 m
  const e = Math.max(0, ad - w);
  // the cliff side (left) is the steeper; buttresses and bays come and go along the ridge
  const fall = (e * (d < 0 ? 1.8 : 1.3) + e * e * 0.004) * (0.75 + 0.5 * vnoise(z * 0.035, d < 0 ? 1 : 7));
  const amp = 0.12 + Math.min(16, e * 0.17);
  const rock = amp * ((ridged(x * 0.045, z * 0.03) - 0.45) * 2 + 0.9 * (vnoise(z * 0.11 + x * 0.015, e * 0.025) - 0.5));
  const crest = -0.035 * Math.min(ad, w) * Math.min(ad, w) + 0.12 * (vnoise(x * 0.6, z * 0.6) - 0.5);
  return Math.max(-420, spineY(z) - fall + rock + crest);
}

// ---- shared GLSL: the sky's own formula (src/engine/sky.js), the haze with gusts and the cloud, noise
const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int o = 0; o < 4; o++) { s += a * n2(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }`;
const SKY_GLSL = /* glsl */ `
  uniform vec3 uSunDir, uZenith, uHorizon, uGlow;
  const vec3 COOL = vec3(0.56, 0.60, 0.66);
  vec3 skyAt(vec3 d) {
    float h = clamp(d.y, -0.2, 1.0), s = max(dot(d, normalize(uSunDir)), 0.0);
    vec3 hor = mix(COOL, uHorizon, pow(s, 3.0));
    vec3 col = mix(hor, uZenith, pow(smoothstep(-0.05, 0.55, h), 0.8));
    return col + uGlow * pow(s, 10.0) * 0.32 + uGlow * pow(s, 90.0) * 0.5;
  }
  // the overcast over this stage: the sky flattened toward its horizon colour, a lid of light grey (uDeck 0 at the top of a
  // transit, where the stage must match the shared sky, 1 once the camera has settled)
  uniform float uDeck;
  vec3 deckAt(vec3 d) { return mix(skyAt(d), skyAt(normalize(vec3(d.x, 0.0, d.z))) * 0.97, 0.72 * uDeck); }`;
const HAZE_GLSL = /* glsl */ `
  uniform float uTime, uGust, uHazeDist, uCloudBase, uRun; uniform vec2 uWindDir;
  // the cloud deck in a direction, with its slow mottling and the fast dark scud (needs NOISE_GLSL)
  vec3 deckFull(vec3 d) {
    vec3 base = deckAt(d);
    float h = max(d.y, 0.0);
    vec2 p = d.xz / (h + 0.12);
    float deck = fbm(p * 1.1 - uWindDir * uTime * 0.012);
    float scud = fbm(p * 2.6 + vec2(7.0, 3.0) - uWindDir * uRun * 0.05);
    float detail = smoothstep(0.0, 0.22, h) * uDeck;
    vec3 col = base * (1.0 + (deck - 0.5) * 0.45 * detail);
    col = mix(col, base * 0.7, smoothstep(0.5, 0.78, scud) * 0.55 * detail);   // ragged dark scud running under the deck
    return mix(col, base * 1.08, smoothstep(0.62, 0.9, deck) * 0.35 * detail);  // thinner, brighter patches
  }
  // gust fronts: bands rolling downwind, broken up across the wind
  float gustAt(vec2 p) {
    vec2 q = vec2(-uWindDir.y, uWindDir.x);
    float a = sin(dot(p, uWindDir) * 0.035 - uTime * 1.1 + sin(dot(p, q) * 0.02 + uTime * 0.2) * 1.8);
    return smoothstep(-0.2, 1.0, a) * (0.45 + 0.55 * uGust);
  }
  // wind-torn mist: three soft layers across each view ray (22, 55 and 120 m out), streaked along the wind and thickening as
  // a gust passes; a point in front of a layer is hardly touched by it, so no layer ever cuts a hard line through the rock
  float mistAt(vec3 p, float seed) {
    vec2 q = vec2(dot(p.xz, uWindDir), p.y);
    vec2 pp = vec2(q.x * 0.018, q.y * 0.09) - vec2(uRun * 0.11, 0.0) + vec2(seed * 13.0, 0.0);
    float n = fbm(pp) * 0.7 + n2(pp * vec2(2.2, 3.5) + vec2(-uRun * 0.05, uTime * 0.04)) * 0.3;
    return smoothstep(0.33, 0.72, n) * (0.25 + gustAt(p.xz));
  }
  vec3 mist(vec3 col, vec3 dir, float d) {
    vec3 mc = deckAt(normalize(vec3(dir.x, 0.0, dir.z))) * 1.05;
    for (int k = 0; k < 3; k++) {
      float D = k == 0 ? 22.0 : k == 1 ? 55.0 : 120.0, A = k == 0 ? 0.42 : k == 1 ? 0.55 : 0.5;
      float w = smoothstep(D * 0.6, D * 1.5, d);
      col = mix(col, mc, clamp(mistAt(cameraPosition + dir * D, float(k)) * A * w, 0.0, 1.0));
    }
    return col;
  }
  // haze toward the sky's horizon colour; thicker where a gust passes between us and the point, into murk below the crest
  // line (the valleys) and into the cloud above the cloud base
  vec3 haze(vec3 col, vec3 world, float k) {
    vec3 v = world - cameraPosition; float d = length(v); vec3 dir = v / d;
    float g = gustAt((cameraPosition + v * min(1.0, 45.0 / d)).xz);
    float f = 1.0 - exp(-d / (uHazeDist * k * (1.0 - 0.45 * g)));
    f = max(f, smoothstep(-25.0, -190.0, world.y));
    float cloud = smoothstep(uCloudBase, uCloudBase + 70.0, world.y);
    f = max(max(f, cloud), smoothstep(1700.0, 2400.0, d));
    vec3 hd = normalize(vec3(dir.x, max(dir.y, 0.0), dir.z));
    // into the cloud a point takes on the deck itself (texture and all), so the ridge's top melts into it without an edge
    vec3 target = mix(deckAt(hd) * (1.0 + 0.06 * g), deckFull(hd), cloud);
    return mist(mix(col, target, f), dir, d);
  }`;

const BASIC_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;

// ---- the ridge
const RIDGE_VERT = /* glsl */ `
  attribute float aAcross;
  varying vec3 vWorld, vNormal; varying float vAcross;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz; vNormal = normal; vAcross = aAcross;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
// wet rock: the light of an overcast sky (bright from above, dark under overhangs), the sky reflected at grazing angles, a
// gravel path with puddles on the crest, moss on the flatter ledges, bedding bands in the rock
const ROCK_LIGHT_GLSL = /* glsl */ `
  uniform vec3 uLight;
  vec3 wetRock(vec3 base, vec3 N, vec3 world, float wet, float puddle) {
    float amb = mix(0.28, 1.0, N.y * 0.5 + 0.5);
    amb *= 0.72 + 0.45 * max(dot(N, normalize(vec3(-0.35, 0.8, 0.45))), 0.0);   // the brighter sky upwind and behind us
    vec3 col = base * amb * uLight;
    vec3 V = normalize(cameraPosition - world), R = reflect(-V, N);
    float nv = max(dot(N, V), 0.0);
    float fres = 0.035 + 0.965 * pow(1.0 - nv, 5.0);
    vec3 env = skyAt(normalize(vec3(R.x, max(R.y, 0.03), R.z)));
    col = mix(col, env * 0.75, clamp(fres * wet * 0.6, 0.0, 0.6));
    col += env * pow(max(R.y, 0.0), 14.0) * 0.1 * wet;                       // the soft sheen of the bright overcast above
    col = mix(col, env * 0.62, puddle * mix(0.3, 0.8, fres));                // standing water mirrors the sky
    return col;
  }`;
const RIDGE_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${SKY_GLSL}
  ${HAZE_GLSL}
  ${ROCK_LIGHT_GLSL}
  varying vec3 vWorld, vNormal; varying float vAcross;
  void main() {
    vec3 Nf = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    vec3 N = normalize(mix(normalize(vNormal), Nf, 0.5));
    float dist = distance(vWorld, cameraPosition);
    vec2 q = vWorld.xz;
    // fine rock relief, fading out with distance (it would only shimmer there)
    float near = 1.0 - smoothstep(30.0, 140.0, dist);
    // on the steep faces the texture runs on the wall (x + z, y) instead of the ground plane, so it never stretches
    float steep = smoothstep(0.45, 0.8, 1.0 - abs(N.y));
    vec2 t = mix(q, vec2(vWorld.x + vWorld.z, vWorld.y * 1.4), steep);
    float h0 = fbm(t * 0.8), hx = fbm(t * 0.8 + vec2(0.3, 0.0)), hz = fbm(t * 0.8 + vec2(0.0, 0.3));
    N = normalize(N + vec3(h0 - hx, (h0 - hz) * steep, (h0 - hz) * (1.0 - steep)) * 2.2 * near);
    float big = fbm(t * 0.05 + vWorld.y * 0.01);
    float strata = smoothstep(0.35, 0.65, sin(vWorld.y * 1.9 + big * 7.0) * 0.5 + 0.5);
    vec3 base = mix(vec3(0.085, 0.09, 0.1), vec3(0.17, 0.165, 0.16), big * 0.7 + strata * 0.35);
    base *= 0.8 + 0.4 * h0 + 0.25 * (fbm(t * 0.012) - 0.5);
    // the path along the crest: grey gravel, worn lighter, with stones and the puddles of the rain
    float onPath = (1.0 - smoothstep(0.7, 1.4, abs(vAcross))) * smoothstep(0.8, 0.95, N.y + 0.12);
    float grit = n2(q * 9.0);
    base = mix(base, vec3(0.22, 0.21, 0.2) * (0.8 + 0.4 * grit), onPath * 0.85);
    float puddle = onPath * smoothstep(0.7, 0.76, n2(q * 0.45 + 3.1) * 0.7 + n2(q * 1.7) * 0.3) * near;
    // moss and wiry grass on the gentler ledges and the crest edges
    float moss = smoothstep(0.7, 0.9, N.y) * smoothstep(0.45, 0.65, fbm(q * 0.35 + 5.0)) * (1.0 - onPath);
    base = mix(base, vec3(0.13, 0.15, 0.085) * (0.7 + 0.6 * grit), moss * 0.85);
    // rain runs down the steeper faces in dark wet streaks
    float runs = smoothstep(0.55, 0.8, n2(vec2((vWorld.x + vWorld.z) * 1.3, vWorld.y * 0.12))) * steep;
    base *= 1.0 - 0.35 * runs;
    if (puddle > 0.0) N = normalize(mix(N, vec3(0.0, 1.0, 0.0), puddle));
    vec3 col = wetRock(base, N, vWorld, 0.4 + 0.3 * runs - 0.3 * moss - 0.15 * steep, puddle);
    // rain rings on the puddles: tiny dark flecks that come and go
    float ring = step(0.985, hash(floor(q * 14.0) + floor(uTime * 6.0)));
    col *= 1.0 - ring * puddle * 0.5;
    gl_FragColor = vec4(haze(col, vWorld, 1.0), 1.0);
  }`;

// ---- boulders (instanced)
const BOULDER_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() { vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const BOULDER_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${SKY_GLSL}
  ${HAZE_GLSL}
  ${ROCK_LIGHT_GLSL}
  varying vec3 vWorld;
  void main() {
    vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    vec2 t = vWorld.xz * 1.7 + vWorld.y * 1.3;
    float n = fbm(t), nx = fbm(t + vec2(0.25, 0.0)), nz = fbm(t + vec2(0.0, 0.25));
    N = normalize(N + vec3(n - nx, 0.0, n - nz) * 1.6 * (1.0 - smoothstep(20.0, 80.0, distance(vWorld, cameraPosition))));
    vec3 base = mix(vec3(0.085, 0.09, 0.1), vec3(0.2, 0.198, 0.19), n);
    float lichen = smoothstep(0.78, 0.86, n2(vWorld.xz * 11.0 + vWorld.y * 9.0)) * smoothstep(0.3, 0.8, N.y);
    base = mix(base, vec3(0.24, 0.23, 0.17), lichen * 0.5);
    gl_FragColor = vec4(haze(wetRock(base, N, vWorld, 0.45, 0.0), vWorld, 1.0), 1.0);
  }`;

// ---- far ridges: flat ribbons with gullies, each range deeper in the haze
const FAR_VERT = /* glsl */ `
  attribute float aTop;
  varying vec3 vWorld; varying float vTop;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vTop = aTop; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const FAR_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${SKY_GLSL}
  ${HAZE_GLSL}
  varying vec3 vWorld; varying float vTop;
  void main() {
    float a = atan(vWorld.x - cameraPosition.x, -(vWorld.z - cameraPosition.z));
    float r = distance(vWorld.xz, cameraPosition.xz);
    vec2 t = vec2(a * r, vWorld.y) * 0.03;
    float rock = fbm(t) * 0.6 + fbm(t * vec2(3.0, 1.2)) * 0.4;
    vec3 col = mix(vec3(0.06, 0.065, 0.075), vec3(0.15, 0.155, 0.16), smoothstep(0.3, 0.75, rock));
    col *= mix(0.8, 1.1, smoothstep(0.6, 1.0, vTop));                     // the crests catch the sky
    gl_FragColor = vec4(haze(col, vWorld, 1.7), 1.0);
  }`;

// ---- the rope and its stakes (one mesh; aColour per vertex, aSag 0 at a stake, 1 at mid-span)
const ROPE_VERT = /* glsl */ `
  attribute vec3 aColour; attribute float aSag;
  uniform float uTime, uGust; uniform vec2 uWindDir;
  varying vec3 vWorld, vNormal, vColour;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float dist = distance(wp.xyz, cameraPosition);
    // far off the rope grows thicker (never thinner than about a pixel, so the line does not break up) and the gusts swing it
    wp.xyz += normal * 0.014 * clamp(dist * 0.045 - 1.0, 0.0, 6.0);
    float swing = sin(uTime * 2.3 + wp.z * 0.21) * 0.5 + sin(uTime * 3.7 + wp.z * 0.5) * 0.25;
    wp.xz += uWindDir * aSag * (0.05 + 0.12 * uGust) * (0.6 + 0.4 * swing);
    vWorld = wp.xyz; vNormal = normal; vColour = aColour;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const ROPE_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${SKY_GLSL}
  ${HAZE_GLSL}
  uniform vec3 uLight;
  varying vec3 vWorld, vNormal, vColour;
  void main() {
    vec3 N = normalize(vNormal), V = normalize(cameraPosition - vWorld);
    float amb = mix(0.4, 1.0, N.y * 0.5 + 0.5);
    vec3 col = vColour * amb * uLight;
    col += skyAt(reflect(-V, N)) * pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.25;   // wet: a thin sheen along it
    gl_FragColor = vec4(haze(col, vWorld, 1.25), 1.0);
  }`;

// ---- the cloud deck over the stage
const DECK_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${SKY_GLSL}
  ${HAZE_GLSL}
  varying vec3 vWorld;
  void main() { vec3 d = normalize(vWorld - cameraPosition); gl_FragColor = vec4(mist(deckFull(d), d, 1e4), 1.0); }`;

// ---- rain: instanced streaks in a box ahead of the camera, wrapped in the shader
const RAIN_VERT = /* glsl */ `
  attribute vec3 aPos; attribute float aSeed;
  uniform float uGust, uPx; uniform vec2 uWindDir; uniform vec3 uBox, uOrigin, uDrift;
  varying float vA; varying vec2 vUv;
  void main() {
    float push = 4.0 + 7.0 * uGust;
    vec3 vel = vec3(uWindDir.x * push, -(8.5 + aSeed * 2.5), uWindDir.y * push);
    vec3 p = mod(aPos * uBox + uDrift * vec3(1.0, 0.92 + aSeed * 0.3, 1.0) * (0.92 + aSeed * 0.16), uBox);
    vec3 c = uOrigin + p;
    vec3 dir = normalize(vel);
    float len = 0.3 + aSeed * 0.4;
    vec3 view = c - cameraPosition; float dist = length(view);
    vec3 side = normalize(cross(dir, view / dist));
    float widen = max(1.0, dist * 1.6 / (0.0045 * uPx));
    vec3 wp = c + dir * len * (position.y - 0.5) + side * position.x * 0.0045 * widen;
    vA = smoothstep(2.0, 5.0, dist) * (1.0 - smoothstep(28.0, 44.0, dist)) / sqrt(widen) * (0.5 + 0.8 * aSeed);
    vUv = position.xy;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }`;
const RAIN_FRAG = /* glsl */ `
  uniform vec3 uRainCol;
  varying float vA; varying vec2 vUv;
  void main() {
    float a = vA * (1.0 - abs(vUv.x * 2.0)) * sin(3.14159 * vUv.y);
    gl_FragColor = vec4(uRainCol * a, 1.0);
  }`;

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// the ridge mesh: columns across the spine (dense on the crest), rows along it (dense near the camera). About 50,000
// heights to sample (some 50 ms), so it is built in slices of a few milliseconds, yielding between them: the stage builds one
// ahead while another is on screen, and a single long build would be a freeze in the middle of that stage.
const SLICE_MS = 6;
const yieldFrame = () => new Promise((r) => setTimeout(r, 0));
async function ridgeGeometry() {
  const across = [];
  for (let u = 0; u <= 6; u += 0.5) across.push(u);
  for (let u = 7; u <= 40; u += 1.5) across.push(u);
  for (let u = 43; u <= 130; u += 3) across.push(u);
  for (let u = 136, s = 6; u <= 640; u += s, s *= 1.1) across.push(u);
  const cols = [...across.slice(1).reverse().map((u) => -u), ...across];
  const rows = [];
  for (let z = 130, s = 6; z > 64; z -= s) rows.push(z);
  for (let z = 64; z > -30; z -= 0.6) rows.push(z);
  for (let z = -30, s = 0.8; z > -900; z -= s, s = Math.min(16, s * 1.035)) rows.push(z);
  const nx = cols.length, nz = rows.length;
  const P = new Float32Array(nx * nz * 3), A = new Float32Array(nx * nz), N = new Float32Array(nx * nz * 3);
  let t0 = performance.now();
  const breathe = async () => { if (performance.now() - t0 > SLICE_MS) { await yieldFrame(); t0 = performance.now(); } };
  for (let j = 0; j < nz; j++) {
    const z = rows[j], sx = spineX(z);
    for (let i = 0; i < nx; i++) {
      const x = sx + cols[i], k = j * nx + i;
      P[k * 3] = x; P[k * 3 + 1] = ridgeHeight(x, z); P[k * 3 + 2] = z; A[k] = cols[i];
    }
    await breathe();
  }
  // normals from the grid's neighbours (central differences): cross(along -z, across +x) points up
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i, l = j * nx + Math.max(0, i - 1), r = j * nx + Math.min(nx - 1, i + 1);
      const b = Math.max(0, j - 1) * nx + i, f = Math.min(nz - 1, j + 1) * nx + i;
      const ax = P[r * 3] - P[l * 3], ay = P[r * 3 + 1] - P[l * 3 + 1], az = P[r * 3 + 2] - P[l * 3 + 2];
      const fx = P[f * 3] - P[b * 3], fy = P[f * 3 + 1] - P[b * 3 + 1], fz = P[f * 3 + 2] - P[b * 3 + 2];
      let x = fy * az - fz * ay, y = fz * ax - fx * az, z = fx * ay - fy * ax;
      if (y < 0) { x = -x; y = -y; z = -z; }
      const len = Math.hypot(x, y, z) || 1;
      N[k * 3] = x / len; N[k * 3 + 1] = y / len; N[k * 3 + 2] = z / len;
    }
    if ((j & 15) === 15) await breathe();
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let o = 0;
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx[o++] = a; idx[o++] = b; idx[o++] = c; idx[o++] = b; idx[o++] = d; idx[o++] = c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('aAcross', new THREE.BufferAttribute(A, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

// far ranges: ribbons on arcs around the camera, from deep in the valley murk up to a ragged crest line
function farGeometry(rand, cam) {
  const P = [], T = [], IDX = [];
  const ranges = [[400, 5, 70, 2.4], [820, 30, 130, 1.8], [1300, 60, 210, 1.3], [2000, 110, 330, 1.0]];
  for (const [R, lo, hi, freq] of ranges) {
    const SEG = 360, A0 = -2.0, A1 = 2.0, base = P.length / 3, off = rand() * 100;
    for (let i = 0; i <= SEG; i++) {
      const a = A0 + (A1 - A0) * (i / SEG);
      const r = R * (1 + 0.08 * Math.sin(a * 3 + off));
      // peaks: a ridged profile, higher toward the sides (the valley opens ahead, the ranges wall it in)
      const prof = ridged(a * freq * 3 + off, off * 0.1) * 0.75 + vnoise(a * freq * 14 + off, 1.3) * 0.25;
      const top = lo + (hi - lo) * prof * (0.65 + 0.35 * smooth(0.2, 1.4, Math.abs(a)));
      const x = cam.x + Math.sin(a) * r, z = cam.z - Math.cos(a) * r;
      P.push(x, -320, z, x, top, z); T.push(0, 1);
      if (i) { const b = base + (i - 1) * 2; IDX.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(T, 1));
  g.setIndex(IDX);
  return g;
}

// the fixed line: stakes every few metres up the crest (left of the path), the rope sagging between them
export const ROPE_ACROSS = -1.25;
function ropeGeometry() {
  const parts = [];
  const orange = [0.78, 0.25, 0.07], iron = [0.06, 0.06, 0.065];
  const stakes = [];
  for (let u = 8, s = 5.5; u < 420; u += s, s = Math.min(9, s * 1.02)) stakes.push(u);
  const pt = (u, lift) => { const z = CAM_Z - u, x = spineX(z) + ROPE_ACROSS; return new THREE.Vector3(x, ridgeHeight(x, z) + lift, z); };
  const colour = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) a.set(c, k * 3); g.setAttribute('aColour', new THREE.BufferAttribute(a, 3)); };
  const sag = (g, v) => g.setAttribute('aSag', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(v), 1));
  for (const u of stakes) {
    const top = pt(u, 0.95);
    const s = new THREE.CylinderGeometry(0.018, 0.022, 1.15, 5, 1, true); s.translate(top.x, top.y - 0.5, top.z);
    const eye = new THREE.TorusGeometry(0.04, 0.008, 3, 8); eye.translate(top.x, top.y + 0.02, top.z);
    for (const g of [s, eye]) { g.deleteAttribute('uv'); colour(g, iron); sag(g, 0); parts.push(g.toNonIndexed()); g.dispose(); }
  }
  // the rope: through each stake's eye, sagging between, as one long tube
  const pts = [], sags = [];
  for (let k = 0; k + 1 < stakes.length; k++) {
    const a = stakes[k], b = stakes[k + 1];
    for (let m = 0; m < 6; m++) {
      const t = m / 6, u = a + (b - a) * t, dip = Math.sin(Math.PI * t);
      pts.push(pt(u, 0.97 - 0.28 * dip)); sags.push(dip);
    }
  }
  pts.push(pt(stakes[stakes.length - 1], 0.97)); sags.push(0);
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const segs = pts.length * 4;
  const rope = new THREE.TubeGeometry(curve, segs, 0.014, 4, false);
  rope.deleteAttribute('uv'); colour(rope, orange);
  { const n = rope.attributes.position.count, a = new Float32Array(n), ring = 5;
    for (let k = 0; k < n; k++) { const f = Math.floor(k / ring) / segs * (pts.length - 1), i0 = Math.floor(f), t = f - i0; a[k] = sags[i0] + ((sags[i0 + 1] ?? 0) - sags[i0]) * t; }
    rope.setAttribute('aSag', new THREE.BufferAttribute(a, 1)); }
  parts.push(rope.toNonIndexed()); rope.dispose();
  const g = mergeGeometries(parts); parts.forEach((p) => p.dispose());
  return { geometry: g, firstStake: pt(stakes[0], 0) };
}

// a boulder: a lumpy icosahedron (flat-shaded in the shader, so its facets read as fractured rock)
function boulderGeometry(rand) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 0.78 + rand() * 0.44);
    const k = seen.get(key);
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k);
  }
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  return g;
}

export async function build(ctx) {
  const { scene, renderer, camera, anchor, lights, wanderer } = ctx;
  const group = new THREE.Group(); group.name = 'the-trials'; group.position.copy(anchor.centre);
  const rand = mulberry(4);
  const small = Math.min(innerWidth, innerHeight) < 700;
  const camLocal = anchor.cam.clone().sub(anchor.centre);
  // the shared sky's live uniforms (so the haze and the cloud deck follow the mood blend exactly); our own copy if absent
  const skyMesh = scene.getObjectByName('Sky');
  const su = skyMesh?.material?.uniforms;
  const sky = su ? { uSunDir: su.uSunDir, uZenith: su.uZenith, uHorizon: su.uHorizon, uGlow: su.uGlow }
    : { uSunDir: { value: new THREE.Vector3(...MOOD.sun).normalize() }, uZenith: { value: new THREE.Color(MOOD.zenith) }, uHorizon: { value: new THREE.Color(MOOD.horizon) }, uGlow: { value: new THREE.Color(MOOD.glow) } };
  const time = { value: 0 }, gust = { value: 0.5 }, run = { value: 0 }, windDir = { value: WIND.clone() };
  const light = { value: new THREE.Color(1.0, 1.03, 1.08) };
  const deckU = { value: 0 };
  const hazeU = { ...sky, uDeck: deckU, uTime: time, uGust: gust, uRun: run, uWindDir: windDir, uHazeDist: { value: HAZE_DIST }, uCloudBase: { value: CLOUD_BASE } };
  const disposables = [];
  const track = (...xs) => { disposables.push(...xs); return xs[0]; };

  // ---- the ridge
  const ridgeMat = track(new THREE.ShaderMaterial({ vertexShader: RIDGE_VERT, fragmentShader: RIDGE_FRAG, uniforms: { ...hazeU, uLight: light } }));
  const ridge = new THREE.Mesh(track(await ridgeGeometry()), ridgeMat); ridge.name = 'ridge'; ridge.frustumCulled = false;
  group.add(ridge);

  await yieldFrame();
  // ---- boulders: the first is the gear ledge beside the path; the rest along the crest edges and down the flanks
  const fullRocks = ROCKS;
  const rockMat = track(new THREE.ShaderMaterial({ vertexShader: BOULDER_VERT, fragmentShader: BOULDER_FRAG, uniforms: { ...hazeU, uLight: light } }));
  const rocks = new THREE.InstancedMesh(track(boulderGeometry(rand)), rockMat, fullRocks); rocks.name = 'boulders'; rocks.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const LEDGE_U = 12, ledgeZ = CAM_Z - LEDGE_U, ledgeX = spineX(ledgeZ) - 3.3, ledgeY = ridgeHeight(ledgeX, ledgeZ);
  const LEDGE = { x: ledgeX, y: ledgeY + 0.42, z: ledgeZ };
  q.setFromEuler(e.set(0.04, 0.5, -0.05)); s.set(1.15, 0.62, 0.8); p.set(ledgeX, ledgeY + 0.05, ledgeZ);
  rocks.setMatrixAt(0, m.compose(p, q, s));
  for (let i = 1; i < fullRocks; i++) {
    // distance up the ridge log-uniform (near rocks are many and small on screen), side by side across the crest
    const u = 4 * Math.pow(320 / 4, rand()), z = CAM_Z - u;
    const side = rand() < 0.5 ? -1 : 1, off = 2.4 + Math.pow(rand(), 1.6) * (8 + u * 0.25);
    const x = spineX(z) + side * off;
    const size = (0.14 + Math.pow(rand(), 3) * 0.95) * (1 + u * 0.012);
    q.setFromEuler(e.set((rand() - 0.5) * 0.6, rand() * 6.283, (rand() - 0.5) * 0.6));
    s.set(size * (0.8 + rand() * 0.5), size * (0.7 + rand() * 0.5), size * (0.8 + rand() * 0.5));
    p.set(x, ridgeHeight(x, z) + size * 0.15, z);
    rocks.setMatrixAt(i, m.compose(p, q, s));
  }
  rocks.instanceMatrix.needsUpdate = true;
  group.add(rocks);

  // ---- the far ranges
  const farMat = track(new THREE.ShaderMaterial({ vertexShader: FAR_VERT, fragmentShader: FAR_FRAG, side: THREE.DoubleSide, uniforms: { ...hazeU } }));
  const far = new THREE.Mesh(track(farGeometry(rand, camLocal)), farMat); far.name = 'far-ridges'; far.frustumCulled = false;
  group.add(far);

  await yieldFrame();
  // ---- the fixed line
  const { geometry: ropeGeo, firstStake } = ropeGeometry();
  const ropeMat = track(new THREE.ShaderMaterial({ vertexShader: ROPE_VERT, fragmentShader: ROPE_FRAG, uniforms: { ...hazeU, uLight: light } }));
  const rope = new THREE.Mesh(track(ropeGeo), ropeMat); rope.name = 'fixed-line'; rope.frustumCulled = false;
  group.add(rope);

  // ---- the cloud deck: a dome around the camera, nearer than the shared sky so it covers it while the stage is shown. It is
  // drawn after the opaque terrain (renderOrder 1, depth tested, writing no depth), so its heavy shader skips every pixel the
  // ridge already covers
  const deckGeo = track(new THREE.SphereGeometry(2600, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.56));
  const deckMat = track(new THREE.ShaderMaterial({ vertexShader: BASIC_VERT, fragmentShader: DECK_FRAG, side: THREE.BackSide, depthWrite: false,
    uniforms: { ...hazeU } }));
  const deck = new THREE.Mesh(deckGeo, deckMat); deck.name = 'cloud-deck'; deck.frustumCulled = false; deck.renderOrder = 1;
  group.add(deck);

  // ---- rain
  const fullRain = small ? RAIN_SMALL : RAIN;
  const rainGeo = track(new THREE.InstancedBufferGeometry());
  rainGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  rainGeo.setIndex([0, 1, 2, 0, 2, 3]);
  { const ap = new Float32Array(fullRain * 3), as = new Float32Array(fullRain);
    for (let k = 0; k < fullRain; k++) { ap.set([rand(), rand(), rand()], k * 3); as[k] = rand(); }
    rainGeo.setAttribute('aPos', new THREE.InstancedBufferAttribute(ap, 3)); rainGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(as, 1)); }
  rainGeo.instanceCount = fullRain;
  const box = new THREE.Vector3(34, 20, 46);
  const rainMat = track(new THREE.ShaderMaterial({ vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uGust: gust, uWindDir: windDir, uPx: { value: 1 }, uBox: { value: box }, uOrigin: { value: new THREE.Vector3() }, uDrift: { value: new THREE.Vector3() }, uRainCol: { value: new THREE.Color(0.36, 0.39, 0.43) } } }));
  const rain = new THREE.Mesh(rainGeo, rainMat); rain.name = 'rain'; rain.frustumCulled = false; rain.renderOrder = 3;
  group.add(rain);

  // ---- the Wanderer's light (ctx.lights, never added): a cool key from our side above, a pale rim from the ridge ahead
  const [key, rim] = lights;
  key.color.set('#dfe7f0'); key.distance = 9; key.decay = 2;
  rim.color.set('#c9d4e2'); rim.distance = 7; rim.decay = 2;

  // ---- props: loaded in the background (the ridge never waits), made plain floats (no first-draw shader variant on
  // Direct3D), warmed, then shown once their textures are up
  const props = [];      // { root, uploads }
  let disposed = false;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  // at: where it stands (stage-local x, z); on: the surface height there (default the ridge); rot: its turn and lean
  const PROPS = [
    // the coil of spare rope at the foot of the first stake, where the fixed line starts
    { file: 'climbing-rope', size: 0.5, axis: 'xz', at: [firstStake.x - 0.45, firstStake.z + 0.4], rot: [0, 0.6, 0] },
    // at the ledge: the poles leaning against it, the axe laid on its top
    { file: 'trekking-poles', size: 1.25, axis: 'y', at: [LEDGE.x + 1.25, LEDGE.z + 0.6], rot: [0.12, -0.5, -0.4] },
    { file: 'ice-axe', size: 0.7, axis: 'y', at: [LEDGE.x, LEDGE.z], on: LEDGE.y, rot: [0, 0.75, Math.PI / 2] },
    // the cairn up the crest: the waymark the Wanderer climbs toward
    { file: 'summit-cairn', size: 1.25, axis: 'y', at: [spineX(CAM_Z - 36) + 2.0, CAM_Z - 36], rot: [0, 0.3, 0] },
  ];
  for (const def of PROPS) {
    loader.loadAsync(import.meta.env.BASE_URL + `models/props/${def.file}.glb`).then(async (gltf) => {
      if (disposed) return;
      const root = gltf.scene;
      dequantize(root);   // plain floats: no fresh vertex shader at the first draw on Direct3D (see src/engine/dequantize.js)
      root.traverse((o) => {
        // one plain standard material per prop (the loader's volume extension makes a physical one): wet, a little glossy
        if (o.isMesh) {
          const old = o.material;
          o.material = new THREE.MeshStandardMaterial({ map: old.map, normalMap: old.normalMap, roughnessMap: old.roughnessMap, metalnessMap: old.metalnessMap,
            color: old.color, roughness: Math.min(1, old.roughness) * 0.62, metalness: old.metalness });
          old.dispose();
        }
      });
      // real size: the longest extent along the chosen axis
      const bb = new THREE.Box3().setFromObject(root), sz = bb.getSize(new THREE.Vector3());
      const along = def.axis === 'y' ? sz.y : Math.max(sz.x, sz.z);
      const k = def.size / along;
      const holder = new THREE.Group(); holder.name = def.file;
      root.scale.multiplyScalar(k);
      root.position.set(-(bb.min.x + bb.max.x) / 2 * k, -(bb.min.y + bb.max.y) / 2 * k, -(bb.min.z + bb.max.z) / 2 * k);
      holder.add(root);
      holder.rotation.set(...def.rot); holder.updateMatrixWorld(true);
      const turned = new THREE.Box3().setFromObject(holder);   // after the turn and lean: rest its lowest point on the surface
      const [x, z] = def.at, y = def.on ?? ridgeHeight(x, z);
      holder.position.set(x, y - turned.min.y - 0.02, z);
      try { await renderer.compileAsync(holder, camera, scene); } catch (err) { console.warn(`The Trials: ${def.file} warm-up failed; it compiles on first sight`, err); }
      if (disposed) { disposeTree(holder); return; }
      const uploads = [];
      holder.traverse((o) => { for (const mat of [].concat(o.material || [])) for (const t in mat) if (mat[t]?.isTexture) uploads.push(mat[t]); });
      holder.visible = false;
      props.push({ root: holder, uploads }); group.add(holder); ctx.requestDraw();
    }).catch((err) => console.warn(`The Trials: ${def.file} did not load; the ridge goes on without it`, err));
  }

  scene.add(group);

  const fall = new THREE.Vector3(), wPos = new THREE.Vector3();
  function update(dt, localT) {
    if (!group.visible) return;
    const still = ctx.still;
    if (!still) time.value += dt;
    const t = time.value;
    // the wind: a steady blow with gusts building and dying every few seconds
    const g = 0.5 + 0.3 * Math.sin(t * 0.55) + 0.2 * Math.sin(t * 1.37 + 1.3) * Math.sin(t * 0.23);
    gust.value = still ? 0.65 : Math.min(1, Math.max(0, g));
    if (!still) {
      run.value += dt * (1 + 0.9 * gust.value);
      const push = 4 + 7 * gust.value;
      rainMat.uniforms.uDrift.value.add(fall.set(WIND.x * push, -9.5, WIND.y * push).multiplyScalar(dt));
    }
    const low = ctx.quality < LOW_BELOW;
    rainGeo.instanceCount = low ? Math.min(fullRain, RAIN_LOW) : fullRain;
    rocks.count = low ? ROCKS_LOW : fullRocks;
    // the cloud deck's own detail comes in only as the camera settles on the anchor (none at the top of a transit)
    const lift = Math.max(0, (camera.position.y - anchor.cam.y) / LIFT);
    deckU.value = 1 - smooth(0.02, 0.3, lift);
    deck.position.copy(camera.position).sub(group.position);
    // the rain box rides with the camera
    rainMat.uniforms.uOrigin.value.set(camera.position.x - box.x / 2, camera.position.y - box.y * 0.55, camera.position.z - box.z + 2);
    rainMat.uniforms.uPx.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));   // pixels per metre at 1 m
    // light on the Wanderer: a cool key from the camera side, a pale rim from up the ridge
    const w = wanderer.copyPosition(wPos);
    if (Number.isFinite(w.x)) {
      key.position.set(w.x - 1.6, w.y + 2.6, w.z + 2.6); key.intensity = 16;
      rim.position.set(w.x + 1.0, w.y + 2.2, w.z - 1.6); rim.intensity = 22;
    } else { key.intensity = 0; rim.intensity = 0; }
    // the props: their textures upload one a frame (all at once in still mode, which draws only on request)
    for (const pr of props) {
      if (pr.root.visible) continue;
      if (pr.uploads.length) { do renderer.initTexture(pr.uploads.shift()); while (still && pr.uploads.length); ctx.requestDraw(); break; }
      pr.root.visible = true; ctx.requestDraw();
    }
  }

  function disposeTree(o) {
    o.traverse((c) => { c.geometry?.dispose?.(); for (const mat of [].concat(c.material || [])) { for (const k in mat) mat[k]?.isTexture && mat[k].dispose(); mat.dispose(); } });
  }
  return {
    group, update,
    groundAt: (x, z) => anchor.centre.y + ridgeHeight(x - anchor.centre.x, z - anchor.centre.z),
    // he walks the path on the crest (the spine), the fixed line on his left
    pathAt: (z) => anchor.centre.x + spineX(z - anchor.centre.z),
    dispose() {
      disposed = true; scene.remove(group);
      for (const d of disposables) d.dispose();
      rocks.dispose();
      for (const pr of props) disposeTree(pr.root);
    },
  };
}
