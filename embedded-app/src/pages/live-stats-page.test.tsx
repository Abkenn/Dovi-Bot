import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveStatsPage } from './live-stats-page';

vi.mock('../components/current-boss-card', () => ({
  CurrentBossCard: () => <div>Current boss card</div>,
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
    expect(screen.getByText('127')).toHaveClass('activity-compact:!text-xl');
    expect(screen.getByText('Current boss card')).toBeInTheDocument();
    expect(screen.getByText('Stream encounters')).toBeInTheDocument();
    expect(screen.getByText('Game switcher')).toBeInTheDocument();
    expect(screen.getByText('Boss history')).toBeInTheDocument();
    expect(screen.getByText('Game switcher').parentElement).toHaveClass(
      'activity-compact:hidden',
    );
    expect(screen.getByText('Current boss card').parentElement).toHaveClass(
      'activity-compact:hidden',
    );
    expect(screen.getByText('Stream encounters').parentElement).toHaveClass(
      'activity-compact:hidden',
    );
    expect(screen.getByText('Boss history').parentElement).toHaveClass(
      'activity-compact:hidden',
    );
    expect(screen.getByRole('main')).toHaveClass(
      'activity-compact:flex',
      'activity-compact:justify-center',
    );
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
});
