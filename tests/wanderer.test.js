import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { groundPoint, HEIGHT } from '../src/climb/wanderer.js';
const cam = (y, pitchDeg) => { const c = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 1000); c.position.set(0, y, 0); c.lookAt(0, y - Math.tan(pitchDeg * Math.PI / 180) * 10, -10); c.updateMatrixWorld(); return c; };
describe('groundPoint', () => {
  it('lands on the ground, ahead of the camera along its heading', () => {
    const p = groundPoint(cam(3, 5), 0, -0.3, 6, 60, new THREE.Vector3());
    expect(p.y).toBe(0); expect(p.z).toBeLessThan(0);
  });
  it('a lower target is nearer', () => {
    const near = groundPoint(cam(3, 5), 0, -0.5, 6, 60, new THREE.Vector3()), far = groundPoint(cam(3, 5), 0, -0.1, 6, 60, new THREE.Vector3());
    expect(near.z).toBeGreaterThan(far.z);
  });
  it('clamps the distance, and a camera looking above the horizon still gets a point in front', () => {
    expect(groundPoint(cam(3, -10), 0, 0.2, 6, 60, new THREE.Vector3()).z).toBeCloseTo(-60, 3);
    expect(groundPoint(cam(0.5, 5), 0, -0.9, 6, 60, new THREE.Vector3()).z).toBeLessThanOrEqual(-6 + 1e-6);
  });
  it('he is 1.8 m', () => { expect(HEIGHT).toBe(1.8); });
});
