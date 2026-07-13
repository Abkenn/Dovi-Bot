import { describe, expect, it } from 'vitest';
import { resolveActivityTargetGame } from './activity-target';

const games = [
  { id: 'undertale', name: 'UNDERTALE' },
  { id: 'ds3', name: 'Dark Souls III' },
];

describe('resolveActivityTargetGame', () => {
  it('matches a deep-linked game without case sensitivity', () => {
    expect(resolveActivityTargetGame(games, 'undertale')).toEqual(games[0]);
  });

  it('falls back to live stats for missing or unknown targets', () => {
    expect(resolveActivityTargetGame(games, null)).toBeNull();
    expect(resolveActivityTargetGame(games, 'Unknown Game')).toBeNull();
  });
});
