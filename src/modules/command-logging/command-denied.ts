export class CommandDeniedError extends Error {
  public readonly ephemeral: boolean;

  public constructor(
    message: string,
    options: {
      ephemeral?: boolean;
    } = {},
  ) {
    super(message);
    this.name = 'CommandDeniedError';
    this.ephemeral = options.ephemeral ?? true;
  }
}
