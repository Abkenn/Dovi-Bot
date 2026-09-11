import type { Client } from 'discord.js';
import { refreshTrackedStreamAnnouncement } from './stream-announcement-change.service';
import { getStreamInfo, setDefaultGameName } from './stream-info.service';
import type { StreamInfoResult, StreamOccurrence } from './stream-info.types';

const COMPLETED_ANNOUNCEMENT_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

type SetDefaultStreamGameInput = {
  client: Client;
  gameName: string;
  guildId: string;
};

const hasGameChanged = (
  before: StreamOccurrence | null,
  after: StreamOccurrence | null,
) => before?.dateKey === after?.dateKey && before?.gameName !== after?.gameName;

const getAffectedAnnouncementDateKey = (
  before: StreamInfoResult,
  after: StreamInfoResult,
  now: Date,
) => {
  const displayedGameChanged =
    hasGameChanged(before.current, after.current) ||
    hasGameChanged(before.next, after.next);
  if (!displayedGameChanged) {
    return null;
  }

  if (before.current?.dateKey === after.current?.dateKey && after.current) {
    return after.current.dateKey;
  }

  const previous = after.previous;
  const samePreviousOccurrence =
    previous && before.previous?.dateKey === previous.dateKey;
  const completedAgoMs = previous
    ? now.getTime() - previous.endAt.getTime()
    : Number.POSITIVE_INFINITY;
  const recentlyCompleted =
    completedAgoMs >= 0 &&
    completedAgoMs <= COMPLETED_ANNOUNCEMENT_REFRESH_WINDOW_MS;

  return samePreviousOccurrence && recentlyCompleted ? previous.dateKey : null;
};

export const setDefaultStreamGame = async ({
  client,
  gameName,
  guildId,
}: SetDefaultStreamGameInput) => {
  const before = await getStreamInfo(guildId);
  await setDefaultGameName(guildId, gameName);
  const after = await getStreamInfo(guildId);
  const streamDateKey = getAffectedAnnouncementDateKey(
    before,
    after,
    new Date(),
  );

  if (streamDateKey) {
    await refreshTrackedStreamAnnouncement({
      client,
      guildId,
      streamDateKey,
    });
  }
};
