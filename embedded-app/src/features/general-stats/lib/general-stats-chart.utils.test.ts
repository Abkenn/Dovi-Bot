import { describe, expect, it } from 'vitest';
import {
  describeGeneralStatsTrend,
  findGeneralStatsGame,
  formatStatsDuration,
  getChartDomain,
  getGeneralStatsTrend,
  isGameComparison,
} from './general-stats-chart.utils';

const game = {
  id: 'game-1',
  name: 'Game',
  defeatedBossCount: 1,
  averageDeathsPerBoss: 2,
  averageAttemptsPerBoss: 3,
  averageWinningAttemptSeconds: 60,
  difficultyScore: 1,
  bossHighlights: {
    mostAttempts: {
      name: 'Boss',
      attempts: 3,
      winningAttemptSeconds: 60,
    },
    longestWinningAttempt: null,
    toughestOverall: null,
  },
};

describe('general stats chart utilities', () => {
  it('formats and finds chart data', () => {
    expect(formatStatsDuration(125)).toBe('2m 5s');
    expect(findGeneralStatsGame([game], game.id)).toBe(game);
    expect(findGeneralStatsGame([game], null)).toBeNull();
  });

  it('guards tooltip payloads', () => {
    expect(isGameComparison(game)).toBe(true);
    expect(isGameComparison(null)).toBe(false);
    expect(isGameComparison('game')).toBe(false);
    expect(isGameComparison({ id: 1, bossHighlights: {} })).toBe(false);
    expect(isGameComparison({ id: 'game' })).toBe(false);
  });

  it('handles absent, flat, and ordinary trends', () => {
    expect(getGeneralStatsTrend([game])).toBeNull();
    expect(
      getGeneralStatsTrend([
        game,
        {
          ...game,
          id: 'same-x',
          averageWinningAttemptSeconds: null,
        },
      ]),
    ).toEqual({ slope: 0, intercept: 30 });
    expect(
      getGeneralStatsTrend([
        game,
        {
          ...game,
          id: 'game-2',
          averageAttemptsPerBoss: 5,
          averageWinningAttemptSeconds: 120,
        },
      ]),
    ).toEqual({ slope: 30, intercept: -30 });
  });

  it('pads chart domains around the observed data and describes trends', () => {
    expect(getChartDomain([4, 5, 13], { minimumSpan: 2 })).toEqual([
      2.92, 14.08,
    ]);
    expect(getChartDomain([5], { minimumSpan: 10 })).toEqual([3.8, 6.2]);
    expect(describeGeneralStatsTrend(-2)).toContain('shorter');
    expect(describeGeneralStatsTrend(2)).toContain('longer');
    expect(describeGeneralStatsTrend(0.5)).toContain('level');
  });
});
