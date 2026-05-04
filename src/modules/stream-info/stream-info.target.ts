import type { DateTime } from 'luxon';
import type { StreamOccurrence, TargetStream } from './stream-info.types';
import { isOngoingOccurrence } from './stream-info.utils';

export const resolveTargetStream = (
  now: DateTime,
  current: StreamOccurrence | null,
  next: StreamOccurrence | null,
): { target: TargetStream; occurrence: StreamOccurrence | null } => {
  if (current && isOngoingOccurrence(current, now)) {
    return {
      target: 'current',
      occurrence: current,
    };
  }

  return {
    target: 'next',
    occurrence: next,
  };
};
