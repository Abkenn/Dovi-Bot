import type { StreamInfoResult, StreamOccurrence } from './stream-info.types';
import { STREAM_REMINDER_EARLY_WINDOW_MINUTES } from './stream-schedule.config';

const STREAM_REMINDER_EARLY_WINDOW_MS =
  STREAM_REMINDER_EARLY_WINDOW_MINUTES * 60 * 1000;

export const isStreamReminderEligible = (
  occurrence: StreamOccurrence | null,
  now = new Date(),
): occurrence is StreamOccurrence => {
  if (!occurrence || occurrence.streamIsLive === true) {
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
