import type { Client } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';

const tick = vi.hoisted(() => vi.fn());
vi.mock('../../src/modules/poll-tournaments/poll-tournament.lifecycle', () => ({
  runPollTournamentLifecycleTick: tick,
}));

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('contains a failed database tick and retries on the next interval without overlapping work', async () => {
  vi.useFakeTimers();
  vi.resetModules();
  const error = new Error('Unable to start a transaction in the given time.');
  tick.mockRejectedValueOnce(error).mockResolvedValue(undefined);
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { startPollTournamentScheduler } = await import(
    '../../src/modules/poll-tournaments/poll-tournament.scheduler'
  );
  const client = {} as Client;
  startPollTournamentScheduler(client);
  startPollTournamentScheduler(client);
  await vi.advanceTimersByTimeAsync(0);
  expect(log).toHaveBeenCalledWith(
    'Poll tournament scheduler tick failed.',
    error,
  );
  expect(tick).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(tick).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(1);
});
