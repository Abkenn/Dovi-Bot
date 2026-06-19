import { DateTime } from 'luxon';
import type {
  StreamOccurrence,
  YouTubeStreamResolution,
  YouTubeStreamStatus,
} from './stream-info.types';
import { LUXON_WEEKDAY_TO_WEEKDAY, makeDateKey } from './stream-info.utils';
import {
  STREAM_CURRENT_FALLBACK_WINDOW_MINUTES,
  STREAM_ENDED_LINK_GRACE_MINUTES,
} from './stream-schedule.config';

const YOUTUBE_MATCH_BEFORE_SCHEDULE_MS = 6 * 60 * 60 * 1000;
export const YOUTUBE_POLL_AFTER_SCHEDULE_START_MS = 16 * 60 * 60 * 1000;
export const YOUTUBE_RECENT_END_GRACE_MS =
  STREAM_ENDED_LINK_GRACE_MINUTES * 60 * 1000;
const YOUTUBE_CURRENT_FALLBACK_WINDOW_MS =
  STREAM_CURRENT_FALLBACK_WINDOW_MINUTES * 60 * 1000;

const getStatusTime = (status: YouTubeStreamStatus): number | null =>
  (
    status.actualStartAt ??
    status.scheduledStartAt ??
    status.actualEndAt
  )?.getTime() ?? null;

const findMatchingOccurrence = (
  occurrences: readonly StreamOccurrence[],
  status: YouTubeStreamStatus,
): StreamOccurrence | null => {
  const statusTime = getStatusTime(status);

  if (!statusTime) {
    return null;
  }

  return (
    occurrences
      .filter((occurrence) => {
        const startMs = occurrence.startAt.getTime();

        return (
          statusTime >= startMs - YOUTUBE_MATCH_BEFORE_SCHEDULE_MS &&
          statusTime <= startMs + YOUTUBE_POLL_AFTER_SCHEDULE_START_MS
        );
      })
      .sort(
        (a, b) =>
          Math.abs(a.startAt.getTime() - statusTime) -
          Math.abs(b.startAt.getTime() - statusTime),
      )[0] ?? null
  );
};

const applyYouTubeStreamStatus = (
  occurrence: StreamOccurrence,
  status: YouTubeStreamStatus,
  now: DateTime,
  timezone: string,
  isMatchedOccurrence: boolean,
): StreamOccurrence => {
  const startAt = status.actualStartAt ?? status.scheduledStartAt;
  const endAt = status.actualEndAt
    ? new Date(status.actualEndAt.getTime() + YOUTUBE_RECENT_END_GRACE_MS)
    : new Date(
        (startAt?.getTime() ?? now.toMillis()) +
          YOUTUBE_CURRENT_FALLBACK_WINDOW_MS,
      );
  const resolvedStartAt = startAt ?? occurrence.startAt;
  const localStart = DateTime.fromJSDate(resolvedStartAt, {
    zone: 'utc',
  }).setZone(timezone);

  return {
    ...occurrence,
    dateKey: isMatchedOccurrence ? occurrence.dateKey : makeDateKey(localStart),
    weekday: isMatchedOccurrence
      ? occurrence.weekday
      : (LUXON_WEEKDAY_TO_WEEKDAY[localStart.weekday] ?? occurrence.weekday),
    startAt: resolvedStartAt,
    endAt,
    title: isMatchedOccurrence ? occurrence.title : status.title,
    streamUrl: status.url,
  };
};

const findFallbackOccurrence = (
  occurrences: readonly StreamOccurrence[],
  now: DateTime,
): StreamOccurrence | null => {
  const nowMs = now.toMillis();

  return (
    occurrences.find((occurrence) => occurrence.startAt.getTime() > nowMs) ??
    occurrences[0] ??
    null
  );
};

export const resolveYouTubeStreamStatus = ({
  occurrences,
  status,
  now,
  timezone,
}: {
  occurrences: readonly StreamOccurrence[];
  status: YouTubeStreamStatus;
  now: DateTime;
  timezone: string;
}): YouTubeStreamResolution => {
  const matchedOccurrence = findMatchingOccurrence(occurrences, status);
  if (status.actualEndAt && !matchedOccurrence) {
    return {
      current: null,
      suppressedScheduledDateKey: null,
    };
  }

  const occurrence =
    matchedOccurrence ?? findFallbackOccurrence(occurrences, now);

  if (!occurrence) {
    return {
      current: null,
      suppressedScheduledDateKey: null,
    };
  }

  const current = applyYouTubeStreamStatus(
    occurrence,
    status,
    now,
    timezone,
    matchedOccurrence !== null,
  );

  if (status.actualEndAt && current.endAt.getTime() <= now.toMillis()) {
    return {
      current: null,
      suppressedScheduledDateKey: current.dateKey,
    };
  }

  return {
    current,
    suppressedScheduledDateKey: null,
  };
};
