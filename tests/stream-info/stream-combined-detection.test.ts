import { describe, expect, it } from 'vitest';
import { doesVideoTitleIndicateCombinedStream } from '../../src/modules/stream-info/stream-combined-detection';

describe('automatic combined stream detection', () => {
  it.each([
    ['Listening to your music + AC7 Later', 'Ace Combat 7'],
    ['Listening to your music + AC7 Later', 'Ace Combat 7: Skies Unknown'],
    [
      'Listening to your music picks + ACE COMBAT Later',
      'Ace Combat 7: Skies Unknown',
    ],
    ['Listening to your music + AC8 Later', 'Ace Combat 7: Skies Unknown'],
    [
      'Listening to your music + Ace Combat VIII Later',
      'Ace Combat 7: Skies Unknown',
    ],
    ['Patreon songs + Dark Souls later', 'Dark Souls III'],
    ['Music democracy + ELDEN RING later tonight', 'Elden Ring'],
  ])('matches an abbreviated scheduled game in %s', (videoTitle, gameName) => {
    expect(doesVideoTitleIndicateCombinedStream(videoTitle, gameName)).toBe(
      true,
    );
  });

  it.each([
    ['Listening to your music + AC7', 'Ace Combat 7'],
    ['Listening to your music AC7 Later', 'Ace Combat 7'],
    ['Listening to your music + requests Later', 'Ace Combat 7'],
    ['Listening to your music + a new game Later', 'Ace Combat 7'],
  ])('rejects an incomplete or mismatched signal in %s', (videoTitle, gameName) => {
    expect(doesVideoTitleIndicateCombinedStream(videoTitle, gameName)).toBe(
      false,
    );
  });
});
