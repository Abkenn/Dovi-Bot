import { getCurrencyRate } from './currency-conversion.api';
import { UnsupportedCurrencyError } from './currency-conversion.errors';
import type {
  ConvertCurrencyInput,
  CurrencyAutocompleteChoice,
  CurrencyConversion,
} from './currency-conversion.types';

type CurrencyDefinition = CurrencyAutocompleteChoice & {
  aliases: readonly string[];
};

const CURRENCIES = [
  {
    name: 'USD - US Dollar',
    value: 'USD',
    aliases: ['dollar', 'dollars', '$'],
  },
  { name: 'EUR - Euro', value: 'EUR', aliases: ['euro', 'euros', '€'] },
  {
    name: 'PLN - Polish Zloty',
    value: 'PLN',
    aliases: ['zloty', 'zlotys', 'złoty', 'złote', 'zl', 'zł'],
  },
  {
    name: 'GBP - British Pound',
    value: 'GBP',
    aliases: ['pound', 'pounds', '£'],
  },
  { name: 'BRL - Brazilian Real', value: 'BRL', aliases: ['real', 'reais'] },
  { name: 'UAH - Ukrainian Hryvnia', value: 'UAH', aliases: ['hryvnia'] },
  { name: 'CAD - Canadian Dollar', value: 'CAD', aliases: ['canadian dollar'] },
  {
    name: 'AUD - Australian Dollar',
    value: 'AUD',
    aliases: ['australian dollar'],
  },
  { name: 'JPY - Japanese Yen', value: 'JPY', aliases: ['yen'] },
  { name: 'CNY - Chinese Yuan', value: 'CNY', aliases: ['yuan', 'renminbi'] },
  { name: 'KRW - South Korean Won', value: 'KRW', aliases: ['won'] },
  { name: 'CHF - Swiss Franc', value: 'CHF', aliases: ['franc'] },
  { name: 'SEK - Swedish Krona', value: 'SEK', aliases: ['swedish krona'] },
  { name: 'NOK - Norwegian Krone', value: 'NOK', aliases: ['norwegian krone'] },
  { name: 'DKK - Danish Krone', value: 'DKK', aliases: ['danish krone'] },
  { name: 'CZK - Czech Koruna', value: 'CZK', aliases: ['koruna'] },
  { name: 'HUF - Hungarian Forint', value: 'HUF', aliases: ['forint'] },
  { name: 'RON - Romanian Leu', value: 'RON', aliases: ['leu'] },
  { name: 'TRY - Turkish Lira', value: 'TRY', aliases: ['lira'] },
  { name: 'MXN - Mexican Peso', value: 'MXN', aliases: ['peso', 'pesos'] },
] as const satisfies readonly CurrencyDefinition[];

const aliasToCurrency = new Map<string, string>();
for (const currency of CURRENCIES) {
  aliasToCurrency.set(currency.value.toLowerCase(), currency.value);
  for (const alias of currency.aliases) {
    aliasToCurrency.set(alias, currency.value);
  }
}

const isAsciiLetter = (character: string) => {
  const code = character.charCodeAt(0);
  return code >= 97 && code <= 122;
};

export const normalizeCurrencyCode = (input: string): string | null => {
  const normalized = input.trim().toLowerCase();
  const alias = aliasToCurrency.get(normalized);
  if (alias) {
    return alias;
  }

  if (normalized.length !== 3 || ![...normalized].every(isAsciiLetter)) {
    return null;
  }

  return normalized.toUpperCase();
};

export const getCurrencyAutocomplete = (
  query: string,
): CurrencyAutocompleteChoice[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const matches = CURRENCIES.filter(
    (currency) =>
      !normalizedQuery ||
      currency.name.toLowerCase().includes(normalizedQuery) ||
      currency.aliases.some((alias) => alias.includes(normalizedQuery)),
  );

  return matches.slice(0, 25).map(({ name, value }) => ({ name, value }));
};

export const convertCurrency = async ({
  amount,
  from,
  to = 'USD',
  signal,
}: ConvertCurrencyInput): Promise<CurrencyConversion> => {
  if (!Number.isFinite(amount)) {
    throw new RangeError('Currency amount must be a finite number.');
  }

  const normalizedFrom = normalizeCurrencyCode(from);
  const normalizedTo = normalizeCurrencyCode(to);
  if (!normalizedFrom || !normalizedTo) {
    const unsupportedCurrencies: string[] = [];
    if (!normalizedFrom) {
      unsupportedCurrencies.push(from);
    }
    if (!normalizedTo) {
      unsupportedCurrencies.push(to);
    }

    throw new UnsupportedCurrencyError(unsupportedCurrencies);
  }

  if (normalizedFrom === normalizedTo) {
    return {
      amount,
      convertedAmount: amount,
      date: null,
      from: normalizedFrom,
      rate: 1,
      to: normalizedTo,
    };
  }

  const currencyRate = await getCurrencyRate({
    base: normalizedFrom,
    quote: normalizedTo,
    signal,
  });

  return {
    amount,
    convertedAmount: amount * currencyRate.rate,
    date: currencyRate.date,
    from: normalizedFrom,
    rate: currencyRate.rate,
    to: normalizedTo,
  };
};
