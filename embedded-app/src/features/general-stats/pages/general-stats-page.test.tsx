import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/game-stats/components/game-switcher', () => ({
  GameSwitcher: () => <div>Game switcher</div>,
}));

import { GeneralStatsPage } from './general-stats-page';

const makeComparison = (
  id: string,
  name: string,
  attempts: number,
  winningSeconds: number,
) => ({
  id,
  name,
  defeatedBossCount: 3,
  averageDeathsPerBoss: attempts - 1,
  averageAttemptsPerBoss: attempts,
  averageWinningAttemptSeconds: winningSeconds,
  difficultyScore: attempts * winningSeconds,
  bossHighlights: {
    mostAttempts: {
      name: `${name} boss`,
      attempts,
      winningAttemptSeconds: winningSeconds,
    },
    longestWinningAttempt: null,
    toughestOverall: null,
  },
});

describe('GeneralStatsPage', () => {
  it('shows every game in a stable ranked row without grouped labels', () => {
    const tiedGames = [
      {
        ...makeComparison('bloodborne', 'Bloodborne', 4, 240),
        difficultyScore: null,
      },
      {
        ...makeComparison('lies-of-p', 'Lies of P', 4.4, 220),
        difficultyScore: null,
      },
    ];

    render(
      <GeneralStatsPage
        games={[]}
        generalStats={{
          hardestByDeathsGameId: 'bloodborne',
          longestWinningAttemptGameId: 'bloodborne',
          toughestOverallGameId: 'bloodborne',
          games: tiedGames,
        }}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Explore 2 nearby games' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    const liesOfP = screen.getByRole('button', {
      name: 'View details for Lies of P',
    });
    fireEvent.click(liesOfP);
    expect(screen.getByText('Lies of P boss')).toBeInTheDocument();
  });

  it('shows comparison highlights and a ranked game comparison', () => {
    render(
      <GeneralStatsPage
        games={[]}
        generalStats={{
          hardestByDeathsGameId: 'ds3',
          longestWinningAttemptGameId: 'elden-ring',
          toughestOverallGameId: 'ds3',
          games: [
            {
              id: 'ds3',
              name: 'Dark Souls III',
              defeatedBossCount: 20,
              averageDeathsPerBoss: 8.4,
              averageAttemptsPerBoss: 9.4,
              averageWinningAttemptSeconds: 112,
              difficultyScore: 0.82,
              bossHighlights: {
                mostAttempts: {
                  name: 'Darkeater Midir',
                  attempts: 17,
                  winningAttemptSeconds: 95,
                },
                longestWinningAttempt: {
                  name: 'Slave Knight Gael',
                  attempts: 9,
                  winningAttemptSeconds: 180,
                },
                toughestOverall: {
                  name: 'Sister Friede',
                  attempts: 14,
                  winningAttemptSeconds: 160,
                },
              },
            },
            {
              id: 'elden-ring',
              name: 'Elden Ring',
              defeatedBossCount: 30,
              averageDeathsPerBoss: 5.2,
              averageAttemptsPerBoss: 6.2,
              averageWinningAttemptSeconds: 180,
              difficultyScore: 0.75,
              bossHighlights: {
                mostAttempts: {
                  name: 'Malenia',
                  attempts: 22,
                  winningAttemptSeconds: 150,
                },
                longestWinningAttempt: {
                  name: 'Elden Beast',
                  attempts: 8,
                  winningAttemptSeconds: 240,
                },
                toughestOverall: {
                  name: 'Malenia',
                  attempts: 22,
                  winningAttemptSeconds: 150,
                },
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getAllByText('General Stats')).toHaveLength(2);
    expect(screen.getByText('Hardest by deaths')).toBeInTheDocument();
    expect(
      screen.getAllByText('Longest winning attempt').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Toughest overall')).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Game difficulty comparison' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Dark Souls III').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Elden Ring').length).toBeGreaterThan(0);
    expect(screen.queryByText('0.82')).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'General stats PiP summary' }),
    ).toHaveClass('general-stats-pip-only', 'activity-compact:flex');
    expect(screen.getByText('PiP summary')).toBeInTheDocument();

    expect(screen.getByText('Game difficulty ranking')).toBeInTheDocument();
    const ranking = screen.getByRole('list', {
      name: 'Game difficulty comparison',
    });
    expect(within(ranking).getAllByText('Attempts')).toHaveLength(2);
    expect(within(ranking).getAllByText('Winning time')).toHaveLength(2);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'View details for Dark Souls III',
      }),
    );
    expect(screen.getByText('Darkeater Midir')).toBeInTheDocument();
  });

  it('shows honest empty states when timing and highlights are unavailable', () => {
    render(
      <GeneralStatsPage
        games={[]}
        generalStats={{
          hardestByDeathsGameId: null,
          longestWinningAttemptGameId: null,
          toughestOverallGameId: null,
          games: [
            {
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
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText('Winning-attempt timing is not available yet.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Not enough data')).toHaveLength(6);
  });

  it('renders one timed game without a regression line', () => {
    render(
      <GeneralStatsPage
        games={[]}
        generalStats={{
          hardestByDeathsGameId: 'solo',
          longestWinningAttemptGameId: 'solo',
          toughestOverallGameId: 'solo',
          games: [
            {
              id: 'solo',
              name: 'Solo Game',
              defeatedBossCount: 1,
              averageDeathsPerBoss: 0,
              averageAttemptsPerBoss: 0,
              averageWinningAttemptSeconds: 0,
              difficultyScore: 0,
              bossHighlights: {
                mostAttempts: {
                  name: 'Solo Boss',
                  attempts: 1,
                  winningAttemptSeconds: 0,
                },
                longestWinningAttempt: {
                  name: 'Solo Boss',
                  attempts: 1,
                  winningAttemptSeconds: 0,
                },
                toughestOverall: {
                  name: 'Solo Boss',
                  attempts: 1,
                  winningAttemptSeconds: 0,
                },
              },
            },
          ],
        }}
      />,
    );

    expect(screen.queryByText('Trend')).not.toBeInTheDocument();
    expect(screen.getAllByText('0m 0s').length).toBeGreaterThan(0);
  });
});
