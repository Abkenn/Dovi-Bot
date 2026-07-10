import type { Client } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamKind } from '../../src/generated/prisma/client';

const queries = vi.hoisted(() => ({
  setStreamLiveReminderEnabled: vi.fn(),
  findAnnouncedStreamReminders: vi.fn(),
  findPendingStreamReminders: vi.fn(),
  markStreamReminderAnnouncementNotified: vi.fn(),
  markStreamReminderNotified: vi.fn(),
  updateStreamReminderAnnouncement: vi.fn(),
  upsertStreamReminder: vi.fn(),
}));

vi.mock('@data/queries/stream-reminder', () => queries);
vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: vi.fn(),
}));

import type { StreamOccurrence } from '../../src/modules/stream-info/stream-info.types';
import {
  deliverStreamReminders,
  setLiveReminderEnabled,
  subscribeToStreamReminder,
} from '../../src/modules/stream-info/stream-reminder.service';

const occurrence: StreamOccurrence = {
  dateKey: '2026-07-03',
  weekday: 'FRIDAY',
  startAt: new Date('2026-07-03T18:10:00.000Z'),
  endAt: new Date('2026-07-03T22:10:00.000Z'),
  streamKind: StreamKind.GAME,
  musicMode: null,
  title: 'Game Stream',
  gameName: 'Dark Souls III',
  streamUrl: 'https://youtube.test/watch?v=stream',
  videoTitle: 'Davi is live',
  streamIsLive: false,
  isOverride: false,
};

describe('stream reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores an upcoming YouTube stream reminder', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-03T16:10:00.000Z'));

    await subscribeToStreamReminder({
      guildId: 'guild-1',
      userId: 'user-1',
      occurrence,
    });

    expect(queries.upsertStreamReminder).toHaveBeenCalledWith({
      guildId: 'guild-1',
      userId: 'user-1',
      streamDateKey: '2026-07-03',
      streamUrl: 'https://youtube.test/watch?v=stream',
      videoTitle: 'Davi is live',
      scheduledStartAt: occurrence.startAt,
    });
  });

  it('stores a schedule-only reminder before YouTube announces the stream', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-03T16:10:00.000Z'));

    await subscribeToStreamReminder({
      guildId: 'guild-1',
      userId: 'user-1',
      occurrence: {
        ...occurrence,
        streamUrl: undefined,
        videoTitle: undefined,
        streamIsLive: undefined,
      },
    });

    expect(queries.upsertStreamReminder).toHaveBeenCalledWith({
      guildId: 'guild-1',
      userId: 'user-1',
      streamDateKey: '2026-07-03',
      streamUrl: null,
      videoTitle: null,
      scheduledStartAt: occurrence.startAt,
    });
  });

  it('sends one pre-stream chat DM when a URL appears and keeps the live reminder pending', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const fetch = vi.fn().mockResolvedValue({ send });
    queries.updateStreamReminderAnnouncement.mockResolvedValue(undefined);
    queries.findAnnouncedStreamReminders.mockResolvedValue([
      { id: 'reminder-1', userId: 'user-1' },
    ]);

    await deliverStreamReminders({
      client: { users: { fetch } } as unknown as Client,
      guildId: 'guild-1',
      occurrence,
    });

    expect(queries.updateStreamReminderAnnouncement).toHaveBeenCalledWith({
      guildId: 'guild-1',
      streamDateKey: occurrence.dateKey,
      streamUrl: occurrence.streamUrl,
      videoTitle: occurrence.videoTitle,
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ components: expect.any(Array) }),
    );
    expect(queries.markStreamReminderAnnouncementNotified).toHaveBeenCalledWith(
      'reminder-1',
    );
    expect(queries.markStreamReminderNotified).not.toHaveBeenCalled();
  });

  it('updates the live reminder state only for its owner', async () => {
    queries.setStreamLiveReminderEnabled.mockResolvedValue({
      id: 'reminder-1',
      streamUrl: occurrence.streamUrl,
      scheduledStartAt: occurrence.startAt,
    });

    await expect(
      setLiveReminderEnabled({
        reminderId: 'reminder-1',
        userId: 'user-1',
        enabled: true,
      }),
    ).resolves.toEqual({
      reminderId: 'reminder-1',
      scheduledStartAt: occurrence.startAt,
      streamUrl: occurrence.streamUrl,
    });
    expect(queries.setStreamLiveReminderEnabled).toHaveBeenCalledWith({
      reminderId: 'reminder-1',
      userId: 'user-1',
      enabled: true,
    });
  });

  it('DMs pending subscribers and marks successful reminders delivered', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const fetch = vi.fn().mockResolvedValue({ send });
    queries.findPendingStreamReminders.mockResolvedValue([
      {
        id: 'reminder-1',
        userId: 'user-1',
        videoTitle: 'Davi is live',
        streamUrl: occurrence.streamUrl,
      },
    ]);

    await deliverStreamReminders({
      client: { users: { fetch } } as unknown as Client,
      guildId: 'guild-1',
      occurrence: { ...occurrence, streamIsLive: true },
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.any(Array),
      }),
    );
    expect(queries.markStreamReminderNotified).toHaveBeenCalledWith(
      'reminder-1',
    );
  });
});
