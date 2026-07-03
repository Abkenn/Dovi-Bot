import {
  findPendingStreamReminders,
  markStreamReminderNotified,
  upsertStreamReminder,
} from '@data/queries/stream-reminder';
import type { Client } from 'discord.js';
import { buildStreamLiveReminderMessage } from './stream-info.discord';
import type { StreamOccurrence } from './stream-info.types';

export const subscribeToStreamReminder = async ({
  guildId,
  userId,
  occurrence,
}: {
  guildId: string;
  userId: string;
  occurrence: StreamOccurrence;
}) => {
  if (
    !occurrence.streamUrl ||
    !occurrence.videoTitle?.trim() ||
    occurrence.streamIsLive !== false
  ) {
    throw new Error('That stream is no longer available for reminders.');
  }

  await upsertStreamReminder({
    guildId,
    userId,
    streamDateKey: occurrence.dateKey,
    streamUrl: occurrence.streamUrl,
    videoTitle: occurrence.videoTitle.trim(),
    scheduledStartAt: occurrence.startAt,
  });
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
  if (!occurrence?.streamIsLive || !occurrence.streamUrl) {
    return;
  }

  const reminders = await findPendingStreamReminders(
    guildId,
    occurrence.streamUrl,
  );

  for (const reminder of reminders) {
    try {
      const user = await client.users.fetch(reminder.userId);
      await user.send(
        buildStreamLiveReminderMessage(reminder.videoTitle, reminder.streamUrl),
      );
      await markStreamReminderNotified(reminder.id);
    } catch (error) {
      console.error(`Failed to deliver stream reminder ${reminder.id}`, error);
    }
  }
};
