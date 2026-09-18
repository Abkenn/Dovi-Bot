import {
  findGuildStreamConfig,
  upsertTargetStreamOverride,
} from '@data/queries/stream-info';
import { StreamKind } from '../../generated/prisma/client';
import { doesVideoTitleIndicateCombinedStream } from './stream-combined-detection';
import type { StreamOccurrence } from './stream-info.types';

export const automaticallyCombinePlannedStream = async (
  guildId: string,
  occurrence: StreamOccurrence,
): Promise<StreamOccurrence> => {
  if (
    occurrence.weekday !== 'FRIDAY' ||
    occurrence.streamKind !== StreamKind.MUSIC ||
    occurrence.isCombined ||
    !occurrence.videoTitle
  ) {
    return occurrence;
  }

  const config = await findGuildStreamConfig(guildId);
  const gameName = config?.defaultGameName?.trim();
  if (
    !gameName ||
    !doesVideoTitleIndicateCombinedStream(occurrence.videoTitle, gameName)
  ) {
    return occurrence;
  }

  await upsertTargetStreamOverride({
    guildId,
    streamDateKey: occurrence.dateKey,
    resolvedFromWeekday: occurrence.weekday,
    startAtUtc: occurrence.startAt,
    isCombined: true,
  });

  return {
    ...occurrence,
    gameName,
    isCombined: true,
    isOverride: true,
  };
};
