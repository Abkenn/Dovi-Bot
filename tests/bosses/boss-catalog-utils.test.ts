import { describe, expect, it } from 'vitest';
import { normalizeBossIdentity } from '../../src/data/boss-catalog.utils';

describe('boss catalog identity', () => {
  it('ignores punctuation, casing, and repeated spacing', () => {
    expect(normalizeBossIdentity('  sans. ')).toBe('sans');
    expect(normalizeBossIdentity('SANS')).toBe('sans');
    expect(normalizeBossIdentity('Boss  -  Name!')).toBe('boss name');
  });

  it('keeps different words distinct', () => {
    expect(normalizeBossIdentity('Sans Prime')).not.toBe(
      normalizeBossIdentity('Sans'),
    );
  });
});
