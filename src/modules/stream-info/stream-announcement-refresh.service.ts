import type { Client } from 'discord.js';
import { refreshTrackedStreamAnnouncement } from './stream-announcement-change.service';
import { getStreamInfo } from './stream-info.service';

type RefreshRelevantTrackedStreamAnnouncementsInput = {
  additionalStreamDateKey?: string;
  client: Client;
  guildId: string;
};

export const refreshRelevantTrackedStreamAnnouncements = async ({
  additionalStreamDateKey,
  client,
  guildId,
}: RefreshRelevantTrackedStreamAnnouncementsInput) => {
  const streamInfo = await getStreamInfo(guildId);
  const latestOccurrence = streamInfo.current ?? streamInfo.previous;
  const streamDateKeys = new Set<string>();

  if (latestOccurrence) {
    streamDateKeys.add(latestOccurrence.dateKey);
  }
  if (streamInfo.next) {
    streamDateKeys.add(streamInfo.next.dateKey);
  }
  if (additionalStreamDateKey) {
    streamDateKeys.add(additionalStreamDateKey);
  }

  for (const streamDateKey of streamDateKeys) {
    await refreshTrackedStreamAnnouncement({
      client,
      guildId,
      streamDateKey,
    });
  }
};
