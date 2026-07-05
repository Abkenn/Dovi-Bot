import { describe, expect, it } from 'vitest';
import { BossTrackingEndResult } from '../../src/generated/prisma/enums';
import {
  getGameBossStatsRows,
  getTrackedBossDeathCount,
  hasTrackedBossKill,
  summarizeCombinedBossStats,
  summarizeTrackedGameStatus,
} from '../../src/modules/bosses/bosses.stats';
import {
  normalizeBossName,
  resolveGameStatsGameName,
} from '../../src/modules/bosses/bosses.utils';

describe('bosses stats', () => {
  it('uses an explicit game or falls back to the current stream game', () => {
    expect(resolveGameStatsGameName(' Elden Ring ', 'Dark Souls III')).toBe(
      'Elden Ring',
    );
    expect(resolveGameStatsGameName(null, ' Dark Souls III ')).toBe(
      'Dark Souls III',
    );
    expect(() => resolveGameStatsGameName(null, null)).toThrow(
      'Set the stream game first, or pass game in this command.',
    );
  });

  it('normalizes boss names for lookups', () => {
    expect(normalizeBossName('  Abyss   Watchers ')).toBe('abyss watchers');
  });

  it('counts tracked boss deaths and kills', () => {
    const sessions = [
      { deathCount: 2, endResult: BossTrackingEndResult.ABANDONED },
      { deathCount: 3, endResult: BossTrackingEndResult.KILLED },
    ];

    expect(getTrackedBossDeathCount(sessions)).toBe(5);
    expect(hasTrackedBossKill(sessions)).toBe(true);
    expect(
      hasTrackedBossKill([
        { endResult: BossTrackingEndResult.ABANDONED },
        { endResult: null },
      ]),
    ).toBe(false);
  });

  it('returns null combined stats when imported and tracked stats are empty', () => {
    expect(
      summarizeCombinedBossStats({
        stats: [],
        trackingSessions: [],
      }),
    ).toBeNull();
  });

  it('keeps zero imported deaths visible when an imported record exists', () => {
    expect(
      summarizeCombinedBossStats({
        stats: [
          {
            deaths: 0,
            totalAttemptTimeSeconds: null,
            winningAttemptTimeSeconds: null,
            difficultyCoefficient: null,
          },
        ],
        trackingSessions: [],
      }),
    ).toMatchObject({
      deaths: 0,
      totalAttemptSeconds: null,
      averageAttemptSeconds: null,
      winningAttemptSeconds: null,
    });
  });

  it('merges imported and tracked game boss rows, sorts by deaths, and defaults to top 10', () => {
    const rows = getGameBossStatsRows({
      game: { name: 'Test Game' },
      stats: [
        { deaths: 3, boss: { id: 'alpha', name: 'Alpha Boss' } },
        { deaths: null, boss: { id: 'ignored', name: 'Ignored Boss' } },
        { deaths: 1, boss: { id: 'shared', name: 'Shared Boss' } },
      ],
      trackedBosses: [
        {
          id: 'shared',
          name: 'Shared Boss',
          trackingSessions: [{ deathCount: 4, endResult: null }],
        },
        {
          id: 'tracked',
          name: 'Tracked Boss',
          trackingSessions: [{ deathCount: 3, endResult: null }],
        },
      ],
    });

    expect(rows).toEqual([
      { name: 'Shared Boss', deaths: 5, hasDeaths: true },
      { name: 'Alpha Boss', deaths: 3, hasDeaths: true },
      { name: 'Tracked Boss', deaths: 3, hasDeaths: true },
    ]);
  });

  it('can return all game boss rows without the default limit', () => {
    const rows = getGameBossStatsRows(
      {
        game: { name: 'Test Game' },
        stats: Array.from({ length: 11 }, (_, index) => ({
          deaths: 11 - index,
          boss: { id: `boss-${index}`, name: `Boss ${index}` },
        })),
        trackedBosses: [],
      },
      { limit: null },
    );

    expect(rows).toHaveLength(11);
    expect(rows[0]).toMatchObject({ name: 'Boss 0', deaths: 11 });
    expect(rows[10]).toMatchObject({ name: 'Boss 10', deaths: 1 });
  });

  it('uses latest final game deaths and separates killed from pending tracked bosses', () => {
    expect(
      summarizeTrackedGameStatus({
        name: 'Test Game',
        trackingSessions: [
          { startDeaths: 10, deathCount: 2, finalDeaths: 13 },
          { startDeaths: 1, deathCount: 1, finalDeaths: 2 },
        ],
        bosses: [
          {
            id: 'killed',
            name: 'Killed Boss',
            trackingSessions: [
              { deathCount: 2, endResult: BossTrackingEndResult.KILLED },
            ],
          },
          {
            id: 'pending',
            name: 'Pending Boss',
            trackingSessions: [{ deathCount: 1, endResult: null }],
          },
          {
            id: 'untracked',
            name: 'Untracked Boss',
            trackingSessions: [],
          },
        ],
      }),
    ).toEqual({
      gameName: 'Test Game',
      deaths: 13,
      killedBossCount: 1,
      pendingBossCount: 1,
    });
  });

  it('falls back to start plus boss deaths when latest final game deaths are missing', () => {
    expect(
      summarizeTrackedGameStatus({
        name: 'Test Game',
        trackingSessions: [
          { startDeaths: 10, deathCount: 2, finalDeaths: null },
        ],
        bosses: [],
      }),
    ).toMatchObject({
      deaths: 12,
      killedBossCount: 0,
      pendingBossCount: 0,
    });
  });

  it('returns zero game deaths when no tracking sessions exist', () => {
    expect(
      summarizeTrackedGameStatus({
        name: 'Test Game',
        trackingSessions: [],
        bosses: [],
      }),
    ).toMatchObject({
      deaths: 0,
    });
  });
});
