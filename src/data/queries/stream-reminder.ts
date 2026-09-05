import { prisma } from '../../lib/prisma';
import type {
  PermanentStreamReminderInput,
  SetStreamLiveReminderEnabledInput,
  UpdateStreamReminderAnnouncementInput,
  UpsertStreamReminderInput,
} from './stream-reminder.types';

export const upsertPermanentStreamReminder = (
  input: PermanentStreamReminderInput,
) =>
  prisma.permanentStreamReminder.upsert({
    where: { guildId_userId: input },
    update: {},
    create: input,
  });

export const deletePermanentStreamReminder = (
  input: PermanentStreamReminderInput,
) => prisma.permanentStreamReminder.deleteMany({ where: input });

export const findPermanentStreamReminderUserIds = async (guildId: string) => {
  const subscriptions = await prisma.permanentStreamReminder.findMany({
    where: { guildId },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  });

  return subscriptions.map(({ userId }) => userId);
};

export const hasPermanentStreamReminder = async (
  input: PermanentStreamReminderInput,
) => (await prisma.permanentStreamReminder.count({ where: input })) > 0;

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

export const ensureStreamReminder = (input: UpsertStreamReminderInput) =>
  prisma.streamReminder.upsert({
    where: {
      guildId_userId_streamDateKey: {
        guildId: input.guildId,
        userId: input.userId,
        streamDateKey: input.streamDateKey,
      },
    },
    update: {
      streamUrl: input.streamUrl,
      videoTitle: input.videoTitle,
      scheduledStartAt: input.scheduledStartAt,
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
      guildId: true,
      id: true,
      liveReminderDisabledAt: true,
      scheduledStartAt: true,
      streamUrl: true,
    },
  });

export const findStreamReminderForUser = (id: string, userId: string) =>
  prisma.streamReminder.findUnique({
    where: { id, userId },
    select: {
      guildId: true,
      id: true,
      liveReminderDisabledAt: true,
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
