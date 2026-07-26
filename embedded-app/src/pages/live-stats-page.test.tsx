import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveStatsPage } from './live-stats-page';

vi.mock('../components/current-boss-card', () => ({
  CurrentBossCard: ({ boss }: { boss: { name: string } | null }) => (
    <div>{boss?.name ?? 'Current boss card'}</div>
  ),
}));
vi.mock('../components/boss-history', () => ({
  BossHistory: () => <div>Boss history</div>,
}));
vi.mock('../components/stream-encounters', () => ({
  StreamEncounters: () => <div>Stream encounters</div>,
}));
vi.mock('../components/game-switcher', () => ({
  GameSwitcher: () => <div>Game switcher</div>,
}));
vi.mock('../components/desktop-pip-live-stats', () => ({
  DesktopPipLiveStats: () => (
    <div className="desktop-pip-live-only">Desktop PiP live attempt</div>
  ),
}));
vi.mock('../components/desktop-pip-last-boss-stats', () => ({
  DesktopPipLastBossStats: ({ boss }: { boss: { name: string } }) => (
    <div className="desktop-pip-live-only">Last boss: {boss.name}</div>
  ),
}));

describe('LiveStatsPage', () => {
  it('shows game totals and dashboard sections', () => {
    render(
      <LiveStatsPage
        stats={{
          game: {
            id: 'game-1',
            name: 'Dark Souls III',
            deaths: 127,
            bossDeaths: 100,
            nonBossDeaths: 27,
            killedBossCount: 4,
          },
          currentBoss: null,
          lastKilledBoss: null,
          currentStreamWindow: null,
          streamEncounters: [],
          bosses: [],
          games: [],
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Dark Souls III' })).toHaveClass(
      'activity-compact:!text-xl',
    );
    expect(
      within(
        screen.getByRole('region', { name: 'Game totals' }),
      ).getByLabelText('127'),
    ).toHaveClass('activity-compact:!text-xl');
    const totals = within(screen.getByRole('region', { name: 'Game totals' }));
    expect(totals.getByText('Total deaths')).toBeInTheDocument();
    expect(totals.getByText('Boss deaths')).toBeInTheDocument();
    expect(totals.getByText('Non-boss deaths')).toBeInTheDocument();
    expect(totals.getByText('Bosses killed')).toBeInTheDocument();
    expect(totals.getByLabelText('100')).toBeInTheDocument();
    expect(totals.getByLabelText('27')).toBeInTheDocument();
    expect(screen.getByText('Current boss card')).toBeInTheDocument();
    expect(screen.getByText('Stream encounters')).toBeInTheDocument();
    expect(screen.getByText('Game switcher')).toBeInTheDocument();
    expect(screen.getByText('Boss history')).toBeInTheDocument();
    expect(screen.getByText('Game switcher').parentElement).toHaveClass(
      'activity-compact:hidden',
    );
    expect(screen.getByText('Current boss card').parentElement).toHaveClass(
      'activity-compact:hidden',
      'overflow-hidden',
    );
    expect(screen.getByRole('main')).not.toHaveClass('desktop-pip-live-frame');
    expect(
      screen.queryByText('Desktop PiP live attempt'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Stream encounters').parentElement).toHaveClass(
      'activity-compact:hidden',
    );
    expect(screen.getByText('Boss history').parentElement).toHaveClass(
      'activity-compact:hidden',
    );
    expect(screen.getByRole('main')).toHaveClass(
      'activity-compact:flex',
      'activity-compact:justify-center',
      'mobile-pip-frame',
    );
    expect(screen.getByRole('main')).not.toHaveAttribute('style');
  });

  it('shows a lower-bound total when non-boss deaths were not tracked', () => {
    render(
      <LiveStatsPage
        stats={{
          game: {
            id: 'game-1',
            name: 'Dark Souls II',
            deaths: 84,
            bossDeaths: 84,
            nonBossDeaths: null,
            killedBossCount: 3,
          },
          currentBoss: null,
          lastKilledBoss: null,
          currentStreamWindow: null,
          streamEncounters: [],
          bosses: [],
          games: [],
        }}
      />,
    );

    const totals = within(screen.getByRole('region', { name: 'Game totals' }));
    expect(totals.getByText('84+')).toBeInTheDocument();
    expect(totals.getByText('Not tracked')).toBeInTheDocument();
  });

  it('keeps archived games reachable from the no-tracking state', () => {
    render(
      <LiveStatsPage
        stats={{
          game: null,
          currentBoss: null,
          lastKilledBoss: null,
          currentStreamWindow: null,
          streamEncounters: [],
          bosses: [],
          games: [
            {
              id: 'game-1',
              name: 'Dark Souls III',
              deaths: 127,
              bossDeaths: 127,
              nonBossDeaths: null,
              killedBossCount: 4,
              bosses: [],
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'No tracked game yet' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Game switcher')).toBeInTheDocument();
  });

  it('provides the live attempt as a desktop PiP-only view', () => {
    const { container } = render(
      <LiveStatsPage
        stats={{
          game: {
            id: 'game-1',
            name: 'Dark Souls III',
            deaths: 1,
            bossDeaths: 1,
            nonBossDeaths: null,
            killedBossCount: 0,
          },
          currentBoss: {
            name: 'Sister Friede',
            deaths: 1,
            attemptNumber: 2,
            attemptStartedAt: '2026-07-17T12:00:00.000Z',
            runbackSeconds: null,
            pausedAt: null,
            status: 'ACTIVE',
            pauseReason: null,
          },
          lastKilledBoss: {
            name: 'Iudex Gundyr',
            deaths: 7,
          },
          currentStreamWindow: null,
          streamEncounters: [],
          bosses: [],
          games: [],
        }}
      />,
    );

    const desktopPip = container.querySelector<HTMLElement>(
      '.desktop-pip-live-only',
    );
    const mobilePip = container.querySelector<HTMLElement>('.mobile-pip-only');
    if (!desktopPip || !mobilePip) {
      throw new Error('Expected desktop and mobile PiP surfaces');
    }
    expect(screen.getByRole('main')).toHaveClass('desktop-pip-live-frame');
    expect(screen.getByText('Desktop PiP live attempt')).toBeInTheDocument();
    expect(mobilePip).not.toContainElement(
      screen.getByText('Desktop PiP live attempt'),
    );
    expect(
      screen.queryByText('Last boss: Iudex Gundyr'),
    ).not.toBeInTheDocument();
  });

  it('keeps the latest killed boss in desktop PiP when no boss is open', () => {
    render(
      <LiveStatsPage
        stats={{
          game: {
            id: 'game-1',
            name: 'Dark Souls III',
            deaths: 246,
            bossDeaths: 246,
            nonBossDeaths: null,
            killedBossCount: 23,
          },
          currentBoss: null,
          lastKilledBoss: {
            name: 'Halflight, Spear of the Church',
            deaths: 1,
          },
          currentStreamWindow: null,
          streamEncounters: [],
          bosses: [],
          games: [],
        }}
      />,
    );

    expect(screen.getByRole('main')).toHaveClass('desktop-pip-live-frame');
    expect(
      screen.getByText('Last boss: Halflight, Spear of the Church'),
    ).toBeInTheDocument();
  });
});
