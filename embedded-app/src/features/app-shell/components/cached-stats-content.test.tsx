import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/live-stats/pages/live-stats-page', () => ({
  LiveStatsPage: () => (
    <div>
      Live cached
      <a href="/stats">Stats tab</a>
      <a href="/games/game-1">Game tab</a>
    </div>
  ),
}));
vi.mock('@/features/general-stats/pages/general-stats-page', () => ({
  GeneralStatsPage: () => (
    <div>
      General cached
      <a href="/">Live tab</a>
    </div>
  ),
}));
vi.mock('@/features/archived-game/pages/archived-game-page', () => ({
  ArchivedGamePage: () => <div>Game cached</div>,
}));

import { CachedStatsContent } from './cached-stats-content';

const snapshot = {
  cachedAt: '2026-07-26T12:00:00.000Z',
  stats: {
    game: null,
    currentBoss: null,
    lastKilledBoss: null,
    currentStreamWindow: null,
    streamEncounters: [],
    bosses: [],
    killedBosses: [],
    games: [
      {
        id: 'game-1',
        name: 'Dark Souls III',
        deaths: 246,
        bossDeaths: 93,
        nonBossDeaths: 153,
        killedBossCount: 23,
        bosses: [],
      },
    ],
    generalStats: {
      games: [],
      hardestByDeathsGameId: null,
      longestWinningAttemptGameId: null,
      toughestOverallGameId: null,
    },
  },
};

describe('CachedStatsContent', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));

  it('navigates cached tabs locally without invoking route loaders', () => {
    render(<CachedStatsContent snapshot={snapshot} />);

    expect(screen.getByText('Live cached')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Stats tab'));
    expect(screen.getByText('General cached')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Live tab'));
    fireEvent.click(screen.getByText('Game tab'));
    expect(screen.getByText('Game cached')).toBeInTheDocument();
  });
});
