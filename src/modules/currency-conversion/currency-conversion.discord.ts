import type { CurrencyConversion } from './currency-conversion.types';

const formatAmount = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
  }).format(amount);

export const buildCurrencyConversionMessage = ({
  amount,
  convertedAmount,
  from,
  to,
}: CurrencyConversion): string =>
  `${formatAmount(amount)} ${from} = ${formatAmount(convertedAmount)} ${to}`;
