import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  cacheLiveStats: vi.fn(),
  customId: null as string | null,
  navigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div>Route outlet</div>,
  useNavigate: () => dependencies.navigate,
}));
vi.mock('@/hooks/use-discord-sdk', () => ({
  useDiscordSdk: () => dependencies.customId,
}));
vi.mock('../lib/live-stats-cache', () => ({
  cacheLiveStats: dependencies.cacheLiveStats,
}));

import { CurrentBuildContent } from './current-build-content';

const stats = {
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
      deaths: 10,
      bossDeaths: 10,
      nonBossDeaths: null,
      killedBossCount: 1,
      bosses: [],
    },
  ],
  generalStats: {
    games: [],
    hardestByDeathsGameId: null,
    longestWinningAttemptGameId: null,
    toughestOverallGameId: null,
  },
};

describe('CurrentBuildContent', () => {
  beforeEach(() => {
    dependencies.customId = null;
    dependencies.cacheLiveStats.mockReset();
    dependencies.navigate.mockReset();
  });

  it('renders the active route without a launch target', () => {
    render(<CurrentBuildContent discordClientId="client-1" stats={stats} />);

    expect(screen.getByText('Route outlet')).toBeInTheDocument();
    expect(dependencies.cacheLiveStats).toHaveBeenCalledWith(stats);
    expect(dependencies.navigate).not.toHaveBeenCalled();
  });

  it('navigates a Discord launch target to its archived game', async () => {
    dependencies.customId = 'Dark Souls III';
    render(<CurrentBuildContent discordClientId="client-1" stats={stats} />);

    await waitFor(() =>
      expect(dependencies.navigate).toHaveBeenCalledWith({
        to: '/games/$gameId',
        params: { gameId: 'game-1' },
        replace: true,
      }),
    );
  });

  it('ignores a launch target that has no matching game', () => {
    dependencies.customId = 'Unknown Game';
    render(<CurrentBuildContent discordClientId="client-1" stats={stats} />);

    expect(dependencies.navigate).not.toHaveBeenCalled();
  });
});
