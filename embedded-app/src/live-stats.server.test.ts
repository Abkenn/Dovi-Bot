import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLiveStatsPayload } from './live-stats.server';

const emptyStats = {
  game: null,
  currentBoss: null,
  streamEncounters: [],
  killedBosses: [],
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

    await expect(loadLiveStatsPayload()).resolves.toEqual({
      stats: emptyStats,
      discordClientId: 'client-1',
    });
    expect(loadStats).toHaveBeenCalledOnce();
  });

  it('fails closed when the production service bridge is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(loadLiveStatsPayload()).rejects.toThrow(
      'The embedded stats service bridge is unavailable.',
    );
  });
});
