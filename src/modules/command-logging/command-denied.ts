export class CommandDeniedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CommandDeniedError';
  }
}
