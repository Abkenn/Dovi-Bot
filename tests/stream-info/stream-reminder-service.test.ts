import type { Client } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamKind } from '../../src/generated/prisma/client';

const queries = vi.hoisted(() => ({
  findPendingStreamReminders: vi.fn(),
  markStreamReminderNotified: vi.fn(),
  upsertStreamReminder: vi.fn(),
}));

vi.mock('@data/queries/stream-reminder', () => queries);
vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: vi.fn(),
}));

import type { StreamOccurrence } from '../../src/modules/stream-info/stream-info.types';
import {
  deliverStreamReminders,
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
