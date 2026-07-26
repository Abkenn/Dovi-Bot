import { describe, expect, it, vi } from 'vitest';
import { cacheLiveStats, readCachedLiveStats } from './live-stats-cache';

const stats = {
  game: null,
  currentBoss: null,
  lastKilledBoss: null,
  currentStreamWindow: null,
  streamEncounters: [],
  bosses: [],
  killedBosses: [],
  games: [],
  generalStats: {
    games: [],
    hardestByDeathsGameId: null,
    longestWinningAttemptGameId: null,
    toughestOverallGameId: null,
  },
};

describe('live stats cache', () => {
  it('stores and restores the last successful payload', () => {
    const values = new Map<string, string>();
    const storage = {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
    };

    cacheLiveStats(stats, storage);

    expect(readCachedLiveStats(storage)?.stats).toEqual(stats);
  });

  it('ignores absent and malformed snapshots', () => {
    expect(
      readCachedLiveStats({ getItem: vi.fn().mockReturnValue(null) }),
    ).toBeNull();
    expect(
      readCachedLiveStats({ getItem: vi.fn().mockReturnValue('{bad') }),
    ).toBeNull();
    expect(
      readCachedLiveStats({
        getItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage blocked');
        }),
      }),
    ).toBeNull();
    expect(() =>
      cacheLiveStats(stats, {
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage full');
        }),
      }),
    ).not.toThrow();
  });
});
