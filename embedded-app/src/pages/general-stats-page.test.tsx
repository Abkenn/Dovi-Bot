import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../components/game-switcher', () => ({
  GameSwitcher: () => <div>Game switcher</div>,
}));
vi.mock('recharts', () => ({
  CartesianGrid: () => <div>Grid</div>,
  LabelList: () => <div>Labels</div>,
  ReferenceLine: () => <div>Trend</div>,
  Scatter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ScatterChart: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  XAxis: () => <div>X axis</div>,
  YAxis: ({ tickFormatter }: { tickFormatter: (value: number) => string }) => (
    <div>{tickFormatter(60)}</div>
  ),
  ZAxis: () => <div>Z axis</div>,
}));
vi.mock('../components/ui/chart', () => ({
  ChartContainer: ({
    children,
    ...props
  }: {
    children: ReactNode;
    'aria-label': string;
  }) => <div {...props}>{children}</div>,
  ChartTooltip: ({
    content,
  }: {
    content: (props: {
      active: boolean;
      payload: { payload: unknown }[];
    }) => ReactNode;
  }) => (
    <>
      {content({ active: false, payload: [] })}
      {content({ active: true, payload: [{ payload: {} }] })}
      {content({
        active: true,
        payload: [
          {
            payload: {
              id: 'tooltip-game',
              name: 'Tooltip Game',
              bossHighlights: {
                mostAttempts: {
                  name: 'Tooltip Boss',
                  attempts: 4,
                  winningAttemptSeconds: 90,
                },
                longestWinningAttempt: null,
                toughestOverall: null,
              },
            },
          },
        ],
      })}
    </>
  ),
}));

import { GeneralStatsPage } from './general-stats-page';

describe('GeneralStatsPage', () => {
  it('shows comparison highlights and a labelled game chart', () => {
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

    expect(screen.getByText('General Stats')).toBeInTheDocument();
    expect(screen.getByText('Hardest by deaths')).toBeInTheDocument();
    expect(
      screen.getAllByText('Longest winning attempt').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Toughest overall')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Game difficulty comparison chart' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Dark Souls III').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Elden Ring').length).toBeGreaterThan(0);
    expect(screen.queryByText('0.82')).not.toBeInTheDocument();
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
    expect(screen.getAllByText('Not enough data')).toHaveLength(3);
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
    expect(screen.getByText('1m 0s')).toBeInTheDocument();
  });
});
