import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeResponse = ({
  body,
  ok = true,
  status = 200,
  statusText = 'OK',
}: {
  body: unknown;
  ok?: boolean;
  status?: number;
  statusText?: string;
}) => ({
  body: null,
  json: vi.fn().mockResolvedValue(body),
  ok,
  status,
  statusText,
});

describe('HLTB API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('initializes HLTB search auth and maps game results', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeResponse({
          body: { token: 'token' },
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          body: {
            data: [
              {
                game_id: 42,
                game_name: 'Moonlit Archive',
              },
            ],
          },
        }),
      );
    vi.stubGlobal('fetch', fetch);
    const { searchHltbGames } = await import('../../src/modules/hltb/hltb.api');

    await expect(
      searchHltbGames({
        query: 'moonlit',
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual([
      {
        id: 42,
        title: 'Moonlit Archive',
      },
    ]);

    expect(String(fetch.mock.calls[0]?.[0])).toContain(
      '/api/search/site/init?t=',
    );
    expect(fetch.mock.calls[1]?.[0]).toBe(
      'https://howlongtobeat.com/api/search/site',
    );
    const searchOptions = fetch.mock.calls[1]?.[1];
    expect(searchOptions.headers['x-auth-token']).toBe('token');
    expect(JSON.parse(searchOptions.body)).toEqual(
      expect.objectContaining({
        searchTerms: ['moonlit'],
      }),
    );
  });

  it('reads median and range times from the game page', async () => {
    const pageData = {
      props: {
        pageProps: {
          game: {
            data: {
              game: [
                {
                  game_id: 42,
                  game_name: 'Moonlit Archive',
                  comp_main_l: 28_800,
                  comp_main_med: 43_200,
                  comp_plus_med: 68_400,
                  comp_100_med: 126_000,
                  comp_100_h: 194_400,
                },
              ],
            },
          },
        },
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: vi
          .fn()
          .mockResolvedValue(
            `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(pageData)}</script>`,
          ),
      }),
    );
    const { getHltbGame } = await import('../../src/modules/hltb/hltb.api');

    await expect(getHltbGame(42)).resolves.toEqual({
      completionistHours: 35,
      id: 42,
      leisureCompletionistHours: 54,
      mainExtraHours: 19,
      mainStoryHours: 12,
      rushedMainStoryHours: 8,
      title: 'Moonlit Archive',
    });
  });

  it('caches repeated searches', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeResponse({
          body: { token: 'token' },
        }),
      )
      .mockResolvedValue(makeResponse({ body: { data: [] } }));
    vi.stubGlobal('fetch', fetch);
    const { searchHltbGames } = await import('../../src/modules/hltb/hltb.api');

    await searchHltbGames({ query: 'quiet horizon' });
    await searchHltbGames({ query: ' Quiet Horizon ' });
    await searchHltbGames({ query: 'distant shore' });

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('refreshes auth once when HLTB rejects a search token', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeResponse({
          body: { token: 'old' },
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          body: {},
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          body: { token: 'new' },
        }),
      )
      .mockResolvedValueOnce(makeResponse({ body: { data: [] } }));
    vi.stubGlobal('fetch', fetch);
    const { searchHltbGames } = await import('../../src/modules/hltb/hltb.api');

    await expect(searchHltbGames({ query: 'silent tower' })).resolves.toEqual(
      [],
    );
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('rejects malformed auth responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse({ body: {} })),
    );
    const { searchHltbGames } = await import('../../src/modules/hltb/hltb.api');

    await expect(searchHltbGames({ query: 'lost city' })).rejects.toThrow(
      'Invalid HLTB search authorization response.',
    );
  });

  it('reports failed searches', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeResponse({ body: { token: 'token' } }))
      .mockResolvedValueOnce(
        makeResponse({
          body: {},
          ok: false,
          status: 500,
          statusText: 'Server Error',
        }),
      );
    vi.stubGlobal('fetch', fetch);
    const { searchHltbGames } = await import('../../src/modules/hltb/hltb.api');

    await expect(searchHltbGames({ query: 'distant shore' })).rejects.toThrow(
      'HLTB search failed: 500 Server Error',
    );
  });
});
