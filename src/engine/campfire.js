// The campfire burns: soft flame tongues that flicker and lick upward, sparks that rise and fade, and a firelight that
// breathes. The model's own flame is baked into its texture, so these sit over it and cover it. Everything here is
// cheap (four quads, 48 points, one light), and it all holds still when motion is paused.
import * as THREE from 'three';

// a flame tongue: a teardrop mask eaten away by noise that scrolls upward, coloured from a white core to a red tip
const FLAME_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // billboard: the quad always faces the camera, standing upright (it only turns about the vertical axis)
    vec3 centre = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 toCam = cameraPosition - centre; toCam.y = 0.0; toCam = normalize(toCam);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
    float sx = length(modelMatrix[0].xyz), sy = length(modelMatrix[1].xyz);
    vec3 world = centre + right * position.x * sx + vec3(0.0, 1.0, 0.0) * position.y * sy;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }`;
const FLAME_FRAG = /* glsl */ `
  uniform float uTime, uSeed, uIntensity;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec2 uv = vUv;
    float t = uTime + uSeed * 7.3;
    // sway: the tongue bends more toward its tip
    uv.x += (noise(vec2(t * 1.3, uSeed)) - 0.5) * 0.35 * uv.y;
    // teardrop: widest a quarter of the way up, narrowing to a point
    float w = 0.42 * pow(1.0 - uv.y, 0.85) * smoothstep(0.0, 0.25, uv.y + 0.08);
    float body = smoothstep(w, w * 0.25, abs(uv.x - 0.5));
    // turbulence rising through the flame breaks the top into licks
    float n = noise(vec2(uv.x * 5.0, uv.y * 3.5 - t * 3.2)) * 0.65 + noise(vec2(uv.x * 11.0, uv.y * 7.0 - t * 5.1)) * 0.35;
    float a = body * smoothstep(0.15, 0.75, n + (1.0 - uv.y) * 0.75 - 0.25);
    a *= smoothstep(0.0, 0.08, uv.y);                       // soft at the logs
    if (a < 0.01) discard;
    float heat = clamp(1.0 - uv.y * 1.15 + body * 0.25, 0.0, 1.0);
    vec3 col = mix(vec3(0.85, 0.16, 0.03), vec3(1.0, 0.55, 0.12), smoothstep(0.15, 0.55, heat));
    col = mix(col, vec3(1.0, 0.93, 0.7), smoothstep(0.7, 1.0, heat));
    gl_FragColor = vec4(col * uIntensity, a);
  }`;

// sparks: each one rises from the fire, drifts, cools from yellow to red, and fades; positions are computed in the
// shader from a start time and a seed, so the CPU only advances one clock
const SPARK_VERT = /* glsl */ `
  attribute vec3 aSeed;            // x, z drift and a phase in [0, 1)
  uniform float uTime, uLife, uRise, uSize;
  varying float vAge;
  void main() {
    float age = fract(uTime / uLife + aSeed.z);
    vAge = age;
    vec3 p = position;
    p.y += age * uRise + age * age * uRise * 0.4;
    p.x += aSeed.x * age * 0.5 + sin(age * 9.0 + aSeed.z * 40.0) * 0.06 * age;
    p.z += aSeed.y * age * 0.5 + cos(age * 7.0 + aSeed.z * 30.0) * 0.06 * age;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (1.0 - age * 0.6) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const SPARK_FRAG = /* glsl */ `
  varying float vAge;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    vec3 c = mix(vec3(1.0, 0.85, 0.45), vec3(1.0, 0.3, 0.05), smoothstep(0.0, 0.6, vAge));
    float a = smoothstep(0.5, 0.1, d) * smoothstep(1.0, 0.55, vAge) * smoothstep(0.0, 0.05, vAge);
    gl_FragColor = vec4(c, a);
  }`;

// `size` is the fire's width in metres; the flames are scaled from it so they cover the model's baked flame.
// A lantern uses the same flame small, without sparks (they would pass through the glass) and with a soft glow.
export function createCampfire({ size = 1.1, light, sparks: withSparks = true, glow = false }) {
  const group = new THREE.Group();
  group.name = 'CampfireFlames';
  const quad = new THREE.PlaneGeometry(1, 1);
  quad.translate(0, 0.5, 0);                               // the quad stands on its base
  const flames = [];
  // [x offset, z offset, width, height, seed, intensity] in units of the fire's width
  const TONGUES = [[0, 0, 0.55, 0.95, 0.0, 1.0], [-0.12, 0.05, 0.38, 0.62, 0.37, 0.9], [0.13, -0.04, 0.36, 0.7, 0.71, 0.9], [0.02, 0.08, 0.3, 0.5, 0.53, 0.8]];
  for (const [x, z, w, h, seed, intensity] of TONGUES) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG,
      uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uIntensity: { value: intensity * 1.6 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(quad, mat);
    m.position.set(x * size, 0.06 * size, z * size);
    m.scale.set(w * size, h * size, 1);
    m.frustumCulled = false;
    m.renderOrder = 5;
    group.add(m); flames.push(mat);
  }

  if (glow) {                                         // the lit glass: a soft additive halo around the flame
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g2 = c.getContext('2d'), grad = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,214,150,0.9)'); grad.addColorStop(0.35, 'rgba(255,170,90,0.35)'); grad.addColorStop(1, 'rgba(255,140,60,0)');
    g2.fillStyle = grad; g2.fillRect(0, 0, 64, 64);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(size * 4.5); halo.position.y = size * 0.45; halo.renderOrder = 4;
    group.add(halo); flames.push({ uniforms: { uTime: { value: 0 } }, halo });
  }

  const N = withSparks ? 48 : 0;
  const pos = new Float32Array(N * 3), seeds = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = Math.random() * 0.18 * size, a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * r, 0.15 * size, Math.sin(a) * r], i * 3);
    seeds.set([(Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, Math.random()], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const sparkMat = new THREE.ShaderMaterial({
    vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG,
    uniforms: { uTime: { value: 0 }, uLife: { value: 2.6 }, uRise: { value: 1.6 * size }, uSize: { value: 60 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  if (N) {
    const sparks = new THREE.Points(g, sparkMat);
    sparks.frustumCulled = false;
    sparks.renderOrder = 6;
    group.add(sparks);
  }

  // firelight: two slow waves and a quick flutter, never quite repeating; the colour warms when it flares
  const base = light ? light.intensity : 0;
  const cool = new THREE.Color('#ff9a4d'), warm = new THREE.Color('#ffc27a');
  let t = 0;
  function update(dt) {
    t += dt;
    for (const m of flames) m.uniforms.uTime.value = t;
    const breathe = 0.9 + 0.1 * Math.sin(t * 3.1) + 0.05 * Math.sin(t * 11.3);
    for (const m of flames) if (m.halo) m.halo.material.opacity = breathe;
    sparkMat.uniforms.uTime.value = t;
    if (light) {
      const f = 0.82 + 0.1 * Math.sin(t * 2.1) + 0.07 * Math.sin(t * 5.3 + 1.7) + 0.05 * Math.sin(t * 13.7 + 0.4) + 0.04 * Math.sin(t * 23.1);
      light.intensity = base * f;
      light.color.copy(cool).lerp(warm, THREE.MathUtils.clamp((f - 0.75) * 2.5, 0, 1));
    }
  }
  update(0);
  return { group, update };
}
