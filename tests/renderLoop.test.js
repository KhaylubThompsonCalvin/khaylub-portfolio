import { describe, it, expect } from 'vitest';
import { nextQuality, createFpsMeter, GAP_RESET } from '../src/engine/renderLoop.js';
const s0 = { scale: 1, lastDrop: -1e9, calmFor: 0 };
describe('nextQuality', () => {
  it('steps down 20% under 40 fps', () => { expect(nextQuality({ ...s0, fps: 30, now: 1000 }).scale).toBeCloseTo(0.8); });
  it('steps down 40% under 20 fps', () => { expect(nextQuality({ ...s0, fps: 10, now: 1000 }).scale).toBeCloseTo(0.6); });
  it('never goes under 0.35', () => { expect(nextQuality({ ...s0, scale: 0.36, fps: 10, now: 1000 }).scale).toBe(0.35); });
  it('enters still mode under 12 fps at the floor', () => { expect(nextQuality({ ...s0, scale: 0.35, fps: 5, now: 1000 }).still).toBe(true); });
  it('climbs back only after 3 calm seconds and 8 s since a drop', () => {
    let q = { scale: 0.8, lastDrop: 0, calmFor: 0 };
    q = nextQuality({ ...q, fps: 60, now: 5000 }); expect(q.scale).toBe(0.8);
    q = nextQuality({ ...q, fps: 60, now: 9000 }); q = nextQuality({ ...q, fps: 60, now: 10000 }); q = nextQuality({ ...q, fps: 60, now: 11000 });
    expect(q.scale).toBeCloseTo(0.8 / 0.85);
  });
  it('holds steady between 40 and 55 fps', () => { const q = nextQuality({ ...s0, scale: 0.8, fps: 50, now: 20000 }); expect(q.scale).toBe(0.8); expect(q.calmFor).toBe(0); });
});

describe('fps meter', () => {
  it('a machine held at 3 fps is still judged, and steps down', () => {
    expect(GAP_RESET).toBeGreaterThanOrEqual(1000);
    const m = createFpsMeter(); const seen = [];
    for (let now = 1000; now < 6000; now += 333) { const f = m.tick(now, true, false); if (f !== null) seen.push(f); }
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toBeCloseTo(3, 0);
    expect(nextQuality({ ...s0, fps: seen[0], now: 6000 }).scale).toBeLessThan(1);
  });
  it('never judges a long gap, still mode, or frames while not ready', () => {
    const gap = createFpsMeter(); const seen = [];
    for (let now = 0; now < 20000; now += 1500) { const f = gap.tick(now, true, false); if (f !== null) seen.push(f); }
    const still = createFpsMeter(), nr = createFpsMeter();
    for (let now = 0; now < 5000; now += 16) { if (still.tick(now, true, true) !== null) seen.push('still'); if (nr.tick(now, false, false) !== null) seen.push('nr'); }
    expect(seen).toEqual([]);
  });
  it('judges a normal 60 fps window once a second', () => {
    const m = createFpsMeter(); const seen = [];
    for (let now = 0; now < 2100; now += 1000 / 60) { const f = m.tick(now, true, false); if (f !== null) seen.push(f); }
    expect(seen.length).toBe(2); expect(seen[0]).toBeCloseTo(60, 0);
  });
});
