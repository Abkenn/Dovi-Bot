import type { StreamInfoResult, StreamOccurrence } from './stream-info.types';
import { STREAM_REMINDER_EARLY_WINDOW_MINUTES } from './stream-schedule.config';

const STREAM_REMINDER_EARLY_WINDOW_MS =
  STREAM_REMINDER_EARLY_WINDOW_MINUTES * 60 * 1000;

export type StreamReminderOccurrence = StreamOccurrence & {
  streamUrl: string;
  videoTitle: string;
  streamIsLive: false;
};

export const isStreamReminderEligible = (
  occurrence: StreamOccurrence | null,
  now = new Date(),
): occurrence is StreamReminderOccurrence => {
  if (
    !occurrence?.streamUrl ||
    !occurrence.videoTitle?.trim() ||
    occurrence.streamIsLive !== false
  ) {
    return false;
  }

  const startsAt = occurrence.startAt.getTime();
  const nowMs = now.getTime();

  return (
    startsAt - STREAM_REMINDER_EARLY_WINDOW_MS <= nowMs && nowMs < startsAt
  );
};

export const getStreamReminderOccurrence = (
  streamInfo: StreamInfoResult,
): StreamOccurrence | null => {
  if (isStreamReminderEligible(streamInfo.current)) {
    return streamInfo.current;
  }

  if (isStreamReminderEligible(streamInfo.next)) {
    return streamInfo.next;
  }

  return null;
};
