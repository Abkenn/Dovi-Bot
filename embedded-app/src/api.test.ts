import { describe, expect, it, vi } from 'vitest';
import { fetchLiveStats } from './api';

describe('fetchLiveStats', () => {
  it('returns the live stats response', async () => {
    const stats = { game: null, currentBoss: null, killedBosses: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => stats }),
    );

    await expect(fetchLiveStats()).resolves.toEqual(stats);
  });

  it('returns a friendly error when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(fetchLiveStats()).rejects.toThrow(
      'Live stats are taking a nap.',
    );
  });
});
