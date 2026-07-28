import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GameComparison } from '@/live-stats.types';
import { GeneralStatsPipSummary } from './general-stats-pip-summary';

const untimedGame = {
  id: 'untimed',
  name: 'Untimed Game',
  defeatedBossCount: 1,
  averageDeathsPerBoss: 5,
  averageAttemptsPerBoss: 6,
  averageAttemptSeconds: null,
  averageWinningAttemptSeconds: null,
  difficultyScore: null,
  bossHighlights: {
    mostAttempts: {
      name: 'Mystery Boss',
      attempts: 6,
      averageAttemptSeconds: null,
      winningAttemptSeconds: null,
    },
    longestWinningAttempt: null,
    toughestOverall: null,
  },
} satisfies GameComparison;

describe('GeneralStatsPipSummary', () => {
  it('labels unavailable average and winning-attempt timing honestly', () => {
    render(
      <GeneralStatsPipSummary
        hardestByDeaths={untimedGame}
        longestWinningAttempt={untimedGame}
        toughestOverall={untimedGame}
      />,
    );

    expect(screen.getAllByText(/6 attempts/)).toHaveLength(3);
    expect(screen.getAllByText(/avg untracked/)).toHaveLength(3);
    expect(screen.getAllByText(/win untracked/)).toHaveLength(3);
  });
});
