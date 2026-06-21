import { describe, expect, it } from 'vitest';
import {
  cleanPingMeKeyword,
  doesPingMeKeywordMatch,
  getPingMeListeningSourceGuildIds,
  normalizePingMeKeywordKey,
  normalizePingMeText,
} from '../../src/modules/ping-me/ping-me.matcher';

const boundary = {
  stagingGuildId: 'staging',
  prodGuildId: 'prod',
};

describe('ping-me keyword matching', () => {
  it.each([
    ['Someone said Lorem Ipsum today', 'lorem ipsum'],
    ['LOREMIPSUM is excellent', 'Lorem Ipsum'],
    ['I need lorem-ipsum', 'lorem ipsum'],
    ['That loremipsm take was brave', 'lorem ipsum'],
    ['I tried lorems ipsum yesterday', 'lorem ipsum'],
    ['hey d\u00f3lor', 'Dolor'],
  ])('matches useful phrase variants: %s', (content, keyword) => {
    expect(doesPingMeKeywordMatch(content, keyword)).toBe(true);
  });

  it.each([
    ['lorem is enough', 'lorem ipsum'],
    ['lorems are enough', 'lorem ipsum'],
    ['dolorous', 'dolor'],
    ['adipiscing', 'sit'],
    ['completely unrelated text', 'lorem ipsum'],
  ])('rejects broad or unrelated matches: %s', (content, keyword) => {
    expect(doesPingMeKeywordMatch(content, keyword)).toBe(false);
  });

  it('normalizes casing, accents, spacing, and punctuation without regex', () => {
    expect(cleanPingMeKeyword('  lorem   ipsum  ')).toBe('lorem ipsum');
    expect(normalizePingMeText('  L\u00f3rem--IPSUM! ')).toEqual([
      'lorem',
      'ipsum',
    ]);
    expect(normalizePingMeKeywordKey('  L\u00f3rem--IPSUM! ')).toBe(
      'loremipsum',
    );
  });
  it('uses two edits only for long phrases', () => {
    expect(
      doesPingMeKeywordMatch('lorem ipsxm dolor', 'lorem ipsum dolors'),
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
});
