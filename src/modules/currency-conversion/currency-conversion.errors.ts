export class UnsupportedCurrencyError extends Error {
  public constructor(currencies: readonly string[]) {
    super(`Unsupported currency code: ${currencies.join(' or ')}`);
    this.name = 'UnsupportedCurrencyError';
  }
}
