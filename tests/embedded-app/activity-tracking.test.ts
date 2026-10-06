import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Activity presence tracking', () => {
  beforeEach(() => vi.resetModules());

  const loadTracker = () =>
    import('../../src/modules/embedded-app/activity-tracking.service');

  const instance = (users: string[]) => ({
    instanceId: 'instance-1',
    location: { guildId: 'staging', channelId: 'channel-1' },
    users,
  });

  it('records participant joins and leaves without inventing app actions', async () => {
    const tracker = await loadTracker();
    const fetchInstance = vi.fn().mockResolvedValue(instance(['alice']));
    tracker.registerActivityInstance({
      instanceId: 'instance-1',
      guildId: 'staging',
      channelId: 'channel-1',
      launchedByUserId: 'alice',
      target: 'Elden Ring',
    });
    await tracker.refreshActivityInstances(fetchInstance);
    expect(tracker.getTrackedActivityInstances('staging')[0]).toMatchObject({
      target: 'Elden Ring',
      status: 'active',
      joinedUserIds: ['alice'],
      leftUserIds: [],
      participants: [{ userId: 'alice', connected: true }],
    });
    fetchInstance.mockResolvedValue(instance(['bob']));
    await tracker.refreshActivityInstances(fetchInstance);
    expect(tracker.getTrackedActivityInstances('staging')[0]).toMatchObject({
      joinedUserIds: ['bob'],
      leftUserIds: ['alice'],
      participants: [
        { userId: 'bob', connected: true },
        { userId: 'alice', connected: false },
      ],
    });
    expect(tracker.getTrackedActivityInstances('prod')).toEqual([]);
  });

  it('preserves the last successful snapshot on transient failures', async () => {
    const tracker = await loadTracker();
    const fetchInstance = vi.fn().mockResolvedValue(instance(['alice']));
    tracker.registerActivityInstance({
      instanceId: 'instance-1',
      guildId: 'staging',
      channelId: 'channel-1',
      launchedByUserId: 'alice',
      target: null,
    });
    await tracker.refreshActivityInstances(fetchInstance);
    const checkedAt =
      tracker.getTrackedActivityInstances('staging')[0]?.lastCheckedAt;
    fetchInstance.mockRejectedValue(new Error('Network unavailable'));
    await tracker.refreshActivityInstances(fetchInstance);
    expect(tracker.getTrackedActivityInstances('staging')[0]).toMatchObject({
      status: 'unavailable',
      lastCheckedAt: checkedAt,
      participants: [{ userId: 'alice', connected: true }],
    });
  });

  it('rejects mismatched locations and expires idle tracking after an hour', async () => {
    vi.useFakeTimers();
    try {
      const tracker = await loadTracker();
      tracker.registerActivityInstance({
        instanceId: 'instance-1',
        guildId: 'staging',
        channelId: 'channel-1',
        launchedByUserId: 'alice',
        target: null,
      });
      await tracker.refreshActivityInstances(
        vi.fn().mockResolvedValue({
          ...instance(['secret']),
          location: { guildId: 'prod', channelId: 'other' },
        }),
      );
      expect(tracker.getTrackedActivityInstances('staging')[0]).toMatchObject({
        status: 'unavailable',
        participants: [],
      });
      vi.advanceTimersByTime(60 * 60_000);
      expect(tracker.getTrackedActivityInstances('staging')).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('coalesces overlapping refreshes and caps retained instances', async () => {
    const tracker = await loadTracker();
    for (let index = 0; index < 101; index++) {
      tracker.registerActivityInstance({
        instanceId: `instance-${index}`,
        guildId: 'staging',
        channelId: 'channel-1',
        launchedByUserId: 'alice',
        target: null,
      });
    }
    expect(tracker.getTrackedActivityInstances('staging')).toHaveLength(100);
    expect(
      tracker
        .getTrackedActivityInstances('staging')
        .some((entry) => entry.instanceId === 'instance-0'),
    ).toBe(false);
    const fetchInstance = vi.fn().mockRejectedValue(new Error('Offline'));
    await Promise.all([
      tracker.refreshActivityInstances(fetchInstance),
      tracker.refreshActivityInstances(fetchInstance),
    ]);
    expect(fetchInstance).toHaveBeenCalledTimes(100);
  });

  it('preserves participant history on relaunch and refuses cross-location rebinding', async () => {
    const tracker = await loadTracker();
    const input = {
      instanceId: 'instance-1',
      guildId: 'staging',
      channelId: 'channel-1',
      launchedByUserId: 'alice',
      target: null,
    };
    tracker.registerActivityInstance(input);
    await tracker.refreshActivityInstances(async () => instance(['alice']));
    tracker.registerActivityInstance({ ...input, target: 'Music' });
    tracker.registerActivityInstance({
      ...input,
      guildId: 'prod',
      target: 'Wrong',
    });
    expect(tracker.getTrackedActivityInstances('staging')[0]).toMatchObject({
      target: 'Music',
      participants: [{ userId: 'alice', connected: true }],
    });
    const copy = tracker.getTrackedActivityInstances('staging')[0];
    copy?.participants.splice(0);
    expect(
      tracker.getTrackedActivityInstances('staging')[0]?.participants,
    ).toHaveLength(1);
  });

  it('renews occupied sessions and removes them after one hour without participants', async () => {
    vi.useFakeTimers();
    try {
      const tracker = await loadTracker();
      tracker.registerActivityInstance({
        instanceId: 'instance-1',
        guildId: 'staging',
        channelId: 'channel-1',
        launchedByUserId: 'alice',
        target: null,
      });
      vi.advanceTimersByTime(50 * 60_000);
      await tracker.refreshActivityInstances(async () => instance(['alice']));
      vi.advanceTimersByTime(50 * 60_000);
      await tracker.refreshActivityInstances(async () => instance([]));
      expect(tracker.getTrackedActivityInstances('staging')[0]).toMatchObject({
        leftUserIds: ['alice'],
        participants: [{ connected: false }],
      });
      vi.advanceTimersByTime(10 * 60_000);
      expect(tracker.getTrackedActivityInstances('staging')).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('bounds user history while retaining the currently connected participants', async () => {
    const tracker = await loadTracker();
    tracker.registerActivityInstance({
      instanceId: 'instance-1',
      guildId: 'staging',
      channelId: 'channel-1',
      launchedByUserId: 'alice',
      target: null,
    });
    await tracker.refreshActivityInstances(async () =>
      instance(Array.from({ length: 100 }, (_, index) => `old-${index}`)),
    );
    await tracker.refreshActivityInstances(async () =>
      instance(Array.from({ length: 100 }, (_, index) => `new-${index}`)),
    );
    const participants =
      tracker.getTrackedActivityInstances('staging')[0]?.participants;
    expect(participants).toHaveLength(100);
    expect(participants?.every((user) => user.connected)).toBe(true);
  });
});
