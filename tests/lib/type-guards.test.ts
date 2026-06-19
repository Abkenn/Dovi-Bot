import { describe, expect, it } from 'vitest';
import { getNumberProperty, isUnknownRecord } from '../../src/lib/type-guards';

describe('type guards', () => {
  it('identifies unknown records', () => {
    expect(isUnknownRecord({ code: 10008 })).toBe(true);
    expect(isUnknownRecord(null)).toBe(false);
    expect(isUnknownRecord('nope')).toBe(false);
  });

  it('reads numeric properties only from records', () => {
    expect(getNumberProperty({ code: 10008 }, 'code')).toBe(10008);
    expect(getNumberProperty({ code: '10008' }, 'code')).toBe(null);
    expect(getNumberProperty(null, 'code')).toBe(null);
  });
});
