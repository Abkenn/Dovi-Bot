import { describe, expect, it } from 'vitest';
import { compressBossStat, expandBossStat } from './boss-stats-scale';

describe('boss stat outlier scaling', () => {
  it('preserves ordinary values and gently compresses outliers', () => {
    expect(compressBossStat(76, 100)).toBe(76);
    expect(compressBossStat(15 * 60, 16 * 60)).toBe(15 * 60);
    expect(compressBossStat(16 * 60, 16 * 60)).toBe(16 * 60);
    const sekiro = compressBossStat(27 * 60 + 8, 16 * 60);
    expect(sekiro).toBeGreaterThan(20 * 60);
    expect(sekiro).toBeLessThan(24 * 60);
    expect(compressBossStat(200, 100)).toBeGreaterThan(100);
    expect(compressBossStat(200, 100)).toBeLessThan(200);
  });

  it('keeps tick labels accurate and preserves ordering', () => {
    for (const threshold of [100, 960]) {
      for (const value of [0, threshold, threshold + 1, threshold * 3]) {
        expect(
          expandBossStat(compressBossStat(value, threshold), threshold),
        ).toBeCloseTo(value);
      }
      expect(compressBossStat(threshold * 2, threshold)).toBeLessThan(
        compressBossStat(threshold * 3, threshold),
      );
    }
  });
});
