// The Ordinary World (stage 1): the Sonoran desert at deep night, home before the journey. A thin moon over the saguaros,
// a full star field with the Milky Way, the far lights of Phoenix in a gap of the mountains to the left, low dunes and
// scattered rocks and brush, a trail post with a small lantern beside the path, sand motes drifting in the moonlight.
//
// Parts (about 16 draw calls of the stage's own, plus the Wanderer's ~33):
//   night sky  a dome just inside the world's sky: a deep night gradient, the moon's halo, the Milky Way and the city's glow on
//              the horizon. It owns the frame while the stage is in view and fades into the world's own sky formula as the
//              camera climbs into the clouds toward the next stage, so the change of set never pops.
//   moon       a camera-facing disc far out along the mood's sun direction (the mood's sun is the moon): a thin crescent and
//              the faint earthshine on its dark side. Opaque, so it hides the stars behind it.
//   stars      a dense layer of faint stars (most of them along the Milky Way) under the world's own glimmering stars
//   ground     the desert floor: low dunes and swells on a grid that is fine near the camera and coarse far off, a packed trail
//              from under the camera past the post into the distance, ripples in the sand, moonlight, the lantern's warm pool, a skirt to the haze
//   mountains  two dark ridgelines ringing the basin (one merged mesh), low to the left where the city lights show through
//   city       the lights of Phoenix far off to the left, twinkling in the heat that rises off the valley floor at night
//   rocks, brush  instanced (code-built), scattered over the floor
//   saguaros   the `saguaro` prop instanced at true heights (5 to 12 m), one standing under the moon
//   trail post, lantern, wolf  props at true scale; a warm halo around the lantern; a lone wolf on a dune crest
//   motes      sand motes drifting through the moonlight, warm where they pass the lantern
// Colours in the code-built shaders are display-referred (no tone mapping, no colour-space step), like the shared sky.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { dequantize } from '../../engine/dequantize.js';
import { MOODS } from '../journey.js';

const MOOD = MOODS[0];
const LOW_BELOW = 0.7;
const DOME_R = 2900, MOON_DIST = 2400, MOON_R = THREE.MathUtils.degToRad(0.95);
const SKIRT_R = 2700;
// the night palette, display values (what the screen shows)
const NIGHT = { zenith: [0.010, 0.015, 0.036], horizon: [0.066, 0.086, 0.146], moonHaze: [0.15, 0.18, 0.27], city: [0.30, 0.17, 0.07] };
const CITY_AZ = THREE.MathUtils.degToRad(-27);     // azimuth of the city (negative: left of the view's heading, -z)

// ---- deterministic noise (the terrain heights in JS; the shaders only shade)
function hash2(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, oct) { let s = 0, a = 0.5, f = 1, n = 0; for (let k = 0; k < oct; k++) { s += a * vnoise(x * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }
const dirAt = (azDeg, elDeg) => { const a = THREE.MathUtils.degToRad(azDeg), e = THREE.MathUtils.degToRad(elDeg); return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- the layout, in stage space (the camera stands at z +40 looking toward -z)
// the trail runs from under the camera's feet (TRAIL_FROM) straight past the post, then (from TRAIL_START) wanders on into
// the desert; the Wanderer walks on its centre line (pathAt), so the post and the lantern stand beside it, on its left
const TRAIL_X0 = -0.4, TRAIL_START = 26.5, TRAIL_FROM = 41;
export const POST = { x: TRAIL_X0 - 1.5, z: 25.2 };                // the trail post: beside the trail, where it leaves the camp
// the trail's centre line (stage space)
export function trailX(z) { const s = Math.max(0, TRAIL_START - z); return TRAIL_X0 + 3.2 * Math.sin(s * 0.024) * smooth(0, 60, s) + 2.0 * Math.sin(s * 0.0075 + 0.6) * smooth(40, 160, s); }
const WOLF_DUNE = { x: -26, z: -25, rx: 16, rz: 11, h: 4.4 };
const GRID = { x0: -330, x1: 330, zNear: 420, zFar: -740, zMid: 30 };
// terrain height at a stage-space point: low swells, dune ridges away from the trail, the wolf's dune; 0 at the grid's edge
export function heightAt(x, z) {
  const dt = Math.abs(x - trailX(Math.min(z, TRAIL_START)));
  const swell = 0.85 * fbm(x * 0.013 + 3.1, z * 0.013 - 1.7, 3);
  const u = x * 0.8 - z * 0.6, w = x * 0.6 + z * 0.8;
  const ridge = 1 - Math.abs(2 * vnoise(u * 0.03 + 11, w * 0.011 + 5) - 1);
  const dune = Math.pow(ridge, 2.4) * (0.6 + 2.6 * vnoise(x * 0.008 + 7, z * 0.008 + 2));
  const near = Math.hypot(x - TRAIL_X0, z - 31);
  const clear = smooth(1.4, 9, dt) * smooth(7, 26, near);
  let h = swell * (0.35 + 0.65 * smooth(4, 20, near)) + dune * clear;
  const wd = ((x - WOLF_DUNE.x) / WOLF_DUNE.rx) ** 2 + ((z - WOLF_DUNE.z) / WOLF_DUNE.rz) ** 2;
  if (wd < 1) { const t = 1 - wd; h += WOLF_DUNE.h * t * t * (3 - 2 * t); }
  const edge = smooth(GRID.x0, GRID.x0 + 60, x) * smooth(GRID.x1, GRID.x1 - 60, x) * smooth(GRID.zFar, GRID.zFar + 80, z) * smooth(GRID.zNear, GRID.zNear - 60, z);
  return h * edge;
}

// ---- shared GLSL: the night sky (blended into the world's own sky formula by uNight) and the haze toward it
const SKY_GLSL = /* glsl */ `
  uniform vec3 uSunDir, uZenith, uHorizon, uGlow;   // the world sky's own uniforms (shared by reference)
  uniform vec3 uMoonDir; uniform float uNight, uCityAz;
  const vec3 COOL = vec3(0.56, 0.60, 0.66);
  const vec3 N_ZEN = vec3(${NIGHT.zenith.join(', ')}), N_HOR = vec3(${NIGHT.horizon.join(', ')});
  const vec3 N_MOON = vec3(${NIGHT.moonHaze.join(', ')}), N_CITY = vec3(${NIGHT.city.join(', ')});
  vec3 worldSky(vec3 d) {
    float h = clamp(d.y, -0.2, 1.0), s = max(dot(d, normalize(uSunDir)), 0.0);
    vec3 hor = mix(COOL, uHorizon, pow(s, 3.0));
    vec3 col = mix(hor, uZenith, pow(smoothstep(-0.05, 0.55, h), 0.8));
    return col + uGlow * pow(s, 10.0) * 0.32 + uGlow * pow(s, 90.0) * 0.5;
  }
  float azDiff(vec3 d, float az) { float a = atan(d.x, -d.z); float x = a - az; return atan(sin(x), cos(x)); }
  vec3 nightSky(vec3 d) {
    float h = clamp(d.y, -0.2, 1.0), s = max(dot(d, uMoonDir), 0.0);
    vec3 col = mix(N_HOR, N_ZEN, pow(smoothstep(-0.02, 0.62, h), 0.65));
    col += N_MOON * (pow(s, 6.0) * 0.18 + pow(s, 60.0) * 0.35 + pow(s, 900.0) * 0.6);   // the moon's halo
    float c = azDiff(d, uCityAz);
    col += N_CITY * exp(-c * c / 0.07) * exp(-max(h, 0.0) * 14.0) * 0.55;               // the city's glow, low on the horizon
    return col;
  }
  vec3 skyAt(vec3 d) { return mix(worldSky(d), nightSky(d), uNight); }
  vec3 haze(vec3 col, vec3 world, float hazeDist, float hazeFar) {
    vec3 v = world - cameraPosition; float d = length(v); vec3 dir = v / d;
    float f = 1.0 - exp(-d / hazeDist);
    f = max(f, smoothstep(hazeFar, hazeFar + 560.0, d));    // the floor's skirt ends in the haze
    f = max(f, 1.0 - uNight);     // climbing away toward the next stage, the whole set melts into the sky (no pop at the change)
    return mix(col, skyAt(normalize(vec3(dir.x, 0.0, dir.z))), f);
  }
  float dither(vec2 p) { return (fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0; }`;
const NOISE3_GLSL = /* glsl */ `
  float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
  float fbm3(vec3 p) { return n3(p) * 0.5 + n3(p * 2.1) * 0.27 + n3(p * 4.3) * 0.15 + n3(p * 8.7) * 0.08; }`;

const POS_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;

// the dome: night sky, moon halo, city glow, the Milky Way (mottled, with its dark rift)
const DOME_FRAG = /* glsl */ `
  ${SKY_GLSL}
  ${NOISE3_GLSL}
  uniform vec3 uBand;
  varying vec3 vWorld;
  void main() {
    vec3 d = normalize(vWorld - cameraPosition);
    vec3 col = nightSky(d);
    float b = dot(d, uBand), band = exp(-b * b / 0.022) * smoothstep(0.0, 0.2, d.y);
    if (band > 0.004) {          // the noise only where the band shows (most of the dome skips it)
      float m = fbm3(d * 7.0), m2 = n3(d * 19.0 + 3.0) * 0.6 + n3(d * 41.0) * 0.4;
      band *= (0.45 + 0.9 * m * m2) * (1.0 - 0.75 * exp(-(b - 0.025) * (b - 0.025) / 0.0012) * smoothstep(0.35, 0.7, m));   // with its dark rift
      col += vec3(0.62, 0.68, 0.86) * band * 0.085;
    }
    col = mix(worldSky(d), col, uNight);
    gl_FragColor = vec4(col + dither(gl_FragCoord.xy), 1.0);
  }`;

const MOON_FRAG = /* glsl */ `
  ${NOISE3_GLSL}
  uniform vec3 uMoonDir; uniform float uRadius, uNight;
  varying vec3 vWorld;
  void main() {
    vec3 d = normalize(vWorld - cameraPosition);
    vec3 right = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0))), up = cross(right, uMoonDir);
    vec2 p = vec2(dot(d, right), dot(d, up)) / uRadius;          // disc coordinates, radius 1
    float r = length(p);
    if (r > 1.0 || uNight < 0.02) discard;
    // a thin crescent: the sun is below the horizon to the lower right, so the lit limb is there
    vec2 sh = normalize(vec2(-0.55, 0.85)) * 0.5;
    float lit = smoothstep(-0.06, 0.06, length(p - sh) - 1.0);
    float mare = 0.82 + 0.18 * n3(vec3(p * 3.0, 1.0));
    vec3 col = mix(vec3(0.075, 0.09, 0.13), vec3(1.0, 0.97, 0.88) * mare, lit);
    col *= smoothstep(1.0, 0.94, r) * 0.15 + 0.85;
    gl_FragColor = vec4(col, 1.0);
  }`;

const STARS_VERT = /* glsl */ `
  attribute float aSeed; uniform float uTime, uPx, uNight; varying float vA;
  void main() {
    vA = (0.25 + 0.55 * aSeed) * (0.8 + 0.2 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 50.0)) * uNight;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (0.9 + aSeed * 0.9) * uPx;
    gl_Position = projectionMatrix * mv;
  }`;
const STARS_FRAG = /* glsl */ `
  varying float vA;
  void main() { float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * vA * smoothstep(0.5, 0.1, r), 1.0); }`;

// the desert floor
const GROUND_VERT = /* glsl */ `
  varying vec3 vWorld, vNormal;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vNormal = normal; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const LIGHTS_GLSL = /* glsl */ `
  uniform vec3 uLampPos, uLampCol; uniform float uLamp;
  // moonlight (cool, low and ahead) plus the sky's fill and the lantern's warm pool
  vec3 light(vec3 albedo, vec3 n, vec3 world) {
    float ndl = max(dot(n, uMoonDir), 0.0);
    vec3 c = albedo * (vec3(0.15, 0.175, 0.25) * (0.55 + 0.45 * n.y) + vec3(0.62, 0.70, 0.95) * ndl * 0.7);
    vec3 lv = uLampPos - world; float ld = length(lv);
    float win = pow(clamp(1.0 - pow(ld / 9.0, 4.0), 0.0, 1.0), 2.0);
    c += albedo * uLampCol * uLamp * max(dot(n, lv / ld), 0.0) / (ld * ld + 0.25) * win;
    return c;
  }`;
const GROUND_FRAG = /* glsl */ `
  ${SKY_GLSL}
  ${LIGHTS_GLSL}
  uniform float uTrail0, uTrailX0, uTrailFrom; uniform vec2 uOrigin;
  varying vec3 vWorld, vNormal;
  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
  float sm(float a, float b, float x) { return smoothstep(a, b, x); }
  float trailX(float z) { float s = max(0.0, uTrail0 - z);
    return uTrailX0 + 3.2 * sin(s * 0.024) * sm(0.0, 60.0, s) + 2.0 * sin(s * 0.0075 + 0.6) * sm(40.0, 160.0, s); }
  void main() {
    vec3 n = normalize(vNormal);
    vec2 p = vWorld.xz - uOrigin;
    float d = distance(vWorld, cameraPosition);
    float g = n2(p * 0.9) * 0.5 + n2(p * 0.23) * 0.3 + n2(p * 3.7) * 0.2;
    vec3 sand = mix(vec3(0.42, 0.40, 0.37), vec3(0.58, 0.54, 0.47), g);
    // wind ripples: fine crests across the sand, gone with distance
    float rip = sin(dot(p, vec2(0.6, 0.8)) * 13.0 + n2(p * 0.7) * 9.0);
    sand *= 1.0 + rip * 0.06 * (1.0 - sm(3.0, 14.0, d));
    // gravel and darker patches of desert pavement
    sand *= mix(0.62, 1.0, sm(0.3, 0.65, n2(p * 0.05 + 9.0) * 0.7 + n2(p * 0.31) * 0.3));
    sand *= 0.85 + 0.3 * n2(p * 0.013 + 4.0);
    // the packed trail, from under the camera on past the post
    float tw = abs(p.x - trailX(p.y));
    float trail = (1.0 - sm(0.4, 0.75, tw)) * sm(uTrailFrom + 1.0, uTrailFrom - 1.5, p.y);
    float berm = sm(0.5, 0.75, tw) * (1.0 - sm(0.8, 1.3, tw)) * sm(uTrailFrom + 1.0, uTrailFrom - 1.5, p.y);
    sand *= 1.0 - berm * 0.35;
    sand = mix(sand, vec3(0.70, 0.65, 0.57) * (0.8 + 0.35 * n2(p * 2.3)), trail * (0.6 + 0.2 * n2(p * 0.6)));
    vec3 col = light(sand, n, vWorld);
    // the moon's sheen on the floor toward it
    vec3 dir = normalize(vWorld - cameraPosition);
    float toward = pow(max(dot(normalize(dir.xz), normalize(uMoonDir.xz)), 0.0), 24.0);
    col += vec3(0.03, 0.036, 0.055) * toward * sm(25.0, 400.0, d) * uNight;
    gl_FragColor = vec4(haze(col, vWorld, 1500.0, 2100.0) + dither(gl_FragCoord.xy), 1.0);
  }`;

// rocks and brush (instanced, faceted, the colour per instance)
const LIT_VERT = /* glsl */ `
  varying vec3 vWorld, vNormal, vCol;
  void main() {
    mat4 m = modelMatrix * instanceMatrix;
    vec4 wp = m * vec4(position, 1.0); vWorld = wp.xyz;
    vNormal = normalize(mat3(m) * normal);
    vCol = instanceColor;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const LIT_FRAG = /* glsl */ `
  ${SKY_GLSL}
  ${NOISE3_GLSL}
  ${LIGHTS_GLSL}
  varying vec3 vWorld, vNormal, vCol;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 alb = vCol;
    #ifdef LEAFY
      // twigs and small leaves: a fine speckle of light and shade, and the edges catch the moon
      float sp = n3(vWorld * 6.0) * 0.55 + n3(vWorld * 15.0) * 0.45;
      alb *= 0.4 + 1.1 * sp * sp;
      vec3 vd = normalize(cameraPosition - vWorld);
      alb += vec3(0.25, 0.3, 0.4) * pow(1.0 - abs(dot(n, vd)), 3.0) * max(dot(-vd, uMoonDir), 0.0) * 0.8;
    #endif
    vec3 col = light(alb, n, vWorld) + alb * vec3(0.06, 0.07, 0.10) * (1.0 - n.y * 0.3);   // the open sky's fill on the sides
    gl_FragColor = vec4(haze(col, vWorld, 1500.0, 2100.0), 1.0);
  }`;

const MOUNTAIN_FRAG = /* glsl */ `
  ${SKY_GLSL}
  varying vec3 vWorld;
  void main() {
    float top = smoothstep(0.0, 60.0, vWorld.y);
    vec3 col = mix(vec3(0.012, 0.014, 0.024), vec3(0.02, 0.024, 0.04), top);
    gl_FragColor = vec4(haze(col, vWorld, 2700.0, 1e5) + dither(gl_FragCoord.xy), 1.0);
  }`;

const POINTS_FRAG = /* glsl */ `
  varying vec3 vCol;
  void main() { float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(vCol * smoothstep(0.5, 0.05, r), 1.0); }`;
const CITY_VERT = /* glsl */ `
  attribute float aSeed; uniform float uTime, uPx, uNight; varying vec3 vCol;
  void main() {
    vec3 warm = vec3(1.0, 0.66, 0.32), white = vec3(0.95, 0.9, 0.8);
    float tw = 0.75 + 0.25 * sin(uTime * (3.0 + aSeed * 5.0) + aSeed * 90.0);   // heat shimmer over the valley
    vCol = mix(warm, white, step(0.78, aSeed)) * (0.5 + 0.6 * fract(aSeed * 13.7)) * tw * uNight;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (1.0 + fract(aSeed * 7.3) * 1.2) * uPx;
    gl_Position = projectionMatrix * mv;
  }`;
const MOTES_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime, uPx; uniform vec3 uBox, uOrigin, uLampPos; uniform float uLamp;
  varying vec3 vCol;
  void main() {
    vec3 p = position;
    p.x = mod(p.x + uTime * (0.25 + aSeed * 0.35) + sin(uTime * 0.3 + aSeed * 40.0) * 0.5, uBox.x) - uBox.x * 0.5;
    p.y = mod(p.y + uTime * 0.04 * (aSeed - 0.4) + sin(uTime * 0.5 + aSeed * 20.0) * 0.12, uBox.y);
    p.z += sin(uTime * 0.25 + aSeed * 13.0) * 0.6;
    vec4 wp = modelMatrix * vec4(p + uOrigin, 1.0);
    vec4 mv = viewMatrix * wp;
    float lamp = exp(-distance(wp.xyz, uLampPos) / 1.6) * uLamp;
    vCol = vec3(0.30, 0.34, 0.45) * (0.4 + 0.6 * aSeed) + vec3(1.0, 0.6, 0.25) * lamp * 1.6;
    gl_PointSize = clamp((0.035 + aSeed * 0.035) * uPx * 600.0 / -mv.z, 1.0, 4.0);
    gl_Position = projectionMatrix * mv;
  }`;
const HALO_FRAG = /* glsl */ `
  uniform float uLamp; varying vec2 vUv;
  void main() { float r = length(vUv - 0.5) * 2.0; float i = exp(-r * 5.0) * 0.9 + exp(-r * 14.0) * 1.2;
    gl_FragColor = vec4(vec3(1.0, 0.62, 0.28) * i * uLamp * smoothstep(1.0, 0.7, r), 1.0); }`;
const UV_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// ---- code-built geometry
// the floor: a grid with its rows and columns packed toward the camera (fine underfoot, coarse far off), plus a flat skirt.
// Computing it costs about 25 ms, so it runs in slices between frames (no long task while the journey moves), and its
// arrays are kept for the module's life: a stage released and built again (scrolling back) reuses them at no cost.
const GROUND_CACHE = new Map();
const nextTask = () => new Promise((r) => setTimeout(r, 0));
async function groundArrays(segX, segZ) {
  const key = `${segX}x${segZ}`;
  if (GROUND_CACHE.has(key)) return GROUND_CACHE.get(key);
  const xs = [], zs = [];
  for (let i = 0; i <= segX; i++) { const s = (i / segX) * 2 - 1; xs.push((s < 0 ? GRID.x0 : GRID.x1) * s * s); }
  // z: t from tA to 1, z = zMid - k t|t|
  const k = GRID.zMid - GRID.zFar, tA = -Math.sqrt((GRID.zNear - GRID.zMid) / k);
  for (let j = 0; j <= segZ; j++) { const t = tA + (1 - tA) * (j / segZ); zs.push(GRID.zMid - k * t * Math.abs(t)); }
  const P = new Float32Array(xs.length * zs.length * 3);
  let o = 0, t0 = performance.now();
  for (const z of zs) {
    for (const x of xs) { P[o++] = x; P[o++] = heightAt(x, z); P[o++] = z; }
    if (performance.now() - t0 > 6) { await nextTask(); t0 = performance.now(); }
  }
  const IDX = new Uint16Array(segX * segZ * 6); o = 0;
  for (let j = 0; j < segZ; j++) for (let i = 0; i < segX; i++) {
    const a = j * (segX + 1) + i, b = a + 1, c = a + segX + 1, d = c + 1;
    IDX[o++] = a; IDX[o++] = c; IDX[o++] = b; IDX[o++] = b; IDX[o++] = c; IDX[o++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setIndex(new THREE.BufferAttribute(IDX, 1));
  await nextTask(); g.computeVertexNormals();
  const skirt = new THREE.CircleGeometry(SKIRT_R, 64).rotateX(-Math.PI / 2).translate(0, -0.35, 40);
  skirt.deleteAttribute('uv');
  await nextTask();
  const m = mergeGeometries([g, skirt]); g.dispose(); skirt.dispose();
  const arrays = { position: m.attributes.position.array, normal: m.attributes.normal.array, index: Uint16Array.from(m.index.array) };
  GROUND_CACHE.set(key, arrays);
  return arrays;
}
function groundGeometry(a) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.position, 3)); g.setAttribute('normal', new THREE.BufferAttribute(a.normal, 3));
  g.setIndex(new THREE.BufferAttribute(a.index, 1));
  return g;
}
// the basin's rim: two ridgelines (far and high, nearer and low), low to the left where the city lights show
function mountainGeometry(rand) {
  const parts = [];
  for (const [R, base, amp, seed] of [[2350, 70, 230, 1.7], [1350, 22, 85, 6.3]]) {
    const P = [], IDX = [], SEG = 520, A0 = -2.7, A1 = 2.7;
    for (let i = 0; i <= SEG; i++) {
      const a = A0 + (A1 - A0) * (i / SEG);
      const n = fbm(a * 3.2 + seed, seed * 2, 5), peak = Math.pow(fbm(a * 1.1 + seed * 3, 1.3, 3), 2.2);
      const gap = 1 - 0.85 * Math.exp(-((a - CITY_AZ) ** 2) / 0.09);     // the low gap toward the city
      const hgt = (base + amp * (n * 0.55 + peak * 0.9)) * gap + 4;
      const r = R + (rand() - 0.5) * 30;
      const x = Math.sin(a) * r, z = 40 - Math.cos(a) * r;
      P.push(x, -30, z, x, hgt, z);
      if (i) { const b = (i - 1) * 2; IDX.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(IDX);
    parts.push(g);
  }
  const out = mergeGeometries(parts); parts.forEach((g) => g.dispose());
  return out;
}
function lumpy(geo, rand, amount) {
  // the polyhedron is non-indexed: coincident corners share one random push, so the surface stays closed
  const p = geo.attributes.position, push = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!push.has(key)) push.set(key, 1 + (rand() - 0.5) * amount);
    const k = push.get(key); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  geo.deleteAttribute('uv'); geo.computeVertexNormals();
  return geo;
}

// ---- the saguaros: stage-space x, z, true height in metres, turn
const SAGUAROS = [
  [5.6, -6, 11.2, 2.1],      // under the moon
  [-9.5, 6, 9.4, 0.4],       // the near giant on the left
  [17, -14, 7.2, 4.0],
  [-21, -50, 8.6, 1.3],
  [26, -70, 10.5, 5.1],
  [-4, -96, 6.4, 3.3],
  [44, -30, 6.0, 0.9],
  [-44, -6, 10.8, 2.6],
  [-62, -120, 7.8, 5.6],
  [64, -150, 11.6, 1.8],
  [12, -190, 9.0, 4.4],
  [-30, -230, 11.8, 0.2],
  [92, -60, 8.4, 3.0],
  [-96, -40, 9.6, 1.1],
  [38, -300, 10.0, 2.4],
  [-70, -330, 8.0, 4.8],
  [120, -260, 11.0, 0.6],
  [-140, -170, 9.2, 3.9],
  // behind the camera, for the landing view from above
  [-30, 120, 9.6, 1.0], [40, 160, 8.2, 2.0], [-70, 230, 11.0, 3.0], [20, 300, 7.4, 4.0], [90, 90, 10.2, 5.0], [-110, 60, 7.0, 0.5],
];

export async function build(ctx) {
  const { scene, renderer, camera, anchor, lights, wanderer } = ctx;
  const small0 = Math.min(innerWidth, innerHeight) < 700, seg = small0 ? 160 : 180;   // 33,000 vertices at most, so a 16-bit index
  const groundData = await groundArrays(seg, seg);
  const group = new THREE.Group(); group.name = 'the-ordinary-world'; group.position.copy(anchor.centre);
  const rand = mulberry(1);
  const small = Math.min(innerWidth, innerHeight) < 700;
  const moonDir = new THREE.Vector3(...MOOD.sun).normalize();
  const worldSky = scene.getObjectByName('Sky')?.material?.uniforms;
  const sky = worldSky
    ? { uSunDir: worldSky.uSunDir, uZenith: worldSky.uZenith, uHorizon: worldSky.uHorizon, uGlow: worldSky.uGlow }
    : { uSunDir: { value: moonDir.clone() }, uZenith: { value: new THREE.Color(MOOD.zenith) }, uHorizon: { value: new THREE.Color(MOOD.horizon) }, uGlow: { value: new THREE.Color(MOOD.glow) } };
  const night = { value: 1 };
  Object.assign(sky, { uMoonDir: { value: moonDir }, uNight: night, uCityAz: { value: CITY_AZ } });
  const time = { value: 0 }, px = { value: 1 };
  const origin = new THREE.Vector2(anchor.centre.x, anchor.centre.z);
  const lampLocal = new THREE.Vector3(POST.x + 0.55, 0, POST.z + 0.35);
  lampLocal.y = heightAt(lampLocal.x, lampLocal.z);
  const lampWorld = lampLocal.clone().add(anchor.centre).add(new THREE.Vector3(0, 0.26, 0));
  const lamp = { uLampPos: { value: lampWorld }, uLampCol: { value: new THREE.Color(1.0, 0.62, 0.3) }, uLamp: { value: 1 } };
  const disposables = [];
  const track = (...xs) => { disposables.push(...xs); return xs[0]; };
  const mesh = (geo, mat, name, order = 0) => { const m = new THREE.Mesh(track(geo), track(mat)); m.name = name; m.frustumCulled = false; m.renderOrder = order; group.add(m); return m; };

  // ---- the night sky dome (drawn after the world's sky, under everything else: depth tested, writes no depth)
  const domeMat = new THREE.ShaderMaterial({ vertexShader: POS_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthWrite: false,
    uniforms: { ...sky, uBand: { value: dirAt(-32, 1).cross(dirAt(18, 24)).normalize() } } });
  const dome = mesh(new THREE.SphereGeometry(DOME_R, 64, 32), domeMat, 'night-sky', 1);

  // ---- the moon
  const moonMat = new THREE.ShaderMaterial({ vertexShader: POS_VERT, fragmentShader: MOON_FRAG, uniforms: { uMoonDir: sky.uMoonDir, uRadius: { value: MOON_R }, uNight: night } });
  const moon = mesh(new THREE.PlaneGeometry(1, 1), moonMat, 'moon', 2);
  moon.scale.setScalar(2 * MOON_DIST * Math.tan(MOON_R) * 1.15);

  // ---- the faint star layer: half spread over the sky, half along the Milky Way
  const nStars = small ? 2400 : 3600;
  const band = domeMat.uniforms.uBand.value;
  const sp = new Float32Array(nStars * 3), ss = new Float32Array(nStars);
  const bu = new THREE.Vector3().crossVectors(band, new THREE.Vector3(0, 1, 0)).normalize(), bv = new THREE.Vector3().crossVectors(band, bu);
  const tmp = new THREE.Vector3();
  for (let k = 0; k < nStars; k++) {
    if (k % 2) { const a = rand() * Math.PI * 2, off = (rand() + rand() + rand() - 1.5) * 0.12; tmp.copy(bu).multiplyScalar(Math.cos(a)).addScaledVector(bv, Math.sin(a)).addScaledVector(band, off).normalize(); }
    else tmp.set(rand() * 2 - 1, rand(), rand() * 2 - 1).normalize();
    if (tmp.y < 0.02) tmp.y = Math.abs(tmp.y) + 0.02;
    tmp.normalize().multiplyScalar(DOME_R - 150);
    sp.set([tmp.x, tmp.y, tmp.z], k * 3); ss[k] = Math.pow(rand(), 2.2);
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); starGeo.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
  const starMat = new THREE.ShaderMaterial({ vertexShader: STARS_VERT, fragmentShader: STARS_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: time, uPx: px, uNight: night } });
  const stars = new THREE.Points(track(starGeo), track(starMat)); stars.name = 'faint-stars'; stars.frustumCulled = false; group.add(stars);

  // ---- the desert floor
  const groundMat = new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG,
    uniforms: { ...sky, ...lamp, uOrigin: { value: origin }, uTrail0: { value: TRAIL_START }, uTrailX0: { value: TRAIL_X0 }, uTrailFrom: { value: TRAIL_FROM } } });
  mesh(groundGeometry(groundData), groundMat, 'desert-floor');
  await nextTask();

  // ---- the mountains
  mesh(mountainGeometry(rand), new THREE.ShaderMaterial({ vertexShader: POS_VERT, fragmentShader: MOUNTAIN_FRAG, uniforms: { ...sky } }), 'mountains');

  // ---- the city lights, far off to the left in the gap of the mountains
  const nCity = 520, cp = new Float32Array(nCity * 3), cs = new Float32Array(nCity);
  for (let k = 0; k < nCity; k++) {
    // spread along the valley floor, which rises gently toward the far mountains (so they show over the near dunes)
    const a = CITY_AZ + (rand() + rand() - 1) * 0.36, r = 900 + Math.pow(rand(), 0.7) * 380;
    cp.set([Math.sin(a) * r, 4 + (r - 900) * 0.035 + rand() * 2, 40 - Math.cos(a) * r], k * 3); cs[k] = rand();
  }
  const cityGeo = new THREE.BufferGeometry(); cityGeo.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cityGeo.setAttribute('aSeed', new THREE.BufferAttribute(cs, 1));
  const cityMat = new THREE.ShaderMaterial({ vertexShader: CITY_VERT, fragmentShader: POINTS_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: time, uPx: px, uNight: night } });
  const city = new THREE.Points(track(cityGeo), track(cityMat)); city.name = 'city-lights'; city.frustumCulled = false; group.add(city);

  // ---- rocks and brush, scattered (never on the trail, never in the Wanderer's way)
  const litMat = track(new THREE.ShaderMaterial({ vertexShader: LIT_VERT, fragmentShader: LIT_FRAG, uniforms: { ...sky, ...lamp } }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), c3 = new THREE.Color();
  const clearOf = (x, z, pad) => Math.abs(x - trailX(Math.min(z, TRAIL_START))) > pad && Math.hypot(x - TRAIL_X0, z - 30) > pad + 3 && Math.hypot(x - POST.x, z - POST.z) > pad
    && Math.hypot(x - WOLF_DUNE.x, z - WOLF_DUNE.z) > 9;
  // scatter at distances log-uniform from the camera (even on screen), inside a wide wedge plus a ring for the landing view
  function scatter(n, minD, maxD, pad) {
    const out = [];
    while (out.length < n) {
      const d = minD * Math.pow(maxD / minD, rand()), a = (rand() * 2 - 1) * (out.length % 4 === 3 ? Math.PI : 1.1);
      const x = Math.sin(a) * d, z = 40 - Math.cos(a) * d;
      if (clearOf(x, z, pad)) out.push([x, z]);
    }
    return out;
  }
  const rockGeo = lumpy(new THREE.IcosahedronGeometry(1, 1), rand, 0.5);
  const nRocks = small ? 300 : 420;
  const rocks = new THREE.InstancedMesh(track(rockGeo), litMat, nRocks); rocks.name = 'rocks'; rocks.frustumCulled = false;
  scatter(nRocks, 8, 420, 1.0).forEach(([x, z], k) => {
    const d = Math.hypot(x, z - 40), big = d > 35 && rand() < 0.1;
    const r = big ? 0.8 + rand() * 1.2 : (0.08 + Math.pow(rand(), 2.5) * 0.4) * Math.min(1, 0.5 + d / 30);
    e.set(rand() * 3, rand() * 6.3, rand() * 3); q.setFromEuler(e);
    s3.set(r * (0.8 + rand() * 0.6), r * (0.45 + rand() * 0.35), r * (0.8 + rand() * 0.6));
    p3.set(x, heightAt(x, z) - s3.y * 0.3, z);
    rocks.setMatrixAt(k, m4.compose(p3, q, s3));
    const v = 0.5 + rand() * 0.22; rocks.setColorAt(k, c3.setRGB(v * 1.04, v * 0.94, v * 0.84));
  });
  group.add(rocks);
  // a shrub: a few lumpy clumps around a low centre (creosote, bursage)
  const bushGeo = mergeGeometries([[0, 0.55, 0, 0.62], [0.5, 0.4, 0.15, 0.45], [-0.42, 0.42, -0.2, 0.48], [0.1, 0.36, -0.5, 0.4], [-0.15, 0.32, 0.5, 0.38]].map(([x, y, z, r]) => {
    const c = lumpy(new THREE.IcosahedronGeometry(r, 1), rand, 0.6); c.scale(1, 0.8, 1); c.translate(x, y, z);
    c.deleteAttribute('normal'); const m = mergeVertices(c); c.dispose(); m.computeVertexNormals(); return m;   // soft, not faceted
  }));
  const nBush = small ? 220 : 300;
  const leafMat = track(new THREE.ShaderMaterial({ vertexShader: LIT_VERT, fragmentShader: LIT_FRAG, defines: { LEAFY: 1 }, uniforms: { ...sky, ...lamp } }));
  const brush = new THREE.InstancedMesh(track(bushGeo), leafMat, nBush); brush.name = 'brush'; brush.frustumCulled = false;
  scatter(nBush, 11, 480, 1.3).forEach(([x, z], k) => {
    const r = (0.35 + rand() * 0.5) * Math.min(1, 0.5 + Math.hypot(x, z - 40) / 40);
    e.set(0, rand() * 6.3, 0); q.setFromEuler(e);
    s3.set(r * (0.9 + rand() * 0.4), r * (0.7 + rand() * 0.6), r * (0.9 + rand() * 0.4));
    p3.set(x, heightAt(x, z) - 0.08, z);
    brush.setMatrixAt(k, m4.compose(p3, q, s3));
    const v = 0.5 + rand() * 0.18; brush.setColorAt(k, c3.setRGB(v * 0.84, v * 0.96, v * 0.72));   // creosote and bursage, grey-green
  });
  group.add(brush);

  // ---- the lantern's halo (additive, depth tested)
  const haloMat = new THREE.ShaderMaterial({ vertexShader: UV_VERT, fragmentShader: HALO_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uLamp: lamp.uLamp } });
  const halo = mesh(new THREE.PlaneGeometry(1.6, 1.6), haloMat, 'lantern-halo', 3);
  halo.position.copy(lampWorld).sub(anchor.centre);

  // ---- sand motes drifting through the moonlight, a box in front of the camera (all motion in the shader)
  const camLocal = anchor.cam.clone().sub(anchor.centre);
  const nMotes = small ? 260 : 420, box = new THREE.Vector3(26, 3.2, 30);
  const mp = new Float32Array(nMotes * 3), ms = new Float32Array(nMotes);
  for (let k = 0; k < nMotes; k++) { mp.set([rand() * box.x, rand() * box.y, -rand() * box.z], k * 3); ms[k] = rand(); }
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3)); moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(ms, 1));
  const moteMat = new THREE.ShaderMaterial({ vertexShader: MOTES_VERT, fragmentShader: POINTS_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: time, uPx: px, uBox: { value: box }, uOrigin: { value: new THREE.Vector3(camLocal.x, 0.05, camLocal.z - 2) }, ...lamp } });
  const motes = new THREE.Points(track(moteGeo), track(moteMat)); motes.name = 'motes'; motes.frustumCulled = false; group.add(motes);

  // ---- the lights (ctx.lights, never added): the lantern's warm glow, and a cool moon rim on the Wanderer
  const [lampLight, rim] = lights;
  lampLight.color.set('#ffb070'); lampLight.distance = 11; lampLight.decay = 2; lampLight.position.copy(lampWorld).add(new THREE.Vector3(0.6, 0.35, 0.3));   // off the post, so it rakes the wood instead of blowing it out
  rim.color.set('#a9bff0'); rim.distance = 7; rim.decay = 2;

  // ---- the props: loaded in the background (the desert never waits), converted to plain floats, warmed, then shown
  let disposed = false;
  const uploads = [], pending = new Set(), loaded = [];
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const url = (p) => import.meta.env.BASE_URL + p;
  // quantized (meshopt) vertex data makes ANGLE build a separate vertex shader at the first draw, after any warm-up (see
  // src/engine/dequantize.js); as plain floats each prop draws with the program the warm-up built
  const toFloats = dequantize;
  // the model's single mesh, its node transform baked in (the models are normalised to about 1 m tall, feet at y 0)
  function bakedMesh(gltf) {
    toFloats(gltf.scene); gltf.scene.updateMatrixWorld(true);
    let found = null; gltf.scene.traverse((o) => { if (o.isMesh && !found) found = o; });
    const geo = found.geometry.clone().applyMatrix4(found.matrixWorld);
    found.geometry.dispose();
    return { geo, mat: found.material };
  }
  async function adopt(obj) {
    try { await renderer.compileAsync(obj, camera, scene); } catch (err) { console.warn('The Ordinary World: a prop warm-up failed; it compiles on first sight', err); }
    if (disposed) { disposeTree(obj); return; }
    const tex = new Set(); obj.traverse((o) => { for (const mat of [].concat(o.material || [])) for (const k in mat) if (mat[k]?.isTexture) tex.add(mat[k]); });
    obj.visible = false; loaded.push(obj); group.add(obj);
    const entry = { obj, left: tex.size }; pending.add(entry);
    for (const t of tex) uploads.push({ entry, t });
    ctx.requestDraw();
  }
  // one prop at a time, each step in its own task, so no single frame carries two props' preparation; each step catches
  // its own failure (a throwing prop is logged and skipped, the chain goes on to the next)
  let chain = Promise.resolve();
  const warn = (p) => (err) => console.warn(`The Ordinary World: ${p} did not load; the desert goes on without it`, err);
  const load = (p, use) => loader.loadAsync(url(p)).then((g) => (chain = chain.then(async () => {
    if (disposed) return; await nextTask(); const o = use(g); await nextTask(); if (!disposed) await adopt(o); else disposeTree(o);
  }).catch(warn(p))))
    .catch(warn(p));
  const nightMat = (mat, tint, rough = 1) => { mat.color.multiply(new THREE.Color(tint)); mat.metalness = 0; mat.roughness = rough; return mat; };

  load('models/props/saguaro.glb', (g) => {
    const { geo, mat } = bakedMesh(g);
    const h0 = (geo.computeBoundingBox(), geo.boundingBox.max.y);
    nightMat(mat, '#ffffff'); mat.emissive.set('#26324a'); mat.emissiveMap = mat.map; mat.emissiveIntensity = 0.55;   // a faint cool sky fill
    const inst = new THREE.InstancedMesh(geo, mat, SAGUAROS.length); inst.name = 'saguaros'; inst.frustumCulled = false;
    SAGUAROS.forEach(([x, z, h, turn], k) => {
      const sc = h / h0; q.setFromEuler(e.set(0, turn, 0));
      inst.setMatrixAt(k, m4.compose(p3.set(x, heightAt(x, z) - 0.15, z), q, s3.set(sc, sc, sc)));
    });
    return inst;
  });
  load('models/props/trail-post.glb', (g) => {
    toFloats(g.scene); g.scene.traverse((o) => { if (o.material) nightMat(o.material, '#ffffff', 0.9); });
    g.scene.scale.setScalar(1.45 / 0.979); g.scene.rotation.y = -0.35;
    g.scene.position.set(POST.x, heightAt(POST.x, POST.z) - 0.05, POST.z); g.scene.name = 'trail-post';
    return g.scene;
  });
  load('models/lantern.glb', (g) => {
    toFloats(g.scene);
    g.scene.traverse((o) => { if (o.material) { const m = o.material; nightMat(m, '#ffffff', 0.7); m.emissive.set('#ff9a40'); m.emissiveMap = m.map; m.emissiveIntensity = 0.5; } });
    g.scene.scale.setScalar(0.38 / 0.979); g.scene.rotation.y = 0.5;
    g.scene.position.copy(lampLocal); g.scene.name = 'lantern';
    return g.scene;
  });
  load('models/props/blue-wolf.glb', (g) => {
    toFloats(g.scene); g.scene.traverse((o) => { if (o.material) nightMat(o.material, '#5a6070'); });
    const wx = WOLF_DUNE.x + 1, wz = WOLF_DUNE.z + 1;
    g.scene.scale.setScalar(0.95 / 0.836); g.scene.rotation.y = Math.PI * 0.5 + 0.25;   // side on, looking toward the city
    g.scene.position.set(wx, heightAt(wx, wz) - 0.05, wz); g.scene.name = 'wolf';
    return g.scene;
  });

  // warm the stage's own programs one at a time, a task apart (the world warms the whole group again once it is built, and
  // finds them all ready), so creating ten programs never lands in one frame
  for (const o of [...group.children]) {
    if (disposed) break;
    try { await renderer.compileAsync(o, camera, scene); } catch { /* the world's warm-up retries; a failure here is harmless */ }
    await nextTask();
  }
  scene.add(group);

  let lampFlicker = 1;
  const wPos = new THREE.Vector3();
  function update(dt, local) {
    if (!group.visible) return;
    const still = ctx.still;
    if (!still) time.value += dt;
    // the night owns the sky until the camera climbs toward the next stage; it hands over to the world's sky by the change of set
    night.value = 1 - smooth(0.75, 1.0, local);
    // the camera-centred pieces
    const camL = tmp.copy(camera.position).sub(group.position);
    dome.position.copy(camL); stars.position.copy(camL);
    moon.position.copy(camL).addScaledVector(moonDir, MOON_DIST); moon.quaternion.copy(camera.quaternion);
    px.value = renderer.getPixelRatio();
    // fewer instances when the render loop steps quality down
    const low = ctx.quality < LOW_BELOW;
    rocks.count = low ? Math.floor(nRocks * 0.5) : nRocks; brush.count = low ? Math.floor(nBush * 0.5) : nBush;
    motes.geometry.setDrawRange(0, low ? Math.floor(nMotes * 0.5) : nMotes);
    stars.geometry.setDrawRange(0, low ? Math.floor(nStars * 0.5) : nStars);
    // the lantern breathes a little (held in still mode)
    if (!still) lampFlicker = 0.92 + 0.05 * Math.sin(time.value * 7.3) + 0.03 * Math.sin(time.value * 17.1 + 1.3);
    lamp.uLamp.value = lampFlicker; lampLight.intensity = 1.6 * lampFlicker;
    halo.quaternion.copy(camera.quaternion);
    // a cool rim from the moon side, ahead of and above the Wanderer
    const w = wanderer.copyPosition(wPos);
    if (Number.isFinite(w.x)) { rim.position.set(w.x + moonDir.x * 2.2, w.y + 2.6, w.z + moonDir.z * 2.2); rim.intensity = 9; } else rim.intensity = 0;
    // props: textures upload one a frame (all at once in still mode); each shows once its own are up
    if (uploads.length) {
      do { const u = uploads.shift(); renderer.initTexture(u.t); u.entry.left--; } while (still && uploads.length);
      ctx.requestDraw();
    }
    for (const p of pending) if (p.left <= 0) { p.obj.visible = true; pending.delete(p); ctx.requestDraw(); }
  }

  function disposeTree(o) {
    o.traverse((c) => { c.geometry?.dispose?.(); for (const mat of [].concat(c.material || [])) { for (const k in mat) mat[k]?.isTexture && mat[k].dispose(); mat.dispose(); } });
  }
  return {
    group, update,
    groundAt: (x, z) => heightAt(x - anchor.centre.x, z - anchor.centre.z),
    pathAt: (z) => anchor.centre.x + trailX(z - anchor.centre.z),
    dispose() {
      disposed = true; scene.remove(group);
      for (const d of disposables) d.dispose();
      rocks.dispose(); brush.dispose();
      for (const o of loaded) { disposeTree(o); o.dispose?.(); }
    },
  };
}
