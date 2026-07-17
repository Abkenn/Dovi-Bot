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

describe('LiveStatsPage', () => {
  it('shows game totals and dashboard sections', () => {
    render(
      <LiveStatsPage
        stats={{
          game: {
            id: 'game-1',
            name: 'Dark Souls III',
            deaths: 127,
            killedBossCount: 4,
          },
          currentBoss: null,
          currentStreamWindow: null,
          streamEncounters: [],
          killedBosses: [],
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
    expect(screen.getByText('Current boss card')).toBeInTheDocument();
    expect(screen.getByText('Stream encounters')).toBeInTheDocument();
    expect(screen.getByText('Game switcher')).toBeInTheDocument();
    expect(screen.getByText('Boss history')).toBeInTheDocument();
    expect(screen.getByText('Game switcher').parentElement).toHaveClass(
      'activity-compact:hidden',
    );
    expect(
      screen.getByText('Current boss card').parentElement?.parentElement,
    ).toHaveClass('activity-compact:hidden', 'overflow-hidden');
    expect(
      screen.getByText('Current boss card').parentElement?.parentElement,
    ).not.toHaveClass('desktop-pip-details');
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

  it('keeps archived games reachable from the no-tracking state', () => {
    render(
      <LiveStatsPage
        stats={{
          game: null,
          currentBoss: null,
          currentStreamWindow: null,
          streamEncounters: [],
          killedBosses: [],
          games: [
            {
              id: 'game-1',
              name: 'Dark Souls III',
              deaths: 127,
              killedBossCount: 4,
              killedBosses: [],
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
            killedBossCount: 0,
          },
          currentBoss: {
            name: 'Sister Friede',
            deaths: 1,
            attemptNumber: 2,
            attemptStartedAt: '2026-07-17T12:00:00.000Z',
            pausedAt: null,
            status: 'ACTIVE',
            pauseReason: null,
          },
          currentStreamWindow: null,
          streamEncounters: [],
          killedBosses: [],
          games: [],
        }}
      />,
    );

    const desktopPip = container.querySelector<HTMLElement>(
      '.desktop-pip-current-boss',
    );
    const mobilePip = container.querySelector<HTMLElement>('.mobile-pip-only');
    if (!desktopPip || !mobilePip) {
      throw new Error('Expected desktop and mobile PiP surfaces');
    }
    expect(desktopPip.parentElement).toHaveClass('desktop-pip-details');
    expect(within(desktopPip).getByText('Sister Friede')).toBeInTheDocument();
    expect(mobilePip).not.toContainElement(
      within(desktopPip).getByText('Sister Friede'),
    );
  });
});
