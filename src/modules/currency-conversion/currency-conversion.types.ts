export type CurrencyRate = {
  date: string;
  rate: number;
};

export type CurrencyConversion = {
  amount: number;
  convertedAmount: number;
  date: string | null;
  from: string;
  rate: number;
  to: string;
};

export type ConvertCurrencyInput = {
  amount: number;
  from: string;
  to?: string | undefined;
  signal?: AbortSignal | undefined;
};

export type GetCurrencyRateInput = {
  base: string;
  quote: string;
  signal?: AbortSignal | undefined;
};

export type CurrencyAutocompleteChoice = {
  name: string;
  value: string;
};
