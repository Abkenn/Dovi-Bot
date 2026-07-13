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
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Dark Souls III' }),
    ).toBeInTheDocument();
    expect(screen.getByText('127')).toBeInTheDocument();
    expect(screen.getByText('Current boss card')).toBeInTheDocument();
    expect(screen.getByText('Stream encounters')).toBeInTheDocument();
    expect(screen.getByText('Boss history')).toBeInTheDocument();
  });

  it('shows the no-tracking state', () => {
    render(
      <LiveStatsPage
        stats={{
          game: null,
          currentBoss: null,
          currentStreamWindow: null,
          streamEncounters: [],
          killedBosses: [],
        }}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'No tracked game yet' }),
    ).toBeInTheDocument();
  });
});
