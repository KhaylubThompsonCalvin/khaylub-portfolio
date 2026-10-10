// The Call (stage 2): a pine forest at blue hour. The camera stands at the edge of a small clearing where a camp is
// made: a campfire burning with a log bench beside it, a kettle on its stove, a sleeping bag rolled out. The last stars
// fade over the treetops, the far forest dissolves into cool blue haze and low mist, embers rise from the fire and drift
// away on the wind, and far off between the trees a single bright spark wanders: the phoenix, seen for the first time
// (a glowing point with a short ember trail, not yet the bird). A trodden path leads from the camp past the Wanderer into
// the trees, toward it.
//
// Parts (about 22 draw calls of the stage's own, plus the Wanderer's ~33):
//   pines     code-built firs (stacked drooping tiers on a trunk): two near shapes (about 330 triangles) within 80 m and one
//             far shape (about 40) out to 560 m, instanced (3 draws, about 4,500 trees); saplings at the clearing's edge
//             reuse the near shapes. Lit in the shader: a cool sky light from above, a warm campfire falloff on the side
//             facing the fire, haze and low mist toward the sky's own horizon colour. Wind sways the crowns a little.
//             Below render quality 0.7 the far forest thins to 40 % (InstancedMesh.count; the far list is shuffled, so any
//             prefix is an even sample).
//   ground    the forest floor (needles and moss), a trodden path and the camp's bare earth, lit by the fire (1 draw)
//   stones    instanced rocks scattered on the floor (1 draw)
//   ridge     far forested hills at 900 to 1,300 m, soft in the haze (1 draw)
//   props     models at real scale: the campfire (with src/engine/campfire.js flames, sparks and light), log bench,
//             camp stove and kettle, sleeping bag, three wind-shaped pines on the clearing's far edge (7 draws + 5 for the flames and sparks)
//   embers    embers rising high from the fire and drifting off on the wind (1 draw)
//   spark     the phoenix's first appearance: a bright core, a halo and a short trail of embers, drifting far off (1 draw)
// Lights: ctx.lights[0] is the campfire's light (createCampfire breathes it), ctx.lights[1] a cool sky rim on the Wanderer.
// Like the Harvest, every stage shader is display-referred (no tone mapping, no colour-space step) and hazes to the
// sky's own horizon colour, so the forest meets the sky without a seam.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createCampfire } from '../../engine/campfire.js';
import { dequantize } from '../../engine/dequantize.js';
import { MOODS } from '../journey.js';

const MOOD = MOODS[1];
const NEAR_R = 80, FAR_R = 560, LOW_BELOW = 0.7, LOW_SHARE = 0.4;
// the camp, in stage space (the camera stands at about z +40 looking toward -z)
const FIRE = new THREE.Vector3(-1.4, 0, 23);
const CLEARING = { x: 0.5, z: 24, r: 12.5 };
// the trodden path: from the camera's feet past the fire's right, then bending left into the trees
export const pathX = (z) => (z >= 30 ? 2.6 : 2.6 - Math.sin((30 - z) * 0.018) * 9);
// the spark: its drift centre, far off between the trees (stage space)
const SPARK = new THREE.Vector3(22, 15, -120);
const EMBERS = 80, EMBERS_SMALL = 56;
const TUFTS = 7000, TUFTS_SMALL = 4500;

// ---- shared GLSL: the sky's formula (src/engine/sky.js) for the haze target, and the fire's light
const SKY_GLSL = /* glsl */ `
  uniform vec3 uSunDir, uZenith, uHorizon, uGlow;
  const vec3 COOL = vec3(0.56, 0.60, 0.66);
  vec3 skyAt(vec3 d) {
    float h = clamp(d.y, -0.2, 1.0), s = max(dot(d, uSunDir), 0.0);
    vec3 hor = mix(COOL, uHorizon, pow(s, 3.0));
    vec3 col = mix(hor, uZenith, pow(smoothstep(-0.05, 0.55, h), 0.8));
    return col + uGlow * pow(s, 10.0) * 0.32 + uGlow * pow(s, 90.0) * 0.5;
  }
  // haze toward the sky's horizon colour in this direction; low mist pools between the far trunks
  vec3 haze(vec3 col, vec3 world, float hazeDist, float mist) {
    vec3 v = world - cameraPosition; float d = length(v); vec3 dir = v / d;
    float f = 1.0 - exp(-d / hazeDist);
    f = max(f, smoothstep(1200.0, 1600.0, d));
    f = max(f, mist * (1.0 - smoothstep(0.0, 7.0, world.y)) * smoothstep(18.0, 120.0, d) * 0.55);
    return mix(col, skyAt(normalize(vec3(dir.x, 0.0, dir.z))), clamp(f, 0.0, 1.0));
  }`;
const FIRE_GLSL = /* glsl */ `
  uniform vec3 uFirePos; uniform float uFireI;
  // the campfire's warm light on a surface: inverse-square with a soft core, wrapped a little round the far side
  vec3 fireLight(vec3 world, vec3 n) {
    vec3 L = uFirePos - world; float d = length(L); L /= d;
    float wrap = clamp((dot(n, L) + 0.35) / 1.35, 0.0, 1.0);
    return vec3(1.0, 0.46, 0.16) * uFireI * wrap * 8.0 / (1.0 + d * d * 0.3);
  }`;

// ---- the fir: a trunk and stacked drooping tiers, unit height (instances scale it to metres). aPart 0 trunk, 1 foliage;
// aEdge 0 at a tier's heart, 1 at its branch tips
function firGeometry(rand, { tiers, radial, hseg, crownFrom, width }) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.014, 0.03, crownFrom + 0.12, Math.max(5, radial >> 1), 1, true);
  trunk.translate(0, (crownFrom + 0.12) / 2, 0);
  tag(trunk, 0, () => 0);
  parts.push(trunk);
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const yb = crownFrom + t * (0.9 - crownFrom), h = 0.26 - t * 0.1, r = width * (1 - t * 0.82) + 0.025;
    const cone = new THREE.ConeGeometry(r, h, radial, hseg, true);
    const p = cone.attributes.position, jit = Array.from({ length: radial }, (_, c) => (c % 2 ? 1.12 : 0.8) * (0.85 + rand() * 0.3)), droop = Array.from({ length: radial }, () => rand());
    for (let k = 0; k < p.count; k++) {
      const row = Math.floor(k / (radial + 1)), col = k % (radial + 1) % radial, f = row / hseg;   // f 0 apex .. 1 skirt
      // the skirt flares (a concave profile reads as drooping boughs) and its tips are ragged
      const prof = hseg > 1 && row > 0 && row < hseg ? 0.4 / (row / hseg) : 1;
      const s = (f > 0 ? jit[col] : 1) * prof;
      p.setX(k, p.getX(k) * s); p.setZ(k, p.getZ(k) * s);
      if (row === hseg) p.setY(k, p.getY(k) - droop[col] * h * 0.25);
    }
    cone.rotateY(rand() * Math.PI * 2);
    cone.translate(0, yb + h / 2, 0);
    cone.computeVertexNormals();
    tag(cone, 1, (k) => Math.floor(k / (radial + 1)) / hseg);
    parts.push(cone);
  }
  const g = mergeGeometries(parts.map((x) => { x.deleteAttribute('uv'); return x; }));
  parts.forEach((x) => x.dispose());
  return g;
}
function tag(g, part, edge) {
  const n = g.attributes.position.count;
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(n).fill(part), 1));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(Float32Array.from({ length: n }, (_, k) => edge(k)), 1));
}

const FIR_VERT = /* glsl */ `
  attribute float aPart, aEdge;
  uniform float uTime;
  varying vec3 vWorld, vNormal; varying float vPart, vEdge, vRand, vH;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 root = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    float r = hash(root.xz), h = position.y;
    // the crowns sway a little on the night wind (the tops most)
    float sway = sin(uTime * (0.55 + r * 0.3) + r * 6.2832) * 0.6 + sin(uTime * 1.3 + root.x * 0.05) * 0.25;
    wp.xz += vec2(-0.8, -0.6) * sway * h * h * 0.35;
    vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    vWorld = wp.xyz; vPart = aPart; vEdge = aEdge; vRand = r; vH = h;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const FIR_FRAG = /* glsl */ `
  ${SKY_GLSL}
  ${FIRE_GLSL}
  uniform vec3 uSkyLight;
  varying vec3 vWorld, vNormal; varying float vPart, vEdge, vRand, vH;
  float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float n3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
  void main() {
    vec3 n = normalize(vNormal); if (!gl_FrontFacing) n = -n;
    // clumps of needles break up the flat facets close by (faded out with distance, where they would only shimmer)
    float dc = distance(vWorld, cameraPosition);
    float clump = mix(1.0, 0.55 + 0.9 * n3(vWorld * 1.6) * n3(vWorld * 4.3 + 3.0), 1.0 - smoothstep(25.0, 70.0, dc));
    vec3 needles = mix(vec3(0.020, 0.040, 0.036), vec3(0.034, 0.062, 0.050), vRand);
    needles *= mix(0.45, 1.15, vEdge);                       // dark at the heart, the bough tips catch the light
    if (!gl_FrontFacing) needles *= 0.5;                     // under the boughs
    needles *= clump;
    vec3 bark = vec3(0.050, 0.038, 0.030) * (0.8 + 0.4 * vRand);
    vec3 base = vPart < 0.5 ? bark : needles;
    // the sky's cool light from above and from the bright horizon, a faint bounce from the floor
    vec3 sunFlat = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
    vec3 light = uSkyLight * (0.35 + 0.65 * max(n.y, 0.0)) + uSkyLight * 0.5 * pow(max(dot(n, sunFlat), 0.0), 2.0) * smoothstep(0.3, 1.0, vH);
    light += fireLight(vWorld, n);
    vec3 col = base * light;
    gl_FragColor = vec4(haze(col, vWorld, 170.0, 1.0), 1.0);
  }`;

const GROUND_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const GROUND_FRAG = /* glsl */ `
  ${SKY_GLSL}
  ${FIRE_GLSL}
  uniform vec3 uSkyLight, uOrigin;
  varying vec3 vWorld;
  float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453), b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5453), d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5453);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
  float pathX(float z) { return z >= 30.0 ? 2.6 : 2.6 - sin((30.0 - z) * 0.018) * 9.0; }
  void main() {
    vec2 q = vWorld.xz - uOrigin.xz;                         // stage space
    float n = n2(q * 0.35) * 0.55 + n2(q * 1.7) * 0.3 + n2(q * 6.0) * 0.15;
    vec3 needles = mix(vec3(0.040, 0.028, 0.020), vec3(0.060, 0.042, 0.028), n);
    vec3 moss = vec3(0.026, 0.042, 0.030);
    vec3 col = mix(needles, moss, smoothstep(0.55, 0.8, n2(q * 0.11 + 7.0)) * 0.8);
    // the trodden path (its edge wavers) and the camp's bare earth round the fire
    float edge = 0.75 + (n2(q * 0.9) - 0.5) * 0.5;
    float path = (1.0 - smoothstep(edge * 0.6, edge, abs(q.x - pathX(q.y)))) * smoothstep(-160.0, -40.0, q.y) * (1.0 - smoothstep(42.0, 46.0, q.y));
    float camp = 1.0 - smoothstep(2.2, 4.2 + n * 0.8, distance(q, vec2(${FIRE.x.toFixed(2)}, ${FIRE.z.toFixed(2)})));
    vec3 earth = mix(vec3(0.075, 0.060, 0.046), vec3(0.095, 0.078, 0.060), n);
    col = mix(col, earth, max(path * 0.85, camp));
    vec3 light = uSkyLight * 0.55 + fireLight(vWorld, vec3(0.0, 1.0, 0.0));
    gl_FragColor = vec4(haze(col * light, vWorld, 170.0, 1.0), 1.0);
  }`;

const STONE_FRAG = /* glsl */ `
  ${SKY_GLSL}
  ${FIRE_GLSL}
  uniform vec3 uSkyLight;
  varying vec3 vWorld, vNormal; varying float vRand;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 base = mix(vec3(0.034, 0.034, 0.036), vec3(0.05, 0.048, 0.046), vRand);
    base = mix(base, vec3(0.02, 0.034, 0.022), smoothstep(0.45, 0.9, n.y) * 0.7);   // moss on the tops
    vec3 light = uSkyLight * (0.3 + 0.7 * max(n.y, 0.0)) + fireLight(vWorld, n);
    gl_FragColor = vec4(haze(base * light, vWorld, 170.0, 1.0), 1.0);
  }`;
const STONE_VERT = /* glsl */ `
  varying vec3 vWorld, vNormal; varying float vRand;
  void main() {
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 root = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vRand = fract(sin(dot(root.xz, vec2(12.9898, 78.233))) * 43758.5453);
    vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal); vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const RIDGE_FRAG = /* glsl */ `
  ${SKY_GLSL}
  varying vec3 vWorld;
  void main() { gl_FragColor = vec4(haze(vec3(0.02, 0.035, 0.05), vWorld, 1500.0, 0.0), 1.0); }`;

// a tuft of meadow grass: five blades fanning out from a root, unit height; uv.y up the blade
function tuftGeometry() {
  const P = [], UV = [], IDX = [];
  for (let b = 0; b < 5; b++) {
    const a = b * 2.4, lean = 0.18 + (b % 3) * 0.1, h = 0.75 + (b % 2) * 0.25, ca = Math.cos(a), sa = Math.sin(a);
    const base = P.length / 3, side = [-sa, ca];
    for (let k = 0; k <= 3; k++) {
      const t = k / 3, w = 0.035 * (1 - t), off = lean * t * t;
      const cx = ca * off, cz = sa * off, y = h * t;
      P.push(cx - side[0] * w, y, cz - side[1] * w, cx + side[0] * w, y, cz + side[1] * w); UV.push(0, t, 1, t);
      if (k) { const i = base + (k - 1) * 2; IDX.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(IDX);
  return g;
}
const TUFT_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld; varying float vH, vRand;
  void main() {
    vec3 root = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    float r = fract(sin(dot(root.xz, vec2(127.1, 311.7))) * 43758.5453);
    wp.xz += vec2(0.7, -0.5) * sin(uTime * (1.1 + r) + r * 6.28) * 0.04 * uv.y * uv.y;
    vWorld = wp.xyz; vH = uv.y; vRand = r;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const TUFT_FRAG = /* glsl */ `
  ${SKY_GLSL}
  ${FIRE_GLSL}
  uniform vec3 uSkyLight;
  varying vec3 vWorld; varying float vH, vRand;
  void main() {
    vec3 col = mix(vec3(0.012, 0.02, 0.016), mix(vec3(0.035, 0.055, 0.04), vec3(0.055, 0.06, 0.04), vRand), smoothstep(0.0, 0.9, vH));
    vec3 light = uSkyLight * (0.45 + 0.4 * vH) + fireLight(vWorld, vec3(0.0, 0.6, 0.0));
    gl_FragColor = vec4(haze(col * light, vWorld, 170.0, 1.0), 1.0);
  }`;

// embers: each rises from the fire on the heat, wanders, drifts off on the wind, cools and fades
const EMBER_VERT = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime, uPx;
  varying float vAge, vSeed;
  void main() {
    float life = 5.0 + aSeed.y * 4.0, age = fract(uTime / life + aSeed.z);
    vec3 p = position;
    p.y += age * (7.0 + aSeed.x * 5.0);
    p.x += sin(age * 6.0 + aSeed.z * 30.0) * 0.5 * age + age * age * 6.0;
    p.z += cos(age * 5.0 + aSeed.x * 20.0) * 0.5 * age - age * age * 4.0;
    vAge = age; vSeed = aSeed.z;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = clamp((0.05 + aSeed.y * 0.04) * uPx * 900.0 / -mv.z, 1.0, 5.0);
    gl_Position = projectionMatrix * mv;
  }`;
const EMBER_FRAG = /* glsl */ `
  uniform float uTime;
  varying float vAge, vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
    float flick = 0.65 + 0.35 * sin(uTime * 13.0 + vSeed * 80.0);
    vec3 c = mix(vec3(1.0, 0.75, 0.35), vec3(0.95, 0.25, 0.05), smoothstep(0.0, 0.7, vAge));
    float a = smoothstep(0.5, 0.1, d) * (1.0 - smoothstep(0.45, 1.0, vAge)) * smoothstep(0.0, 0.04, vAge) * flick;
    gl_FragColor = vec4(c * a, 1.0);
  }`;

// the spark: one Points draw. aK = 0 is the halo, 1 the core, 2.. the trail (aT its age along the trail, 0..1)
const SPARK_GLSL = /* glsl */ `
  uniform vec3 uCentre;
  // a slow wander on the wind: loops and lifts that never quite repeat
  vec3 sparkAt(float t) {
    return uCentre + vec3(sin(t * 0.29) * 8.0 + sin(t * 0.83 + 1.3) * 2.5,
                          sin(t * 0.47 + 0.6) * 2.6 + sin(t * 0.17) * 1.5,
                          cos(t * 0.23) * 6.0);
  }`;
const SPARK_VERT = /* glsl */ `
  attribute float aK, aT, aJit;
  uniform float uTime, uPx, uGlow;
  ${SPARK_GLSL}
  varying float vK, vT, vJit;
  void main() {
    vec3 p = sparkAt(uTime - aT * 2.8);
    // the trail breaks into embers: each falls behind a little and flickers
    p += vec3(sin(aJit * 40.0), cos(aJit * 31.0) - 0.6, sin(aJit * 17.0)) * aT * aT * 0.9;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float px = aK < 0.5 ? 90.0 * uGlow : aK < 1.5 ? 7.0 : mix(5.5, 2.0, aT) * (0.7 + 0.6 * aJit);
    gl_PointSize = px * uPx;
    vK = aK; vT = aT; vJit = aJit;
    gl_Position = projectionMatrix * mv;
  }`;
const SPARK_FRAG = /* glsl */ `
  uniform float uTime, uGlow;
  varying float vK, vT, vJit;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
    vec3 c;
    if (vK < 0.5) {                     // halo: a wide warm bloom
      float pulse = 0.85 + 0.15 * sin(uTime * 2.3) + 0.06 * sin(uTime * 7.1);
      c = vec3(1.0, 0.5, 0.16) * (exp(-d * 2.5) * 1.2 + exp(-d * 8.0) * 1.5) * pow(1.0 - d, 1.5) * pulse * uGlow;
    } else if (vK < 1.5) {              // core: white-gold
      c = vec3(1.0, 0.95, 0.8) * smoothstep(1.0, 0.0, d) * 1.6;
    } else {                            // trail embers, cooling from gold to red
      float flick = 0.6 + 0.4 * sin(uTime * 17.0 + vJit * 60.0);
      c = mix(vec3(1.0, 0.72, 0.3), vec3(0.9, 0.22, 0.04), vT) * smoothstep(1.0, 0.2, d) * (1.0 - vT) * flick * 1.2;
    }
    gl_FragColor = vec4(c, 1.0);
  }`;

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// the glade: a long open meadow running away from the camp into the forest, so the far trees, the mist and the sky show
const GLADE = { x: -6, z: -72, rx: 38, rz: 108 };
const inGlade = (x, z, pad = 0) => ((x - GLADE.x) / (GLADE.rx + pad)) ** 2 + ((z - GLADE.z) / (GLADE.rz + pad)) ** 2 < 1;
// where a tree may stand: not in the clearing or the glade, not on the path, not on the camera
function treeOk(x, z, cam, rad = 0) {
  if (Math.hypot(x - CLEARING.x, (z - CLEARING.z) * 0.85) < CLEARING.r + rad) return false;
  if (inGlade(x, z, rad)) return false;
  if (z < cam.z + 4 && z > -260 && Math.abs(x - pathX(z)) < 3.2 + rad) return false;
  if (Math.hypot(x - cam.x, z - cam.z) < 5 + rad) return false;
  if (z > cam.z - 6 && Math.abs(x - cam.x) < 15 + (z - cam.z) * 0.25 + rad) return false;   // the camera's way down from the clouds
  return true;
}

// far ridges: forested hills across the view at 900 to 1,300 m, their tops ragged with tree spikes
function ridgeGeometry(rand, cam) {
  const P = [], IDX = [];
  const rows = [[950, 26, 0.0], [1250, 60, 2.1]];
  for (const [R, H, ph] of rows) {
    const SEG = 520, A0 = -1.5, A1 = 1.5, base = P.length / 3;
    for (let i = 0; i <= SEG; i++) {
      const a = A0 + (A1 - A0) * (i / SEG);
      const hill = H * (0.55 + 0.3 * Math.sin(a * 3.1 + ph) + 0.15 * Math.sin(a * 7.7 + ph * 2));
      const spike = (i % 2 ? 1 : 0.35) * (4 + rand() * 7);
      const r = R + (rand() - 0.5) * 30, x = cam.x + Math.sin(a) * r, z = cam.z - Math.cos(a) * r;
      P.push(x, -4, z, x, hill + spike, z);
      if (i) { const b = base + (i - 1) * 2; IDX.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(IDX);
  return g;
}

// the props: models about 1 m across as delivered, set here at real-world size (metres)
const PROPS = {
  campfire: { url: 'models/campfire.glb' },
  bench: { url: 'models/props/log-bench.glb' },
  kettle: { url: 'models/props/camp-stove-kettle.glb' },
  bag: { url: 'models/props/sleeping-bag.glb' },
  pine: { url: 'models/props/wind-pine.glb' },
};

export async function build(ctx) {
  const { scene, renderer, camera, anchor, lights, wanderer } = ctx;
  const group = new THREE.Group(); group.name = 'the-call'; group.position.copy(anchor.centre);
  const rand = mulberry(2);
  const small = Math.min(innerWidth, innerHeight) < 700;
  const sunDir = new THREE.Vector3(...MOOD.sun).normalize();
  const sky = { uSunDir: { value: sunDir }, uZenith: { value: new THREE.Color(MOOD.zenith) }, uHorizon: { value: new THREE.Color(MOOD.horizon) }, uGlow: { value: new THREE.Color(MOOD.glow) } };
  const time = { value: 0 };
  const camLocal = anchor.cam.clone().sub(anchor.centre);
  const firePos = FIRE.clone().add(anchor.centre).setY(0.45);
  const fireU = { uFirePos: { value: firePos }, uFireI: { value: 1 } };
  const skyLight = { value: new THREE.Color().setRGB(1.25, 1.55, 2.2, THREE.LinearSRGBColorSpace) };
  const disposables = [];
  const track = (...xs) => { disposables.push(...xs); return xs[0]; };

  // ---- the pines: positions on a jittered grid, fine near the camera and coarse far off
  const near = [], far = [];
  const grid = (cell, x0, x1, z0, z1, keep) => {
    for (let x = x0; x < x1; x += cell) for (let z = z0; z < z1; z += cell) {
      if (rand() < 0.14) continue;                              // natural gaps
      const px = x + (rand() - 0.2) * cell * 0.9, pz = z + (rand() - 0.5) * cell * 0.9;
      const d = Math.hypot(px - camLocal.x, pz - camLocal.z);
      if (keep(d) && treeOk(px, pz, camLocal)) (d < NEAR_R ? near : far).push([px, pz, d]);
    }
  };
  grid(5.2, camLocal.x - NEAR_R, camLocal.x + NEAR_R, camLocal.z - NEAR_R, camLocal.z + 22, (d) => d < NEAR_R);
  grid(10.5, camLocal.x - 330, camLocal.x + 330, camLocal.z - FAR_R, camLocal.z + 40, (d) => d >= NEAR_R && d < FAR_R);
  // saplings and young firs along the clearing's edge
  const young = [];
  for (let k = 0; k < 46; k++) {
    const a = rand() * Math.PI * 2, r = CLEARING.r + 0.5 + rand() * 4;
    const x = CLEARING.x + Math.cos(a) * r, z = CLEARING.z + Math.sin(a) * r / 0.85;
    if (z > camLocal.z - 3 || Math.abs(x - pathX(z)) < 2.2) continue;
    young.push([x, z]);
  }
  // a few lone firs and small stands out in the glade, for depth
  for (const [cx, cz, n] of [[-28, -38, 3], [-30, -96, 4], [-22, -150, 5], [24, -30, 1], [-3, -118, 2]]) {
    for (let k = 0; k < n; k++) {
      const x = cx + (rand() - 0.5) * 9, z = cz + (rand() - 0.5) * 9, d = Math.hypot(x - camLocal.x, z - camLocal.z);
      if (Math.abs(x - pathX(z)) > 3) (d < NEAR_R ? near : far).push([x, z, d]);
    }
  }
  // shuffle the far list, so any prefix is an even thinning of the whole forest
  for (let k = far.length - 1; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [far[k], far[j]] = [far[j], far[k]]; }

  const firMat = track(new THREE.ShaderMaterial({ vertexShader: FIR_VERT, fragmentShader: FIR_FRAG, side: THREE.DoubleSide,
    uniforms: { ...sky, ...fireU, uTime: time, uSkyLight: skyLight } }));
  const spruce = track(firGeometry(rand, { tiers: 9, radial: 16, hseg: 2, crownFrom: 0.1, width: 0.27 }));
  const pine = track(firGeometry(rand, { tiers: 7, radial: 14, hseg: 2, crownFrom: 0.34, width: 0.24 }));
  const distant = track(firGeometry(rand, { tiers: 5, radial: 6, hseg: 1, crownFrom: 0.12, width: 0.26 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const setTree = (mesh, i, x, z, height) => {
    e.set((rand() - 0.5) * 0.05, rand() * Math.PI * 2, (rand() - 0.5) * 0.05); q.setFromEuler(e);
    const wide = 0.8 + rand() * 0.45;
    sc.set(height * wide, height, height * wide); ps.set(x, -0.15, z);
    mesh.setMatrixAt(i, m4.compose(ps, q, sc));
  };
  const nearA = near.filter(() => rand() < 0.62);
  const nearB = near.filter((t) => !nearA.includes(t));
  const spruceMesh = new THREE.InstancedMesh(spruce, firMat, nearA.length + young.length);
  nearA.forEach(([x, z], i) => setTree(spruceMesh, i, x, z, 11 + rand() * 11));
  young.forEach(([x, z], i) => setTree(spruceMesh, nearA.length + i, x, z, 1.2 + rand() * 3.4));
  const pineMesh = new THREE.InstancedMesh(pine, firMat, nearB.length);
  nearB.forEach(([x, z], i) => setTree(pineMesh, i, x, z, 14 + rand() * 10));
  const farMesh = new THREE.InstancedMesh(distant, firMat, far.length);
  far.forEach(([x, z], i) => setTree(farMesh, i, x, z, 12 + rand() * 14));
  for (const [mesh, name] of [[spruceMesh, 'spruces'], [pineMesh, 'pines'], [farMesh, 'far-forest']]) {
    mesh.name = name; mesh.frustumCulled = false; mesh.instanceMatrix.needsUpdate = true; group.add(mesh);
  }
  const farFull = far.length;

  // ---- the forest floor (one plane; the path, the camp's earth and the firelight are in its shader)
  const groundGeo = track(new THREE.PlaneGeometry(3400, 3400, 1, 1).rotateX(-Math.PI / 2).translate(camLocal.x, 0, camLocal.z - 1300));
  const groundMat = track(new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG,
    uniforms: { ...sky, ...fireU, uSkyLight: skyLight, uOrigin: { value: anchor.centre.clone() } } }));
  const ground = new THREE.Mesh(groundGeo, groundMat); ground.name = 'forest-floor'; ground.frustumCulled = false;
  group.add(ground);

  // ---- stones: low lumps scattered over the floor, a ring of them round the camp
  const stoneGeo = track(mergeVertices(new THREE.IcosahedronGeometry(1, 2)));
  { const p = stoneGeo.attributes.position; for (let k = 0; k < p.count; k++) { const s = 0.8 + rand() * 0.4; p.setXYZ(k, p.getX(k) * s, p.getY(k) * s, p.getZ(k) * s); } stoneGeo.computeVertexNormals(); }
  const stoneMat = track(new THREE.ShaderMaterial({ vertexShader: STONE_VERT, fragmentShader: STONE_FRAG, uniforms: { ...sky, ...fireU, uSkyLight: skyLight } }));
  const stoneSpots = [];
  for (let k = 0; k < 140; k++) {
    const d = 9 + Math.pow(rand(), 1.4) * 70, a = (rand() - 0.5) * 2.4;
    const x = camLocal.x + Math.sin(a) * d, z = camLocal.z - Math.cos(a) * d;
    if (Math.abs(x - pathX(z)) < 1.4) continue;
    if (Math.hypot(x - FIRE.x, z - FIRE.z) < 3.4) continue;
    stoneSpots.push([x, z, 0.1 + Math.pow(rand(), 2.5) * 0.6]);
  }
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, stoneSpots.length);
  stoneSpots.forEach(([x, z, s], i) => {
    e.set(rand() * 3, rand() * 6.3, rand() * 3); q.setFromEuler(e);
    sc.set(s * (1 + rand() * 0.6), s * (0.45 + rand() * 0.3), s * (1 + rand() * 0.4)); ps.set(x, -s * 0.18, z);
    stones.setMatrixAt(i, m4.compose(ps, q, sc));
  });
  stones.name = 'stones'; stones.frustumCulled = false; stones.instanceMatrix.needsUpdate = true; group.add(stones);

  // ---- meadow grass: tufts from the camera's feet out across the clearing and the glade, never on the path or the camp's
  // earth; any prefix is an even sample (the order is random), so quality can trim the count
  const nTuft = small ? TUFTS_SMALL : TUFTS, tuftSpots = [];
  for (let guard = 0; tuftSpots.length < nTuft && guard < nTuft * 4; guard++) {
    const d = 2.2 * Math.pow(90 / 2.2, rand()), a = (rand() * 2 - 1) * 0.95;
    const x = camLocal.x + Math.sin(a) * d, z = camLocal.z - Math.cos(a) * d;
    if (Math.abs(x - pathX(z)) < 0.9 + rand() * 0.4 || Math.hypot(x - FIRE.x, z - FIRE.z) < 3.4 + rand()) continue;
    tuftSpots.push([x, z, d]);
  }
  const tuftGeo = track(tuftGeometry());
  const tuftMat = track(new THREE.ShaderMaterial({ vertexShader: TUFT_VERT, fragmentShader: TUFT_FRAG, side: THREE.DoubleSide, uniforms: { ...sky, ...fireU, uTime: time, uSkyLight: skyLight } }));
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftSpots.length);
  tuftSpots.forEach(([x, z, d], i) => {
    e.set(0, rand() * 6.3, 0); q.setFromEuler(e);
    const h = (0.22 + rand() * 0.3) * (1 + Math.min(1, d / 40) * 0.6), w = h * (0.9 + rand() * 0.5) * (1 + Math.min(2, d / 25));
    sc.set(w, h, w); ps.set(x, 0, z); tufts.setMatrixAt(i, m4.compose(ps, q, sc));
  });
  tufts.name = 'grass'; tufts.frustumCulled = false; tufts.instanceMatrix.needsUpdate = true; group.add(tufts);
  const tuftFull = tuftSpots.length;

  // ---- far ridges
  const ridgeGeo = track(ridgeGeometry(rand, camLocal));
  const ridgeMat = track(new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: RIDGE_FRAG, uniforms: { ...sky } }));
  const ridge = new THREE.Mesh(ridgeGeo, ridgeMat); ridge.name = 'ridges'; ridge.frustumCulled = false; group.add(ridge);

  // ---- embers on the wind, from the fire
  const nEmb = small ? EMBERS_SMALL : EMBERS;
  const ep = new Float32Array(nEmb * 3), es = new Float32Array(nEmb * 3);
  for (let k = 0; k < nEmb; k++) {
    const r = rand() * 0.3, a = rand() * Math.PI * 2;
    ep.set([FIRE.x + Math.cos(a) * r, 0.5, FIRE.z + Math.sin(a) * r], k * 3); es.set([rand(), rand(), rand()], k * 3);
  }
  const emberGeo = track(new THREE.BufferGeometry());
  emberGeo.setAttribute('position', new THREE.BufferAttribute(ep, 3)); emberGeo.setAttribute('aSeed', new THREE.BufferAttribute(es, 3));
  const emberMat = track(new THREE.ShaderMaterial({ vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: time, uPx: { value: 1 } } }));
  const embers = new THREE.Points(emberGeo, emberMat); embers.name = 'embers'; embers.frustumCulled = false; embers.renderOrder = 6;
  group.add(embers);

  // ---- the spark: the phoenix, far off between the trees
  const TRAIL = 26;
  const sk = new Float32Array(TRAIL + 2), st = new Float32Array(TRAIL + 2), sj = new Float32Array(TRAIL + 2);
  sk[0] = 0; sk[1] = 1;
  for (let k = 0; k < TRAIL; k++) { sk[k + 2] = 2; st[k + 2] = (k + 1) / TRAIL; sj[k + 2] = rand(); }
  const sparkGeo = track(new THREE.BufferGeometry());
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((TRAIL + 2) * 3), 3));
  sparkGeo.setAttribute('aK', new THREE.BufferAttribute(sk, 1)); sparkGeo.setAttribute('aT', new THREE.BufferAttribute(st, 1)); sparkGeo.setAttribute('aJit', new THREE.BufferAttribute(sj, 1));
  const sparkMat = track(new THREE.ShaderMaterial({ vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uGlow: { value: 1 }, uCentre: { value: SPARK.clone() } } }));
  const spark = new THREE.Points(sparkGeo, sparkMat); spark.name = 'spark'; spark.frustumCulled = false; spark.renderOrder = 7;
  group.add(spark);

  // ---- light: the fire (ctx.lights[0], breathed by createCampfire) and a cool sky rim on the Wanderer (ctx.lights[1])
  const [fireLightPt, rim] = lights;
  fireLightPt.position.copy(firePos).setY(0.7); fireLightPt.distance = 18; fireLightPt.decay = 2; fireLightPt.intensity = 26;
  rim.color.set('#9db8ff'); rim.distance = 7; rim.decay = 2;
  const fireBase = fireLightPt.intensity;

  // ---- the fire's flames (code-built, so the camp burns even if the fire-ring model never arrives)
  const flames = createCampfire({ size: 1.05, light: fireLightPt });
  flames.group.position.set(FIRE.x, 0.05, FIRE.z);
  group.add(flames.group);

  // ---- the props: each loads on its own in the background (the forest never waits for them), is converted to plain floats,
  // placed, warmed, and shown once its textures are up; one that fails is left out, the forest stands without it
  let disposed = false;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const owned = [];
  // the models sit in the blue hour: their own colours dimmed and cooled a little, the fire does the rest
  const cool = (root) => root.traverse((o) => { if (!o.isMesh) return; for (const mat of [].concat(o.material)) if (mat.isMeshStandardMaterial && !mat.userData.cooled) {
    mat.userData.cooled = true; mat.color.multiply(new THREE.Color('#9fa9bb')); mat.envMapIntensity = 0;
  } });
  const place = (root, [x, y, z], scale, rotY = 0) => { const o = root; o.position.set(x, y, z); o.scale.setScalar(scale); o.rotation.y = rotY; return o; };
  // the wind-shaped pines: one old pine close on the left, so tall (13 m) that its crown leaves the top of the frame and only
  // the twisted trunk and lowest boughs show, warmed on its fire side; two more stand back among the first firs (z -12 to
  // -22), lifted toward the haze so they read as storm-bent silhouettes in the treeline. The fire and the spark stay the subjects.
  const PINES = [[-9.6, 23.5, 13, 0.3], [27, -16, 11, 2.4], [-19, -22, 12, 4.1]];
  const SETUP = {
    campfire: (r) => [place(r, [FIRE.x, 0, FIRE.z], 1.15, 0.4)],
    bench: (r) => [place(r, [FIRE.x - 2.1, 0, FIRE.z - 0.9], 1.85, 1.15)],          // beside the fire, facing it
    kettle: (r) => [place(r, [FIRE.x + 1.25, 0, FIRE.z + 0.55], 0.36, -0.6)],
    bag: (r) => [place(r, [FIRE.x + 2.5, 0, FIRE.z + 0.4], 1.85, 0.35)],
    pine: (r) => {
      const far = [];   // per mesh, in traversal order: the far trees' own material
      r.traverse((o) => { if (!o.isMesh) return; const m = [].concat(o.material)[0]; if (!m.isMeshStandardMaterial) return;
        // the near one: a faint warm lift on the bark, the firelight's reach, so the trunk is not a pure black cut-out
        m.emissive.set('#7a4a28'); m.emissiveMap = m.map; m.emissiveIntensity = 0.24;
        // the far ones: a flat cool lift toward the haze over the forest
        const f = track(m.clone()); f.color.multiplyScalar(0.5); f.emissive.set('#1b2334'); f.emissiveMap = null; f.emissiveIntensity = 1; far.push(f); });
      return PINES.map(([x, z, h, rot], i) => {
        const t = i ? r.clone() : r;
        if (i) { let k = 0; t.traverse((o) => { if (o.isMesh && k < far.length) o.material = far[k++]; }); }
        return place(t, [x, -0.05, z], h, rot);
      });
    },
  };
  const arrivals = [];      // { holder, uploads }: warmed, hidden until their textures are on the GPU
  for (const [k, { url }] of Object.entries(PROPS)) {
    loader.loadAsync(import.meta.env.BASE_URL + url).then(async (g) => {
      const root = g.scene;
      if (disposed) { disposeTree(root); return; }
      owned.push(root);
      dequantize(root);   // plain floats: quantized attributes cost a fresh vertex shader at first draw on Direct3D
      cool(root);
      const objs = SETUP[k](root), holder = new THREE.Group(); holder.name = k; holder.add(...objs);
      try { await renderer.compileAsync(holder, camera, scene); } catch (err) { console.warn(`The Call: ${url} warm-up failed; it compiles on first sight`, err); }
      if (disposed) { disposeTree(holder); return; }
      const uploads = new Set();
      holder.traverse((o) => { for (const mat of [].concat(o.material || [])) for (const t in mat) if (mat[t]?.isTexture) uploads.add(mat[t]); });
      holder.visible = false; group.add(holder);
      arrivals.push({ holder, uploads: [...uploads] }); ctx.requestDraw();
    }).catch((err) => console.warn(`The Call: ${url} did not load; the forest goes on without it`, err));
  }

  scene.add(group);

  let stillPosed = false;
  const wPos = new THREE.Vector3();
  function update(dt, local) {
    const still = ctx.still;
    // props that arrived: their textures upload one a frame (all at once in still mode), then they show; this runs while
    // the stage is still hidden too (the world calls update on every built stage), so the uploads are done before it is seen
    for (let k = 0; k < arrivals.length; k++) {
      const a = arrivals[k];
      if (a.uploads.length) { do renderer.initTexture(a.uploads.shift()); while (still && a.uploads.length); ctx.requestDraw(); if (!still) break; }
      if (!a.uploads.length) { a.holder.visible = true; arrivals.splice(k--, 1); ctx.requestDraw(); }
    }
    if (!group.visible) return;
    if (!still) time.value += dt;
    else if (!stillPosed) { time.value = STILL_AT; stillPosed = true; }
    if (!still) stillPosed = false;
    farMesh.count = farFor(ctx.quality, farMesh.count, farFull);
    tufts.count = farFor(ctx.quality, tufts.count, tuftFull);
    const px = renderer.getPixelRatio();
    emberMat.uniforms.uPx.value = px; sparkMat.uniforms.uPx.value = px;
    sparkMat.uniforms.uTime.value = time.value;
    // the call grows: the spark's glow swells as the visitor stays with the scene
    sparkMat.uniforms.uGlow.value = still ? 1.1 : 0.85 + 0.35 * smooth01((local - 0.3) / 0.4);
    flames.update(still ? 0 : dt); fireU.uFireI.value = fireLightPt.intensity / fireBase;
    const w = wanderer.copyPosition(wPos);
    if (Number.isFinite(w.x)) { rim.position.set(w.x - 1.3, w.y + 2.4, w.z - 1.8); rim.intensity = 16; }
    else rim.intensity = 0;
  }

  function disposeTree(o) {
    o.traverse((c) => { c.geometry?.dispose?.(); for (const mat of [].concat(c.material || [])) { for (const k in mat) mat[k]?.isTexture && mat[k].dispose(); mat.dispose(); } });
  }
  return {
    group, update,
    groundAt: () => 0,
    pathAt: (z) => anchor.centre.x + pathX(z - anchor.centre.z),
    dispose() {
      disposed = true; scene.remove(group);
      for (const d of disposables) d.dispose();
      for (const m of [spruceMesh, pineMesh, farMesh, stones, tufts]) m.dispose();
      flames.group.traverse((o) => { o.geometry?.dispose?.(); for (const mat of [].concat(o.material || [])) { mat.map?.dispose(); mat.dispose(); } });
      for (const root of owned) disposeTree(root);
    },
  };
}
const STILL_AT = 3;    // seconds: the still picture's moment (the spark mid-drift, embers well up)
// how many far trees to draw at a render-loop quality scale: all at full quality, LOW_SHARE below LOW_BELOW, and between the
// two lines the current count holds (so a scale at the line does not flicker the forest)
export function farFor(quality, shown, full) {
  if (quality < LOW_BELOW) return Math.round(full * LOW_SHARE);
  if (quality >= LOW_BELOW + 0.05) return full;
  return shown;
}
const smooth01 = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
