import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = vi.hoisted(() => ({
  bossGame: { findMany: vi.fn() },
  guildConfig: { findUnique: vi.fn() },
  bossTrackingSession: { findFirst: vi.fn(), findMany: vi.fn() },
}));
vi.mock('../../src/lib/prisma', () => ({ prisma }));

import { findEmbeddedAppGameStats } from '../../src/data/queries/embedded-app-stats';

describe('activity Live game selection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.bossGame.findMany.mockResolvedValue([]);
    prisma.guildConfig.findUnique.mockResolvedValue({
      embeddedAppLiveGame: null,
    });
    prisma.bossTrackingSession.findFirst.mockResolvedValue(null);
    prisma.bossTrackingSession.findMany.mockResolvedValue([]);
  });

  it('uses an explicitly selected game without sessions and ignores other active games', async () => {
    const selectedGame = { id: 'ac8', name: 'Ace Combat 8: Wings of Theve' };
    prisma.guildConfig.findUnique.mockResolvedValue({
      embeddedAppLiveGame: selectedGame,
    });
    prisma.bossTrackingSession.findFirst.mockResolvedValue({
      game: { id: 'old-game', name: 'Old Game' },
    });
    const result = await findEmbeddedAppGameStats(['staging', 'prod'], 'prod');
    expect(result).toMatchObject({
      game: selectedGame,
      sessions: [],
      gameDeaths: 0,
    });
    expect(prisma.guildConfig.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { guildId: 'prod' } }),
    );
    expect(prisma.bossTrackingSession.findFirst).not.toHaveBeenCalled();
    expect(prisma.bossTrackingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ gameId: 'ac8' }),
      }),
    );
  });

  it('keeps session-based Live selection until app:true has been used', async () => {
    prisma.bossTrackingSession.findFirst.mockResolvedValue({
      game: { id: 'old-game', name: 'Old Game' },
    });
    const result = await findEmbeddedAppGameStats(['prod'], 'prod');
    expect(result.game).toEqual({ id: 'old-game', name: 'Old Game' });
    expect(prisma.bossTrackingSession.findFirst).toHaveBeenCalledOnce();
  });
});
