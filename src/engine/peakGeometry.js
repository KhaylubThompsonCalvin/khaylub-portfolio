// Peak geometry: ridged noise on a radial falloff, rock below, snow on the high, flat faces. Pure three.js math with
// no DOM, so the same code runs on the main thread or in peaks.worker.js.
import * as THREE from 'three';

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function ridged(x, y, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(noise(x * f, y * f) * 2 - 1);
    s += n * n * a; f *= 2.1; a *= 0.5;
  }
  return s;
}

export function peakGeometry({ radius = 220, height = 160, seed = 1, palette, segments = 140 }) {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    // a warped footprint, so peaks read as ridges and shoulders rather than cones
    const ang = Math.atan2(z, x);
    const r = Math.hypot(x, z) / radius * (0.8 + 0.45 * noise(Math.cos(ang) * 2 + seed, Math.sin(ang) * 2 + seed * 3));
    // outside the footprint the ground drops well below the cloud floor, so no flat sheet shows through gaps
    // (and skips the ridged noise, the costly part, which that ground never uses)
    if (r >= 1) { pos.setY(i, -160); continue; }
    const shape = Math.pow(1 - r, 1.25);
    const n = ridged(x / 90 + seed * 13.1, z / 90 + seed * 7.7);
    pos.setY(i, height * shape * (0.55 + 0.75 * n) - 30 - 130 * Math.pow(r, 6));
  }
  geo.computeVertexNormals();
  const rock = new THREE.Color(palette.rock), snow = new THREE.Color(palette.snow);
  const cols = new Float32Array(pos.count * 3);
  const nrm = geo.attributes.normal;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), up = nrm.getY(i);
    const snowAmt = THREE.MathUtils.smoothstep(y, height * 0.22, height * 0.45) * THREE.MathUtils.smoothstep(up, 0.35, 0.65);
    c.copy(rock).lerp(snow, snowAmt);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
