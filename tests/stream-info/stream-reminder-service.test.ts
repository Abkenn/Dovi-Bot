import type { Client } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamKind } from '../../src/generated/prisma/client';

const queries = vi.hoisted(() => ({
  deletePermanentStreamReminder: vi.fn(),
  ensureStreamReminder: vi.fn(),
  findPermanentStreamReminderUserIds: vi.fn(),
  setStreamLiveReminderEnabled: vi.fn(),
  findAnnouncedStreamReminders: vi.fn(),
  findPendingStreamReminders: vi.fn(),
  findStreamReminderForUser: vi.fn(),
  hasPermanentStreamReminder: vi.fn(),
  markStreamReminderAnnouncementNotified: vi.fn(),
  markStreamReminderNotified: vi.fn(),
  updateStreamReminderAnnouncement: vi.fn(),
  upsertStreamReminder: vi.fn(),
  upsertPermanentStreamReminder: vi.fn(),
}));

vi.mock('@data/queries/stream-reminder', () => queries);
vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: vi.fn(),
}));

import type { StreamOccurrence } from '../../src/modules/stream-info/stream-info.types';
import {
  deliverStreamReminders,
  getPermanentStreamReminderEnabled,
  getStreamReminderMessageState,
  setLiveReminderEnabled,
  setPermanentStreamReminder,
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
  customTitle: null,
  musicTheme: null,
  gameName: 'Dark Souls III',
  streamUrl: 'https://youtube.test/watch?v=stream',
  videoTitle: 'Davi is live',
  streamIsLive: false,
  isOverride: false,
};

describe('stream reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.findPermanentStreamReminderUserIds.mockResolvedValue([]);
  });

  it('enables and disables reminders for all future streams', async () => {
    await setPermanentStreamReminder({
      enabled: true,
      guildId: 'guild-1',
      userId: 'user-1',
    });
    await setPermanentStreamReminder({
      enabled: false,
      guildId: 'guild-1',
      userId: 'user-1',
    });

    expect(queries.upsertPermanentStreamReminder).toHaveBeenCalledWith({
      guildId: 'guild-1',
      userId: 'user-1',
    });
    expect(queries.deletePermanentStreamReminder).toHaveBeenCalledWith({
      guildId: 'guild-1',
      userId: 'user-1',
    });
  });

  it('reads the permanent preference and an owned reminder message state', async () => {
    queries.hasPermanentStreamReminder.mockResolvedValue(true);
    queries.findStreamReminderForUser.mockResolvedValue({
      guildId: 'guild-1',
      id: 'reminder-1',
      liveReminderDisabledAt: null,
      scheduledStartAt: occurrence.startAt,
      streamUrl: occurrence.streamUrl,
    });

    await expect(
      getPermanentStreamReminderEnabled('guild-1', 'user-1'),
    ).resolves.toBe(true);
    await expect(
      getStreamReminderMessageState('reminder-1', 'user-1'),
    ).resolves.toEqual({
      guildId: 'guild-1',
      liveAlertEnabled: true,
      reminderId: 'reminder-1',
      scheduledStartAt: occurrence.startAt,
      streamUrl: occurrence.streamUrl,
    });
  });

  it('rejects a missing owned reminder message state', async () => {
    queries.findStreamReminderForUser.mockResolvedValue(null);

    await expect(
      getStreamReminderMessageState('missing', 'user-1'),
    ).rejects.toThrow('This reminder is no longer available.');
  });

  it('rejects subscriptions after a stream has started', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(occurrence.startAt);

    await expect(
      subscribeToStreamReminder({
        guildId: 'guild-1',
        userId: 'user-1',
        occurrence,
      }),
    ).rejects.toThrow('That stream is no longer available for reminders.');
  });

  it('creates the current stream reminder for permanent subscribers before delivery', async () => {
    queries.findPermanentStreamReminderUserIds.mockResolvedValue([
      'user-1',
      'user-2',
    ]);
    queries.findAnnouncedStreamReminders.mockResolvedValue([]);

    await deliverStreamReminders({
      client: { users: { fetch: vi.fn() } } as unknown as Client,
      guildId: 'guild-1',
      occurrence,
    });

    expect(queries.ensureStreamReminder).toHaveBeenCalledTimes(2);
    expect(queries.ensureStreamReminder).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    );
    expect(queries.ensureStreamReminder).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2' }),
    );
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
      guildId: 'guild-1',
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
      guildId: 'guild-1',
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
