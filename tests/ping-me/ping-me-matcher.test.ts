import { describe, expect, it } from 'vitest';
import {
  cleanPingMeKeyword,
  doesPingMeKeywordMatch,
  getPingMeListeningSourceGuildIds,
  normalizePingMeKeywordKey,
  normalizePingMeText,
  shouldForwardPingMeMessage,
} from '../../src/modules/ping-me/ping-me.matcher';

const boundary = {
  stagingGuildId: 'staging',
  prodGuildId: 'prod',
};

describe('ping-me keyword matching', () => {
  it.each([
    ['Someone said Olive Oil today', 'olive oil'],
    ['OLIVEOIL is excellent', 'Olive Oil'],
    ['I need olive-oil', 'olive oil'],
    ['That oliveol take was brave', 'olive oil'],
    ['I tried olives oil yesterday', 'olive oil'],
    ['hey abk\u00e9n', 'Abken'],
  ])('matches useful phrase variants: %s', (content, keyword) => {
    expect(doesPingMeKeywordMatch(content, keyword)).toBe(true);
  });

  it.each([
    ['olive is enough', 'olive oil'],
    ['olives are enough', 'olive oil'],
    ['cupcake', 'cake'],
    ['catastrophe', 'cat'],
    ['completely unrelated text', 'olive oil'],
  ])('rejects broad or unrelated matches: %s', (content, keyword) => {
    expect(doesPingMeKeywordMatch(content, keyword)).toBe(false);
  });

  it('normalizes casing, accents, spacing, and punctuation without regex', () => {
    expect(cleanPingMeKeyword('  olive   oil  ')).toBe('olive oil');
    expect(normalizePingMeText('  \u00d3live--OIL! ')).toEqual([
      'olive',
      'oil',
    ]);
    expect(normalizePingMeKeywordKey('  \u00d3live--OIL! ')).toBe('oliveoil');
  });
  it('uses two edits only for long phrases', () => {
    expect(
      doesPingMeKeywordMatch(
        'community notificatons',
        'community notification',
      ),
    ).toBe(true);
    expect(doesPingMeKeywordMatch('', '')).toBe(false);
  });
});

describe('ping-me guild security boundary', () => {
  it('allows only staging-created profiles to observe staging messages', () => {
    expect(getPingMeListeningSourceGuildIds('staging', boundary)).toEqual([
      'staging',
    ]);
  });

  it('allows staging-created and prod-created profiles to observe prod', () => {
    expect(getPingMeListeningSourceGuildIds('prod', boundary)).toEqual([
      'staging',
      'prod',
    ]);
  });

  it('ignores every unrelated guild', () => {
    expect(getPingMeListeningSourceGuildIds('other', boundary)).toEqual([]);
  });

  it('permits forwarding only for prod messages', () => {
    expect(shouldForwardPingMeMessage('prod', boundary)).toBe(true);
    expect(shouldForwardPingMeMessage('staging', boundary)).toBe(false);
    expect(shouldForwardPingMeMessage('other', boundary)).toBe(false);
  });
});
