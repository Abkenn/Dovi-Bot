import { Events } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Activity tracking scheduler', () => {
  afterEach(() => vi.useRealTimers());

  it('samples Discord instances every minute, starts once, and stops on invalidation', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const { registerActivityInstance, getTrackedActivityInstances } =
      await import('../../src/modules/embedded-app/activity-tracking.service');
    const { startActivityTracking } = await import(
      '../../src/modules/embedded-app/activity-tracking.scheduler'
    );
    registerActivityInstance({
      instanceId: 'instance',
      guildId: 'staging',
      channelId: 'channel',
      launchedByUserId: 'alice',
      target: null,
    });
    const fetchActivityInstance = vi.fn().mockResolvedValue({
      instanceId: 'instance',
      location: { guildId: 'staging', channelId: 'channel' },
      users: ['alice'],
    });
    const once = vi.fn();
    const client = { application: { fetchActivityInstance }, once };
    startActivityTracking(client as never);
    startActivityTracking(client as never);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchActivityInstance).toHaveBeenCalledExactlyOnceWith('instance');
    expect(
      getTrackedActivityInstances('staging')[0]?.participants[0]?.userId,
    ).toBe('alice');
    expect(once).toHaveBeenCalledWith(Events.Invalidated, expect.any(Function));
    once.mock.calls[0]?.[1]();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchActivityInstance).toHaveBeenCalledTimes(1);
  });

  it('does not poll before a Discord application is available', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const { startActivityTracking } = await import(
      '../../src/modules/embedded-app/activity-tracking.scheduler'
    );
    const client = { application: null, once: vi.fn() };
    startActivityTracking(client as never);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(vi.getTimerCount()).toBe(1);
    client.once.mock.calls[0]?.[1]();
    expect(vi.getTimerCount()).toBe(0);
  });
});
