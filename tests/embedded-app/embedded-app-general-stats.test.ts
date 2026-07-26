import { describe, expect, it } from 'vitest';
import { summarizeEmbeddedAppGeneralStats } from '../../src/modules/embedded-app/embedded-app-general-stats';

describe('embedded app general stats', () => {
  it('ranks games by deaths, winning time, and a balanced composite', () => {
    const stats = summarizeEmbeddedAppGeneralStats([
      {
        id: 'death-heavy',
        name: 'Death Heavy',
        bosses: [
          { name: 'Wall', deaths: 19, winningAttemptSeconds: 60 },
          { name: 'Runner', deaths: 9, winningAttemptSeconds: 120 },
        ],
      },
      {
        id: 'balanced',
        name: 'Balanced',
        bosses: [
          { name: 'Balanced Wall', deaths: 14, winningAttemptSeconds: 180 },
          { name: 'Marathon', deaths: 10, winningAttemptSeconds: 240 },
        ],
      },
      {
        id: 'slow',
        name: 'Slow Finish',
        bosses: [{ name: 'Slow Boss', deaths: 4, winningAttemptSeconds: 600 }],
      },
    ]);

    expect(stats.hardestByDeathsGameId).toBe('death-heavy');
    expect(stats.longestWinningAttemptGameId).toBe('slow');
    expect(stats.toughestOverallGameId).toBe('balanced');
    expect(stats.games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'balanced',
          averageDeathsPerBoss: 12,
          averageAttemptsPerBoss: 13,
          averageWinningAttemptSeconds: 210,
        }),
      ]),
    );
    expect(
      stats.games.find((game) => game.id === 'balanced')?.bossHighlights,
    ).toEqual({
      mostAttempts: expect.objectContaining({ name: 'Balanced Wall' }),
      longestWinningAttempt: expect.objectContaining({ name: 'Marathon' }),
      toughestOverall: expect.objectContaining({ name: 'Balanced Wall' }),
    });
  });

  it('keeps games without winning-attempt timing but excludes them from timed rankings', () => {
    const stats = summarizeEmbeddedAppGeneralStats([
      {
        id: 'untimed',
        name: 'Untimed',
        bosses: [
          { name: 'Mystery Boss', deaths: 20, winningAttemptSeconds: null },
        ],
      },
      {
        id: 'timed',
        name: 'Timed',
        bosses: [{ name: 'Timed Boss', deaths: 3, winningAttemptSeconds: 90 }],
      },
    ]);

    expect(stats.hardestByDeathsGameId).toBe('untimed');
    expect(stats.longestWinningAttemptGameId).toBe('timed');
    expect(stats.toughestOverallGameId).toBe('timed');
    expect(stats.games.find((game) => game.id === 'untimed')).toMatchObject({
      averageWinningAttemptSeconds: null,
      difficultyScore: null,
    });
  });
});
