// The star field both sites share: stars that glimmer, each breathing at its own pace, the bright ones now and then flashing.
import * as THREE from 'three';

// stars glimmer (owner 2026-10-09): each one breathes at its own pace, and the bright ones now and then flash
const STAR_VERT = /* glsl */ `
  attribute float aSize; attribute float aPhase; uniform float uOpacity, uTime; varying float vA;
  void main() {
    float slow = 0.72 + 0.28 * sin(uTime * (0.8 + aPhase * 1.7) + aPhase * 40.0);
    float flash = aSize > 2.0 ? pow(max(0.0, sin(uTime * 0.9 + aPhase * 60.0)), 24.0) : 0.0;
    vA = uOpacity * clamp(slow + flash * 0.8, 0.0, 1.6);
    vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * (1.0 + flash * 0.9); gl_Position = projectionMatrix * mv;
  }`;
const STAR_FRAG = /* glsl */ `
  varying float vA; void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(1.0, 0.97, 0.9, vA * smoothstep(0.5, 0.0, d)); }`;

export function createStars(n = 2000, r = 2800) {
  const pos = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = Math.random(), v = Math.random() * 0.9 + 0.08;          // upper sky only
    const th = 2 * Math.PI * u, ph = Math.acos(1 - v);
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    size[i] = Math.random() < 0.07 ? 3.2 : 1.4 + Math.random() * 1.2;
    phase[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const m = new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false,
    uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } }, blending: THREE.AdditiveBlending });
  const s = new THREE.Points(g, m); s.frustumCulled = false; s.renderOrder = -1;
  return s;
}
