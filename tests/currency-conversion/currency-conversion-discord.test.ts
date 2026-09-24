import { describe, expect, it } from 'vitest';
import { buildCurrencyConversionMessage } from '../../src/modules/currency-conversion/currency-conversion.discord';

describe('currency conversion Discord output', () => {
  it('shows the converted amount, rate, and reference date', () => {
    expect(
      buildCurrencyConversionMessage({
        amount: 50,
        convertedAmount: 59,
        date: '2026-09-24',
        from: 'GBP',
        rate: 1.18,
        to: 'CAD',
      }),
    ).toBe('50 GBP = 59 CAD\nRate: 1 GBP = 1.18 CAD (2026-09-24)');
  });

  it('keeps same-currency output concise', () => {
    expect(
      buildCurrencyConversionMessage({
        amount: 50,
        convertedAmount: 50,
        date: null,
        from: 'USD',
        rate: 1,
        to: 'USD',
      }),
    ).toBe('50 USD = 50 USD');
  });
});
