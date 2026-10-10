// A sea of clouds seen from a summit: a stack of horizontal slices that all sample one 3D noise field.
// Each slice draws the cloud density at its own height, so together they read as volume without raymarching.
import * as THREE from 'three';

const vert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const frag = /* glsl */ `
  uniform float uTime;
  uniform float uSlice;      // 0 at the cloud floor, 1 at the tops
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uShadeColor;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uCoverage;
  varying vec3 vWorld;

  // value noise + fbm (cheap and smooth enough for soft cloud tops)
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
    return s;
  }
  float density(vec3 p) {
    vec3 q = p * 0.018 + vec3(uTime * 0.006, 0.0, uTime * 0.004);
    float base = fbm(q);
    float detail = fbm(q * 3.1 + vec3(0.0, uTime * 0.01, 0.0));
    float d = base * 0.78 + detail * 0.22;
    // billows: the top of the sea is lumpy, the floor is solid
    float h = uSlice;
    return smoothstep(uCoverage + h * 0.32, uCoverage + h * 0.32 + 0.2, d);
  }
  // the lighting probe only needs the broad shape: the base field's first three octaves, no detail layer
  // (about a quarter of density()'s cost; the lit edges look the same)
  float densitySoft(vec3 p) {
    vec3 q = p * 0.018 + vec3(uTime * 0.006, 0.0, uTime * 0.004);
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 3; i++) { s += a * noise(q); q = q * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
    float h = uSlice;
    return smoothstep(uCoverage + h * 0.32, uCoverage + h * 0.32 + 0.2, s * 0.78 + 0.143);   // + the mean of the dropped octaves and detail
  }

  void main() {
    float d = uSlice == 0.0 ? 1.0 : density(vWorld);
    if (d < 0.01) discard;
    // light: compare the density a little toward the sun; less density there means a lit edge
    float toward = densitySoft(vWorld + uSunDir * 6.0);
    float lit = clamp(1.0 - toward * 0.85, 0.0, 1.0);
    lit = mix(lit, 1.0, uSlice * 0.55);                     // tops catch more light
    vec3 col = mix(uShadeColor, uSunColor, lit);
    // silver lining where the cloud is thin and faces the sun
    float rim = pow(1.0 - d, 3.0) * max(dot(normalize(vec3(uSunDir.x, 0.0, uSunDir.z)), vec3(0.0, 0.0, -1.0)) * 0.5 + 0.5, 0.0);
    col += uSunColor * rim * 0.35;
    float dist = length(vWorld - cameraPosition);
    float fog = smoothstep(uFogNear, uFogFar, dist);
    col = mix(col, uFogColor, fog);
    float alpha = d * mix(0.36, 0.14, uSlice) * (1.0 - fog * 0.5);
    if (uSlice == 0.0) alpha = 1.0;   // the floor slice is solid: no sky colour shows through the sea
    float dn = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    alpha *= 0.75 + 0.5 * dn;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

export function createCloudSea({ sunDir, palette, slices = 36, size = 2400, floor = -20, depth = 26, coverage = 0.36 }) {
  const group = new THREE.Group();
  group.name = 'CloudSea';
  const geo = new THREE.PlaneGeometry(size, size, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const shared = {
    uTime: { value: 0 },
    uSunDir: { value: sunDir.clone().normalize() },
    uSunColor: { value: new THREE.Color(palette.cloudLit) },
    uShadeColor: { value: new THREE.Color(palette.cloudShade) },
    uFogColor: { value: new THREE.Color(palette.horizon) },
    uFogNear: { value: 300 },
    uFogFar: { value: 1100 },
    uCoverage: { value: coverage },
  };
  for (let i = 0; i < slices; i++) {
    const t = i / (slices - 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { ...shared, uSlice: { value: t } },
      transparent: true,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = floor + t * depth;
    m.renderOrder = i;
    group.add(m);
  }
  group.userData.uniforms = shared;
  return group;
}
