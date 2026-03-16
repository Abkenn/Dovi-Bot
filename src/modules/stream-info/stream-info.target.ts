import type { DateTime } from 'luxon';
import type { StreamOccurrence, TargetStream } from './stream-info.types';

export const resolveTargetStream = (
  now: DateTime,
  current: StreamOccurrence | null,
  next: StreamOccurrence | null,
): { target: TargetStream; occurrence: StreamOccurrence | null } => {
  if (current) {
    const nowMs = now.toMillis();
    const startMs = current.startAt.getTime();
    const endMs = current.endAt.getTime();

    if (nowMs >= startMs && nowMs <= endMs) {
      return {
        target: 'current',
        occurrence: current,
      };
    }
  }

  return {
    target: 'next',
    occurrence: next,
  };
};
