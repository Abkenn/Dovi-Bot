import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLiveStatsPayload } from './live-stats.server';

const emptyStats = {
  game: null,
  currentBoss: null,
  lastKilledBoss: null,
  currentStreamWindow: null,
  streamEncounters: [],
  bosses: [],
  games: [],
};

describe('live stats server adapter', () => {
  afterEach(() => {
    globalThis.__doviEmbeddedAppStatsLoader = undefined;
    vi.unstubAllEnvs();
  });

  it('uses the bot process service bridge without opening another DAL', async () => {
    const loadStats = vi.fn().mockResolvedValue(emptyStats);
    globalThis.__doviEmbeddedAppStatsLoader = loadStats;
    vi.stubEnv('DISCORD_CLIENT_ID', 'client-1');
    vi.stubEnv('KOYEB_GIT_SHA', 'deploy-2');

    await expect(loadLiveStatsPayload()).resolves.toEqual({
      stats: emptyStats,
      discordClientId: 'client-1',
      deploymentVersion: 'deploy-2',
    });
    expect(loadStats).toHaveBeenCalledOnce();
  });

  it('fails closed when the production service bridge is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(loadLiveStatsPayload()).rejects.toThrow(
      'The embedded stats service bridge is unavailable.',
    );
  });

  it('uses a stable local version outside Koyeb', async () => {
    globalThis.__doviEmbeddedAppStatsLoader = vi
      .fn()
      .mockResolvedValue(emptyStats);

    await expect(loadLiveStatsPayload()).resolves.toMatchObject({
      deploymentVersion: 'development',
    });
  });
});
