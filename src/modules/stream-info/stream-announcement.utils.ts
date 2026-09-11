import { StreamKind } from '../../generated/prisma/client';
import type { StreamAnnouncementEdits } from './stream-announcement.types';
import type { StreamInfoResult, StreamOccurrence } from './stream-info.types';
import { resolveTitle } from './stream-info.utils';
import { isStreamReminderEligible } from './stream-reminder.utils';

const STREAM_ANNOUNCEMENT_REVIEW_LEAD_MS = 50 * 60 * 1000;
const STREAM_ANNOUNCEMENT_UPDATE_LEAD_MS = 60 * 60 * 1000;
const STREAM_ANNOUNCEMENT_UPDATE_AFTER_START_MS = 8 * 60 * 60 * 1000;

export const isStreamAnnouncementReviewDue = (
  occurrence: StreamOccurrence,
  now = new Date(),
) => {
  const nowMs = now.getTime();
  const startMs = occurrence.startAt.getTime();

  return (
    startMs - STREAM_ANNOUNCEMENT_REVIEW_LEAD_MS <= nowMs && nowMs < startMs
  );
};

export const isStreamAnnouncementEligible = (
  occurrence: StreamOccurrence | null,
): occurrence is StreamOccurrence =>
  occurrence?.streamIsLive === true || isStreamReminderEligible(occurrence);

export const findEditableStreamAnnouncementOccurrence = (
  streamInfo: StreamInfoResult,
  now = new Date(),
): StreamOccurrence | null => {
  const nowMs = now.getTime();

  return (
    [streamInfo.current, streamInfo.next, streamInfo.previous].find(
      (occurrence) => {
        if (!occurrence) {
          return false;
        }

        const startMs = occurrence.startAt.getTime();
        return (
          startMs - STREAM_ANNOUNCEMENT_UPDATE_LEAD_MS <= nowMs &&
          nowMs <= startMs + STREAM_ANNOUNCEMENT_UPDATE_AFTER_START_MS
        );
      },
    ) ?? null
  );
};

const applyEditsToOccurrence = (
  occurrence: StreamOccurrence,
  edits: StreamAnnouncementEdits,
): StreamOccurrence => {
  const streamKind =
    edits.streamKind ??
    (edits.musicMode ? StreamKind.MUSIC : occurrence.streamKind);
  const musicMode =
    streamKind === StreamKind.MUSIC
      ? (edits.musicMode ?? occurrence.musicMode)
      : null;
  const title =
    edits.streamKind || edits.musicMode
      ? resolveTitle(streamKind, musicMode, null)
      : occurrence.title;

  return {
    ...occurrence,
    streamKind,
    musicMode,
    musicTheme:
      streamKind === StreamKind.MUSIC
        ? (edits.musicTheme ?? occurrence.musicTheme)
        : null,
    title,
    customTitle: edits.title ?? occurrence.customTitle,
    gameName: edits.gameName ?? occurrence.gameName,
    videoTitle: edits.videoTitle ?? occurrence.videoTitle,
    streamUrl: edits.streamUrl ?? occurrence.streamUrl,
  };
};

export const applyStreamAnnouncementEdits = (
  streamInfo: StreamInfoResult,
  streamDateKey: string,
  edits: StreamAnnouncementEdits,
): StreamInfoResult => {
  let matched = false;
  const updateOccurrence = (occurrence: StreamOccurrence | null) => {
    if (!occurrence || occurrence.dateKey !== streamDateKey) {
      return occurrence;
    }

    matched = true;
    return applyEditsToOccurrence(occurrence, edits);
  };
  const updated = {
    ...streamInfo,
    current: updateOccurrence(streamInfo.current),
    previous: updateOccurrence(streamInfo.previous),
    next: updateOccurrence(streamInfo.next),
  };

  if (!matched) {
    throw new Error('The stored announcement no longer has its stream data.');
  }

  return updated;
};
