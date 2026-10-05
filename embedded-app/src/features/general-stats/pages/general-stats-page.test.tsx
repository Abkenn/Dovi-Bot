import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { CSSProperties, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/game-stats/components/game-switcher', () => ({
  GameSwitcher: () => <div>Game switcher</div>,
}));
vi.mock('recharts', () => ({
  Cell: ({ style }: { style?: CSSProperties }) => (
    <span data-testid="chart-dot" style={style} />
  ),
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
    onMouseLeave,
  }: {
    children: ReactNode;
    data: unknown[];
    onClick: (entry: unknown) => void;
    onMouseEnter: (entry: unknown) => void;
    onMouseLeave: () => void;
  }) => (
    <div>
      {children}
      <button
        type="button"
        className="recharts-scatter-symbol"
        onMouseEnter={() => onMouseEnter(data[0])}
        onMouseLeave={onMouseLeave}
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
  }) => (
    <div className="recharts-tooltip-wrapper">
      {content({
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
      })}
    </div>
  ),
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
  it('uses the chart medal winners for PiP instead of the game-average leaders', () => {
    const eigong = makeComparison('nine-sols', 'Nine Sols', 76, 360);
    const sekiro = {
      ...makeComparison('sekiro', 'Sekiro', 24, 337),
      bossHighlights: {
        mostAttempts: {
          name: 'Isshin',
          attempts: 24,
          winningAttemptSeconds: 337,
        },
        longestWinningAttempt: {
          name: 'Monkeys',
          attempts: 4,
          winningAttemptSeconds: 1628,
        },
        toughestOverall: null,
      },
    };
    const elden = makeComparison('elden-ring', 'Elden Ring', 60, 600);
    const cuphead = makeComparison('cuphead', 'Cuphead', 2, 30);
    render(
      <GeneralStatsPage
        games={[]}
        generalStats={{
          hardestByDeathsGameId: cuphead.id,
          longestWinningAttemptGameId: cuphead.id,
          toughestOverallGameId: cuphead.id,
          games: [eigong, sekiro, elden, cuphead],
        }}
      />,
    );
    const pip = within(
      screen.getByRole('region', { name: 'General stats PiP summary' }),
    );
    expect(pip.getByText('Nine Sols')).toBeInTheDocument();
    expect(pip.getByText('Sekiro')).toBeInTheDocument();
    expect(pip.getByText('Elden Ring')).toBeInTheDocument();
    expect(pip.queryByText('Cuphead')).not.toBeInTheDocument();
    expect(pip.getAllByRole('button')).toHaveLength(3);
  });

  it('mirrors subtle dot hover onto the matching game button and keeps selection stronger', () => {
    const game = makeComparison('nine-sols', 'Nine Sols', 76, 360);
    render(
      <GeneralStatsPage
        games={[]}
        generalStats={{
          hardestByDeathsGameId: game.id,
          longestWinningAttemptGameId: game.id,
          toughestOverallGameId: game.id,
          games: [game],
        }}
      />,
    );
    const dot = screen.getByRole('button', { name: 'First chart dot' });
    const key = screen.getByRole('button', {
      name: 'Lock details for Nine Sols',
    });
    const glow = screen.getByTestId('chart-dot');
    fireEvent.mouseEnter(dot);
    expect(key).toHaveClass('border-primary/45', 'bg-primary/5');
    expect(key).not.toHaveClass('border-primary');
    expect(glow.style.filter).toContain('2px');
    fireEvent.click(dot);
    expect(key).toHaveClass('border-primary');
    expect(glow.style.filter).toContain('6px');
    fireEvent.mouseLeave(dot);
    expect(key).toHaveClass('border-primary');
    expect(key).not.toHaveClass('bg-primary/5');
  });

  it('previews game buttons at the static position without locking and clears the preview on leave', async () => {
    const game = makeComparison('preview', 'Preview Game', 20, 180);
    render(
      <GeneralStatsPage
        games={[]}
        generalStats={{
          hardestByDeathsGameId: game.id,
          longestWinningAttemptGameId: game.id,
          toughestOverallGameId: game.id,
          games: [game],
        }}
      />,
    );
    const key = screen.getByRole('button', {
      name: 'Lock details for Preview Game',
    });
    fireEvent.mouseEnter(key);
    expect(key).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('chart-dot').style.filter).toContain('2px');
    expect(
      screen.getByText('Preview Game boss').closest('.locked-chart-popup'),
    ).toHaveClass('top-24', 'right-6');
    fireEvent.mouseLeave(key);
    await waitFor(() =>
      expect(screen.queryByText('Preview Game boss')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('chart-dot').style.filter).toBe('');
    fireEvent.mouseEnter(key);
    fireEvent.click(key);
    fireEvent.mouseLeave(key);
    expect(key).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Preview Game boss')).toBeInTheDocument();
    expect(screen.getByTestId('chart-dot').style.filter).toContain('6px');
  });

  it('restores the clicked selection after previewing another game button', () => {
    const selected = makeComparison('selected', 'Selected Game', 30, 240);
    const preview = makeComparison('preview', 'Preview Game', 20, 180);
    render(
      <GeneralStatsPage
        games={[]}
        generalStats={{
          hardestByDeathsGameId: selected.id,
          longestWinningAttemptGameId: selected.id,
          toughestOverallGameId: selected.id,
          games: [selected, preview],
        }}
      />,
    );
    const selectedKey = screen.getByRole('button', {
      name: 'Lock details for Selected Game',
    });
    const previewKey = screen.getByRole('button', {
      name: 'Lock details for Preview Game',
    });
    fireEvent.click(selectedKey);
    fireEvent.mouseEnter(previewKey);
    const activePopup = () => {
      const popup = document.querySelector(
        '.locked-chart-popup[aria-hidden="false"]',
      );
      if (!(popup instanceof HTMLElement))
        throw new Error('Expected active popup');
      return within(popup);
    };
    expect(activePopup().getByText('Preview Game boss')).toBeInTheDocument();
    expect(selectedKey).toHaveAttribute('aria-pressed', 'true');
    expect(previewKey).toHaveAttribute('aria-pressed', 'false');
    fireEvent.mouseLeave(previewKey);
    expect(activePopup().getByText('Selected Game boss')).toBeInTheDocument();
    expect(selectedKey).toHaveClass('border-primary');
  });

  it('shows large chart dots with hover details that lock on click', async () => {
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
      name: 'Boss stats game data',
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

    const hoverPopup = chartCardContent.querySelector(
      '.recharts-tooltip-wrapper',
    );
    if (!(hoverPopup instanceof HTMLElement))
      throw new Error('Expected hover popup');
    hoverPopup.getBoundingClientRect = () => ({
      ...chartCardContent.getBoundingClientRect(),
      left: 320,
      top: 150,
    });
    fireEvent.click(screen.getByRole('button', { name: 'First chart dot' }));
    expect(chartCardContent.querySelector('.locked-chart-popup')).toHaveStyle({
      left: '320px',
      top: '150px',
    });
    expect(
      screen.getByRole('button', { name: 'Lock details for Bloodborne' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Lock details for Bloodborne' }),
    ).toHaveClass('border-primary');
    expect(screen.getByText('Bloodborne boss')).toBeInTheDocument();
    expect(screen.queryByText('Hovered Game')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Lock details for Bloodborne' }),
    );
    expect(chartCardContent.querySelector('.locked-chart-popup')).toHaveClass(
      'top-24',
      'right-6',
    );
    expect(
      chartCardContent.querySelector('.locked-chart-popup'),
    ).not.toHaveStyle({ left: '320px' });
    expect(
      within(chartCardContent).getByRole('button', {
        name: /Most deaths: Highest death count/,
      }),
    ).toBeInTheDocument();
    expect(
      within(chartCardContent).getByRole('button', {
        name: /Longest winning attempt: Longest final/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Most difficult boss')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Bloodborne boss'));
    expect(screen.getByText('Bloodborne boss')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('img', {
        name: 'Boss deaths and winning-attempt time comparison chart',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText('Bloodborne boss')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Hovered Game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wrapped chart dot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Invalid chart dot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Empty chart dot' }));
  });

  it('shows chart-wide badges on the winning boss and no badges for other games', () => {
    const championBoss = {
      name: 'Eigong',
      attempts: 76,
      winningAttemptSeconds: 600,
    };
    const champion = {
      ...makeComparison('nine-sols', 'Nine Sols', 76, 600),
      bossHighlights: {
        mostAttempts: championBoss,
        longestWinningAttempt: championBoss,
        toughestOverall: championBoss,
      },
    };
    const other = makeComparison('other', 'Other Game', 4, 120);
    render(
      <GeneralStatsPage
        games={[]}
        generalStats={{
          hardestByDeathsGameId: champion.id,
          longestWinningAttemptGameId: champion.id,
          toughestOverallGameId: champion.id,
          games: [champion, other],
        }}
      />,
    );
    const card = screen
      .getByRole('img', {
        name: 'Boss deaths and winning-attempt time comparison chart',
      })
      .closest('[data-slot="card-content"]');
    if (!(card instanceof HTMLElement))
      throw new Error('Expected chart content');
    const chart = within(card);
    fireEvent.click(
      screen.getByRole('button', { name: 'Lock details for Other Game' }),
    );
    expect(
      chart.queryAllByRole('button', { name: /Most deaths: Highest/ }),
    ).toHaveLength(0);
    expect(
      chart.queryAllByRole('button', {
        name: /Longest winning attempt: Longest final/,
      }),
    ).toHaveLength(0);
    expect(
      chart.queryAllByRole('button', { name: /Toughest overall: Strongest/ }),
    ).toHaveLength(0);
    fireEvent.click(
      screen.getByRole('button', { name: 'Lock details for Nine Sols' }),
    );
    expect(
      chart.getAllByRole('button', {
        name: /Most deaths: Highest death count across all chart games/,
      }),
    ).toHaveLength(1);
    expect(
      chart.getAllByRole('button', {
        name: /Longest winning attempt: Longest final successful attempt across all chart games/,
      }),
    ).toHaveLength(1);
    expect(
      chart.getAllByRole('button', { name: /Toughest overall: Strongest/ }),
    ).toHaveLength(1);
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
    expect(screen.getAllByText('Toughest overall').length).toBeGreaterThan(0);
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

    expect(screen.getByText('Boss stats')).toBeInTheDocument();
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
