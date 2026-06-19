import { DateTime } from 'luxon';
import {
  type GuildConfig,
  MusicMode,
  StreamKind,
  type StreamScheduleDefault,
  type StreamScheduleOverride,
  type Weekday,
} from '../../generated/prisma/client';
import type { StreamOccurrence, TargetStream } from './stream-info.types';
import { STREAM_CURRENT_FALLBACK_WINDOW_MINUTES } from './stream-schedule.config';

export const WEEKDAY_TO_LUXON: Record<Weekday, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

export const LUXON_WEEKDAY_TO_WEEKDAY: Record<number, Weekday> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
  7: 'SUNDAY',
};

export const makeDateKey = (value: DateTime): string =>
  value.toFormat('yyyy-LL-dd');

export const isOngoingOccurrence = (
  occurrence: StreamOccurrence,
  now: DateTime,
): boolean => {
  const start = DateTime.fromJSDate(occurrence.startAt);
  const end = DateTime.fromJSDate(occurrence.endAt);

  return now >= start && now <= end;
};

export const findCurrentOccurrence = (
  occurrences: readonly StreamOccurrence[],
  now: DateTime,
): StreamOccurrence | null =>
  occurrences.find((occurrence) => isOngoingOccurrence(occurrence, now)) ??
  null;

export const extendOccurrenceCurrentWindow = (
  occurrence: StreamOccurrence,
): StreamOccurrence => {
  const configuredEnd = DateTime.fromJSDate(occurrence.endAt);
  const fallbackEnd = DateTime.fromJSDate(occurrence.startAt).plus({
    minutes: STREAM_CURRENT_FALLBACK_WINDOW_MINUTES,
  });

  return {
    ...occurrence,
    endAt: DateTime.max(configuredEnd, fallbackEnd).toJSDate(),
  };
};

export const findNextOccurrence = (
  occurrences: readonly StreamOccurrence[],
  now: DateTime,
): StreamOccurrence | null =>
  occurrences.find(
    (occurrence) => DateTime.fromJSDate(occurrence.startAt) > now,
  ) ?? null;

export const resolveTargetStream = (
  current: StreamOccurrence | null,
  next: StreamOccurrence | null,
): { target: TargetStream; occurrence: StreamOccurrence | null } => {
  if (current) {
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
  config: GuildConfig,
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
      DateTime.fromJSDate(occurrence.endAt).diff(
        DateTime.fromJSDate(occurrence.startAt),
        'minutes',
      ).minutes,
    );
  const endAt = DateTime.fromJSDate(startAt)
    .plus({ minutes: durationMinutes })
    .toJSDate();

  const streamKind = override.streamKind ?? occurrence.streamKind;
  const musicMode = override.musicMode ?? occurrence.musicMode;
  const title = resolveTitle(
    streamKind,
    musicMode,
    override.titleOverride ?? null,
  );

  let gameName: string | null;

  if (override.gameName !== null && override.gameName !== undefined) {
    gameName = override.gameName;
  } else if (streamKind === StreamKind.GAME) {
    if (occurrence.streamKind === StreamKind.GAME) {
      gameName = occurrence.gameName ?? config.defaultGameName ?? null;
    } else {
      gameName = config.defaultGameName ?? null;
    }
  } else {
    gameName = occurrence.gameName;
  }

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
