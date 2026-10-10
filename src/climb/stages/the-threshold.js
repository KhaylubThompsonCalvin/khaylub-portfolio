// The Threshold (stage 3): crossing over. A river in dawn mist: a stone path runs down a wet bank to an old stone arch at
// the water's edge, and on through it as a causeway of flat stones across the river. Low mist banks drift over the water,
// the far bank's pines fade into the mist, and the pale sun sits just below the ridge, its glow spilling over the crest.
// Through the stage the set slides toward the camera (the camera itself rests on its anchor, as the path requires), so the
// visitor walks on behind the Wanderer: the arch comes near, passes overhead (the camera goes through it at about local
// 0.65), and the stage ends on the causeway with the river wide on either side.
//
// Parts (about 16 draw calls of the stage's own, plus the Wanderer's ~33):
//   terrain   one non-uniform grid: the near bank with its flagstone path, the river bed, the far bank rising to the woods
//   water     the river: a flowing ripple field (flow +x) mirroring the dawn sky, the far ridges and the far treeline
//             (analytic reflections, no render target), with shallows at the banks and foam where it pours past the causeway
//   causeway  flat stone slabs across the river (merged boxes), wet at the water line
//   arch      the stone-arch prop, 7 m tall (its opening spans x -1.5 to 1.5); trekking poles lean on its left leg
//   rocks     the snow-boulders prop re-shaded as wet river rock (dark, mossy, glossy), instanced along both banks and midstream
//   grass     instanced tufts on both banks and reeds at the water's edge, with a slow sway
//   pines     the far bank's forest, merged code-built pines, fading layer by layer into the mist
//   skyline   two analytic ridge lines (near hills, far range) with a warm rim where the hidden sun is just below the crest
//   mist      seven thin ground-level slices over the water (like src/engine/clouds.js, but low and drifting with the river)
// Every colour is display-referred like the shared sky shader (no tone mapping, no colour-space step), and the haze converges
// on the sky's horizon colour, so the land meets the sky without a seam.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { dequantize } from '../../engine/dequantize.js';
import { MOODS } from '../journey.js';

const MOOD = MOODS[2];
const WATER_Y = -0.32;                       // the river's surface (the bank and the path are at about y 0)
const CAUSEWAY_TOP = 0.04, CAUSEWAY_HALF = 1.6;
const PATH_X = 0;                            // the stone path and the causeway's centre line (stage space): the Wanderer walks on it
const ARCH_H = 7.0;
const SLIDE = 36, SLIDE_FROM = 0.12, SLIDE_TO = 0.88;   // metres the set moves toward the camera through the stage
const GRASS = 16000, GRASS_SMALL = 11000, GRASS_LOW = 6000, LOW_BELOW = 0.7;
const MIST_Y = [-0.2, 0.12, 0.45, 0.85, 1.35, 2.0, 2.8];

// ---- the land, in the stage's own (set) space: shared by the meshes, groundAt and (as GLSL) the shaders
const eN = (x) => 8 + 1.8 * Math.sin(x * 0.045 + 0.7) + 0.8 * Math.sin(x * 0.13 + 0.3);    // near water's edge (river at z below)
const eF = (x) => -42 + 3 * Math.sin(x * 0.03 - 0.4) + 1.2 * Math.sin(x * 0.11 + 2);       // far water's edge (river at z above)
const ARCH_Z = eN(0) + 2.6;
const ridgeFar = (az) => 0.034 + 0.022 * (1 - Math.abs(Math.sin(az * 3.7 + 0.4))) + 0.012 * (1 - Math.abs(Math.sin(az * 8.3 + 1.2))) + 0.006 * (1 - Math.abs(Math.sin(az * 19 + 0.3))) + 0.03 * Math.exp(-(((az - 0.38) / 0.2) ** 2));
const ridgeNear = (az) => 0.012 + 0.008 * (1 - Math.abs(Math.sin(az * 4.1 + 2.0))) + 0.004 * Math.sin(az * 9.3 + 0.4) + 0.002 * Math.sin(az * 23.0);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const hashJ = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoiseJ(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hashJ(ix, iy), hashJ(ix + 1, iy), fx), lerp(hashJ(ix, iy + 1), hashJ(ix + 1, iy + 1), fx), fy);
}
const fbmJ = (x, y) => vnoiseJ(x, y) * 0.55 + vnoiseJ(x * 2.1 + 5.2, y * 2.1 + 1.3) * 0.3 + vnoiseJ(x * 4.3 + 9.1, y * 4.3 + 3.7) * 0.15;
export function terrainH(x, z) {
  const n = fbmJ(x * 0.07, z * 0.07), dn = z - eN(x), df = eF(x) - z;
  if (dn >= 0) {
    const off = sm(1.9, 3.4, Math.abs(x));      // 0 on the stone path (level), 1 on the open bank
    const base = ((n - 0.45) * 0.8 + 0.1) + Math.max(0, Math.abs(x) - 22) * 0.035 + Math.max(0, z - 60) * 0.03;
    return lerp(0, lerp(-0.8, base, sm(0, 3.2, dn)), off);
  }
  if (df >= 0) {
    const base = 0.25 + Math.min(df, 80) * 0.07 + (n - 0.5) * 1.4 + Math.max(0, df - 80) * 0.012;
    return lerp(-0.8, base, sm(0, 5, df));
  }
  return -0.8 - 0.9 * sm(0, 7, Math.min(-dn, -df));
}
const onCauseway = (x, z) => Math.abs(x) < CAUSEWAY_HALF && z < eN(x) + 0.35 && z > eF(x) - 0.4;
export const groundLocal = (x, z) => (onCauseway(x, z) ? CAUSEWAY_TOP : Math.max(terrainH(x, z), WATER_Y));
export const slideAt = (local) => SLIDE * sm(SLIDE_FROM, SLIDE_TO, local);

// ---- shared GLSL: the sky's own formula (src/engine/sky.js), noise, the river's edges, the ridges, and the haze
const COMMON_GLSL = /* glsl */ `
  uniform vec3 uSunDir, uZenith, uHorizon, uGlow, uOrigin;
  uniform float uTime;
  const vec3 COOL = vec3(0.56, 0.60, 0.66);
  const float WATER_Y = ${WATER_Y.toFixed(3)};
  vec3 skyAt(vec3 d) {
    float h = clamp(d.y, -0.2, 1.0), s = max(dot(d, uSunDir), 0.0);
    vec3 hor = mix(COOL, uHorizon, pow(s, 3.0));
    vec3 col = mix(hor, uZenith, pow(smoothstep(-0.05, 0.55, h), 0.8));
    return col + uGlow * pow(s, 10.0) * 0.32 + uGlow * pow(s, 90.0) * 0.5;
  }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y); }
  float fbm3(vec2 p) { return vnoise(p) * 0.55 + vnoise(p * 2.1 + vec2(5.2, 1.3)) * 0.3 + vnoise(p * 4.3 + vec2(9.1, 3.7)) * 0.15; }
  float eN(float x) { return 8.0 + 1.8 * sin(x * 0.045 + 0.7) + 0.8 * sin(x * 0.13 + 0.3); }
  float eF(float x) { return -42.0 + 3.0 * sin(x * 0.03 - 0.4) + 1.2 * sin(x * 0.11 + 2.0); }
  float ridgeFar(float az) { float k = (az - 0.38) / 0.2;
    return 0.034 + 0.022 * (1.0 - abs(sin(az * 3.7 + 0.4))) + 0.012 * (1.0 - abs(sin(az * 8.3 + 1.2))) + 0.006 * (1.0 - abs(sin(az * 19.0 + 0.3))) + 0.03 * exp(-k * k); }
  float ridgeNear(float az) { return 0.012 + 0.008 * (1.0 - abs(sin(az * 4.1 + 2.0))) + 0.004 * sin(az * 9.3 + 0.4) + 0.002 * sin(az * 23.0); }
  vec3 flatDir(vec3 d) { return normalize(vec3(d.x, 0.015, d.z)); }
  // the mist's own colour: the horizon's, pale and cool, only softly warmed toward the sun (the sky's bright glow belongs
  // to the open sky; mist in front of the land would otherwise burn orange)
  vec3 mistAt(vec3 d) {
    float s = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0);
    return mix(vec3(0.62, 0.65, 0.69), mix(uHorizon, vec3(0.80, 0.74, 0.68), 0.45), pow(s, 4.0) * 0.85);
  }
  // haze: toward the mist near, toward the sky's own horizon far away, so the land meets the sky without a seam
  vec3 haze(vec3 col, vec3 world, float hazeDist) {
    vec3 v = world - cameraPosition; float d = length(v); vec3 dir = v / d;
    float f = 1.0 - exp(-d / hazeDist);
    f = max(f, smoothstep(1200.0, 1700.0, d));
    return mix(col, mix(mistAt(dir), skyAt(flatDir(dir)), smoothstep(250.0, 1400.0, d)), f);
  }
  // the ridge colours, shared by the skyline and the river's reflection of it
  vec3 farRidgeCol(vec3 d) { return mix(vec3(0.30, 0.32, 0.40), mistAt(d), 0.42); }
  vec3 nearRidgeCol(vec3 d) { return mix(vec3(0.17, 0.20, 0.24), mistAt(d), 0.4); }
  // the light: a pale sky from above, the low sun ahead (warm, from just under the ridge, so mostly a rim)
  const vec3 SUNCOL = vec3(1.0, 0.76, 0.56);
  vec3 lightOn(vec3 col, vec3 n) {
    float sky = 0.62 + 0.3 * n.y;
    vec3 sh = normalize(vec3(uSunDir.x, 0.25, uSunDir.z));
    return col * (vec3(0.93, 0.95, 1.0) * sky + SUNCOL * max(dot(n, sh), 0.0) * 0.55);
  }`;

const BASIC_VERT = /* glsl */ `
  varying vec3 vWorld, vN;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp; }`;

const TERRAIN_FRAG = /* glsl */ `
  ${COMMON_GLSL}
  varying vec3 vWorld, vN;
  // flagstones: the nearest two cell centres of a jittered grid
  vec3 cells(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0; vec2 id = vec2(0.0);
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(hash2(i + g), hash2(i + g + 17.3)) * 0.8 + 0.1; float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d; }
    return vec3(d2 - d1, id); }
  void main() {
    vec3 L = vWorld - uOrigin;
    float dn = L.z - eN(L.x), df = eF(L.x) - L.z;
    float n1 = fbm3(L.xz * 0.35), n2 = vnoise(L.xz * 2.3);
    vec3 grass = mix(vec3(0.15, 0.17, 0.12), vec3(0.25, 0.26, 0.18), n1);
    vec3 earth = mix(vec3(0.13, 0.11, 0.09), vec3(0.22, 0.19, 0.15), n2);
    vec3 col = mix(earth, grass, smoothstep(0.35, 0.6, n1 + n2 * 0.2));
    // the stone path down the near bank, to the causeway
    float path = (1.0 - smoothstep(1.55, 1.8, abs(L.x))) * step(0.0, dn);
    vec3 c = cells(L.xz * vec2(2.3, 1.9));
    float h = hash2(c.yz);
    vec3 stone = mix(vec3(0.19, 0.185, 0.18), vec3(0.30, 0.29, 0.27), h) * (0.85 + 0.3 * n2);
    col = mix(col, mix(mix(vec3(0.09, 0.10, 0.07), grass * 0.6, 0.5), stone, smoothstep(0.02, 0.07, c.x)), path);
    // wet near the water line: darker, and mirror-like at grazing angles
    float wet = 1.0 - smoothstep(0.0, 0.5, vWorld.y - WATER_Y);
    col *= mix(1.0, 0.5, wet);
    vec3 n = normalize(vN);
    col = lightOn(col, n);
    vec3 vd = normalize(vWorld - cameraPosition);
    float fr = pow(1.0 - max(-vd.y, 0.0), 5.0);
    col += skyAt(reflect(vd, vec3(0.0, 1.0, 0.0))) * fr * (0.05 + 0.45 * wet + 0.3 * path * smoothstep(0.02, 0.07, c.x));
    gl_FragColor = vec4(haze(col, vWorld, 240.0), 1.0);
  }`;

const WATER_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const WATER_FRAG = /* glsl */ `
  ${COMMON_GLSL}
  varying vec3 vWorld;
  // the ripple field, moving downstream (+x): long slow swells, finer chop, and broad slow undulations
  float wh(vec2 p, float t) {
    float a = vnoise(vec2((p.x - t * 0.9) * 0.45, p.y * 1.6));
    float b = vnoise(vec2((p.x - t * 1.4) * 1.3, p.y * 3.1) + 7.3);
    float c = vnoise(vec2((p.x - t * 0.5) * 0.12, p.y * 0.45) + 3.1);
    return a * 0.6 + b * 0.25 + c * 0.9;
  }
  // the far treeline as seen in the water: the reflected ray against the forest's front (a wall just behind the far edge)
  float treeTop(float x) { return 13.5 + 3.5 * sin(x * 0.23) + 2.5 * sin(x * 0.61 + 1.0) + 1.5 * sin(x * 1.7 + 2.0) + 1.5 * sin(x * 3.1); }
  void main() {
    vec3 L = vWorld - uOrigin;
    vec3 v = vWorld - cameraPosition; float d = length(v); vec3 vd = v / d;
    float t = uTime, e = 0.08;
    float h0 = wh(L.xz, t), hx = wh(L.xz + vec2(e, 0.0), t), hz = wh(L.xz + vec2(0.0, e), t);
    float amp = 0.11 / (1.0 + d * 0.035);                      // calmer with distance (and no shimmer)
    vec3 n = normalize(vec3(-(hx - h0) / e * amp, 1.0, -(hz - h0) / e * amp));
    vec3 r = reflect(vd, n); r.y = abs(r.y);
    // what the water mirrors: the sky, the far range and the near hills, and the far bank's pines
    float az = atan(r.x, -r.z), el = r.y;
    vec3 refl = skyAt(r);
    refl = mix(refl, farRidgeCol(r), smoothstep(ridgeFar(az) + 0.004, ridgeFar(az) - 0.004, el));
    refl = mix(refl, nearRidgeCol(r), smoothstep(ridgeNear(az) + 0.003, ridgeNear(az) - 0.003, el));
    if (r.z < -0.01) {
      float zt = eF(L.x) - 40.0, tt = (zt - L.z) / r.z;
      vec3 hit = L + r * tt;
      float tm = smoothstep(treeTop(hit.x) + 0.8, treeTop(hit.x) - 0.8, hit.y);
      vec3 pine = mix(vec3(0.07, 0.10, 0.10), mistAt(r), 1.0 - exp(-(d + tt) / 150.0));
      refl = mix(refl, pine, tm * step(0.0, tt));
    }
    refl *= 0.92;
    float cosT = max(dot(-vd, n), 0.0), F = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
    float dn = eN(L.x) - L.z, df = L.z - eF(L.x), edge = min(dn, df);
    vec3 body = mix(vec3(0.055, 0.08, 0.085), vec3(0.17, 0.15, 0.11), (1.0 - smoothstep(0.0, 3.5, edge)) * 0.7);
    body += skyAt(vec3(0.0, 1.0, 0.0)) * 0.06;
    vec3 col = mix(body, refl, F);
    // foam: where the river pours past the causeway (downstream, +x), a little where it piles against it, and at the banks
    float dx = L.x - ${CAUSEWAY_HALF.toFixed(2)};
    float streak = smoothstep(0.5, 0.85, vnoise(vec2((L.x - t * 1.3) * 0.7, L.z * 3.5)));
    float foam = exp(-max(dx, 0.0) * 0.4) * step(-0.05, dx) * (0.35 + 0.65 * streak);
    foam += (1.0 - smoothstep(0.0, 0.6, -L.x - ${CAUSEWAY_HALF.toFixed(2)})) * step(0.0, -L.x - ${CAUSEWAY_HALF.toFixed(2)}) * 0.5 * vnoise(vec2(L.z * 4.0, t * 2.0));
    foam += (1.0 - smoothstep(0.0, 0.7, edge)) * 0.45 * vnoise(vec2(L.x * 1.5 - t * 1.1, L.z * 3.0));
    foam *= smoothstep(-0.2, 0.3, edge);
    col = mix(col, vec3(0.80, 0.80, 0.80), clamp(foam, 0.0, 1.0) * 0.6);
    gl_FragColor = vec4(haze(col, vWorld, 260.0), 1.0);
  }`;

const CAUSEWAY_VERT = /* glsl */ `
  attribute float aSeed;
  varying vec3 vWorld, vN; varying float vSeed;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vSeed = aSeed;
    gl_Position = projectionMatrix * viewMatrix * wp; }`;
const CAUSEWAY_FRAG = /* glsl */ `
  ${COMMON_GLSL}
  varying vec3 vWorld, vN; varying float vSeed;
  void main() {
    vec3 L = vWorld - uOrigin, n = normalize(vN);
    float g = vnoise(L.xz * 3.0 + vSeed * 40.0) * 0.6 + vnoise(vec2(L.x + L.z, L.y) * 9.0) * 0.4;
    vec3 col = mix(vec3(0.24, 0.23, 0.22), vec3(0.38, 0.36, 0.33), vSeed) * (0.8 + 0.35 * g);
    float above = vWorld.y - WATER_Y;
    col = mix(col, vec3(0.10, 0.12, 0.08), (1.0 - smoothstep(0.0, 0.14, above)) * 0.8);    // green slick at the water line
    float wet = 1.0 - smoothstep(0.0, 0.32, above);
    col *= mix(1.0, 0.55, wet);
    col = lightOn(col, n);
    vec3 vd = normalize(vWorld - cameraPosition);
    float fr = pow(1.0 - max(dot(-vd, n), 0.0), 5.0);
    col += skyAt(reflect(vd, n)) * fr * (0.15 + 0.4 * wet);
    gl_FragColor = vec4(haze(col, vWorld, 260.0), 1.0);
  }`;

// the props: their own albedo texture under this stage's light; rocks are re-shaded from snow to wet, mossy river stone
const PROP_VERT = /* glsl */ `
  varying vec3 vWorld, vN; varying vec2 vUv;
  void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
    vec4 wp = m * vec4(position, 1.0); vWorld = wp.xyz; vN = normalize(mat3(m) * normal); vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const PROP_FRAG = /* glsl */ `
  ${COMMON_GLSL}
  uniform sampler2D uMap; uniform float uRock, uGloss;
  varying vec3 vWorld, vN; varying vec2 vUv;
  void main() {
    vec3 n = normalize(vN);
    vec3 alb = texture2D(uMap, vUv).rgb;
    if (uRock > 0.5) {
      float l = dot(alb, vec3(0.3, 0.55, 0.15));
      alb = mix(vec3(0.10, 0.10, 0.095), vec3(0.30, 0.29, 0.27), l * 0.75) * (0.85 + 0.3 * vnoise(vWorld.xz * 2.0 + vWorld.y));
      alb = mix(alb, vec3(0.15, 0.18, 0.10), smoothstep(0.55, 0.9, n.y) * smoothstep(0.5, 1.2, vWorld.y - WATER_Y) * 0.7);   // moss on the dry tops
    } else {
      alb = mix(alb, alb * vec3(0.75, 0.85, 0.7), (1.0 - smoothstep(0.0, 1.6, vWorld.y)) * 0.6);   // green-dark damp at the foot
    }
    float above = vWorld.y - WATER_Y, wet = 1.0 - smoothstep(0.0, 0.6, above);
    alb *= mix(1.0, 0.5, wet);
    vec3 col = lightOn(alb, n);
    vec3 vd = normalize(vWorld - cameraPosition);
    float fr = pow(1.0 - max(dot(-vd, n), 0.0), 4.0);
    col += skyAt(reflect(vd, n)) * fr * (uGloss + 0.35 * wet);
    gl_FragColor = vec4(haze(col, vWorld, 240.0), 1.0);
  }`;

const GRASS_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld; varying float vH, vR;
  float hash1(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec3 root = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    float r = hash1(root.xz), h = uv.y;
    float sway = sin(uTime * (1.1 + r * 0.6) + root.x * 0.35 + r * 6.28) * 0.06 + sin(uTime * 0.45 + root.z * 0.2) * 0.04;
    wp.x += sway * h * h * (wp.y - root.y + 0.3);
    vWorld = wp.xyz; vH = h; vR = r;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const GRASS_FRAG = /* glsl */ `
  ${COMMON_GLSL}
  varying vec3 vWorld; varying float vH, vR;
  void main() {
    vec3 col = mix(vec3(0.09, 0.10, 0.07), mix(vec3(0.20, 0.23, 0.15), vec3(0.27, 0.26, 0.18), vR), smoothstep(0.0, 0.9, vH));
    col = lightOn(col, vec3(0.0, 0.7, 0.7));
    vec3 vd = normalize(vWorld - cameraPosition);
    col += SUNCOL * pow(max(dot(vd, uSunDir), 0.0), 16.0) * 0.5 * vH;                 // dew tips against the light
    gl_FragColor = vec4(haze(col, vWorld, 220.0), 1.0);
  }`;

const PINE_VERT = /* glsl */ `
  attribute float aSeed;
  varying vec3 vWorld, vN; varying float vSeed;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vSeed = aSeed;
    gl_Position = projectionMatrix * viewMatrix * wp; }`;
const PINE_FRAG = /* glsl */ `
  ${COMMON_GLSL}
  varying vec3 vWorld, vN; varying float vSeed;
  void main() {
    vec3 n = normalize(vN);
    vec3 col = vec3(0.05, 0.08, 0.075) * (0.75 + 0.5 * vSeed);
    vec3 sh = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
    col += uGlow * pow(max(dot(n, sh), 0.0), 3.0) * 0.12;                              // the sun side catches the glow
    // the mist lies low among the trees: their feet fade first
    vec3 L = vWorld - uOrigin;
    float low = 1.0 - smoothstep(1.0, 9.0, vWorld.y - max(0.0, (eF(L.x) - L.z) * 0.07));
    col = mix(col, mistAt(vWorld - cameraPosition), low * 0.5);
    gl_FragColor = vec4(haze(col, vWorld, 150.0), 1.0);
  }`;

const SKYLINE_VERT = /* glsl */ `
  attribute float aCrest, aLayer;
  varying vec3 vWorld; varying float vBelow, vLayer;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vBelow = aCrest - position.y; vLayer = aLayer;
    gl_Position = projectionMatrix * viewMatrix * wp; }`;
const SKYLINE_FRAG = /* glsl */ `
  ${COMMON_GLSL}
  varying vec3 vWorld; varying float vBelow, vLayer;
  void main() {
    vec3 d = normalize(vWorld - cameraPosition);
    vec3 col = vLayer > 0.5 ? farRidgeCol(d) : nearRidgeCol(d);
    // the hidden sun: its glow spills over the crest just above it
    float toward = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0), 40.0);
    float rim = exp(-vBelow / (vLayer > 0.5 ? 3.5 : 1.2)) * (0.55 + 0.45 * vnoise(vWorld.xz * 0.05));
    col += uGlow * rim * toward * (vLayer > 0.5 ? 0.75 : 0.25);
    // and the mist lifts from the valley floor
    col = mix(col, skyAt(flatDir(d)), (1.0 - smoothstep(0.0, vLayer > 0.5 ? 0.012 : 0.006, d.y + 0.004)) * 0.6);
    gl_FragColor = vec4(col, 1.0);
  }`;

const MIST_FRAG = /* glsl */ `
  ${COMMON_GLSL}
  uniform float uSlice;
  varying vec3 vWorld;
  void main() {
    vec3 L = vWorld - uOrigin;
    vec3 v = vWorld - cameraPosition; float d = length(v); vec3 dir = v / d;
    vec2 p = L.xz * vec2(0.035, 0.08) + vec2(-uTime * 0.03, uTime * 0.003) + uSlice * 3.7;
    float nz = fbm3(p) * 0.75 + vnoise(L.xz * vec2(0.12, 0.3) + vec2(-uTime * 0.07, 0.0)) * 0.25;
    float out_ = max(L.z - eN(L.x), eF(L.x) - L.z);                          // metres from the river onto either bank
    // over the water only, thinning out within a metre or two onto the banks: a slice cutting through the arch or a rock
    // on the bank would draw a hard line across it
    float over = 1.0 - smoothstep(-1.0, 2.5, out_);
    float dens = smoothstep(0.3 + uSlice * 0.2, 0.66, nz) * over;
    dens *= mix(1.0, smoothstep(1.4, 4.0, abs(L.x)), step(0.25, uSlice));   // and thin over the causeway at body height (no line across the Wanderer)
    float a = dens * mix(0.5, 0.14, uSlice) * smoothstep(3.0, 12.0, d) * (1.0 - smoothstep(380.0, 650.0, d));
    if (a < 0.004) discard;
    vec3 dh = normalize(vec3(dir.x, 0.0, dir.z)), sh = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
    float toward = pow(max(dot(dh, sh), 0.0), 5.0);
    vec3 col = mix(vec3(0.72, 0.75, 0.79), vec3(1.0, 0.85, 0.72), toward * 0.8 + uSlice * 0.12);
    col = mix(col, skyAt(flatDir(dir)), smoothstep(60.0, 420.0, d) * 0.8);
    float dn = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    gl_FragColor = vec4(col, clamp(a * (0.93 + 0.14 * dn), 0.0, 1.0));
  }`;

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// a grid whose spacing grows away from the camera's track (fine near the path, coarse far out)
async function terrainGeometry(breathe) {
  const axis = (from, to, centreLo, centreHi, fine, growth) => {
    const out = [];
    for (let v = centreLo; v >= from; v -= fine + Math.max(0, centreLo - v) * growth) out.unshift(v);
    if (out[0] !== from) out.unshift(from);
    for (let v = centreLo + fine; v <= centreHi; v += fine) out.push(v);
    for (let v = centreHi + fine; v <= to; v += fine + (v - centreHi) * growth) out.push(v);
    if (out[out.length - 1] !== to) out.push(to);
    return out;
  };
  const xs = axis(-700, 700, -6, 6, 0.55, 0.09), zs = axis(-900, 260, -45, 62, 0.6, 0.08);
  const W = xs.length, H = zs.length;
  const P = new Float32Array(W * H * 3), N = new Float32Array(W * H * 3), IDX = new Uint32Array((W - 1) * (H - 1) * 6);
  let k = 0, t = performance.now();
  for (let j = 0; j < H; j++) {
    const z = zs[j];
    for (let i = 0; i < W; i++) { P[k++] = xs[i]; P[k++] = terrainH(xs[i], z); P[k++] = z; }
    if (performance.now() - t > 12) { await breathe(); t = performance.now(); }
  }
  // normals from the grid's own neighbours (central differences), and the triangles
  const y = (i, j) => P[(j * W + i) * 3 + 1];
  for (let j = 0, q = 0, m = 0; j < H; j++) {
    const j0 = Math.max(0, j - 1), j1 = Math.min(H - 1, j + 1);
    for (let i = 0; i < W; i++, q += 3) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(W - 1, i + 1);
      const dx = (y(i1, j) - y(i0, j)) / (xs[i1] - xs[i0]), dz = (y(i, j1) - y(i, j0)) / (zs[j1] - zs[j0]);
      const l = Math.hypot(dx, 1, dz); N[q] = -dx / l; N[q + 1] = 1 / l; N[q + 2] = -dz / l;
      if (i + 1 < W && j + 1 < H) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1; IDX[m++] = a; IDX[m++] = c; IDX[m++] = b; IDX[m++] = b; IDX[m++] = c; IDX[m++] = d; }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setIndex(new THREE.BufferAttribute(IDX, 1));
  return g;
}

// flat stones across the river: rows of one or two slabs with narrow gaps, their tops level for walking
function causewayGeometry(rand) {
  const parts = [], z0 = eN(0) + 0.35, z1 = eF(0) - 0.4;
  for (let z = z0; z > z1;) {
    const len = 0.85 + rand() * 0.55, mid = z - len / 2;
    const split = rand() < 0.75 ? (rand() - 0.5) * 1.2 : null;
    const spans = split === null ? [[-CAUSEWAY_HALF, CAUSEWAY_HALF]] : [[-CAUSEWAY_HALF, split - 0.04], [split + 0.04, CAUSEWAY_HALF]];
    for (const [a, b] of spans) {
      const top = CAUSEWAY_TOP + (rand() - 0.5) * 0.03, bottom = -1.5, w = b - a - (rand() * 0.06);
      const box = new THREE.BoxGeometry(w, top - bottom, len, 1, 1, 1).toNonIndexed();
      box.deleteAttribute('uv');
      box.rotateY((rand() - 0.5) * 0.05); box.translate((a + b) / 2, (top + bottom) / 2, mid);
      const s = rand(); box.setAttribute('aSeed', new THREE.Float32BufferAttribute(new Array(box.attributes.position.count).fill(s), 1));
      parts.push(box);
    }
    z -= len + 0.08 + rand() * 0.06;
  }
  const g = mergeGeometries(parts); parts.forEach((p) => p.dispose());
  return g;
}

// one grass tuft: five blades fanning from the root, uv.y up each blade
function tuftGeometry() {
  const P = [], UV = [];
  for (let b = 0; b < 7; b++) {
    const a = (b / 7) * Math.PI * 2 + 0.3, lean = 0.1 + (b % 3) * 0.07, hgt = 0.6 + (b % 3) * 0.2, w = 0.02;
    const cx = Math.cos(a), cz = Math.sin(a), px = -cz * w, pz = cx * w;
    P.push(-px, 0, -pz, px, 0, pz, cx * lean, hgt, cz * lean); UV.push(0, 0, 1, 0, 0.5, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  return g;
}

// the far bank's forest: simple pines (a trunk and three stacked cones), merged into one mesh
function forestGeometry(rand) {
  const trees = [];
  // a few lone pines on the far bank's meadow, then the wood: groves with clearings, deeper and deeper into the mist, and a
  // gap toward the sun so its glow over the ridge shows, framed by the trees
  for (let i = 0; i < 12; i++) { const x = (rand() * 2 - 1) * 70; if (Math.abs(x) > 5) trees.push([x, 7 + rand() * 14, 0.75]); }
  for (let i = 0; i < 1400 && trees.length < 640; i++) {
    const x = (rand() * 2 - 1) * 460, df = 30 + Math.pow(rand(), 1.25) * 300;
    if (fbmJ(x * 0.018 + 4, (eF(x) - df) * 0.018) < 0.4 + (df < 60 ? 0.08 : 0)) continue;
    trees.push([x, df, 1]);
  }
  // one pine of unit height (a short trunk and three stacked cones), copied into place for each tree: no per-tree geometry
  const proto = [];
  const trunk = new THREE.CylinderGeometry(0.008, 0.014, 0.16, 5, 1, true).translate(0, 0.08, 0); proto.push(trunk);
  for (let c = 0; c < 3; c++) { const ch = 0.46 - c * 0.07; proto.push(new THREE.ConeGeometry(0.19 * (1 - c * 0.24), ch, 6, 1, false).translate(0, 0.07 + c * 0.25 + ch / 2, 0)); }
  const unit = mergeGeometries(proto.map((g) => { const n = g.toNonIndexed(); g.dispose(); n.deleteAttribute('uv'); return n; }));
  const up = unit.attributes.position.array, un = unit.attributes.normal.array, nv = up.length / 3;
  const kept = trees.filter(([x, df]) => { const z = eF(x) - df, az = Math.atan2(x + 0.3, 22 - z); return !(az > 0.2 && az < 0.62 && df < 200 && rand() < 0.85); });
  const P = new Float32Array(kept.length * nv * 3), N = new Float32Array(kept.length * nv * 3), S = new Float32Array(kept.length * nv);
  let o = 0;
  for (const [x, df, k] of kept) {
    const z = eF(x) - df, y = terrainH(x, z) - 0.3, hgt = (10 + rand() * 14) * k, wid = hgt * (0.85 + rand() * 0.3), seed = rand();
    const yaw = rand() * 6.28, c = Math.cos(yaw), sn = Math.sin(yaw);
    for (let v = 0; v < nv; v++, o++) {
      const px = up[v * 3] * wid, py = up[v * 3 + 1] * hgt, pz = up[v * 3 + 2] * wid;
      P[o * 3] = x + px * c + pz * sn; P[o * 3 + 1] = y + py; P[o * 3 + 2] = z - px * sn + pz * c;
      const nx = un[v * 3], nz = un[v * 3 + 2];
      N[o * 3] = nx * c + nz * sn; N[o * 3 + 1] = un[v * 3 + 1]; N[o * 3 + 2] = -nx * sn + nz * c; S[o] = seed;
    }
  }
  unit.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(S, 1));
  return g;
}

// two ridge lines as strips at a fixed angle profile seen from the camera: near hills at 750 m, the far range at 2300 m
function skylineGeometry(cam) {
  const P = [], CREST = [], LAYER = [], IDX = [];
  for (const [R, fn, layer] of [[2300, ridgeFar, 1], [750, ridgeNear, 0]]) {
    const base = P.length / 3, SEG = 360, A0 = -1.7, A1 = 1.7;
    for (let i = 0; i <= SEG; i++) {
      const az = A0 + (A1 - A0) * (i / SEG), x = cam.x + Math.sin(az) * R, z = cam.z - Math.cos(az) * R;
      const top = cam.y + Math.tan(fn(az)) * R;
      P.push(x, -40, z, x, top, z); CREST.push(top, top); LAYER.push(layer, layer);
      if (i) { const b = base + (i - 1) * 2; IDX.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aCrest', new THREE.Float32BufferAttribute(CREST, 1)); g.setAttribute('aLayer', new THREE.Float32BufferAttribute(LAYER, 1));
  g.setIndex(IDX);
  return g;
}

// a prop's single mesh as plain float geometry, sized and stood on y 0. Packed (meshopt-quantized) vertex inputs made
// Direct3D build a new vertex shader at the first draw (stage 6's lesson), so they become 32-bit floats here.
function propGeometry(gltf, height) {
  let mesh = null; gltf.scene.updateMatrixWorld(true); gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  if (!mesh) throw new Error('no mesh');
  dequantize(mesh);
  const src = mesh.geometry, g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) { const a = src.attributes[k]; if (a) g.setAttribute(k, a); }
  if (src.index) g.setIndex(new THREE.BufferAttribute(Uint32Array.from(src.index.array), 1));
  g.applyMatrix4(mesh.matrixWorld);
  g.computeBoundingBox();
  const b = g.boundingBox, s = height / (b.max.y - b.min.y);
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g.scale(s, s, s);
  if (!g.attributes.normal) g.computeVertexNormals();
  const map = mesh.material?.map || null;
  if (map) {
    map.colorSpace = THREE.NoColorSpace;          // raw texels: this stage works display-referred
    map.needsUpdate = true;
  }
  return { geometry: g, map, dispose: () => { src.dispose(); mesh.material?.dispose?.(); for (const k of ['normalMap', 'roughnessMap', 'metalnessMap']) mesh.material?.[k]?.dispose?.(); } };
}

export async function build(ctx) {
  const { scene, renderer, camera, anchor, lights, wanderer } = ctx;
  const group = new THREE.Group(); group.name = 'the-threshold'; group.position.copy(anchor.centre);
  const rand = mulberry(3);
  const small = Math.min(innerWidth, innerHeight) < 700;
  const sunDir = new THREE.Vector3(...MOOD.sun).normalize();
  const origin = new THREE.Vector3().copy(group.position);
  const common = { uSunDir: { value: sunDir }, uZenith: { value: new THREE.Color(MOOD.zenith) }, uHorizon: { value: new THREE.Color(MOOD.horizon) },
    uGlow: { value: new THREE.Color(MOOD.glow) }, uOrigin: { value: origin }, uTime: { value: 0 } };
  const camLocal = anchor.cam.clone().sub(anchor.centre);
  const disposables = [];
  const track = (...xs) => { disposables.push(...xs); return xs[0]; };
  const shader = (vertexShader, fragmentShader, extra = {}, opts = {}) => track(new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { ...common, ...extra }, ...opts }));
  const add = (geo, mat, name, order = 0) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.frustumCulled = false; m.renderOrder = order; group.add(m); return m; };

  // ---- the props (the slow part) start loading now and are added as each arrives, so the river never waits for them:
  // the arch, the river rocks, the trekking poles; any that fails is left out
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const url = (n) => import.meta.env.BASE_URL + 'models/props/' + n + '.glb';
  const [archP, rockP, polesP] = ['stone-arch', 'snow-boulders', 'trekking-poles'].map((n) => loader.loadAsync(url(n)));
  for (const p of [archP, rockP, polesP]) p.catch(() => {});   // handled where each is used
  let disposed = false;
  const arrivals = [];      // { mesh, tex }: compiled, hidden until its texture is on the GPU

  // the work is cut into steps of under about 25 ms, each in its own task, so a frame is drawn in between (no freeze)
  // (a frame first, then a fresh task: a plain setTimeout chain can run back to back without a frame between)
  const breathe = () => new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; setTimeout(r, 0); } }; requestAnimationFrame(go); setTimeout(go, 100); });
  // ---- land, water, causeway
  add(track(await terrainGeometry(breathe)), shader(BASIC_VERT, TERRAIN_FRAG), 'banks');
  const xMin = -700, xMax = 700, zNear = 12, zFar = -48;
  const water = new THREE.PlaneGeometry(xMax - xMin, zNear - zFar, 1, 1).rotateX(-Math.PI / 2).translate(0, WATER_Y, (zNear + zFar) / 2);
  water.deleteAttribute('uv'); water.deleteAttribute('normal');
  await breathe();
  add(track(water), shader(WATER_VERT, WATER_FRAG), 'river');
  add(track(causewayGeometry(rand)), shader(CAUSEWAY_VERT, CAUSEWAY_FRAG), 'causeway');

  // ---- the arch at the water's edge, the poles against its left leg
  const propMat = (map, rock, gloss) => shader(PROP_VERT, PROP_FRAG, { uMap: { value: map }, uRock: { value: rock ? 1 : 0 }, uGloss: { value: gloss } });
  const white = track(new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1)); white.needsUpdate = true;
  // a prop arrives: its geometry made (plain floats, sized), its material compiled, then it waits hidden for its texture upload
  // (each step in its own task, a frame apart, and one prop at a time: the texture halving alone is a long step)
  let chain = Promise.resolve();
  const adopt = (promise, height, label, make) => promise.then((gltf) => (chain = chain.then(async () => {
    await breathe(); if (disposed) return;
    let p;
    try { p = propGeometry(gltf, height); } catch (e) { console.warn(`The Threshold: ${label} could not be used`, e); return; }
    disposables.push(p.geometry, p); if (p.map) disposables.push(p.map);
    // 2048 px is more than a prop seen from 2 m or more needs, and uploading two of them in one frame cost a 60 ms frame:
    // halve it, off the main thread (createImageBitmap resizes in the background), so the uploads stay short
    const im = p.map?.image;
    if (im && im.width > 1024 && typeof createImageBitmap === 'function') {
      try { p.map.image = await createImageBitmap(im, { resizeWidth: 1024, resizeHeight: 1024, resizeQuality: 'high' }); im.close?.(); p.map.needsUpdate = true; }
      catch (e) { console.warn(`The Threshold: ${label} texture kept at full size`, e); }
    }
    await breathe(); if (disposed) return;
    const m = make(p);
    try { await renderer.compileAsync(m, camera, scene); } catch (e) { console.warn(`The Threshold: ${label} warm-up failed; it compiles on first sight`, e); }
    if (disposed) return;
    m.visible = false; group.add(m); arrivals.push({ mesh: m, tex: p.map }); ctx.requestDraw();
  }).catch((err) => console.warn(`The Threshold: ${label} could not be added`, err))), (err) => console.warn(`The Threshold: ${label} did not load; the river goes on without it`, err));
  const named = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.frustumCulled = false; return m; };
  adopt(archP, ARCH_H, 'the arch', (a) => { const m = named(a.geometry, propMat(a.map || white, false, 0.06), 'arch'); m.position.set(0, -0.15, ARCH_Z); return m; });
  adopt(polesP, 1.3, 'the trekking poles', (p) => {
    const m = named(p.geometry, propMat(p.map || white, false, 0.1), 'poles');
    m.position.set(-2.55, terrainH(-2.55, ARCH_Z + 1.65) - 0.02, ARCH_Z + 1.62); m.rotation.set(-0.32, 0.25, 0.04); return m;
  });

  // ---- wet river rocks: banks, midstream, a few large ones in the foreground at the frame's edges (placed now, so the
  // layout is the same whenever the model arrives)
  await breathe();
  const rockMatrices = [];
  {
    const spots = [];
    const put = (x, z, s, sink = 0.28) => spots.push([x, Math.max(terrainH(x, z), -0.95) - s * sink, z, s]);
    for (let i = 0; i < 18; i++) { const side = i % 2 ? 1 : -1, x = side * (4.5 + Math.pow(rand(), 1.5) * 70); put(x, eN(x) + (rand() - 0.6) * 2.2, 0.9 + rand() * 1.8); }
    for (let i = 0; i < 7; i++) { const side = i % 2 ? 1 : -1, x = side * (7 + rand() * 45); put(x, lerp(eN(x), eF(x), 0.2 + rand() * 0.6), 1.3 + rand() * 1.4, 0.45); }
    for (let i = 0; i < 8; i++) { const x = (rand() * 2 - 1) * 70; if (Math.abs(x) < 4) continue; put(x, eF(x) - rand() * 2, 1.0 + rand() * 1.6); }
    put(-6.8, 30, 2.4); put(-9.5, 19, 3.1); put(7.4, 24, 2.2); put(-4.6, 14.5, 1.3); put(4.8, 13.2, 1.6);
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    for (const [x, y, z, s] of spots) { e.set((rand() - 0.5) * 0.2, rand() * 6.28, (rand() - 0.5) * 0.2); q.setFromEuler(e);
      rockMatrices.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s * (0.9 + rand() * 0.4), s * (0.7 + rand() * 0.4), s * (0.9 + rand() * 0.4)))); }
  }
  adopt(rockP, 1, 'the river rocks', (r) => {
    const rocks = new THREE.InstancedMesh(r.geometry, propMat(r.map || white, true, 0.18), rockMatrices.length);
    rockMatrices.forEach((m4, i) => rocks.setMatrixAt(i, m4));
    rocks.instanceMatrix.needsUpdate = true; rocks.name = 'rocks'; rocks.frustumCulled = false;
    disposables.push({ dispose: () => rocks.dispose() });
    return rocks;
  });

  await breathe();
  // ---- grass on both banks, reeds at the water's edge (any prefix of the list is an even sample, so quality can trim it)
  const full = small ? GRASS_SMALL : GRASS;
  const grass = new THREE.InstancedMesh(track(tuftGeometry()), shader(GRASS_VERT, GRASS_FRAG, {}, { side: THREE.DoubleSide }), full);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let i = 0, guard = 0, t = performance.now();
    while (i < full && guard++ < full * 20) {
      if ((guard & 255) === 0 && performance.now() - t > 12) { await breathe(); t = performance.now(); }
      const kind = rand();
      let x, z, y, sc;
      if (kind < 0.07) {                                  // reeds along the near and far edges
        x = (rand() * 2 - 1) * 80; if (Math.abs(x) < 2.6) continue;
        const near = rand() < 0.7; z = near ? eN(x) + (rand() - 0.65) * 1.6 : eF(x) + (rand() - 0.35) * 1.6;
        y = Math.max(terrainH(x, z), WATER_Y - 0.05); sc = 1.1 + rand() * 0.7;
      } else if (kind < 0.85) {                           // the near bank, denser toward the camera's track
        x = Math.sign(rand() - 0.5) * (1.9 + Math.pow(rand(), 1.7) * 75); z = eN(x) + 0.4 + Math.pow(rand(), 1.3) * (68 - eN(x));
        y = terrainH(x, z); sc = 0.4 + rand() * 0.35;
        if (Math.abs(x) < 2.3 || y < WATER_Y + 0.05) continue;
      } else {                                            // the far bank
        x = (rand() * 2 - 1) * 110; z = eF(x) - 0.5 - Math.pow(rand(), 1.5) * 40; y = terrainH(x, z); sc = 0.6 + rand() * 0.5;
        if (y < WATER_Y + 0.05) continue;
      }
      e.set((rand() - 0.5) * 0.2, rand() * 6.28, (rand() - 0.5) * 0.2); q.setFromEuler(e);
      grass.setMatrixAt(i++, m4.compose(p.set(x, y, z), q, s.set(sc, sc * (0.8 + rand() * 0.5), sc)));
    }
    grass.count = i; }
  const grassFull = grass.count;
  grass.instanceMatrix.needsUpdate = true; grass.name = 'grass'; grass.frustumCulled = false;
  group.add(grass); disposables.push({ dispose: () => grass.dispose() });

  await breathe();
  // ---- the far bank's forest and the skyline
  add(track(forestGeometry(rand)), shader(PINE_VERT, PINE_FRAG), 'forest');
  add(track(skylineGeometry(camLocal.clone().setZ(camLocal.z - SLIDE / 2))), shader(SKYLINE_VERT, SKYLINE_FRAG), 'skyline');

  await breathe();
  // ---- the mist: thin slices low over the water, drawn bottom to top after the opaque scene
  const mistGeo = track(new THREE.PlaneGeometry(800, 320, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, -110));
  mistGeo.deleteAttribute('uv'); mistGeo.deleteAttribute('normal');
  const mist = MIST_Y.map((y, k) => {
    const m = add(mistGeo, shader(WATER_VERT, MIST_FRAG, { uSlice: { value: k / (MIST_Y.length - 1) } }, { transparent: true, depthWrite: false }), 'mist-' + k, 2 + k);
    m.position.y = y; return m;
  });

  // ---- the Wanderer's light (ctx.lights, never added): a warm rim from the dawn ahead of him and a cool fill from our side
  const [rim, fill] = lights;
  rim.color.set('#ffc49a'); rim.distance = 7; rim.decay = 2;
  fill.color.set('#c9d5ea'); fill.distance = 8; fill.decay = 2;
  scene.add(group);

  let slide = 0;
  const wPos = new THREE.Vector3();
  function update(dt, local) {
    // props that arrived: one texture upload a frame (all at once in still mode), then shown; this runs while the stage is
    // still hidden too (the world calls update on every built stage), so the uploads are done before it is seen
    for (let k = 0; k < arrivals.length; k++) {
      const a = arrivals[k];
      if (a.tex) { renderer.initTexture(a.tex); a.tex = null; if (!ctx.still) { ctx.requestDraw(); break; } }
      a.mesh.visible = true; arrivals.splice(k--, 1); ctx.requestDraw();
    }
    if (!group.visible) return;
    if (!ctx.still) common.uTime.value += dt;
    // the walk on: the set moves toward the camera (all of it, so the parallax is the camera's own)
    slide = slideAt(local);
    group.position.set(anchor.centre.x, anchor.centre.y, anchor.centre.z + slide);
    origin.copy(group.position);
    grass.count = ctx.quality < LOW_BELOW ? Math.min(grassFull, GRASS_LOW) : grassFull;
    for (let k = 4; k < mist.length; k++) mist[k].visible = ctx.quality >= LOW_BELOW;
    const w = wanderer.copyPosition(wPos);
    if (Number.isFinite(w.x)) {
      rim.position.set(w.x + 0.8, w.y + 2.1, w.z - 1.6); rim.intensity = 26;
      fill.position.set(w.x - 1.0, w.y + 1.5, w.z + 2.4); fill.intensity = 10;
    } else { rim.intensity = 0; fill.intensity = 0; }
  }

  return {
    group, update,
    groundAt: (x, z) => groundLocal(x - group.position.x, z - group.position.z),
    // he walks the centre line of the stone path, through the arch's opening and on along the causeway
    pathAt: () => group.position.x + PATH_X,
    dispose() {
      disposed = true; scene.remove(group);
      for (const d of disposables) d.dispose();
      // a prop still mid-load when the stage is released is freed the moment it lands
      disposables.push = (...xs) => { for (const d of xs) d.dispose(); return 0; };
    },
  };
}
