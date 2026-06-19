import { DateTime } from 'luxon';

export const getSignedElapsedSeconds = (from: Date, to: Date) =>
  Math.floor(
    DateTime.fromJSDate(to).diff(DateTime.fromJSDate(from), 'seconds').seconds,
  );

export const getElapsedSeconds = (from: Date, to: Date) =>
  Math.max(0, getSignedElapsedSeconds(from, to));
