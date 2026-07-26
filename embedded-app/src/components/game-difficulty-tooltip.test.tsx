import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameDifficultyTooltip } from './game-difficulty-tooltip';

describe('GameDifficultyTooltip', () => {
  it('shows three boss categories and allows the same boss to win twice', () => {
    render(
      <GameDifficultyTooltip
        game={{
          id: 'ds3',
          name: 'Dark Souls III',
          defeatedBossCount: 3,
          averageDeathsPerBoss: 10,
          averageAttemptsPerBoss: 11,
          averageWinningAttemptSeconds: 120,
          difficultyScore: 0.8,
          bossHighlights: {
            mostAttempts: {
              name: 'Sister Friede',
              attempts: 20,
              winningAttemptSeconds: 180,
            },
            longestWinningAttempt: {
              name: 'Slave Knight Gael',
              attempts: 10,
              winningAttemptSeconds: 240,
            },
            toughestOverall: {
              name: 'Sister Friede',
              attempts: 20,
              winningAttemptSeconds: 180,
            },
          },
        }}
      />,
    );

    expect(screen.getByText('Most attempts')).toBeInTheDocument();
    expect(screen.getByText('Longest winning attempt')).toBeInTheDocument();
    expect(screen.getByText('Toughest balanced boss')).toBeInTheDocument();
    expect(screen.getAllByText('Sister Friede')).toHaveLength(2);
    expect(screen.getByText('4m 0s')).toBeInTheDocument();
  });

  it('shows honest timing fallbacks for an untimed game', () => {
    render(
      <GameDifficultyTooltip
        game={{
          id: 'untimed',
          name: 'Untimed Game',
          defeatedBossCount: 1,
          averageDeathsPerBoss: 5,
          averageAttemptsPerBoss: 6,
          averageWinningAttemptSeconds: null,
          difficultyScore: null,
          bossHighlights: {
            mostAttempts: {
              name: 'Mystery Boss',
              attempts: 6,
              winningAttemptSeconds: null,
            },
            longestWinningAttempt: null,
            toughestOverall: null,
          },
        }}
      />,
    );

    expect(screen.getAllByText('Timing unavailable')).toHaveLength(2);
    expect(screen.getByText('Mystery Boss')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(2);
  });
});
