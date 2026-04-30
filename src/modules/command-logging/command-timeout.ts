export class CommandTimeoutError extends Error {
  public constructor(message = 'Command timed out') {
    super(message);
    this.name = 'CommandTimeoutError';
  }
}

export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message?: string,
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new CommandTimeoutError(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const COMMAND_TIMEOUT_MS = 10_000;

export const COMMAND_TIMEOUT_MESSAGE =
  'Dovi is too eepy right now 😴 Try again in a bit.';
