import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/embedded-app/embedded-app-stats.service', () => ({
  getEmbeddedAppStats: vi.fn(),
}));

import { createEmbeddedAppStatsCache } from '../../src/modules/embedded-app/embedded-app-stats-cache.service';

const emptyStats = {
  game: null,
  currentBoss: null,
  currentStreamWindow: null,
  streamEncounters: [],
  killedBosses: [],
};

describe('embedded app stats cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T18:00:00.000Z'));
  });

  it('shares one small snapshot across viewers during the refresh window', async () => {
    const loadStats = vi.fn().mockResolvedValue(emptyStats);
    const cache = createEmbeddedAppStatsCache(loadStats);

    await Promise.all([cache.get('staging-guild'), cache.get('staging-guild')]);
    await cache.get('staging-guild');

    expect(loadStats).toHaveBeenCalledOnce();
  });

  it('keeps the tiny snapshot for twelve hours between tracking changes', async () => {
    const loadStats = vi.fn().mockResolvedValue(emptyStats);
    const cache = createEmbeddedAppStatsCache(loadStats);
    await cache.get('staging-guild');

    vi.advanceTimersByTime(12 * 60 * 60 * 1_000);
    await cache.get('staging-guild');

    expect(loadStats).toHaveBeenCalledTimes(2);
  });

  it('reloads immediately after the guild tracking data changes', async () => {
    const loadStats = vi.fn().mockResolvedValue(emptyStats);
    const cache = createEmbeddedAppStatsCache(loadStats);
    await cache.get('staging-guild');

    cache.invalidate('staging-guild');
    await cache.get('staging-guild');

    expect(loadStats).toHaveBeenCalledTimes(2);
  });

  it('does not retain a snapshot invalidated while it is loading', async () => {
    let finishLoad: ((stats: typeof emptyStats) => void) | undefined;
    const loadStats = vi.fn(
      () =>
        new Promise<typeof emptyStats>((resolve) => {
          finishLoad = resolve;
        }),
    );
    const cache = createEmbeddedAppStatsCache(loadStats);
    const firstLoad = cache.get('staging-guild');

    cache.invalidate('staging-guild');
    finishLoad?.(emptyStats);
    await firstLoad;
    loadStats.mockResolvedValue(emptyStats);
    await cache.get('staging-guild');

    expect(loadStats).toHaveBeenCalledTimes(2);
  });
});
