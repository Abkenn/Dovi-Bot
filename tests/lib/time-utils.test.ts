import { describe, expect, it } from 'vitest';
import {
  getElapsedSeconds,
  getSignedElapsedSeconds,
} from '../../src/lib/time.utils';

describe('time utils', () => {
  it('calculates whole elapsed seconds with Luxon', () => {
    const start = new Date('2026-06-12T18:00:00.250Z');
    const end = new Date('2026-06-12T18:01:05.900Z');

    expect(getSignedElapsedSeconds(start, end)).toBe(65);
    expect(getElapsedSeconds(start, end)).toBe(65);
  });

  it('preserves signed differences and clamps public elapsed time at zero', () => {
    const start = new Date('2026-06-12T18:01:00.000Z');
    const end = new Date('2026-06-12T18:00:59.500Z');

    expect(getSignedElapsedSeconds(start, end)).toBe(-1);
    expect(getElapsedSeconds(start, end)).toBe(0);
  });
});
