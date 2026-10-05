import { describe, expect, it } from 'vitest';
import type { BossComparison, GameComparison } from '@/live-stats.types';
import { getChartBossWinners } from './chart-boss-achievements';

const game = (
  id: string,
  bosses: [BossComparison, BossComparison, BossComparison],
): GameComparison => ({
  id,
  name: id,
  defeatedBossCount: 3,
  averageDeathsPerBoss: 1,
  averageAttemptsPerBoss: 2,
  averageWinningAttemptSeconds: 100,
  difficultyScore: 1,
  bossHighlights: {
    mostAttempts: bosses[0],
    longestWinningAttempt: bosses[1],
    toughestOverall: bosses[2],
  },
});
const boss = (
  name: string,
  attempts: number,
  winningAttemptSeconds: number | null,
) => ({ name, attempts, winningAttemptSeconds });

describe('chart-wide boss achievements', () => {
  it('awards just one winner per category across every unique chart boss', () => {
    const eigong = boss('Eigong', 76, 360);
    const monkeys = boss('Monkeys', 4, 1628);
    const difficult = boss('Difficult boss', 60, 600);
    expect(
      getChartBossWinners([
        game('nine-sols', [eigong, eigong, eigong]),
        game('sekiro', [
          boss('Isshin', 24, 337),
          monkeys,
          boss('Isshin', 24, 337),
        ]),
        game('other', [difficult, difficult, difficult]),
      ]),
    ).toEqual({
      MOST_DEATHS: { gameId: 'nine-sols', bossName: 'Eigong' },
      LONGEST_WINNING_ATTEMPT: { gameId: 'sekiro', bossName: 'Monkeys' },
      TOUGHEST_OVERALL: { gameId: 'other', bossName: 'Difficult boss' },
    });
  });

  it('allows one boss to win all categories, without conflating names across games', () => {
    const champion = boss('Same name', 50, 600);
    expect(
      getChartBossWinners([
        game('winner', [champion, champion, champion]),
        game('loser', [
          boss('Same name', 2, 30),
          boss('Other', 1, 40),
          boss('Same name', 2, 30),
        ]),
      ]),
    ).toEqual({
      MOST_DEATHS: { gameId: 'winner', bossName: 'Same name' },
      LONGEST_WINNING_ATTEMPT: { gameId: 'winner', bossName: 'Same name' },
      TOUGHEST_OVERALL: { gameId: 'winner', bossName: 'Same name' },
    });
  });

  it('does not invent timed awards when timing is missing', () => {
    expect(getChartBossWinners([])).toEqual({
      MOST_DEATHS: null,
      LONGEST_WINNING_ATTEMPT: null,
      TOUGHEST_OVERALL: null,
    });
    const untimed = boss('Untimed', 100, null);
    expect(
      getChartBossWinners([game('untimed', [untimed, untimed, untimed])]),
    ).toEqual({
      MOST_DEATHS: { gameId: 'untimed', bossName: 'Untimed' },
      LONGEST_WINNING_ATTEMPT: null,
      TOUGHEST_OVERALL: null,
    });
  });
});
