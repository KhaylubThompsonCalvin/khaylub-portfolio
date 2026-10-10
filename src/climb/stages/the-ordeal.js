// The Ordeal (stage 5, the darkest point): a high snowfield at the end of dusk. The camera stands on a wind-scoured plateau
// that tilts down to a corniced edge; past the edge the land falls away into a sea of cloud, far peaks stand out of it, and
// a thin red line on the horizon is all that is left of the day, fading to night while the visitor stays. Snow falls and
// spindrift streams over the drifts. A small stone shelter holds a sleeping bag and a faint warm glow; a cairn stands on a
// knoll at the edge; an ice axe is planted by the door. At the stage's middle the phoenix rises out of the cloud sea with its
// ember trail, climbs into the last red light and arcs away over the edge.
//
// Parts (about 15 draw calls of the stage's own, plus the Wanderer's ~33):
//   snowfield  one heightfield mesh: the plateau with drifts and sastrugi, the knoll, the fall to the edge and the cliff
//              below it (heightAt() in JS and HEIGHT_GLSL below are the same function); unlit shader, display-referred
//   track      the Wanderer's trodden track: a line of footprints out toward the edge (one ribbon on the snow, 1 draw);
//              he walks on its centre line (pathAt)
//   cloud sea  one opaque billowed plane under the edge, lit pink on the sun side, hazing to the horizon
//   ranges     two far mountain ranges standing out of the clouds (one merged mesh, red on the sun side)
//   veil       a dome just inside the sky that darkens it toward night, keeping the red line on the horizon toward the sun
//   snow       falling flakes (2,800; 1,800 on a small screen), all motion in the vertex shader
//   spindrift  wind-blown snow streaming low over the drifts (1,000; 600 on a small screen); flakes total under 4,000
//   props      stone-shelter, sleeping-bag (inside it), snow-boulders (one InstancedMesh), summit-cairn, ice-axe: lighter
//              copies in public/models/props/ordeal/ (textures 1024 or 512, meshes simplified, meshopt), at true scale
//   phoenix    src/engine/phoenix.js on a path of its own, out of the cloud sea and away over the edge
// Lights: ctx.lights only (the shelter's warm glow, a rim on the Wanderer); nothing is added to the scene.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPhoenixFlight } from '../../engine/phoenix.js';
import { dequantize } from '../../engine/dequantize.js';
import { MOODS } from '../journey.js';
import { LIFT } from '../path.js';

const MOOD = MOODS[4];
const SNOW = 2800, SNOW_SMALL = 1800, DRIFT = 1000, DRIFT_SMALL = 600, LOW_BELOW = 0.7, LOW_SHARE = 0.45;
const CLOUD_Y = -12;                          // the cloud sea's mean top, stage space
const PHOENIX_Y = CLOUD_Y + 2;                // the flight's path y 0 sits just above the cloud tops (its ember burst fires there)
const PHOENIX_DELAY = 0.9;                    // seconds after arrival before the bird breaks out of the clouds
const STILL_AT = 5.5;                         // seconds into the flight for the still picture: high in the red light, wings wide
const PROP_FILL = '#8f98c4';
const WIND = new THREE.Vector2(1, -0.18).normalize();   // the wind blows from the sun side (left) across the plateau

// ---- the land: one height function, in JS (mesh, props, the Wanderer's feet) and in GLSL (spindrift)
const HEIGHT_GLSL = /* glsl */ `
  float sstep(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  float edgeZ(float x) { return -6.0 + 4.0 * sin(x * 0.05 + 0.6) + 3.0 * sin(x * 0.13 + 1.9) - 52.0 * sstep(-6.0, -38.0, x); }
  float heightAt(float x, float z) {
    float e = edgeZ(x);
    float t = clamp((12.0 - z) / (12.0 - e), 0.0, 1.0);
    float h = -5.0 * t * t;                                                    // the plateau rolls over to the edge
    h -= 150.0 * sstep(0.0, 40.0, e - z);                                      // the cliff under the cornice
    h -= 70.0 * sstep(-45.0, -170.0, x) * sstep(30.0, -20.0, z);               // the left falls away toward the sun
    h += 26.0 * sstep(35.0, 170.0, x) * sstep(-90.0, 0.0, z);                  // a snow shoulder on the right
    h += 6.5 * exp(-((x + 47.0) * (x + 47.0) + (z + 48.0) * (z + 48.0)) / 338.0);   // the knoll at the edge
    float s = sin(0.23 * x - 0.31 * z + sin(0.05 * z) * 2.0) * 0.12 + sin(0.07 * x + 0.11 * z) * 0.28 + sin(0.031 * x - 0.017 * z + 1.3) * 0.4;
    float pad = exp(-((x + 13.0) * (x + 13.0) + (z - 10.0) * (z - 10.0)) / 60.0);     // the shelter stands on a level pad
    return h + s * (1.0 - 0.6 * t) * (1.0 - pad) * sstep(-25.0, 0.0, z - e);
  }`;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const edgeZ = (x) => -6 + 4 * Math.sin(x * 0.05 + 0.6) + 3 * Math.sin(x * 0.13 + 1.9) - 52 * sstep(-6, -38, x);
// the trodden track: a line of footprints in the snow from under the camera's feet out toward the edge, a little right of
// the phoenix's rise (so the Wanderer walking in it never hides the bird) and drifting gently further right. The Wanderer walks on its centre line (pathAt). Stage space.
const TRACK_FROM = 44, TRACK_TO = 0.5, TRACK_HALF = 0.5, STRIDE = 0.36;
export const trackX = (z) => 1.35 + 0.5 * sstep(34, -4, z);
export function heightAt(x, z) {
  const e = edgeZ(x);
  const t = Math.min(1, Math.max(0, (12 - z) / (12 - e)));
  let h = -5 * t * t;
  h -= 150 * sstep(0, 40, e - z);
  h -= 70 * sstep(-45, -170, x) * sstep(30, -20, z);
  h += 26 * sstep(35, 170, x) * sstep(-90, 0, z);
  h += 6.5 * Math.exp(-((x + 47) * (x + 47) + (z + 48) * (z + 48)) / 338);
  const s = Math.sin(0.23 * x - 0.31 * z + Math.sin(0.05 * z) * 2) * 0.12 + Math.sin(0.07 * x + 0.11 * z) * 0.28 + Math.sin(0.031 * x - 0.017 * z + 1.3) * 0.4;
  const pad = Math.exp(-((x + 13) * (x + 13) + (z - 10) * (z - 10)) / 60);
  return h + s * (1 - 0.6 * t) * (1 - pad) * sstep(-25, 0, z - e);
}

// ---- shared GLSL: the sky's own formula (src/engine/sky.js), the night veil over it, and the haze toward both
const SKY_GLSL = /* glsl */ `
  uniform vec3 uSunDir, uZenith, uHorizon, uGlow;
  uniform float uNight, uVeil;
  const vec3 COOL = vec3(0.56, 0.60, 0.66);
  vec3 skyAt(vec3 d) {
    float h = clamp(d.y, -0.2, 1.0), s = max(dot(d, uSunDir), 0.0);
    vec3 hor = mix(COOL, uHorizon, pow(s, 3.0));
    vec3 col = mix(hor, uZenith, pow(smoothstep(-0.05, 0.55, h), 0.8));
    return col + uGlow * pow(s, 10.0) * 0.32 + uGlow * pow(s, 90.0) * 0.5;
  }
  // the veil: night closes over the sky; a thin red line stays on the horizon toward the sun, thinner and dimmer as it goes
  const vec3 NIGHT = vec3(0.022, 0.026, 0.052);
  vec4 veilAt(vec3 d) {
    vec2 hz = normalize(d.xz + vec2(1e-5, 0.0)), sz = normalize(uSunDir.xz);
    float s = max(dot(hz, sz), 0.0);
    float e = max(d.y + 0.012, 0.0);
    float width = mix(0.05, 0.022, uNight);
    float line = exp(-e / width) * pow(s, mix(2.0, 3.5, uNight));
    // uVeil: 1 on the anchor, fading to 0 as the camera lifts toward a change of set, so arriving and leaving never change
    // the sky in one frame (the world's own sky shows at the top of each transit)
    float a = mix(0.5, 0.84, uNight) * (1.0 - line * mix(0.8, 0.62, uNight)) * uVeil;
    vec3 col = mix(NIGHT, vec3(0.62, 0.11, 0.07), line * 0.55);
    return vec4(col, clamp(a, 0.0, 0.95));
  }
  vec3 nightSky(vec3 d) { vec4 v = veilAt(d); return mix(skyAt(d), v.rgb, v.a); }
  vec3 haze(vec3 col, vec3 world, float hazeDist) {
    vec3 v = world - cameraPosition; float d = length(v); vec3 dir = v / d;
    float f = 1.0 - exp(-d / hazeDist);
    f = max(f, smoothstep(1700.0, 2600.0, d));
    return mix(col, nightSky(normalize(vec3(dir.x, max(dir.y, -0.01), dir.z))), f);
  }`;

// the track: a ribbon laid on the snow (vT: metres across, metres along); a faint trodden band and alternating prints, in
// the snow's own shade, fading into the snow toward the edge
const TRACK_VERT = /* glsl */ `
  attribute vec2 aT; varying vec2 vT; varying float vFade;
  void main() { vT = aT; vFade = smoothstep(${TRACK_TO.toFixed(1)}, ${(TRACK_TO + 9).toFixed(1)}, position.z); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const TRACK_FRAG = /* glsl */ `
  uniform float uNight; varying vec2 vT; varying float vFade;
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  float print(vec2 t, float i) {
    float side = mod(i, 2.0) * 2.0 - 1.0;
    vec2 c = vec2(side * 0.12 + (hash(i) - 0.5) * 0.05, (i + 0.5) * ${STRIDE.toFixed(2)});
    vec2 d = (t - c) / vec2(0.06, 0.15);
    return 1.0 - smoothstep(0.6, 1.0, length(d));
  }
  void main() {
    float band = 1.0 - smoothstep(0.2, ${TRACK_HALF.toFixed(2)}, abs(vT.x));
    float i = floor(vT.y / ${STRIDE.toFixed(2)});
    float p = max(print(vT, i), max(print(vT, i - 1.0), print(vT, i + 1.0)));
    float a = (band * 0.3 + p * 0.55) * vFade;
    gl_FragColor = vec4(vec3(0.03, 0.03, 0.06), a);
  }`;

const SNOWFIELD_VERT = /* glsl */ `
  varying vec3 vWorld, vNormal;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vNormal = normal; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const SNOWFIELD_FRAG = /* glsl */ `
  ${SKY_GLSL}
  uniform vec3 uGlowPos; uniform float uGlowI;
  varying vec3 vWorld, vNormal;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = vWorld - cameraPosition; float d = length(v);
    // light from the sky: a cold blue-violet everywhere, a little brighter on faces open to the sky
    vec3 col = vec3(0.40, 0.44, 0.60) * (0.6 + 0.4 * n.y);
    // the last of the day: warm on faces turned toward the sun (below the horizon, so lifted: the glow of the sky over it)
    vec3 sl = normalize(uSunDir + vec3(0.0, 0.32, 0.0));
    float sun = max(dot(n, sl), 0.0);
    col += vec3(0.62, 0.28, 0.24) * pow(sun, 1.4) * (1.0 - 0.7 * uNight);
    col *= 1.0 - 0.35 * uNight;
    // the drifts' crests catch a glint now and then
    vec2 cell = floor(vWorld.xz * 7.0);
    float g = step(0.985, hash(cell)) * smoothstep(30.0, 4.0, d) * (0.5 + 0.5 * sin(hash(cell + 3.1) * 40.0 + d * 0.8));
    col += vec3(0.45, 0.45, 0.55) * g * 0.35;
    // the shelter's warm light spills onto the snow at its door
    float gd = distance(vWorld, uGlowPos);
    col += vec3(1.0, 0.5, 0.2) * uGlowI * 0.55 / (1.0 + gd * gd * 0.35);
    // the snow right at the camera's feet sits in its own shade (keeps the caption corner calm)
    col *= mix(0.62, 1.0, smoothstep(3.0, 16.0, d));
    gl_FragColor = vec4(haze(col, vWorld, 420.0), 1.0);
  }`;

const CLOUD_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld, vNormal; varying float vBillow;
  float bil(vec2 p) {
    return sin(p.x * 0.011 + uTime * 0.02) * sin(p.y * 0.013 - uTime * 0.015) * 5.0
         + sin(p.x * 0.031 + p.y * 0.017 + uTime * 0.03) * 2.5 + sin(p.x * 0.07 - p.y * 0.05) * 1.1;
  }
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float b = bil(wp.xz);
    float e = 3.0;
    vec3 n = normalize(vec3(bil(wp.xz - vec2(e, 0.0)) - bil(wp.xz + vec2(e, 0.0)), 2.0 * e, bil(wp.xz - vec2(0.0, e)) - bil(wp.xz + vec2(0.0, e))));
    wp.y += b; vWorld = wp.xyz; vNormal = n; vBillow = b;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const CLOUD_FRAG = /* glsl */ `
  ${SKY_GLSL}
  uniform vec3 uLit, uShade; uniform float uTime;
  varying vec3 vWorld, vNormal; varying float vBillow;
  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    vec2 q = vWorld.xz * 0.012 + vec2(uTime * 0.004, 0.0);
    float puff = vn(q) * 0.6 + vn(q * 2.7 + 4.0) * 0.3 + vn(q * 7.1) * 0.1;
    vec3 n = normalize(vNormal + vec3(puff - 0.5, 0.0, vn(q * 1.9 + 9.0) - 0.5) * 0.9);
    vec3 sl = normalize(uSunDir + vec3(0.0, 0.22, 0.0));
    float lit = smoothstep(-0.1, 0.6, dot(n, sl)) * 0.5 + smoothstep(-4.0, 7.0, vBillow + (puff - 0.5) * 8.0) * 0.5;
    vec3 col = mix(uShade, uLit, lit * (1.0 - 0.45 * uNight));
    // toward the sun the cloud tops glow with the red of the horizon
    vec3 dir = normalize(vWorld - cameraPosition);
    float toward = pow(max(dot(normalize(dir.xz + vec2(1e-5, 0.0)), normalize(uSunDir.xz)), 0.0), 6.0);
    col += vec3(0.5, 0.14, 0.08) * toward * (1.0 - 0.5 * uNight);
    col *= 1.0 - 0.35 * uNight;
    gl_FragColor = vec4(haze(col, vWorld, 1400.0), 1.0);
  }`;

const PEAK_FRAG = /* glsl */ `
  ${SKY_GLSL}
  varying vec3 vWorld, vNormal;
  void main() {
    vec3 n = normalize(vNormal);
    if (n.y < 0.0) n = -n;
    vec3 sl = normalize(uSunDir + vec3(0.0, 0.25, 0.0));
    float sun = max(dot(n, sl), 0.0);
    float snow = smoothstep(0.35, 0.6, n.y);
    vec3 rock = vec3(0.05, 0.05, 0.08), white = vec3(0.24, 0.24, 0.36);
    vec3 col = mix(rock, white, snow) + vec3(0.62, 0.2, 0.16) * pow(sun, 2.0) * (0.4 + 0.6 * snow) * (1.0 - 0.6 * uNight);
    gl_FragColor = vec4(haze(col, vWorld, 1100.0), 1.0);
  }`;

const VEIL_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// the hut's lit window: amber, a little brighter low down (the stove), soft at the edges, with its cross bars
const PANE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PANE_FRAG = /* glsl */ `
  uniform float uGlowI; varying vec2 vUv;
  void main() {
    vec2 e = min(vUv, 1.0 - vUv);
    float edge = smoothstep(0.0, 0.18, min(e.x, e.y));
    vec3 col = mix(vec3(0.62, 0.27, 0.08), vec3(0.42, 0.17, 0.06), vUv.y) * (0.75 + 0.3 * uGlowI);
    // the window's cross bars (the model's own are painted on the glass this pane covers)
    float bars = 1.0 - (1.0 - smoothstep(0.035, 0.06, abs(vUv.x - 0.5))) * 0.85;
    bars *= 1.0 - (1.0 - smoothstep(0.035, 0.06, abs(vUv.y - 0.52))) * 0.85;
    gl_FragColor = vec4(mix(vec3(0.05, 0.03, 0.03), col, edge * bars), 1.0);
  }`;
const VEIL_FRAG = /* glsl */ `
  ${SKY_GLSL}
  varying vec3 vDir;
  void main() { gl_FragColor = veilAt(normalize(vDir)); }`;

// falling snow: every flake keeps its own distance from the camera (log-even, so the screen density is even); it falls,
// drifts with the wind and wraps inside a window that grows with that distance
const SNOW_VERT = /* glsl */ `
  attribute vec4 aFlake;   // x: distance ahead, y: lateral 0..1, z: height 0..1, w: seed
  uniform float uTime, uPx, uTan; uniform vec3 uCam; uniform vec2 uWind;
  varying float vA;
  void main() {
    float d = aFlake.x, s = aFlake.w;
    float w = 2.4 * d * uTan + 4.0, hgt = 1.6 * d * uTan + 6.0;
    float x = mod(aFlake.y * w + uTime * uWind.x * (1.6 + s * 1.4) + sin(uTime * 0.9 + s * 40.0) * 0.5, w) - w * 0.5;
    float y = mod(aFlake.z * hgt - uTime * (0.7 + s * 0.6), hgt) - hgt * 0.45;
    float z = sin(uTime * 0.6 + s * 17.0) * 0.4;
    vec3 p = uCam + vec3(x, y, -d + z);
    vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
    gl_PointSize = clamp((0.03 + s * 0.035) * uPx * 1000.0 / -mv.z, 1.0, 9.0);
    vA = (0.45 + 0.4 * s) * smoothstep(0.6, 2.5, -mv.z) * (1.0 - smoothstep(60.0, 110.0, -mv.z) * 0.6);
    gl_Position = projectionMatrix * mv;
  }`;
const SNOW_FRAG = /* glsl */ `
  varying float vA;
  void main() { float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard;
    gl_FragColor = vec4(vec3(0.78, 0.8, 0.9), vA * smoothstep(0.5, 0.1, r)); }`;

// spindrift: streams of snow blown low over the drifts in gusts, hugging the ground (heightAt in the shader)
const DRIFT_VERT = /* glsl */ `
  ${HEIGHT_GLSL}
  attribute vec4 aFlake;
  uniform float uTime, uPx, uTan; uniform vec3 uCam, uOrigin; uniform vec2 uWind;
  varying float vA;
  void main() {
    float d = aFlake.x, s = aFlake.w;
    float w = 2.4 * d * uTan + 6.0;
    float lx = mod(aFlake.y * w + uTime * (7.0 + s * 5.0), w) - w * 0.5;
    vec3 p = uCam + vec3(lx, 0.0, -d);
    p.z += lx * uWind.y / uWind.x;
    vec2 world = p.xz + uOrigin.xz;
    float gust = smoothstep(0.15, 1.0, sin(dot(world, uWind) * 0.09 - uTime * 2.4 + sin(world.y * 0.05 + uTime * 0.2) * 2.0));
    p.y = heightAt(p.x, p.z) + 0.05 + aFlake.z * aFlake.z * (0.4 + 1.3 * gust) + sin(uTime * 3.0 + s * 30.0) * 0.06;
    vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
    gl_PointSize = clamp((0.12 + s * 0.16) * uPx * 1000.0 / -mv.z, 1.0, 26.0);
    vA = (0.25 + 0.75 * gust) * (0.3 + 0.3 * s) * (1.0 - aFlake.z * 0.6) * smoothstep(1.0, 4.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const DRIFT_FRAG = /* glsl */ `
  varying float vA;
  void main() { vec2 c = gl_PointCoord - 0.5; c.y *= 3.2; float r = length(c); if (r > 0.5 || vA < 0.003) discard;
    gl_FragColor = vec4(vec3(0.74, 0.77, 0.9), vA * smoothstep(0.5, 0.0, r)); }`;

// the far ranges: two strips of ridged summits across the view, standing out of the cloud sea about 1.3 and 2.2 km out.
// Each strip is rows from under the cloud tops up to its crest, the lower rows nearer (the face slopes toward the viewer),
// creased by gullies; smooth normals, so the faces read as snow slopes, not facets.
function rangeGeometry(rand, camLocal) {
  const T = Array.from({ length: 1024 }, rand);
  const n1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return T[i & 1023] * (1 - u) + T[(i + 1) & 1023] * u; };
  const ridge = (x) => { let s = 0, a = 0.55, f = 1; for (let o = 0; o < 5; o++) { s += a * Math.pow(1 - Math.abs(2 * n1(x * f + o * 37) - 1), 1.6); a *= 0.5; f *= 2.1; } return s; };
  const parts = [];
  for (const [R, lo, hi, seed, SEG, ROWS] of [[1350, 8, 85, 0, 420, 8], [2250, 30, 170, 500, 320, 7]]) {
    const A0 = -1.35, A1 = 1.35, P = [], IDX = [];
    for (let i = 0; i <= SEG; i++) {
      const a = A0 + (A1 - A0) * (i / SEG), u = seed + i / SEG * 26;
      const massif = Math.exp(-((a - 0.42) ** 2) / 0.03) * 0.8 + Math.exp(-((a + 0.95) ** 2) / 0.05) * 0.35;
      const crest = lo + (hi - lo) * Math.min(1.4, ridge(u) * 0.95 + massif);
      const r0 = R + (n1(u * 0.7 + 9) - 0.5) * R * 0.35;
      const depth = (crest - CLOUD_Y) * 1.5;
      for (let k = 0; k <= ROWS; k++) {
        const f = k / ROWS, gully = (n1(u * 9 + k * 0.7) - 0.5) * (1 - f * 0.6);
        const y = CLOUD_Y - 25 + (crest - CLOUD_Y + 25) * Math.pow(f, 1.25);
        const r = r0 - (1 - f) * depth * (1 + gully * 0.6);
        P.push(camLocal.x + Math.sin(a) * r, y, camLocal.z - Math.cos(a) * r);
      }
    }
    for (let i = 0; i < SEG; i++) for (let k = 0; k < ROWS; k++) { const p0 = i * (ROWS + 1) + k, p1 = p0 + ROWS + 1; IDX.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(IDX); g.computeVertexNormals();
    parts.push(g);
  }
  const out = mergeGeometries(parts); parts.forEach((g) => g.dispose());
  return out;
}

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// a model's quantized vertex data (meshopt: 8 and 16 bit integers) as plain floats, so it draws with the program the warm-up
// built (on Direct3D an integer input builds another vertex shader at the first draw: a 50 to 70 ms freeze; see
// src/engine/dequantize.js)
const toFloats = dequantize;
function firstMesh(root) { let m = null; root.traverse((o) => { if (!m && o.isMesh) m = o; }); return m; }

export function build(ctx) {
  const { scene, renderer, camera, anchor, lights, wanderer } = ctx;
  const group = new THREE.Group(); group.name = 'the-ordeal'; group.position.copy(anchor.centre);
  const rand = mulberry(5);
  const small = Math.min(innerWidth, innerHeight) < 700;
  const sunDir = new THREE.Vector3(...MOOD.sun).normalize();
  const night = { value: 0 }, time = { value: 7.3 }, veilU = { value: 1 };
  const sky = { uSunDir: { value: sunDir }, uZenith: { value: new THREE.Color(MOOD.zenith) }, uHorizon: { value: new THREE.Color(MOOD.horizon) }, uGlow: { value: new THREE.Color(MOOD.glow) }, uNight: night, uVeil: veilU };
  const camLocal = anchor.cam.clone().sub(anchor.centre);
  const disposables = [];
  const track = (...xs) => { disposables.push(...xs); return xs[0]; };

  // ---- props' places (stage space): the shelter left of the path, its door toward the camera; the cairn on the knoll
  const SHELTER = new THREE.Vector3(-13, 0, 10), SHELTER_YAW = 0.45;
  SHELTER.y = heightAt(SHELTER.x, SHELTER.z);
  const DOOR = new THREE.Vector3(0, 0.3, 2.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), SHELTER_YAW).add(SHELTER);
  const glowI = { value: 1 };

  // ---- the snowfield: a heightfield, finer near the camera (rows spaced by a power curve)
  {
    const NX = 170, NZ = 150, X0 = -340, X1 = 340, Z0 = camLocal.z + 25, Z1 = -260;
    const P = new Float32Array((NX + 1) * (NZ + 1) * 3), IDX = [];
    for (let j = 0; j <= NZ; j++) {
      const z = Z0 + (Z1 - Z0) * Math.pow(j / NZ, 1.6);
      for (let i = 0; i <= NX; i++) {
        const u = i / NX * 2 - 1, x = camLocal.x + Math.sign(u) * Math.pow(Math.abs(u), 1.5) * (X1 - X0) / 2;
        P.set([x, heightAt(x, z), z], (j * (NX + 1) + i) * 3);
      }
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; IDX.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setIndex(IDX); g.computeVertexNormals();
    const mat = track(new THREE.ShaderMaterial({ vertexShader: SNOWFIELD_VERT, fragmentShader: SNOWFIELD_FRAG,
      uniforms: { ...sky, uGlowPos: { value: DOOR.clone().add(group.position) }, uGlowI: glowI } }));
    const mesh = new THREE.Mesh(g, mat); mesh.name = 'snowfield'; mesh.frustumCulled = false;
    group.add(mesh);
  }

  // ---- the trodden track: one ribbon on the snow, three vertices across (so it follows the drifts), a row every 0.4 m
  {
    const rows = Math.ceil((TRACK_FROM - TRACK_TO) / 0.4), P = [], T = [], IDX = [];
    for (let j = 0; j <= rows; j++) {
      const z = TRACK_FROM - (TRACK_FROM - TRACK_TO) * j / rows, cx = trackX(z);
      for (const u of [-TRACK_HALF, 0, TRACK_HALF]) { const x = cx + u; P.push(x, heightAt(x, z) + 0.02, z); T.push(u, TRACK_FROM - z); }
    }
    for (let j = 0; j < rows; j++) for (let k = 0; k < 2; k++) { const a = j * 3 + k, b = a + 3; IDX.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(T, 2)); g.setIndex(IDX);
    const mat = track(new THREE.ShaderMaterial({ vertexShader: TRACK_VERT, fragmentShader: TRACK_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4, uniforms: { uNight: night } }));
    const mesh = new THREE.Mesh(g, mat); mesh.name = 'track'; mesh.frustumCulled = false;
    group.add(mesh);
  }

  // ---- the cloud sea under the edge: a disc around the camera, finer near the middle
  const time10 = { value: 0 };
  {
    const R = [0, 60, 130, 210, 300, 400, 520, 660, 820, 1000, 1220, 1480, 1780, 2100, 2600], SEG = 120;
    const P = [], IDX = [];
    P.push(0, 0, 0);
    for (let r = 1; r < R.length; r++) for (let s = 0; s < SEG; s++) { const a = s / SEG * Math.PI * 2; P.push(Math.sin(a) * R[r], 0, -Math.cos(a) * R[r]); }
    for (let s = 0; s < SEG; s++) IDX.push(0, 1 + s, 1 + (s + 1) % SEG);
    for (let r = 1; r + 1 < R.length; r++) for (let s = 0; s < SEG; s++) {
      const a = 1 + (r - 1) * SEG + s, b = 1 + (r - 1) * SEG + (s + 1) % SEG, c = a + SEG, d = b + SEG;
      IDX.push(a, c, b, b, c, d);
    }
    const cg = track(new THREE.BufferGeometry());
    cg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); cg.setIndex(IDX);
    cg.translate(camLocal.x, CLOUD_Y, camLocal.z - 200);
    const mat = track(new THREE.ShaderMaterial({ vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG,
      uniforms: { ...sky, uTime: time10, uLit: { value: new THREE.Vector3(0.78, 0.58, 0.62) }, uShade: { value: new THREE.Vector3(0.33, 0.31, 0.45) } } }));
    const mesh = new THREE.Mesh(cg, mat); mesh.name = 'cloud-sea'; mesh.frustumCulled = false;
    group.add(mesh);
  }

  // ---- far peaks out of the clouds
  {
    const g = track(rangeGeometry(rand, camLocal));
    const mat = track(new THREE.ShaderMaterial({ vertexShader: SNOWFIELD_VERT, fragmentShader: PEAK_FRAG, uniforms: { ...sky } }));
    const mesh = new THREE.Mesh(g, mat); mesh.name = 'peaks'; mesh.frustumCulled = false;
    group.add(mesh);
  }

  // ---- the night veil: a dome just inside the sky (radius 3000), following the camera; drawn before the stars
  const veilGeo = track(new THREE.SphereGeometry(2900, 48, 24));
  const veilMat = track(new THREE.ShaderMaterial({ vertexShader: VEIL_VERT, fragmentShader: VEIL_FRAG, side: THREE.BackSide, transparent: true, depthWrite: false, uniforms: { ...sky } }));
  const veil = new THREE.Mesh(veilGeo, veilMat); veil.name = 'night-veil'; veil.frustumCulled = false; veil.renderOrder = -1;
  group.add(veil);

  // ---- falling snow and spindrift
  const tanH = { value: Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(1, camera.aspect) };
  const px = { value: 1 }, wind = { value: WIND.clone() }, camU = { value: camLocal.clone() };
  const nSnow = small ? SNOW_SMALL : SNOW, nDrift = small ? DRIFT_SMALL : DRIFT;
  function flakes(n, near, far) {
    const a = new Float32Array(n * 4);
    for (let k = 0; k < n; k++) a.set([near * Math.pow(far / near, rand()), rand(), rand(), rand()], k * 4);
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aFlake', new THREE.BufferAttribute(a, 4));
    return g;
  }
  const snowGeo = flakes(nSnow, 1.2, 110);
  const snowMat = track(new THREE.ShaderMaterial({ vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG, transparent: true, depthWrite: false,
    uniforms: { uTime: time, uPx: px, uTan: tanH, uCam: camU, uWind: wind } }));
  const snow = new THREE.Points(snowGeo, snowMat); snow.name = 'snow'; snow.frustumCulled = false; snow.renderOrder = 2;
  group.add(snow);
  const driftGeo = flakes(nDrift, 3, 70);
  const driftMat = track(new THREE.ShaderMaterial({ vertexShader: DRIFT_VERT, fragmentShader: DRIFT_FRAG, transparent: true, depthWrite: false,
    uniforms: { uTime: time, uPx: px, uTan: tanH, uCam: camU, uWind: wind, uOrigin: { value: group.position.clone() } } }));
  const drift = new THREE.Points(driftGeo, driftMat); drift.name = 'spindrift'; drift.frustumCulled = false; drift.renderOrder = 2;
  group.add(drift);

  // ---- lights (ctx.lights, never added): the shelter's warm glow, and a rim on the Wanderer from the red side
  const [glow, rim] = lights;
  glow.color.set('#ff9348'); glow.distance = 11; glow.decay = 2;
  glow.position.copy(SHELTER).add(new THREE.Vector3(0, 1.3, 3.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), SHELTER_YAW)).add(group.position);
  rim.color.set('#ff9a80'); rim.distance = 8; rim.decay = 2;

  // ---- props: loaded in the background, each converted to plain floats and warmed before it joins the group
  let disposed = false;
  const uploads = [];
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const base = import.meta.env.BASE_URL + 'models/';
  const props = new THREE.Group(); props.name = 'props'; group.add(props);
  async function addProp(file, place) {
    const gltf = await loader.loadAsync(base + file);
    if (disposed) return;
    toFloats(gltf.scene);
    // the cold light of the sky on everything (an emissive lift through the prop's own texture; no light is added)
    gltf.scene.traverse((o) => { for (const mat of [].concat(o.material || [])) if (mat.isMeshStandardMaterial) {
      mat.emissive.set(PROP_FILL); mat.emissiveMap = mat.map || null; mat.emissiveIntensity = 0.42;
    } });
    const obj = place(gltf.scene) || gltf.scene;
    obj.traverse((o) => { if (o.isMesh) o.frustumCulled = true; });
    try { await renderer.compileAsync(obj, camera, scene); } catch (err) { console.warn('The Ordeal: prop warm-up failed', err); }
    if (disposed) { disposeTree(obj); return; }
    obj.traverse((o) => { for (const mat of [].concat(o.material || [])) for (const k in mat) if (mat[k]?.isTexture) uploads.push(mat[k]); });
    obj.visible = false; obj.userData.pending = true;
    props.add(obj); ctx.requestDraw();
  }
  const set = (o, x, z, scale, yaw = 0, sink = 0) => { o.scale.setScalar(scale); o.rotation.y = yaw; o.position.set(x, heightAt(x, z) - sink, z); return o; };
  const fail = (what) => (err) => console.warn(`The Ordeal: ${what} did not load; the snowfield goes on without it`, err);
  addProp('props/ordeal/stone-shelter.glb', (o) => {
    // the hut model is about 0.82 x 0.8 x 0.98 (normalised); 4.4 times that is a 3.6 m by 4.3 m stone bivouac hut, 3.5 m tall
    set(o, SHELTER.x, SHELTER.z, 4.4, SHELTER_YAW, 0.15);
    o.traverse((m) => { for (const mat of [].concat(m.material || [])) if (mat.isMeshStandardMaterial) mat.color.multiply(new THREE.Color('#c9c4d6')); });
    // a faint warm light in the window beside the door (the stove inside): a small pane on the model's own glass, in the
    // model's coordinates (found by a raycast on the front wall), the frame bars in front of it; it breathes with the glow
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.092, 0.098), new THREE.ShaderMaterial({ vertexShader: PANE_VERT, fragmentShader: PANE_FRAG, uniforms: { uGlowI: glowI } }));
    pane.name = 'lit-window'; pane.position.set(0.195, 0.256, 0.358); o.add(pane);
  }).catch(fail('the shelter'));
  addProp('props/ordeal/sleeping-bag.glb', (o) => {
    // 2.05 m long (the bag model is 0.98 long), laid inside the door, its foot toward the back wall
    const at = new THREE.Vector3(0.35, 0, 0.55).applyAxisAngle(new THREE.Vector3(0, 1, 0), SHELTER_YAW).add(SHELTER);
    o.scale.setScalar(2.1); o.rotation.y = SHELTER_YAW + 0.12; o.position.set(at.x, SHELTER.y + 0.02, at.z);
  }).catch(fail('the sleeping bag'));
  addProp('props/ordeal/summit-cairn.glb', (o) => { set(o, -47, -48, 3.0, 0.8, 0.2); }).catch(fail('the cairn'));
  addProp('props/ordeal/ice-axe.glb', (o) => {
    // 0.72 m (the model is 0.98 tall), driven into the snow by the door, leaning a little
    const at = new THREE.Vector3(1.9, 0, 2.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), SHELTER_YAW).add(SHELTER);
    set(o, at.x, at.z, 0.74, 1.2, 0.18); o.rotation.z = 0.12;
  }).catch(fail('the ice axe'));
  addProp('props/ordeal/snow-boulders.glb', (o) => {
    // one InstancedMesh: snow-capped boulder groups at 2.4 to 5 m across, half sunk in the drifts
    const src = firstMesh(o); if (!src) return o;
    src.updateWorldMatrix(true, false);
    const geo = src.geometry.clone().applyMatrix4(src.matrixWorld);
    const spots = [[-4.5, 26, 1.9, 0.4], [-24, 14, 3.0, 1.4], [9.5, 6, 3.4, 2.1], [-23, -17, 4.2, 4.0], [24, 2, 5.2, 1.0], [-50, -14, 6.5, 2.7], [44, -8, 4.6, 3.3]];
    const inst = new THREE.InstancedMesh(geo, src.material, spots.length); inst.name = 'boulders';
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    spots.forEach(([x, z, w, yaw], i) => {
      q.setFromEuler(new THREE.Euler((rand() - 0.5) * 0.12, yaw, (rand() - 0.5) * 0.12)); s.set(w, w * (0.75 + rand() * 0.3), w);
      p.set(x, heightAt(x, z) - w * 0.12, z); inst.setMatrixAt(i, m.compose(p, q, s));
    });
    inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere();
    src.material.color.multiply(new THREE.Color('#c4c6dc'));
    o.traverse((c) => { if (c !== src && c.geometry) c.geometry.dispose(); });
    src.geometry.dispose();
    return inst;
  }).catch(fail('the boulders'));

  // ---- the phoenix: out of the cloud sea ahead, a climbing turn into the red light, away over the edge and down
  // (path space: y 0 is just above the cloud tops; the group sits at PHOENIX_Y). The camera stands at z +40 looking to -z.
  const flightPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-14, -34, -228), new THREE.Vector3(-13, -8, -222), new THREE.Vector3(-10, 16, -212), new THREE.Vector3(-14, 40, -196),
    new THREE.Vector3(-30, 58, -184), new THREE.Vector3(-58, 64, -196), new THREE.Vector3(-90, 56, -226), new THREE.Vector3(-122, 40, -262),
    new THREE.Vector3(-160, 22, -300), new THREE.Vector3(-196, 6, -330), new THREE.Vector3(-214, -30, -342),
  ], false, 'centripetal');
  let phoenix = null, pUploads = [], wasShown = false, stillPosed = false, wait = 0;
  loader.loadAsync(base + 'phoenix-flap.glb').then(async (gltf) => {
    if (disposed) return;
    toFloats(gltf.scene);
    // in the cold dark the bird is the only fire: its own feathers, lit from within
    gltf.scene.traverse((o) => { for (const mat of [].concat(o.material || [])) if (mat.isMeshStandardMaterial) {
      mat.metalness = Math.min(mat.metalness, 0.3);
      if (mat.emissiveMap) { mat.emissive.set('#ff8a40'); mat.emissiveIntensity = 1.1; }
      else { mat.emissive.set('#ff6a2a'); mat.emissiveIntensity = 0.5; }
    } });
    const flight = createPhoenixFlight(gltf, { path: flightPath, hidden: 6 });
    flight.group.position.y = PHOENIX_Y;
    try { await renderer.compileAsync(flight.group, camera, scene); } catch (err) { console.warn('The Ordeal: phoenix warm-up failed; it compiles on first sight', err); }
    if (disposed) { disposeTree(flight.group); return; }
    flight.group.traverse((o) => { for (const mat of [].concat(o.material || [])) for (const k in mat) if (mat[k]?.isTexture) pUploads.push(mat[k]); });
    flight.group.visible = false;
    phoenix = flight; group.add(flight.group); ctx.requestDraw();
  }).catch((err) => console.warn('The Ordeal: the phoenix did not load; the night goes on without it', err));

  scene.add(group);

  const _w = new THREE.Vector3();
  function update(dt, local) {
    if (!group.visible) { wasShown = false; return; }
    const still = ctx.still;
    if (!still) { time.value += dt; time10.value += dt; }
    // dusk into night while the visitor stays (local 0.3 to 0.85); a still picture holds the dusk with the red line
    night.value = still ? 0.25 : smooth01((local - 0.3) / 0.55);
    veil.position.copy(camera.position).sub(group.position);
    // the veil fades by the camera's lift, as the Trials' cloud deck does: full on the anchor, gone by a third of the way up
    const lift = Math.max(0, (camera.position.y - anchor.cam.y) / LIFT);
    veilU.value = 1 - smooth01((lift - 0.02) / 0.28);
    px.value = renderer.getPixelRatio();
    tanH.value = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(1, camera.aspect);
    camU.value.copy(camera.position).sub(group.position);
    const low = ctx.quality < LOW_BELOW;
    snowGeo.setDrawRange(0, low ? Math.round(nSnow * LOW_SHARE) : nSnow);
    driftGeo.setDrawRange(0, low ? Math.round(nDrift * LOW_SHARE) : nDrift);
    // the shelter's glow breathes a little, like a stove flame
    const flick = still ? 1 : 0.88 + 0.08 * Math.sin(time.value * 7.3) + 0.04 * Math.sin(time.value * 17.1 + 1.3);
    glowI.value = flick * (0.8 + 0.4 * night.value);
    glow.intensity = 7 * glowI.value;
    // a rim of red light on the Wanderer from the sun side, so he reads against the snow
    wanderer.copyPosition(_w);
    if (Number.isFinite(_w.x)) { rim.position.set(_w.x - 1.6, _w.y + 2.0, _w.z - 1.2); rim.intensity = 16 * (1 - 0.4 * night.value); }
    else rim.intensity = 0;
    // props and the bird: textures upload one a frame (all at once in still mode, which draws only on request)
    const queue = uploads.length ? uploads : pUploads;
    if (queue.length) { do renderer.initTexture(queue.shift()); while (still && queue.length); ctx.requestDraw(); }
    if (!uploads.length) for (const o of props.children) if (o.userData.pending) { o.userData.pending = false; o.visible = true; ctx.requestDraw(); }
    if (phoenix && !pUploads.length) {
      if (still) {
        phoenix.group.visible = true;
        if (!stillPosed) { phoenix.restart(); for (let t = 0; t < STILL_AT; t += 1 / 30) phoenix.update(1 / 30); stillPosed = true; }
      } else {
        stillPosed = false;
        if (!wasShown) { phoenix.restart(); wait = PHOENIX_DELAY; phoenix.group.visible = false; }
        if (wait > 0) wait -= dt;
        else { phoenix.group.visible = true; phoenix.update(dt); }
      }
    }
    wasShown = true;
  }

  function disposeTree(o) {
    // instanced meshes free their instance buffers; skinned meshes (the phoenix) their bone texture
    o.traverse((c) => { if (c.isInstancedMesh) c.dispose(); c.skeleton?.dispose?.(); c.geometry?.dispose?.(); for (const mat of [].concat(c.material || [])) { for (const k in mat) mat[k]?.isTexture && mat[k].dispose(); mat.dispose(); } });
  }
  return {
    group, update,
    groundAt: (x, z) => heightAt(x - group.position.x, z - group.position.z),
    // he walks in the trodden track, out toward the edge
    pathAt: (z) => group.position.x + trackX(z - group.position.z),
    dispose() {
      disposed = true; scene.remove(group);
      for (const d of disposables) d.dispose();
      disposeTree(props);
      if (phoenix) disposeTree(phoenix.group);
    },
  };
}
const smooth01 = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
