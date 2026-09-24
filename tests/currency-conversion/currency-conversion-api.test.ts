import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('currency conversion API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('fetches and caches a currency pair from Frankfurter', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        date: '2026-09-24',
        base: 'CHF',
        quote: 'JPY',
        rate: 1.18,
      }),
    });
    vi.stubGlobal('fetch', fetch);
    const { getCurrencyRate } = await import(
      '../../src/modules/currency-conversion/currency-conversion.api'
    );

    await expect(
      getCurrencyRate({ base: 'CHF', quote: 'JPY' }),
    ).resolves.toEqual({ date: '2026-09-24', rate: 1.18 });
    await getCurrencyRate({ base: 'CHF', quote: 'JPY' });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      'https://api.frankfurter.dev/v2/rate/CHF/JPY',
    );
  });

  it('reports unsupported currencies clearly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Content',
      }),
    );
    const { getCurrencyRate } = await import(
      '../../src/modules/currency-conversion/currency-conversion.api'
    );

    await expect(
      getCurrencyRate({ base: 'AAA', quote: 'JPY' }),
    ).rejects.toThrow('Unsupported currency code: AAA or JPY');
  });

  it('rejects malformed successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ date: 'today', rate: 'many' }),
      }),
    );
    const { getCurrencyRate } = await import(
      '../../src/modules/currency-conversion/currency-conversion.api'
    );

    await expect(
      getCurrencyRate({ base: 'CHF', quote: 'JPY' }),
    ).rejects.toThrow('Invalid response from currency conversion service.');
  });
});
