import { DateTime } from 'luxon';

const WATCH_TIMEZONE = 'America/Sao_Paulo';
const WATCH_START_MINUTES = 14 * 60 + 40;
const WATCH_END_MINUTES = 15 * 60 + 15;

export const isStreamAnnouncementWatchWindow = (
  now: DateTime<true> | DateTime<false> = DateTime.utc(),
): boolean => {
  const local = now.setZone(WATCH_TIMEZONE);
  const isStreamDay = local.weekday === 5 || local.weekday === 6;
  const minutes = local.hour * 60 + local.minute;

  return (
    isStreamDay && minutes >= WATCH_START_MINUTES && minutes < WATCH_END_MINUTES
  );
};
