import { describe, it, expect } from 'vitest';
import { stalksFor } from '../src/climb/stages/the-harvest.js';
describe('the harvest: stalk count follows the render quality', () => {
  it('draws the full field at full quality and about 10,000 stalks once quality steps below 0.7', () => {
    expect(stalksFor(1, 32000, 32000)).toBe(32000);
    expect(stalksFor(0.8, 32000, 32000)).toBe(32000);   // one step down (1 to 0.8) keeps the field
    expect(stalksFor(0.64, 32000, 32000)).toBe(10000);  // the next step (0.8 to 0.64) thins it
    expect(stalksFor(0.35, 32000, 32000)).toBe(10000);
  });
  it('holds between 0.7 and 0.75 (no flicker at the line) and restores the field once quality recovers', () => {
    expect(stalksFor(0.72, 10000, 32000)).toBe(10000);
    expect(stalksFor(0.72, 32000, 32000)).toBe(32000);
    expect(stalksFor(0.753, 10000, 32000)).toBe(32000);  // 0.64 / 0.85, the render loop's first step back up
  });
});
