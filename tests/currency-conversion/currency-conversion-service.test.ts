import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  getCurrencyRate: vi.fn(),
}));

vi.mock(
  '../../src/modules/currency-conversion/currency-conversion.api',
  () => ({ getCurrencyRate: dependencies.getCurrencyRate }),
);

import {
  convertCurrency,
  getCurrencyAutocomplete,
  normalizeCurrencyCode,
} from '../../src/modules/currency-conversion/currency-conversion.service';

describe('currency conversion service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['gbp', 'GBP'],
    ['pounds', 'GBP'],
    ['yen', 'JPY'],
    ['reais', 'BRL'],
    ['brl', 'BRL'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeCurrencyCode(input)).toBe(expected);
  });

  it('rejects values that are neither known aliases nor ISO-shaped codes', () => {
    expect(normalizeCurrencyCode('gold')).toBeNull();
    expect(normalizeCurrencyCode('STERLING')).toBeNull();
    expect(normalizeCurrencyCode('A1A')).toBeNull();
  });

  it('accepts an ISO-shaped code that is not in the autocomplete catalog', () => {
    expect(normalizeCurrencyCode('xts')).toBe('XTS');
  });

  it('defaults an omitted target currency to USD', async () => {
    dependencies.getCurrencyRate.mockResolvedValue({
      date: '2026-09-24',
      rate: 1.18,
    });

    await expect(convertCurrency({ amount: 50, from: 'GBP' })).resolves.toEqual(
      {
        amount: 50,
        convertedAmount: 59,
        date: '2026-09-24',
        from: 'GBP',
        rate: 1.18,
        to: 'USD',
      },
    );
  });

  it('defaults an omitted USD target to EUR', async () => {
    dependencies.getCurrencyRate.mockResolvedValue({
      date: '2026-09-24',
      rate: 0.85,
    });

    await expect(convertCurrency({ amount: 50, from: 'usd' })).resolves.toEqual(
      {
        amount: 50,
        convertedAmount: 42.5,
        date: '2026-09-24',
        from: 'USD',
        rate: 0.85,
        to: 'EUR',
      },
    );
    expect(dependencies.getCurrencyRate).toHaveBeenCalledWith({
      base: 'USD',
      quote: 'EUR',
      signal: undefined,
    });
  });

  it('returns explicit same-currency conversions locally', async () => {
    await expect(
      convertCurrency({ amount: 50, from: 'usd', to: 'USD' }),
    ).resolves.toEqual({
      amount: 50,
      convertedAmount: 50,
      date: null,
      from: 'USD',
      rate: 1,
      to: 'USD',
    });
    expect(dependencies.getCurrencyRate).not.toHaveBeenCalled();
  });

  it('uses an explicitly requested target currency', async () => {
    dependencies.getCurrencyRate.mockResolvedValue({
      date: '2026-09-24',
      rate: 4.25,
    });

    await convertCurrency({ amount: 10, from: 'cad', to: 'yen' });

    expect(dependencies.getCurrencyRate).toHaveBeenCalledWith({
      base: 'CAD',
      quote: 'JPY',
      signal: undefined,
    });
  });

  it('offers popular currencies by code, name, and alias', () => {
    expect(getCurrencyAutocomplete('yen')).toContainEqual({
      name: 'JPY - Japanese Yen',
      value: 'JPY',
    });
    expect(getCurrencyAutocomplete('usd')).toContainEqual({
      name: 'USD - US Dollar',
      value: 'USD',
    });
    expect(getCurrencyAutocomplete('')).toHaveLength(20);
    expect(getCurrencyAutocomplete('not-a-currency')).toEqual([]);
  });

  it('rejects non-finite amounts before requesting a rate', async () => {
    await expect(
      convertCurrency({ amount: Number.NaN, from: 'GBP' }),
    ).rejects.toThrow('Currency amount must be a finite number.');
    expect(dependencies.getCurrencyRate).not.toHaveBeenCalled();
  });

  it.each([
    { from: 'gold', to: 'JPY' },
    { from: 'CAD', to: 'silver' },
    { from: 'gold', to: 'silver' },
  ])('rejects unsupported currency inputs: $from to $to', async (input) => {
    await expect(convertCurrency({ amount: 10, ...input })).rejects.toThrow(
      'Unsupported currency code:',
    );
    expect(dependencies.getCurrencyRate).not.toHaveBeenCalled();
  });
});
