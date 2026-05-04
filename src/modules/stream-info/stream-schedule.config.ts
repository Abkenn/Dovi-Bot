import { DateTime } from 'luxon';
import { StreamKind, type Weekday } from '../../generated/prisma/client';

type DefaultStreamScheduleRule = {
  weekday: Weekday;
  startTime: string;
  durationMinutes: number;
  isEnabled: boolean;
};

export const DEFAULT_GUILD_STREAM_CONFIG = {
  canonicalTimezone: 'America/Sao_Paulo',
  currentWindowMinutes: 240,
  lookaheadDays: 21,
  defaultStreamKind: StreamKind.GAME,
} as const;

export const DEFAULT_STREAM_SCHEDULE = [
  {
    weekday: 'FRIDAY',
    startTime: '15:10',
    durationMinutes: 240,
    isEnabled: true,
  },
  {
    weekday: 'SATURDAY',
    startTime: '15:10',
    durationMinutes: 240,
    isEnabled: true,
  },
] as const satisfies readonly DefaultStreamScheduleRule[];

export const startTimeToMinutes = (startTime: string): number => {
  const parsed = DateTime.fromFormat(startTime, 'H:mm', { zone: 'UTC' });

  if (!parsed.isValid) {
    throw new Error(`Invalid stream schedule start time: ${startTime}`);
  }

  return parsed.hour * 60 + parsed.minute;
};
