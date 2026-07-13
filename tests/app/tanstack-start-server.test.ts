import { describe, expect, it, vi } from 'vitest';

const stats = vi.hoisted(() => ({
  getCachedEmbeddedAppStats: vi.fn(),
}));

vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { STAGING_ENV: 'staging-guild' },
}));
vi.mock(
  '../../src/modules/embedded-app/embedded-app-stats-cache.service',
  () => ({ getCachedEmbeddedAppStats: stats.getCachedEmbeddedAppStats }),
);

import {
  createTanStackStartFetcher,
  registerEmbeddedAppStatsLoader,
} from '../../src/app/tanstack-start-server';

describe('TanStack Start server integration', () => {
  it('loads one server entry and forwards requests to its fetch handler', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('activity'));
    const loadEntry = vi.fn().mockResolvedValue({ default: { fetch } });
    const fetchActivity = createTanStackStartFetcher(loadEntry);
    const request = new Request('https://dovi.test/');

    await fetchActivity(request);
    await fetchActivity(request);

    expect(loadEntry).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid generated server entry', async () => {
    const fetchActivity = createTanStackStartFetcher(async () => ({}));

    await expect(
      fetchActivity(new Request('https://dovi.test/')),
    ).rejects.toThrow('The TanStack Start server entry is invalid.');
  });

  it('registers the existing cached DAL service for Start server functions', async () => {
    const emptyStats = {
      game: null,
      currentBoss: null,
      streamEncounters: [],
      killedBosses: [],
    };
    stats.getCachedEmbeddedAppStats.mockResolvedValue(emptyStats);

    registerEmbeddedAppStatsLoader();

    await expect(globalThis.__doviEmbeddedAppStatsLoader?.()).resolves.toEqual(
      emptyStats,
    );
    expect(stats.getCachedEmbeddedAppStats).toHaveBeenCalledWith(
      'staging-guild',
    );
  });
});
