import { prisma } from '../../lib/prisma';
import type {
  SetStreamLiveReminderEnabledInput,
  UpdateStreamReminderAnnouncementInput,
  UpsertStreamReminderInput,
} from './stream-reminder.types';

export const upsertStreamReminder = (input: UpsertStreamReminderInput) =>
  prisma.streamReminder.upsert({
    where: {
      guildId_userId_streamDateKey: {
        guildId: input.guildId,
        userId: input.userId,
        streamDateKey: input.streamDateKey,
      },
    },
    update: {
      guildId: input.guildId,
      streamDateKey: input.streamDateKey,
      streamUrl: input.streamUrl,
      videoTitle: input.videoTitle,
      scheduledStartAt: input.scheduledStartAt,
      liveReminderDisabledAt: null,
    },
    create: input,
  });

export const updateStreamReminderAnnouncement = (
  input: UpdateStreamReminderAnnouncementInput,
) =>
  prisma.streamReminder.updateMany({
    where: {
      guildId: input.guildId,
      streamDateKey: input.streamDateKey,
      notifiedAt: null,
    },
    data: {
      streamUrl: input.streamUrl,
      videoTitle: input.videoTitle,
    },
  });

export const findAnnouncedStreamReminders = (
  guildId: string,
  streamDateKey: string,
) =>
  prisma.streamReminder.findMany({
    where: {
      guildId,
      streamDateKey,
      announcementNotifiedAt: null,
      notifiedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });

export const markStreamReminderAnnouncementNotified = (id: string) =>
  prisma.streamReminder.updateMany({
    where: { id, announcementNotifiedAt: null, notifiedAt: null },
    data: { announcementNotifiedAt: new Date() },
  });

export const setStreamLiveReminderEnabled = (
  input: SetStreamLiveReminderEnabledInput,
) =>
  prisma.streamReminder.update({
    where: {
      id: input.reminderId,
      userId: input.userId,
      notifiedAt: null,
    },
    data: { liveReminderDisabledAt: input.enabled ? null : new Date() },
    select: {
      id: true,
      scheduledStartAt: true,
      streamUrl: true,
    },
  });

export const findPendingStreamReminders = (
  guildId: string,
  streamDateKey: string,
) =>
  prisma.streamReminder.findMany({
    where: {
      guildId,
      streamDateKey,
      liveReminderDisabledAt: null,
      notifiedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });

export const markStreamReminderNotified = (id: string) =>
  prisma.streamReminder.updateMany({
    where: { id, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });
