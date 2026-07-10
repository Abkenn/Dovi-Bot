import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/embedded-app/embedded-app-stats.service', () => ({
  getEmbeddedAppStats: vi.fn(),
}));

import { createEmbeddedAppStatsCache } from '../../src/modules/embedded-app/embedded-app-stats-cache.service';

const emptyStats = { game: null, currentBoss: null, killedBosses: [] };

describe('embedded app stats cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T18:00:00.000Z'));
  });

  it('shares one small snapshot across viewers during the refresh window', async () => {
    const loadStats = vi.fn().mockResolvedValue(emptyStats);
    const getStats = createEmbeddedAppStatsCache(loadStats);

    await Promise.all([getStats('staging-guild'), getStats('staging-guild')]);
    await getStats('staging-guild');

    expect(loadStats).toHaveBeenCalledOnce();
  });

  it('refreshes after four seconds', async () => {
    const loadStats = vi.fn().mockResolvedValue(emptyStats);
    const getStats = createEmbeddedAppStatsCache(loadStats);
    await getStats('staging-guild');

    vi.advanceTimersByTime(4_000);
    await getStats('staging-guild');

    expect(loadStats).toHaveBeenCalledTimes(2);
  });
});
