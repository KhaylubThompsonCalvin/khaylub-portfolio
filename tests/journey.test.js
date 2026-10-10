import { describe, it, expect } from 'vitest';
import { STAGES, MOODS, stageAt, progressFromScroll, blendMood } from '../src/climb/journey.js';
describe('journey', () => {
  it('has six stages with the agreed slugs, in order', () => {
    expect(STAGES.map((s) => s.slug)).toEqual(['the-ordinary-world', 'the-call', 'the-threshold', 'the-trials', 'the-ordeal', 'the-harvest']);
    expect(MOODS).toHaveLength(6);
  });
  it('maps progress to a stage and a position within it', () => {
    expect(stageAt(0)).toEqual({ index: 0, t: 0 });
    expect(stageAt(0.5)).toEqual({ index: 3, t: 0 });
    expect(stageAt(1)).toEqual({ index: 5, t: 1 });
    expect(stageAt(-2)).toEqual({ index: 0, t: 0 });
    expect(stageAt(9)).toEqual({ index: 5, t: 1 });
  });
  it('turns scroll into progress against the stage sections', () => {
    const tops = [1000, 2000, 3000, 4000, 5000, 6000], vh = 1000;
    expect(progressFromScroll(0, tops, vh)).toBe(0);
    expect(progressFromScroll(1000, tops, vh)).toBeCloseTo(1 / 12);
    expect(progressFromScroll(99999, tops, vh)).toBe(1);
  });
  it('blends moods: numbers and colours halfway', () => {
    const m = blendMood({ ...MOODS[0], sunI: 0, zenith: '#000000' }, { ...MOODS[1], sunI: 2, zenith: '#ffffff' }, 0.5);
    expect(m.sunI).toBe(1);
    expect(m.zenith).toBe('#808080');
    expect(Math.hypot(...m.sun)).toBeCloseTo(1);
  });
});
