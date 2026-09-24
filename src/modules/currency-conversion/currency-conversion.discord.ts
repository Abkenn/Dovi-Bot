import type { CurrencyConversion } from './currency-conversion.types';

const formatAmount = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
  }).format(amount);

const formatRate = (rate: number): string =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
  }).format(rate);

export const buildCurrencyConversionMessage = ({
  amount,
  convertedAmount,
  date,
  from,
  rate,
  to,
}: CurrencyConversion): string => {
  const result = `${formatAmount(amount)} ${from} = ${formatAmount(convertedAmount)} ${to}`;

  if (!date) {
    return result;
  }

  return `${result}\nRate: 1 ${from} = ${formatRate(rate)} ${to} (${date})`;
};
