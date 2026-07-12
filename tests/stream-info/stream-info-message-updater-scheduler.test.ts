import type { Client } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const updater = vi.hoisted(() => ({
  refreshLastStreamInfoMessages: vi.fn(),
}));

vi.mock(
  '../../src/modules/stream-info/stream-info-message-updater.service',
  () => updater,
);

describe('stream info message updater scheduler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays startup and retries transient failures without rejecting', async () => {
    const connectionError = new Error('Connection terminated due to timeout');
    updater.refreshLastStreamInfoMessages
      .mockRejectedValueOnce(connectionError)
      .mockResolvedValueOnce(undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { startStreamInfoMessageUpdater } = await import(
      '../../src/modules/stream-info/stream-info-message-updater.scheduler'
    );

    startStreamInfoMessageUpdater({} as Client);

    expect(updater.refreshLastStreamInfoMessages).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(12_000);
    expect(updater.refreshLastStreamInfoMessages).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(updater.refreshLastStreamInfoMessages).toHaveBeenCalledTimes(2);
    expect(consoleWarn).toHaveBeenCalledWith(
      'Stream info startup refresh failed; retrying in 1000ms',
      connectionError,
    );

    consoleWarn.mockRestore();
  });

  it('stops retrying as soon as the startup refresh succeeds', async () => {
    updater.refreshLastStreamInfoMessages.mockResolvedValue(undefined);
    const { startStreamInfoMessageUpdater } = await import(
      '../../src/modules/stream-info/stream-info-message-updater.scheduler'
    );

    startStreamInfoMessageUpdater({} as Client);
    await vi.advanceTimersByTimeAsync(12_000);

    expect(updater.refreshLastStreamInfoMessages).toHaveBeenCalledOnce();
  });

  it('reports a final startup failure after all retries', async () => {
    const error = new Error('database unavailable');
    updater.refreshLastStreamInfoMessages.mockRejectedValue(error);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { startStreamInfoMessageUpdater } = await import(
      '../../src/modules/stream-info/stream-info-message-updater.scheduler'
    );

    startStreamInfoMessageUpdater({} as Client);
    await vi.advanceTimersByTimeAsync(19_000);

    expect(updater.refreshLastStreamInfoMessages).toHaveBeenCalledTimes(4);
    expect(consoleWarn).toHaveBeenLastCalledWith(
      'Stream info startup refresh failed',
      error,
    );
    consoleWarn.mockRestore();
  });

  it('runs one scheduled refresh at a time and reports failures', async () => {
    let resolveStartup: (() => void) | undefined;
    updater.refreshLastStreamInfoMessages.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveStartup = resolve;
        }),
    );
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { startStreamInfoMessageUpdater } = await import(
      '../../src/modules/stream-info/stream-info-message-updater.scheduler'
    );

    startStreamInfoMessageUpdater({} as Client);
    startStreamInfoMessageUpdater({} as Client);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(updater.refreshLastStreamInfoMessages).toHaveBeenCalledOnce();

    resolveStartup?.();
    await vi.advanceTimersByTimeAsync(60_000);
    updater.refreshLastStreamInfoMessages.mockRejectedValueOnce(
      new Error('refresh'),
    );
    await vi.advanceTimersByTimeAsync(60_000);

    expect(updater.refreshLastStreamInfoMessages).toHaveBeenCalledTimes(3);
    expect(consoleError).toHaveBeenCalledWith(
      'Stream info message refresh failed',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
