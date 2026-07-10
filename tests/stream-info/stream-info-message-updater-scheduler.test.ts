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
});
