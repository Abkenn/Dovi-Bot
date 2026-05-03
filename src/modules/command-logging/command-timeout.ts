export const COMMAND_TIMEOUT_MS = 10_000;

export const COMMAND_TIMEOUT_MESSAGE =
  'Dovi is too eepy right now. Try again in a bit.';

export class CommandTimeoutError extends Error {
  public constructor(message = COMMAND_TIMEOUT_MESSAGE) {
    super(message);
    this.name = 'CommandTimeoutError';
  }
}
