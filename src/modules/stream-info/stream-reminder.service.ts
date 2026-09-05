import {
  deletePermanentStreamReminder,
  ensureStreamReminder,
  findAnnouncedStreamReminders,
  findPendingStreamReminders,
  findPermanentStreamReminderUserIds,
  findStreamReminderForUser,
  hasPermanentStreamReminder,
  markStreamReminderAnnouncementNotified,
  markStreamReminderNotified,
  setStreamLiveReminderEnabled,
  updateStreamReminderAnnouncement,
  upsertPermanentStreamReminder,
  upsertStreamReminder,
} from '@data/queries/stream-reminder';
import type { Client } from 'discord.js';
import {
  buildStreamAnnouncementReminderMessage,
  buildStreamLiveReminderMessage,
} from './stream-info.discord';
import type { StreamOccurrence } from './stream-info.types';
import { isStreamAnnouncementReminderEligible } from './stream-reminder.utils';

export const subscribeToStreamReminder = async ({
  guildId,
  userId,
  occurrence,
}: {
  guildId: string;
  userId: string;
  occurrence: StreamOccurrence;
}) => {
  if (!isStreamAnnouncementReminderEligible(occurrence)) {
    throw new Error('That stream is no longer available for reminders.');
  }

  await upsertStreamReminder({
    guildId,
    userId,
    streamDateKey: occurrence.dateKey,
    streamUrl: occurrence.streamUrl ?? null,
    videoTitle: occurrence.videoTitle?.trim() || null,
    scheduledStartAt: occurrence.startAt,
  });
};

export const setPermanentStreamReminder = async ({
  enabled,
  guildId,
  userId,
}: {
  enabled: boolean;
  guildId: string;
  userId: string;
}) => {
  const input = { guildId, userId };
  if (enabled) {
    await upsertPermanentStreamReminder(input);
    return;
  }

  await deletePermanentStreamReminder(input);
};

export const getPermanentStreamReminderEnabled = (
  guildId: string,
  userId: string,
) => hasPermanentStreamReminder({ guildId, userId });

export const setLiveReminderEnabled = async ({
  enabled,
  reminderId,
  userId,
}: {
  enabled: boolean;
  reminderId: string;
  userId: string;
}) => {
  const reminder = await setStreamLiveReminderEnabled({
    enabled,
    reminderId,
    userId,
  });
  if (!reminder.streamUrl) {
    throw new Error('This live alert is no longer available.');
  }

  return {
    guildId: reminder.guildId,
    reminderId: reminder.id,
    scheduledStartAt: reminder.scheduledStartAt,
    streamUrl: reminder.streamUrl,
  };
};

export const getStreamReminderMessageState = async (
  reminderId: string,
  userId: string,
) => {
  const reminder = await findStreamReminderForUser(reminderId, userId);
  if (!reminder?.streamUrl) {
    throw new Error('This reminder is no longer available.');
  }

  return {
    guildId: reminder.guildId,
    liveAlertEnabled: reminder.liveReminderDisabledAt === null,
    reminderId: reminder.id,
    scheduledStartAt: reminder.scheduledStartAt,
    streamUrl: reminder.streamUrl,
  };
};

export const deliverStreamReminders = async ({
  client,
  guildId,
  occurrence,
}: {
  client: Client;
  guildId: string;
  occurrence: StreamOccurrence | null;
}) => {
  const streamUrl = occurrence?.streamUrl;
  const videoTitle = occurrence?.videoTitle?.trim();
  if (!occurrence || !streamUrl || !videoTitle) {
    return;
  }

  const permanentUserIds = await findPermanentStreamReminderUserIds(guildId);
  for (const userId of permanentUserIds) {
    await ensureStreamReminder({
      guildId,
      userId,
      streamDateKey: occurrence.dateKey,
      streamUrl,
      videoTitle,
      scheduledStartAt: occurrence.startAt,
    });
  }
  const permanentUsers = new Set(permanentUserIds);

  await updateStreamReminderAnnouncement({
    guildId,
    streamDateKey: occurrence.dateKey,
    streamUrl,
    videoTitle,
  });

  if (!occurrence.streamIsLive) {
    const reminders = await findAnnouncedStreamReminders(
      guildId,
      occurrence.dateKey,
    );

    for (const reminder of reminders) {
      try {
        const user = await client.users.fetch(reminder.userId);
        await user.send(
          buildStreamAnnouncementReminderMessage(
            streamUrl,
            occurrence.startAt,
            reminder.id,
            true,
            permanentUsers.has(reminder.userId),
            guildId,
          ),
        );
        await markStreamReminderAnnouncementNotified(reminder.id);
      } catch (error) {
        console.error(
          `Failed to deliver stream announcement reminder ${reminder.id}`,
          error,
        );
      }
    }
    return;
  }

  const reminders = await findPendingStreamReminders(
    guildId,
    occurrence.dateKey,
  );

  for (const reminder of reminders) {
    try {
      const user = await client.users.fetch(reminder.userId);
      await user.send(buildStreamLiveReminderMessage(videoTitle, streamUrl));
      await markStreamReminderNotified(reminder.id);
    } catch (error) {
      console.error(`Failed to deliver stream reminder ${reminder.id}`, error);
    }
  }
};
