// The Harvest (stage 6, the signature scene): golden wheat at golden hour. The camera stands in the field, eyes just above
// the heads; a huge low sun sits over a lone tree on a gentle rise, light streams through floating dust, the Wanderer walks
// on toward it along a narrow trodden lane through the wheat (laneX, his pathAt; the field thins along it), and the phoenix
// passes overhead and flies on into the sun.
//
// Parts (9 draw calls of the stage's own: wheat, field, skyline, sun, glare, dust, the phoenix's 2 meshes and its embers;
// 52 in the whole frame with the Wanderer's ~33, the sky and the stars):
//   wheat     one low-poly stalk (stem, leaf, seed head, awns; 27 triangles) instanced 32,000 times (24,000 on a small
//             screen), denser near the camera in equal screen measure; 10,000 drawn while the render loop's quality is
//             below 0.7 (InstancedMesh.count, no recompile). Wind in the vertex shader: rolling gusts plus each stalk's own
//             sway; the heads glow where they stand against the sun. Opaque, alpha-free.
//   ground    the field beyond and under the stalks (the same gusts roll across it as light bands) and the gentle rise
//   skyline   the lone tree on the rise and a far treeline, dark shapes softened by the golden haze (one merged mesh)
//   sun       a camera-facing disc with its halo and slow rays, far out along the mood's sun direction (additive, depth
//             tested, so the treeline and the rise cut its lower edge)
//   glare     one screen-space pass: rays from the sun's screen position over the whole frame (no post-processing chain)
//   dust      motes floating in the light, bright only near the sun line (forward scattering)
//   phoenix   src/engine/phoenix.js on a path of its own: in from behind the camera, overhead, on over the field into the sun
// Every colour here is display-referred like the shared sky shader (no tone mapping, no colour-space step), and the haze
// converges on exactly the sky's horizon colour, so the field meets the sky without a seam.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPhoenixFlight } from '../../engine/phoenix.js';
import { dequantize } from '../../engine/dequantize.js';
import { MOODS } from '../journey.js';
import { LIFT } from '../path.js';

const MOOD = MOODS[5];
const FULL = 32000, FULL_SMALL = 24000, LOW = 10000, LOW_BELOW = 0.7;
const NEAR = 1.5, FAR = 230;            // the instanced field, metres from the camera
const WEDGE = THREE.MathUtils.degToRad(44);
const SUN_DIST = 2500, SUN_RADIUS = 0.068;   // radians: about 3.9 degrees, a huge low sun
const DUST = 520, DUST_SMALL = 320;
// the lane: a narrow trodden way through the wheat (stage space; the camera stands at z +40). It runs straight on a little
// right of the camera (so the Wanderer walking in it stands clear of the sun's disc), then bends gently left toward the
// lone tree on the rise. LANE_HALF is its half width; the wheat thins inside it and stands clear of his body.
const LANE_X0 = 0.8, LANE_FROM = 36.5, LANE_HALF = 0.5;
const TREE_X = -22, TREE_S = 312;        // the tree: x, and its distance from the camera along -z (RISE in build, + 8)
const smoothJ = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const laneX = (z) => LANE_X0 + (TREE_X - LANE_X0) * smoothJ(14, TREE_S, 40 - z);

// ---- shared GLSL: the sky's own formula (src/engine/sky.js) for the haze target, and the rolling gusts
const SKY_GLSL = /* glsl */ `
  uniform vec3 uSunDir, uZenith, uHorizon, uGlow;
  const vec3 COOL = vec3(0.56, 0.60, 0.66);
  vec3 skyAt(vec3 d) {
    float h = clamp(d.y, -0.2, 1.0), s = max(dot(d, uSunDir), 0.0);
    vec3 hor = mix(COOL, uHorizon, pow(s, 3.0));
    vec3 col = mix(hor, uZenith, pow(smoothstep(-0.05, 0.55, h), 0.8));
    return col + uGlow * pow(s, 10.0) * 0.32 + uGlow * pow(s, 90.0) * 0.5;
  }
  // haze: toward the sky's horizon colour in this direction, warmer and brighter toward the sun (light through dust)
  vec3 haze(vec3 col, vec3 world, float hazeDist) {
    vec3 v = world - cameraPosition; float d = length(v); vec3 dir = v / d;
    float f = 1.0 - exp(-d / hazeDist);
    f = max(f, smoothstep(1100.0, 1500.0, d));
    return mix(col, skyAt(normalize(vec3(dir.x, 0.0, dir.z))), f);
  }`;
const GUST_GLSL = /* glsl */ `
  uniform float uTime; uniform vec2 uWindDir;
  float gustAt(vec2 p) {
    vec2 q = vec2(-uWindDir.y, uWindDir.x);
    float a = sin(dot(p, uWindDir) * 0.05 - uTime * 1.25 + sin(dot(p, q) * 0.021 + uTime * 0.17) * 1.6);
    float b = sin(dot(p, q) * 0.033 + dot(p, uWindDir) * 0.012 - uTime * 0.55);
    return smoothstep(-0.15, 1.0, a * 0.72 + b * 0.28);
  }`;

// ---- the stalk: 1.24 m to the awn tips. uv.x runs across each blade (0..1), uv.y up the stalk (0..1); aPart 0 stem,
// 1 leaf, 2 head, 3 awns
function stalkGeometry() {
  const P = [], UV = [], PART = [], IDX = [];
  const TOP = 1.24;
  // a ribbon along a centre line, `side` the unit direction its width spans; width(t) at t 0..1
  function ribbon(pts, side, width, part) {
    const base = P.length / 3;
    pts.forEach((c, i) => {
      const t = i / (pts.length - 1), w = width(t) / 2;
      P.push(c[0] - side[0] * w, c[1] - side[1] * w, c[2] - side[2] * w, c[0] + side[0] * w, c[1] + side[1] * w, c[2] + side[2] * w);
      UV.push(0, c[1] / TOP, 1, c[1] / TOP); PART.push(part, part);
    });
    for (let i = 0; i + 1 < pts.length; i++) { const a = base + i * 2; IDX.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  // stem: a faint lean, 3 segments
  ribbon([[0, 0, 0], [0.004, 0.33, 0], [0.012, 0.66, 0], [0.026, 0.95, 0]], [1, 0, 0], (t) => 0.011 - t * 0.003, 0);
  // leaf: out from the stem and drooping
  ribbon([[0.003, 0.3, 0], [0.01, 0.42, 0.09], [0.012, 0.47, 0.2], [0.014, 0.43, 0.3]], [1, 0, 0], (t) => 0.024 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08)), 1);
  // seed head: two crossed spindles, nodding a little
  const head = [[0.026, 0.93, 0], [0.033, 0.99, 0], [0.04, 1.05, 0], [0.046, 1.11, 0]];
  const prof = (t) => 0.038 * Math.sin(Math.PI * (0.12 + t * 0.8)) * (1 - t * 0.35);
  ribbon(head, [1, 0, 0], prof, 2);
  ribbon(head, [0, 0, 1], prof, 2);
  // awns: three long, thin bristles fanning up from the head
  for (const [dx, dz] of [[-0.03, 0.01], [0.035, -0.012], [0.004, 0.034]]) {
    const b = P.length / 3;
    P.push(0.04, 1.06, 0, 0.05, 1.06, 0, 0.046 + dx, TOP, dz);
    UV.push(0, 1.06 / TOP, 1, 1.06 / TOP, 0.5, 1); PART.push(3, 3, 3); IDX.push(b, b + 1, b + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(PART, 1));
  g.setIndex(IDX);
  return g;
}

const WHEAT_VERT = /* glsl */ `
  attribute float aPart;
  ${GUST_GLSL}
  uniform float uFar;
  varying vec2 vUv; varying float vPart, vGust, vRand; varying vec3 vWorld;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 bw = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;     // the stalk's root, world
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    float r = hash(bw.xz), dist = distance(bw, cameraPosition);
    // far stalks grow wider (never thinner than a pixel, so the distance does not shimmer) and sink into the field at the edge
    float widen = 1.0 + clamp((dist - 5.0) * 0.03, 0.0, 3.5);
    wp.xz = bw.xz + (wp.xz - bw.xz) * widen;
    wp.y = bw.y + (wp.y - bw.y) * (1.0 - smoothstep(uFar * 0.78, uFar, dist));
    float h = uv.y, g = gustAt(bw.xz);
    float sway = sin(uTime * (1.5 + r * 0.9) + r * 6.2832) * 0.05 + sin(uTime * 2.7 + bw.x * 0.6 + bw.z * 0.3) * 0.02;
    float bend = 0.07 + g * 0.3 + sway, k = h * h;
    wp.xz += uWindDir * bend * k * 1.05;
    wp.y -= bend * bend * k * 0.45;
    vUv = uv; vPart = aPart; vGust = g; vRand = r; vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const WHEAT_FRAG = /* glsl */ `
  ${SKY_GLSL}
  uniform vec3 uSunCol;
  varying vec2 vUv; varying float vPart, vGust, vRand; varying vec3 vWorld;
  void main() {
    float h = vUv.y;
    vec3 stem = mix(vec3(0.07, 0.04, 0.015), vec3(0.42, 0.25, 0.08), smoothstep(0.05, 0.85, h));
    vec3 leaf = vec3(0.22, 0.14, 0.05);
    vec3 head = mix(vec3(0.52, 0.30, 0.08), vec3(0.74, 0.47, 0.15), vRand);
    vec3 awn = vec3(0.80, 0.55, 0.22);
    vec3 col = vPart < 0.5 ? stem : vPart < 1.5 ? leaf : vPart < 2.5 ? head : awn;
    col *= 0.78 + 0.44 * vRand;
    col *= mix(0.32, 1.0, smoothstep(0.0, 0.8, h));                  // the field's own shade low down
    float near = distance(vWorld, cameraPosition);
    col *= mix(0.5, 1.0, smoothstep(1.0, 7.0, near));                 // the stalks around the camera stand in their own shade
    vec3 vd = normalize(vWorld - cameraPosition);
    float back = pow(max(dot(vd, uSunDir), 0.0), 34.0);              // standing against the sun
    float rim = abs(vUv.x * 2.0 - 1.0);                              // blade edges: the light comes through them
    float top = smoothstep(0.62, 1.0, h);
    col += uSunCol * (0.05 + back * (0.6 + 1.5 * rim)) * top;
    col += vec3(0.30, 0.18, 0.06) * vGust * top * 0.4;                // gusts lay the heads over: a sheen rolls across
    gl_FragColor = vec4(haze(col, vWorld, 520.0), 1.0);
  }`;

const GROUND_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const GROUND_FRAG = /* glsl */ `
  ${SKY_GLSL}
  ${GUST_GLSL}
  uniform vec3 uSunCol;
  varying vec3 vWorld;
  float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453), b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5453), d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5453);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
  void main() {
    vec3 v = vWorld - cameraPosition; float d = length(v); vec3 dir = v / d;
    float g = gustAt(vWorld.xz);
    float n = n2(vWorld.xz * 0.06) * 0.6 + n2(vWorld.xz * 0.23) * 0.4;
    vec3 field = mix(vec3(0.40, 0.23, 0.07), vec3(0.62, 0.38, 0.12), n) + vec3(0.26, 0.16, 0.05) * g * 0.45;
    vec3 soil = vec3(0.08, 0.05, 0.02);
    vec3 col = mix(soil, field, smoothstep(3.0, 40.0, d));
    float toward = pow(max(dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0), 40.0);
    col += uSunCol * toward * 0.5 * smoothstep(15.0, 260.0, d);    // the field toward the sun shines
    gl_FragColor = vec4(haze(col, vWorld, 520.0), 1.0);
  }`;

const SIL_FRAG = /* glsl */ `
  ${SKY_GLSL}
  varying vec3 vWorld;
  void main() { gl_FragColor = vec4(haze(vec3(0.075, 0.045, 0.02), vWorld, 900.0), 1.0); }`;

const SUN_VERT = GROUND_VERT;
const SUN_FRAG = /* glsl */ `
  uniform vec3 uSunDir; uniform float uTime, uRadius, uFade;
  varying vec3 vWorld;
  void main() {
    vec3 d = normalize(vWorld - cameraPosition);
    float a = acos(clamp(dot(d, uSunDir), -1.0, 1.0));
    vec3 right = normalize(cross(uSunDir, vec3(0.0, 1.0, 0.0))), up = cross(right, uSunDir);
    float th = atan(dot(d, up), dot(d, right));
    float disc = 1.0 - smoothstep(uRadius * 0.82, uRadius * 1.08, a);
    float k = clamp(a / uRadius, 0.0, 1.0);
    vec3 col = mix(vec3(1.0, 0.96, 0.84), vec3(1.0, 0.66, 0.28), k * k) * disc * 0.95;
    col += vec3(1.0, 0.5, 0.16) * (exp(-a * 7.0) * 0.42 + exp(-a * 22.0) * 0.55) * (1.0 - disc);
    float rays = pow(0.5 + 0.5 * sin(th * 11.0 + sin(th * 4.0 + uTime * 0.12) * 2.2), 4.0) * 0.6
               + pow(0.5 + 0.5 * sin(th * 27.0 - uTime * 0.07 + 1.3), 6.0) * 0.4;
    col += vec3(1.0, 0.6, 0.28) * rays * exp(-a * 4.2) * 0.3 * smoothstep(uRadius, uRadius * 1.7, a);
    col *= (1.0 - smoothstep(0.5, 0.7, a)) * uFade;
    gl_FragColor = vec4(col, 1.0);
  }`;

const GLARE_VERT = /* glsl */ `
  uniform vec3 uSunDir; varying vec2 vNdc; varying vec3 vSun;
  void main() {
    vec4 c = projectionMatrix * viewMatrix * vec4(cameraPosition + uSunDir * 1000.0, 1.0);
    vSun = vec3(c.xy / c.w, step(0.0, c.w));
    vNdc = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0);
  }`;
const GLARE_FRAG = /* glsl */ `
  uniform float uTime, uAspect, uStrength; varying vec2 vNdc; varying vec3 vSun;
  void main() {
    vec2 d = vNdc - vSun.xy; d.x *= uAspect;
    float r = length(d), th = atan(d.y, d.x);
    float rays = pow(0.5 + 0.5 * sin(th * 9.0 + sin(th * 3.0 + uTime * 0.18) * 1.6), 3.0) * 0.7
               + pow(0.5 + 0.5 * sin(th * 23.0 - uTime * 0.11), 5.0) * 0.3;
    float i = rays * exp(-r * 2.4) * 0.2 + exp(-r * 3.6) * 0.09;
    gl_FragColor = vec4(vec3(1.0, 0.58, 0.26) * i * vSun.z * uStrength, 1.0);
  }`;

const DUST_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime, uPx; uniform vec3 uSunDir; uniform vec3 uBox, uOrigin;
  varying float vBright;
  void main() {
    vec3 p = position;
    p.x = mod(p.x + uTime * (0.35 + aSeed * 0.3) + sin(uTime * 0.4 + aSeed * 40.0) * 0.6, uBox.x) - uBox.x * 0.5;
    p.y = mod(p.y + uTime * 0.05 * (aSeed - 0.3) + sin(uTime * 0.6 + aSeed * 20.0) * 0.15, uBox.y);
    p.z += sin(uTime * 0.3 + aSeed * 13.0) * 0.5;
    vec4 wp = modelMatrix * vec4(p + uOrigin, 1.0);
    vec4 mv = viewMatrix * wp;
    vec3 vd = normalize(wp.xyz - cameraPosition);
    // forward scattering: only the motes close to the sun line light up, and those high in the frame fade (no star field)
    vBright = pow(max(dot(vd, uSunDir), 0.0), 26.0) * 1.8 * (1.0 - smoothstep(0.12, 0.3, vd.y));
    gl_PointSize = clamp((0.05 + aSeed * 0.05) * uPx * 600.0 / -mv.z, 1.0, 6.0);
    gl_Position = projectionMatrix * mv;
  }`;
const DUST_FRAG = /* glsl */ `
  varying float vBright;
  void main() { float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard;
    gl_FragColor = vec4(vec3(1.0, 0.78, 0.45) * vBright * smoothstep(0.5, 0.05, r), 1.0); }`;

// the lone tree: a broad field oak (trunk, limbs, a crown of lumpy clumps), about 14 m as built and scaled to about 19 m where it stands on the rise
function treeGeometry(rand) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.35, 0.6, 6, 7, 1, true); trunk.translate(0, 3, 0); parts.push(trunk);
  for (const [ax, az, len, tilt] of [[1, 0.3, 5, 0.9], [-1, -0.2, 5.5, 0.85], [0.2, 1, 4, 0.7], [-0.3, -1, 4, 0.8]]) {
    const limb = new THREE.CylinderGeometry(0.12, 0.28, len, 5, 1, true); limb.translate(0, len / 2, 0);
    limb.rotateZ(-Math.sign(ax) * tilt * Math.min(1, Math.abs(ax) + 0.2)); limb.rotateX(Math.sign(az) * tilt * Math.abs(az));
    limb.translate(0, 5.2, 0); parts.push(limb);
  }
  const clumps = [[0, 11, 0, 4.2], [-4.6, 9.8, 0.4, 3.4], [4.8, 9.9, -0.3, 3.5], [-2.2, 12.2, 1.2, 3.1], [2.6, 12.4, -0.8, 3.2], [-7.4, 8.6, 0, 2.4], [7.6, 8.8, 0.5, 2.3], [0.5, 9, 2.6, 3]];
  for (const [x, y, z, r] of clumps) {
    const c = new THREE.IcosahedronGeometry(r, 2);
    const p = c.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + (rand() - 0.5) * 0.32; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.72, p.getZ(i) * k); }
    c.translate(x, y, z); parts.push(c);
  }
  return mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position') n.deleteAttribute(k); return n; }));
}
// the far treeline: a strip of crowns at about 1150 m, across the view (heights 6 to 24 m)
function treelineGeometry(rand, centre) {
  const P = [], IDX = [], R = 1150, SEG = 420, A0 = -1.35, A1 = 1.35;
  let hgt = 8, vel = 0;
  for (let i = 0; i <= SEG; i++) {
    const a = A0 + (A1 - A0) * (i / SEG), r = R + (rand() - 0.5) * 40;
    vel = vel * 0.8 + (rand() - 0.5) * 1.6; hgt = Math.min(15, Math.max(2.5, hgt + vel));
    const crown = hgt * (0.82 + 0.18 * Math.sqrt(Math.abs(Math.sin(i * 0.9))));
    const x = centre.x + Math.sin(a) * r, z = centre.z - Math.cos(a) * r;
    P.push(x, -3, z, x, crown, z);
    if (i) { const b = (i - 1) * 2; IDX.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(IDX);
  return g.toNonIndexed();
}
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function build(ctx) {
  const { scene, renderer, camera, anchor, lights, wanderer } = ctx;
  const group = new THREE.Group(); group.name = 'the-harvest'; group.position.copy(anchor.centre);
  const rand = mulberry(6);
  const small = Math.min(innerWidth, innerHeight) < 700;
  const sunDir = new THREE.Vector3(...MOOD.sun).normalize();
  const sky = { uSunDir: { value: sunDir }, uZenith: { value: new THREE.Color(MOOD.zenith) }, uHorizon: { value: new THREE.Color(MOOD.horizon) }, uGlow: { value: new THREE.Color(MOOD.glow) } };
  const time = { value: 0 }, windDir = { value: new THREE.Vector2(0.55, -0.83).normalize() };
  const sunCol = { value: new THREE.Color(1.0, 0.62, 0.26) };
  const camLocal = anchor.cam.clone().sub(anchor.centre);           // the camera, in the stage's own space
  const disposables = [];
  const track = (...xs) => { disposables.push(...xs); return xs[0]; };

  // ---- the wheat
  const full = small ? FULL_SMALL : FULL;
  const stalk = track(stalkGeometry());
  const wheatMat = track(new THREE.ShaderMaterial({ vertexShader: WHEAT_VERT, fragmentShader: WHEAT_FRAG, side: THREE.DoubleSide,
    uniforms: { ...sky, uTime: time, uWindDir: windDir, uSunCol: sunCol, uFar: { value: FAR } } }));
  const wheat = new THREE.InstancedMesh(stalk, wheatMat, full);
  wheat.frustumCulled = false; wheat.name = 'wheat';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const place = (i, x, z, scale, lean = 0.12) => {
    e.set((rand() - 0.5) * lean, rand() * Math.PI * 2, (rand() - 0.5) * lean); q.setFromEuler(e);
    s.set(scale, scale * (0.88 + rand() * 0.24), scale); p.set(x, 0, z);
    wheat.setMatrixAt(i, m.compose(p, q, s));
  };
  // the first few are the large foreground stalks at the frame's edges (always drawn, whatever the quality); then the
  // field: distance log-uniform from NEAR to FAR across a wedge wider than any screen, so its density is even on screen.
  // Any prefix of the field is an even sample of it, which is what lets quality trim the count without holes.
  let i = 0;
  // (tall enough that their heads reach the horizon, 20 to 32 degrees either side of the view, so on a wide screen they frame
  // the field the way the stalks frame the mood reference; a phone's narrower view leaves them out)
  for (const side of [-1, 1]) for (let k = 0; k < 7; k++) {
    const d = 1.3 + rand() * 1.3, a = side * (0.36 + rand() * 0.2);
    place(i++, camLocal.x + Math.sin(a) * d, camLocal.z - Math.cos(a) * d, 1.15 + rand() * 0.2, 0.3);
  }
  while (i < full) {
    const d = NEAR * Math.pow(FAR / NEAR, rand()), a = (rand() * 2 - 1) * WEDGE;
    const x = camLocal.x + Math.sin(a) * d, z = camLocal.z - Math.cos(a) * d;
    // the lane: none within his body's reach of its centre line, a few stragglers toward its edges (a sample that is
    // rejected is simply drawn again, so any prefix of the field stays an even sample of it)
    const off = Math.abs(x - laneX(z));
    if (z < LANE_FROM && off < LANE_HALF && (off < 0.32 || rand() < 0.75)) continue;
    place(i++, x, z, 0.72 + rand() * 0.14);
  }
  wheat.instanceMatrix.needsUpdate = true;
  group.add(wheat);

  // ---- the ground: the field plane with the gentle rise merged in (one draw)
  const RISE = new THREE.Vector3(-30, 0, camLocal.z - 320), RISE_R = 140, RISE_H = 6;
  const plane = new THREE.PlaneGeometry(3400, 3400, 1, 1).rotateX(-Math.PI / 2).translate(camLocal.x, 0, camLocal.z - 1300);
  const hill = new THREE.PlaneGeometry(RISE_R * 2, RISE_R * 2, 40, 40).rotateX(-Math.PI / 2);
  { const a = hill.attributes.position; for (let k = 0; k < a.count; k++) { const r = Math.hypot(a.getX(k), a.getZ(k)) / RISE_R, t = Math.max(0, 1 - r * r); a.setY(k, RISE_H * t * t - 0.08); } }
  hill.translate(RISE.x, 0, RISE.z);
  for (const g of [plane, hill]) { g.deleteAttribute('uv'); g.deleteAttribute('normal'); }
  const groundGeo = track(mergeGeometries([plane.toNonIndexed(), hill.toNonIndexed()])); plane.dispose(); hill.dispose();
  const groundMat = track(new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG, uniforms: { ...sky, uTime: time, uWindDir: windDir, uSunCol: sunCol } }));
  const ground = new THREE.Mesh(groundGeo, groundMat); ground.name = 'field'; ground.frustumCulled = false;
  group.add(ground);

  // ---- the skyline: the lone tree on the rise and the far treeline (one draw)
  const tree = treeGeometry(rand); tree.rotateY(0.6); tree.scale(1.35, 1.35, 1.35); tree.translate(RISE.x + 8, RISE_H - 0.8, RISE.z + 8);
  const line = treelineGeometry(rand, camLocal);
  const silGeo = track(mergeGeometries([tree, line])); tree.dispose(); line.dispose();
  const silMat = track(new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: SIL_FRAG, uniforms: { ...sky } }));
  const skyline = new THREE.Mesh(silGeo, silMat); skyline.name = 'skyline'; skyline.frustumCulled = false;
  group.add(skyline);

  // ---- the sun: a camera-facing disc, halo and rays, far out along the sun direction. It (and its glare) comes in late in
  // the descent from the change of set (none above lift 0.3, full below 0.08, by when the world's own sun has moved onto
  // the same line), so the arrival never changes the sky in one frame and never shows two suns
  const sunFade = { value: 1 };
  const sunGeo = track(new THREE.PlaneGeometry(1, 1));
  const sunMat = track(new THREE.ShaderMaterial({ vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSunDir: sky.uSunDir, uTime: time, uRadius: { value: SUN_RADIUS }, uFade: sunFade } }));
  const sun = new THREE.Mesh(sunGeo, sunMat); sun.name = 'sun'; sun.frustumCulled = false;
  sun.scale.setScalar(2 * SUN_DIST * Math.tan(0.72)); sun.renderOrder = 1;
  group.add(sun);

  // ---- the glare: one screen-space pass of rays from the sun's place on screen, drawn last over everything
  const glareGeo = track(new THREE.BufferGeometry());
  glareGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const glareMat = track(new THREE.ShaderMaterial({ vertexShader: GLARE_VERT, fragmentShader: GLARE_FRAG, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uSunDir: sky.uSunDir, uTime: time, uAspect: { value: 1 }, uStrength: { value: 1 } } }));
  const glare = new THREE.Mesh(glareGeo, glareMat); glare.name = 'glare'; glare.frustumCulled = false; glare.renderOrder = 10;
  group.add(glare);

  // ---- dust in the light: a box in front of the camera, drifting with the wind (all motion in the shader)
  const nDust = small ? DUST_SMALL : DUST, box = new THREE.Vector3(30, 6, 46);
  const dp = new Float32Array(nDust * 3), ds = new Float32Array(nDust);
  for (let k = 0; k < nDust; k++) { dp.set([rand() * box.x, rand() * box.y, -rand() * box.z], k * 3); ds[k] = rand(); }
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(ds, 1));
  const dustMat = track(new THREE.ShaderMaterial({ vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: time, uPx: { value: 1 }, uSunDir: sky.uSunDir, uBox: { value: box }, uOrigin: { value: new THREE.Vector3(camLocal.x, 0.2, camLocal.z - 1.5) } } }));
  const dust = new THREE.Points(dustGeo, dustMat); dust.name = 'dust'; dust.frustumCulled = false;
  group.add(dust);

  // ---- the Wanderer's light (ctx.lights, never added): a warm rim from the sun side behind him and a soft fill from ours
  const [rim, fill] = lights;
  rim.color.set('#ffb35c'); rim.distance = 7; rim.decay = 2;
  fill.color.set('#ffc887'); fill.distance = 8; fill.decay = 2;

  // ---- the phoenix: loaded in the background (the field never waits for it), warmed before it joins the group
  // the flight (stage space; the camera stands at z +40 looking toward -z): in high from behind the camera on the LEFT,
  // across overhead past the Wanderer, a wide bank to the right (away from the lower-left caption), then straight on along
  // the sun line and into the sun
  const sunLine = (t) => camLocal.clone().add(sunDir.clone().multiplyScalar(t));
  const flightPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-34, 34, 120), new THREE.Vector3(-14, 27, 52), new THREE.Vector3(10, 23, -8), new THREE.Vector3(38, 26, -85),
    new THREE.Vector3(58, 31, -175), new THREE.Vector3(34, 35, -285), sunLine(460), sunLine(700), sunLine(900),
  ], false, 'centripetal');
  let phoenix = null, disposed = false, pUploads = [], wasShown = false, stillPosed = false;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.loadAsync(import.meta.env.BASE_URL + 'models/phoenix-flap.glb').then(async (gltf) => {
    if (disposed) return;
    dequantize(gltf.scene);   // float attributes: no shader build at its first draw on Direct3D (see src/engine/dequantize.js)
    // this copy of the bird is warmed to the hour: its feathers catch the low sun and glow amber, not silver
    gltf.scene.traverse((o) => { for (const mat of [].concat(o.material || [])) if (mat.isMeshStandardMaterial) {
      mat.color.multiply(new THREE.Color('#ffc890')); mat.metalness = Math.min(mat.metalness, 0.3);
      if (mat.emissiveMap) { mat.emissive.set('#ff9a52'); mat.emissiveIntensity = 0.55; }
    } });
    const flight = createPhoenixFlight(gltf, { path: flightPath, hidden: 6 });
    try { await renderer.compileAsync(flight.group, camera, scene); } catch (err) { console.warn('The Harvest: phoenix warm-up failed; it compiles on first sight', err); }
    if (disposed) { disposeTree(flight.group); return; }
    flight.group.traverse((o) => { for (const mat of [].concat(o.material || [])) for (const k in mat) if (mat[k]?.isTexture) pUploads.push(mat[k]); });
    flight.group.visible = false;
    phoenix = flight; group.add(flight.group); ctx.requestDraw();
  }).catch((err) => console.warn('The Harvest: the phoenix did not load; the field goes on without it', err));

  scene.add(group);

  const wPos = new THREE.Vector3();
  function update(dt, local) {
    if (!group.visible) { wasShown = false; return; }
    const still = ctx.still;
    if (!still) time.value += dt;
    wheat.count = stalksFor(ctx.quality, wheat.count, full);
    // the sun disc stays far out along the sun line, facing the camera
    sun.position.copy(camera.position).addScaledVector(sunDir, SUN_DIST).sub(group.position);
    sun.quaternion.copy(camera.quaternion);
    glareMat.uniforms.uAspect.value = camera.aspect;
    const lift = Math.max(0, (camera.position.y - anchor.cam.y) / LIFT);
    sunFade.value = 1 - smooth01((lift - 0.08) / 0.22);
    glareMat.uniforms.uStrength.value = (1 + 0.6 * smooth01((local - 0.72) / 0.18)) * sunFade.value;   // the light swells as the page ends
    dustMat.uniforms.uPx.value = renderer.getPixelRatio();
    // light on the Wanderer: rim behind him toward the sun, fill from the camera side
    const w = wanderer.copyPosition(wPos);
    if (Number.isFinite(w.x)) {
      rim.position.set(w.x - 1.0, w.y + 2.2, w.z - 1.4); rim.intensity = 40;
      fill.position.set(w.x + 1.0, w.y + 1.5, w.z + 2.4); fill.intensity = 20;
    } else { rim.intensity = 0; fill.intensity = 0; }
    // the phoenix: its textures upload one a frame; its flight starts over on each arrival; still mode holds one moment
    // (still mode draws only on request, so there it uploads them all at once and asks for the frame that shows it)
    if (pUploads.length) {
      do renderer.initTexture(pUploads.shift()); while (still && pUploads.length);
      ctx.requestDraw();
    }
    if (phoenix && !pUploads.length) {
      phoenix.group.visible = true;
      if (still) {
        if (!stillPosed) { phoenix.restart(); for (let t = 0; t < STILL_AT; t += 1 / 30) phoenix.update(1 / 30); stillPosed = true; }
      } else {
        stillPosed = false;
        if (!wasShown) phoenix.restart();
        phoenix.update(dt);
      }
    }
    wasShown = true;
  }

  function disposeTree(o) {
    // skinned meshes (the phoenix) free their bone texture too
    o.traverse((c) => { c.skeleton?.dispose?.(); c.geometry?.dispose?.(); for (const mat of [].concat(c.material || [])) { for (const k in mat) mat[k]?.isTexture && mat[k].dispose(); mat.dispose(); } });
  }
  return {
    group, update,
    groundAt: () => 0,
    // he walks in the lane through the wheat
    pathAt: (z) => group.position.x + laneX(z - group.position.z),
    dispose() {
      disposed = true; scene.remove(group);
      for (const d of disposables) d.dispose();
      wheat.dispose();
      if (phoenix) disposeTree(phoenix.group);
    },
  };
}
const STILL_AT = 10;     // seconds into the flight for the still picture: past the Wanderer, wings spread, high in the light
// how many stalks to draw at a render-loop quality scale: all of them at full quality, LOW below LOW_BELOW, and between the
// two lines the current count holds (so a scale at the line does not flicker the field)
export function stalksFor(quality, shown, full) {
  if (quality < LOW_BELOW) return Math.min(full, LOW);
  if (quality >= LOW_BELOW + 0.05) return full;
  return shown;
}
const smooth01 = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
