import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/game-stats/components/game-switcher', () => ({
  GameSwitcher: () => <div>Game switcher</div>,
}));
vi.mock('recharts', () => ({
  CartesianGrid: () => <div>Grid</div>,
  ReferenceLine: ({
    onMouseEnter,
    onMouseLeave,
    x,
    y,
  }: {
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    x?: number;
    y?: number;
  }) =>
    onMouseEnter ? (
      <button
        type="button"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {x === undefined ? 'Average time guide' : 'Average deaths guide'}
      </button>
    ) : (
      <div>{y === undefined ? 'Deaths average' : 'Time average'}</div>
    ),
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Scatter: ({
    children,
    data,
    onClick,
    onMouseEnter,
  }: {
    children: ReactNode;
    data: unknown[];
    onClick: (entry: unknown) => void;
    onMouseEnter: () => void;
  }) => (
    <div>
      {children}
      <button
        type="button"
        className="recharts-scatter-symbol"
        onMouseEnter={onMouseEnter}
        onClick={() => onClick(data[0])}
      >
        First chart dot
      </button>
      <button
        type="button"
        className="recharts-scatter-symbol"
        onClick={() => onClick({ payload: data[0] })}
      >
        Wrapped chart dot
      </button>
      <button
        type="button"
        className="recharts-scatter-symbol"
        onClick={() => onClick({ payload: {} })}
      >
        Invalid chart dot
      </button>
      <button
        type="button"
        className="recharts-scatter-symbol"
        onClick={() => onClick(null)}
      >
        Empty chart dot
      </button>
    </div>
  ),
  ScatterChart: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: ({
    content,
  }: {
    content: (props: {
      active: boolean;
      payload: { payload: unknown }[];
    }) => ReactNode;
  }) =>
    content({
      active: true,
      payload: [
        {
          payload: {
            ...makeComparison('hovered', 'Hovered Game', 5, 300),
            longestBossFightSeconds: 300,
            toughestBossDeaths: 4,
          },
        },
      ],
    }),
  XAxis: ({ label }: { label: { offset: number; value: string } }) => (
    <div>
      X axis {label.value} {label.offset}
    </div>
  ),
  YAxis: ({ tickFormatter }: { tickFormatter: (value: number) => string }) => (
    <div>Time axis {tickFormatter(60)}</div>
  ),
  ZAxis: ({ range }: { range: [number, number] }) => (
    <div>Dot area {range[0]}</div>
  ),
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
    longestWinningAttempt: {
      name: `${name} long boss`,
      attempts,
      winningAttemptSeconds: winningSeconds,
    },
    toughestOverall: null,
  },
});

describe('GeneralStatsPage', () => {
  it('shows large chart dots with hover details that lock on click', () => {
    const tiedGames = [
      {
        ...makeComparison('bloodborne', 'Bloodborne', 4, 240),
        difficultyScore: null,
      },
      {
        ...makeComparison('lies-of-p', 'Lies of P', 4, 240),
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
    const gameData = screen.getByRole('list', {
      name: 'Boss extremes game data',
    });
    expect(gameData).toHaveTextContent('Bloodborne');
    expect(gameData).toHaveTextContent('3 deaths · 4m 0s');
    expect(screen.getByText('Dot area 343')).toBeInTheDocument();
    expect(screen.getByText('Hovered Game')).toBeInTheDocument();

    const deathsGuide = screen.getByRole('button', {
      name: 'Average deaths guide',
    });
    const chart = screen.getByRole('img', {
      name: 'Boss deaths and winning-attempt time comparison chart',
    });
    const chartCardContent = chart.closest('[data-slot="card-content"]');

    if (!(chartCardContent instanceof HTMLElement)) {
      throw new Error('Expected chart card content');
    }

    chartCardContent.getBoundingClientRect = () => ({
      bottom: 600,
      height: 600,
      left: 0,
      right: 1_000,
      top: 0,
      width: 1_000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.mouseEnter(deathsGuide);
    fireEvent.mouseMove(chartCardContent, { clientX: 200, clientY: 200 });
    expect(screen.getByText('Average deaths: 3.0')).toHaveStyle({
      left: '212px',
      top: '212px',
    });
    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'First chart dot' }),
    );
    expect(screen.queryByText('Average deaths: 3.0')).not.toBeInTheDocument();

    const timeGuide = screen.getByRole('button', {
      name: 'Average time guide',
    });
    fireEvent.mouseEnter(timeGuide);
    expect(screen.getByText('Average longest win: 4m 0s')).toBeInTheDocument();
    fireEvent.mouseLeave(timeGuide);

    fireEvent.click(screen.getByRole('button', { name: 'First chart dot' }));
    expect(screen.getByText('Bloodborne boss')).toBeInTheDocument();
    expect(screen.queryByText('Hovered Game')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Bloodborne boss'));
    expect(screen.getByText('Bloodborne boss')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('img', {
        name: 'Boss deaths and winning-attempt time comparison chart',
      }),
    );
    expect(screen.queryByText('Bloodborne boss')).not.toBeInTheDocument();
    expect(screen.getByText('Hovered Game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wrapped chart dot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Invalid chart dot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Empty chart dot' }));
  });

  it('shows comparison highlights and a boss extremes chart', () => {
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
            {
              ...makeComparison('missing-time', 'Missing Time', 2, 60),
              bossHighlights: {
                mostAttempts: {
                  name: 'Known Boss',
                  attempts: 2,
                  winningAttemptSeconds: null,
                },
                longestWinningAttempt: {
                  name: 'Untimed Boss',
                  attempts: 2,
                  winningAttemptSeconds: null,
                },
                toughestOverall: null,
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
      screen.getByRole('img', {
        name: 'Boss deaths and winning-attempt time comparison chart',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Dark Souls III').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Elden Ring').length).toBeGreaterThan(0);
    expect(screen.queryByText('0.82')).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'General stats PiP summary' }),
    ).toHaveClass('general-stats-pip-only', 'activity-compact:flex');
    expect(screen.getByText('PiP summary')).toBeInTheDocument();

    expect(screen.getByText('Boss extremes')).toBeInTheDocument();
    expect(screen.getByText('Fight duration')).toBeInTheDocument();
    expect(screen.getByText('X axis Deaths -18')).toBeInTheDocument();
    expect(screen.queryByText('Long + deadly')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Lock details for Dark Souls III' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'First chart dot' }));
    expect(screen.getAllByText('Malenia').length).toBeGreaterThan(0);
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
      screen.getByText(
        'Boss death and winning-attempt timing data is not available yet.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Not enough data')).toHaveLength(6);
  });

  it('renders one game with zero deaths and a zero-second winning attempt', () => {
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

    expect(screen.getByText('Dot area 343')).toBeInTheDocument();
  });
});
