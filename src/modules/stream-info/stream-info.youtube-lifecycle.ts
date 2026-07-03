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

export const YOUTUBE_POLL_AFTER_SCHEDULE_START_MS = 16 * 60 * 60 * 1000;
export const YOUTUBE_RECENT_END_GRACE_MS =
  STREAM_ENDED_LINK_GRACE_MINUTES * 60 * 1000;

const getStatusTime = (status: YouTubeStreamStatus): DateTime | null => {
  const statusTime =
    status.actualStartAt ?? status.scheduledStartAt ?? status.actualEndAt;

  return statusTime ? DateTime.fromJSDate(statusTime) : null;
};

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
        const start = DateTime.fromJSDate(occurrence.startAt);

        return (
          statusTime >= start.minus({ hours: 6 }) &&
          statusTime <= start.plus({ hours: 16 })
        );
      })
      .sort((a, b) => {
        const aDistance = Math.abs(
          DateTime.fromJSDate(a.startAt).diff(statusTime).milliseconds,
        );
        const bDistance = Math.abs(
          DateTime.fromJSDate(b.startAt).diff(statusTime).milliseconds,
        );

        return aDistance - bDistance;
      })[0] ?? null
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
    ? DateTime.fromJSDate(status.actualEndAt)
        .plus({ minutes: STREAM_ENDED_LINK_GRACE_MINUTES })
        .toJSDate()
    : (startAt ? DateTime.fromJSDate(startAt) : now)
        .plus({ minutes: STREAM_CURRENT_FALLBACK_WINDOW_MINUTES })
        .toJSDate();
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
    videoTitle: status.title,
    streamIsLive: status.isLive,
  };
};

const findFallbackOccurrence = (
  occurrences: readonly StreamOccurrence[],
  now: DateTime,
): StreamOccurrence | null => {
  return (
    occurrences.find(
      (occurrence) => DateTime.fromJSDate(occurrence.startAt) > now,
    ) ??
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

  if (status.actualEndAt && DateTime.fromJSDate(current.endAt) <= now) {
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
