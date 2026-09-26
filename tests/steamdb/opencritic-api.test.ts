import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  env: { OPENCRITIC_RAPIDAPI_KEY: 'test-key' as string | undefined },
}));

vi.mock('@zod-schemas/env.zod', () => ({ env: dependencies.env }));

const makeResponse = (body: unknown) => ({
  json: vi.fn().mockResolvedValue(body),
  ok: true,
  status: 200,
  statusText: 'OK',
});

describe('OpenCritic API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    dependencies.env.OPENCRITIC_RAPIDAPI_KEY = 'test-key';
  });

  it('finds an exact game and returns its critic score', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeResponse([
          { id: 7, name: 'Moonlit Archive' },
          { id: 8, name: 'Moonlit Archive II' },
        ]),
      )
      .mockResolvedValueOnce(makeResponse({ topCriticScore: 87.6 }));
    vi.stubGlobal('fetch', fetch);
    const { getOpenCriticScore } = await import(
      '../../src/modules/steam/opencritic.api'
    );

    await expect(
      getOpenCriticScore('Moonlit Archive', new AbortController().signal),
    ).resolves.toBe(87.6);
    expect(String(fetch.mock.calls[0]?.[0])).toContain(
      '/game/search?criteria=Moonlit+Archive',
    );
    expect(String(fetch.mock.calls[1]?.[0])).toContain('/game/7');
  });

  it('skips the provider when no key is configured', async () => {
    dependencies.env.OPENCRITIC_RAPIDAPI_KEY = undefined;
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { getOpenCriticScore } = await import(
      '../../src/modules/steam/opencritic.api'
    );

    await expect(getOpenCriticScore('Quiet Horizon')).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('caches a missing score', async () => {
    const fetch = vi.fn().mockResolvedValue(makeResponse([]));
    vi.stubGlobal('fetch', fetch);
    const { getOpenCriticScore } = await import(
      '../../src/modules/steam/opencritic.api'
    );

    await expect(getOpenCriticScore('Unlisted Voyage')).resolves.toBeNull();
    await expect(getOpenCriticScore('Unlisted Voyage')).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('treats the provider sentinel score as unavailable', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeResponse([{ id: 9, name: 'Silent Atlas' }]))
      .mockResolvedValueOnce(makeResponse({ topCriticScore: -1 }));
    vi.stubGlobal('fetch', fetch);
    const { getOpenCriticScore } = await import(
      '../../src/modules/steam/opencritic.api'
    );

    await expect(getOpenCriticScore('Silent Atlas')).resolves.toBeNull();
  });
});
