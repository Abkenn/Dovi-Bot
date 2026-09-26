import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeResponse = (body: unknown) => ({
  json: vi.fn().mockResolvedValue(body),
  ok: true,
  status: 200,
  statusText: 'OK',
});

describe('Steam API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('searches Steam apps by title', async () => {
    const fetch = vi.fn().mockResolvedValue(
      makeResponse({
        items: [
          { id: 42, name: 'Moonlit Archive', type: 'app' },
          { id: 43, name: 'Moonlit Archive Collection', type: 'sub' },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const { searchSteamGames } = await import(
      '../../src/modules/steam/steam.api'
    );

    await expect(
      searchSteamGames('moonlit', new AbortController().signal),
    ).resolves.toEqual([{ id: 42, title: 'Moonlit Archive' }]);
    expect(String(fetch.mock.calls[0]?.[0])).toContain(
      '/api/storesearch/?term=moonlit',
    );
  });

  it('accepts games and rejects DLC after resolving app details', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeResponse({
          arbitraryKey: {
            success: true,
            data: {
              steam_appid: 42,
              name: 'Moonlit Archive',
              type: 'game',
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          anotherKey: {
            success: true,
            data: {
              steam_appid: 43,
              name: 'Moonlit Archive Soundtrack',
              type: 'dlc',
            },
          },
        }),
      );
    vi.stubGlobal('fetch', fetch);
    const { getSteamGame } = await import('../../src/modules/steam/steam.api');

    await expect(getSteamGame(42)).resolves.toEqual({
      id: 42,
      title: 'Moonlit Archive',
    });
    await expect(getSteamGame(43)).resolves.toBeNull();
  });

  it('calculates English reviews from players with at least one hour', async () => {
    const fetch = vi.fn().mockResolvedValue(
      makeResponse({
        success: 1,
        query_summary: {
          total_positive: 91,
          total_reviews: 100,
        },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const { getSteamEnglishReviewPercent } = await import(
      '../../src/modules/steam/steam.api'
    );

    await expect(getSteamEnglishReviewPercent(42)).resolves.toBe(91);
    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(url.searchParams.get('language')).toBe('english');
    expect(url.searchParams.get('playtime_filter_min')).toBe('1');
  });

  it('returns no rating when there are no matching reviews', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeResponse({
          success: 1,
          query_summary: { total_positive: 0, total_reviews: 0 },
        }),
      ),
    );
    const { getSteamEnglishReviewPercent } = await import(
      '../../src/modules/steam/steam.api'
    );

    await expect(getSteamEnglishReviewPercent(42)).resolves.toBeNull();
  });
});
