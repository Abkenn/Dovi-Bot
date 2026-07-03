import { prisma } from '../../lib/prisma';
import type { UpsertStreamReminderInput } from './stream-reminder.types';

export const upsertStreamReminder = (input: UpsertStreamReminderInput) =>
  prisma.streamReminder.upsert({
    where: {
      userId_streamUrl: {
        userId: input.userId,
        streamUrl: input.streamUrl,
      },
    },
    update: {
      guildId: input.guildId,
      streamDateKey: input.streamDateKey,
      videoTitle: input.videoTitle,
      scheduledStartAt: input.scheduledStartAt,
      notifiedAt: null,
    },
    create: input,
  });

export const findPendingStreamReminders = (
  guildId: string,
  streamUrl: string,
) =>
  prisma.streamReminder.findMany({
    where: {
      guildId,
      streamUrl,
      notifiedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });

export const markStreamReminderNotified = (id: string) =>
  prisma.streamReminder.updateMany({
    where: { id, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });
