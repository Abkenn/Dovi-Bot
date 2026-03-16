import type { DateTime } from 'luxon';
import { z } from 'zod';
import {
  type GuildConfig,
  MusicMode,
  StreamKind,
  type StreamScheduleDefault,
  type StreamScheduleOverride,
  type Weekday,
} from '../../generated/prisma/client';
import type { StreamOccurrence } from './stream-info.types';

export const WEEKDAY_TO_LUXON: Record<Weekday, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

export const makeDateKey = (value: DateTime): string =>
  value.toFormat('yyyy-LL-dd');

const timeSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      const parts = val.split(':');
      if (parts.length !== 2) return false;

      const hoursStr = parts[0];
      const minutesStr = parts[1];

      if (!hoursStr || !minutesStr) return false;

      const hours = Number.parseInt(hoursStr, 10);
      const minutes = Number.parseInt(minutesStr, 10);

      return (
        !Number.isNaN(hours) &&
        !Number.isNaN(minutes) &&
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59
      );
    },
    { message: 'Time must be in HH:mm format' },
  )
  .transform((val) => {
    const [hoursStr, minutesStr] = val.split(':');
    return Number(hoursStr) * 60 + Number(minutesStr);
  });

export const parseTimeToMinutes = (value: string | undefined): number => {
  if (!value) {
    throw new Error('Time must be in HH:mm format');
  }

  return timeSchema.parse(value);
};

export const resolveTitle = (
  streamKind: StreamKind,
  musicMode: MusicMode | null,
  titleOverride: string | null,
): string => {
  if (titleOverride) {
    return titleOverride;
  }

  if (streamKind === StreamKind.MUSIC) {
    switch (musicMode) {
      case MusicMode.DEMOCRACY:
        return 'Democracy Stream';
      case MusicMode.DICTATORSHIP:
        return 'Dictatorship Stream';
      case MusicMode.CAPITALISM:
        return 'Capitalism Stream';
      default:
        return 'Music Stream';
    }
  }

  if (streamKind === StreamKind.GAME) {
    return 'Game Stream';
  }

  return 'Stream';
};

export const resolveBaseStreamKind = (
  config: GuildConfig,
  rule: StreamScheduleDefault,
): StreamKind => rule.streamKind ?? config.defaultStreamKind;

export const resolveBaseMusicMode = (
  config: GuildConfig,
  rule: StreamScheduleDefault,
): MusicMode | null => rule.musicMode ?? config.defaultMusicMode ?? null;

export const resolveBaseTitle = (
  config: GuildConfig,
  rule: StreamScheduleDefault,
  streamKind: StreamKind,
  musicMode: MusicMode | null,
): string =>
  resolveTitle(
    streamKind,
    musicMode,
    rule.titleOverride ?? config.defaultTitleOverride ?? null,
  );

export const resolveBaseGameName = (
  config: GuildConfig,
  rule: StreamScheduleDefault,
  streamKind: StreamKind,
): string | null => {
  if (streamKind !== StreamKind.GAME) {
    return rule.gameName ?? null;
  }

  return rule.gameName ?? config.defaultGameName ?? null;
};

export const buildDefaultOccurrence = (
  config: GuildConfig,
  rule: StreamScheduleDefault,
  localDate: DateTime,
): StreamOccurrence => {
  const hours = Math.floor(rule.startMinutes / 60);
  const minutes = rule.startMinutes % 60;

  const localStart = localDate.set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0,
  });

  const streamKind = resolveBaseStreamKind(config, rule);
  const musicMode = resolveBaseMusicMode(config, rule);
  const title = resolveBaseTitle(config, rule, streamKind, musicMode);
  const gameName = resolveBaseGameName(config, rule, streamKind);

  return {
    dateKey: makeDateKey(localDate),
    weekday: rule.weekday,
    startAt: localStart.toUTC().toJSDate(),
    endAt: localStart
      .plus({ minutes: rule.durationMinutes })
      .toUTC()
      .toJSDate(),
    streamKind,
    musicMode,
    title,
    gameName,
    isOverride: false,
  };
};

export const applyOverrideToOccurrence = (
  occurrence: StreamOccurrence,
  override: StreamScheduleOverride,
): StreamOccurrence | null => {
  if (override.status === 'CANCELLED') {
    return null;
  }

  const startAt = override.startAtUtc ?? occurrence.startAt;
  const durationMinutes =
    override.durationMinutes ??
    Math.round(
      (occurrence.endAt.getTime() - occurrence.startAt.getTime()) / 60000,
    );
  const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

  const streamKind = override.streamKind ?? occurrence.streamKind;
  const musicMode = override.musicMode ?? occurrence.musicMode;
  const title = resolveTitle(
    streamKind,
    musicMode,
    override.titleOverride ?? null,
  );
  const gameName =
    override.gameName !== null && override.gameName !== undefined
      ? override.gameName
      : occurrence.gameName;

  return {
    ...occurrence,
    startAt,
    endAt,
    streamKind,
    musicMode,
    title,
    gameName,
    isOverride: true,
  };
};
