import {
  deleteStreamScheduleOverrideForDate,
  ensureGuildStreamConfig as ensureGuildStreamConfigRows,
  findEnabledStreamScheduleDefaults,
  findGuildStreamConfig,
  findStreamScheduleOverridesInDateRange,
  updateDefaultGameName as updateDefaultGameNameRow,
  upsertStreamTitleResetOverride,
  upsertTargetStreamOverride,
} from '@data/queries/stream-info';
import {
  updateDefaultGameAndTargetStreamOverride,
  upsertMovedTargetStreamOverride,
} from '@data/transactions/stream-info';
import { DateTime } from 'luxon';
import type {
  GuildConfig,
  StreamScheduleDefault,
  StreamScheduleOverride,
  Weekday,
} from '../../generated/prisma/client';
import {
  MusicMode,
  ScheduleStatus,
  StreamKind,
} from '../../generated/prisma/client';
import type {
  SetStreamInfoInput,
  SkipStreamInput,
  StreamInfoResult,
  StreamOccurrence,
} from './stream-info.types';
import {
  applyOverrideToOccurrence,
  buildDefaultOccurrence,
  findCurrentOccurrence,
  findNextOccurrence,
  LUXON_WEEKDAY_TO_WEEKDAY,
  makeDateKey,
  resolveTargetStream,
  resolveTitle,
  WEEKDAY_TO_LUXON,
} from './stream-info.utils';
import {
  DEFAULT_GUILD_STREAM_CONFIG,
  DEFAULT_STREAM_SCHEDULE,
  startTimeToMinutes,
} from './stream-schedule.config';

const getCandidateDates = (
  nowLocal: DateTime,
  rule: StreamScheduleDefault,
  lookaheadDays: number,
): DateTime[] => {
  const targetWeekday = WEEKDAY_TO_LUXON[rule.weekday];
  const dates: DateTime[] = [];

  for (let i = 0; i <= lookaheadDays; i += 1) {
    const candidate = nowLocal.plus({ days: i }).startOf('day');

    if (candidate.weekday === targetWeekday) {
      dates.push(candidate);
    }
  }

  return dates;
};

const isLastFridayOfMonth = (date: DateTime): boolean =>
  date.weekday === WEEKDAY_TO_LUXON.FRIDAY &&
  date.plus({ days: 7 }).month !== date.month;

const shouldApplyAutomaticMusicFriday = (
  nowLocal: DateTime,
  streamDate: DateTime,
): boolean => {
  if (!isLastFridayOfMonth(streamDate)) {
    return false;
  }

  const activationStart = streamDate.minus({ days: 4 }).startOf('day');

  return nowLocal >= activationStart;
};

const applyAutomaticMusicFridayToOccurrence = (
  nowLocal: DateTime,
  occurrence: StreamOccurrence,
): StreamOccurrence => {
  const streamDate = DateTime.fromJSDate(occurrence.startAt, {
    zone: 'utc',
  }).setZone(nowLocal.zoneName ?? 'utc');

  if (!shouldApplyAutomaticMusicFriday(nowLocal, streamDate)) {
    return occurrence;
  }

  return {
    ...occurrence,
    streamKind: StreamKind.MUSIC,
    musicMode: MusicMode.UNKNOWN,
    title: resolveTitle(StreamKind.MUSIC, MusicMode.UNKNOWN, null),
    gameName: occurrence.gameName,
    isOverride: true,
  };
};

const buildOverrideOnlyOccurrence = (
  config: GuildConfig,
  override: StreamScheduleOverride,
): StreamOccurrence | null => {
  if (override.status === ScheduleStatus.CANCELLED || !override.startAtUtc) {
    return null;
  }

  const streamKind = override.streamKind ?? config.defaultStreamKind;
  const musicMode = override.musicMode ?? config.defaultMusicMode ?? null;
  const durationMinutes =
    override.durationMinutes ?? config.currentWindowMinutes;
  const title = resolveTitle(streamKind, musicMode, override.titleOverride);
  const gameName =
    override.gameName ??
    (streamKind === StreamKind.GAME ? config.defaultGameName : null);
  const weekday =
    override.resolvedFromWeekday ??
    LUXON_WEEKDAY_TO_WEEKDAY[
      DateTime.fromJSDate(override.startAtUtc, {
        zone: 'utc',
      }).setZone(config.canonicalTimezone).weekday
    ] ??
    null;

  return {
    dateKey: override.streamDateKey,
    weekday,
    startAt: override.startAtUtc,
    endAt: new Date(override.startAtUtc.getTime() + durationMinutes * 60000),
    streamKind,
    musicMode,
    title,
    gameName,
    isOverride: true,
  };
};

const buildOccurrences = (
  config: GuildConfig,
  defaults: StreamScheduleDefault[],
  overrides: Map<string, StreamScheduleOverride>,
): StreamOccurrence[] => {
  const nowLocal = DateTime.utc().setZone(config.canonicalTimezone);
  const occurrences: StreamOccurrence[] = [];

  for (const rule of defaults) {
    const dates = getCandidateDates(nowLocal, rule, config.lookaheadDays);

    for (const date of dates) {
      const base = buildDefaultOccurrence(config, rule, date);
      const override = overrides.get(base.dateKey);

      if (!override) {
        occurrences.push(applyAutomaticMusicFridayToOccurrence(nowLocal, base));
        continue;
      }

      const resolved = applyOverrideToOccurrence(config, base, override);
      if (resolved) {
        occurrences.push(resolved);
      }
    }
  }

  const defaultDateKeys = new Set(
    occurrences.map((occurrence) => occurrence.dateKey),
  );
  for (const override of overrides.values()) {
    if (defaultDateKeys.has(override.streamDateKey)) {
      continue;
    }

    const overrideOnlyOccurrence = buildOverrideOnlyOccurrence(
      config,
      override,
    );
    if (overrideOnlyOccurrence) {
      occurrences.push(overrideOnlyOccurrence);
    }
  }

  return occurrences.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
};

const ensureGuildStreamConfig = async (guildId: string) => {
  return ensureGuildStreamConfigRows({
    guildId,
    defaultConfig: DEFAULT_GUILD_STREAM_CONFIG,
    defaultSchedule: DEFAULT_STREAM_SCHEDULE,
    startTimeToMinutes,
  });
};

const updateDefaultGameName = (guildId: string, gameName: string) =>
  updateDefaultGameNameRow(guildId, gameName);

const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

const getDateForWeekdayBeforeTarget = ({
  targetWeekday,
  targetDate,
}: {
  targetWeekday: Weekday;
  targetDate: DateTime;
}): DateTime => {
  const daysFromTarget =
    (targetDate.weekday - WEEKDAY_TO_LUXON[targetWeekday] + 7) % 7;

  return targetDate.minus({ days: daysFromTarget }).startOf('day');
};

const getNextDateForWeekday = (
  nowLocal: DateTime,
  targetWeekday: Weekday,
): DateTime => {
  const daysUntilTarget =
    (WEEKDAY_TO_LUXON[targetWeekday] - nowLocal.weekday + 7) % 7;

  return nowLocal.plus({ days: daysUntilTarget }).startOf('day');
};

const getDefaultRuleForWeekday = (
  defaults: readonly StreamScheduleDefault[],
  targetWeekday: Weekday,
) => defaults.find((rule) => rule.weekday === targetWeekday) ?? null;

const getFallbackScheduleRule = (
  defaults: readonly StreamScheduleDefault[],
): StreamScheduleDefault => {
  const fallback = defaults[0];

  if (!fallback) {
    throw new Error('No enabled stream schedule defaults found');
  }

  return fallback;
};

const buildTargetOccurrenceForWeekday = async ({
  guildId,
  targetWeekday,
}: {
  guildId: string;
  targetWeekday: Weekday | null | undefined;
}): Promise<{
  occurrence: StreamOccurrence;
  movedFromOccurrence: StreamOccurrence | null;
}> => {
  const info = await getStreamInfo(guildId);
  const target = resolveTargetStream(DateTime.utc(), info.current, info.next);

  if (!targetWeekday) {
    if (!target.occurrence) {
      throw new Error('No target stream found');
    }

    return {
      occurrence: target.occurrence,
      movedFromOccurrence: null,
    };
  }

  const config = await findGuildStreamConfig(guildId);
  if (!config) {
    throw new Error(`GuildConfig not found for guildId=${guildId}`);
  }

  if (!target.occurrence) {
    throw new Error('No target stream found');
  }

  const nowLocal = DateTime.utc().setZone(config.canonicalTimezone);
  const targetStreamDate = DateTime.fromJSDate(target.occurrence.startAt, {
    zone: 'utc',
  }).setZone(config.canonicalTimezone);
  const targetDate = getDateForWeekdayBeforeTarget({
    targetWeekday,
    targetDate: targetStreamDate,
  });
  const targetDateKey = makeDateKey(targetDate);
  const targetStreamDateKey = makeDateKey(targetStreamDate);

  if (
    targetDate < nowLocal.startOf('day') ||
    targetDateKey === targetStreamDateKey
  ) {
    throw new Error(
      'Pick a day before the target stream, or use skipstream for later streams.',
    );
  }

  const existingTarget = [info.current, info.next].find(
    (occurrence) => occurrence?.dateKey === targetDateKey,
  );

  if (existingTarget) {
    return {
      occurrence: existingTarget,
      movedFromOccurrence: target.occurrence,
    };
  }

  const defaults = await findEnabledStreamScheduleDefaults(guildId);
  const targetRule =
    getDefaultRuleForWeekday(defaults, targetWeekday) ??
    getFallbackScheduleRule(defaults);

  return {
    occurrence: {
      ...buildDefaultOccurrence(config, targetRule, targetDate),
      dateKey: targetDateKey,
      weekday: targetWeekday,
    },
    movedFromOccurrence: target.occurrence,
  };
};

const buildSkipTargetOccurrenceForWeekday = async ({
  guildId,
  targetWeekday,
}: {
  guildId: string;
  targetWeekday: Weekday | null | undefined;
}): Promise<StreamOccurrence> => {
  const info = await getStreamInfo(guildId);

  if (!targetWeekday) {
    const target = resolveTargetStream(DateTime.utc(), info.current, info.next);

    if (!target.occurrence) {
      throw new Error('No target stream found');
    }

    return target.occurrence;
  }

  const config = await findGuildStreamConfig(guildId);
  if (!config) {
    throw new Error(`GuildConfig not found for guildId=${guildId}`);
  }

  const nowLocal = DateTime.utc().setZone(config.canonicalTimezone);
  const targetDate = getNextDateForWeekday(nowLocal, targetWeekday);
  const targetDateKey = makeDateKey(targetDate);
  const existingTarget = [info.current, info.next].find(
    (occurrence) => occurrence?.dateKey === targetDateKey,
  );

  if (existingTarget) {
    return existingTarget;
  }

  const defaults = await findEnabledStreamScheduleDefaults(guildId);
  const targetRule =
    getDefaultRuleForWeekday(defaults, targetWeekday) ??
    getFallbackScheduleRule(defaults);

  return {
    ...buildDefaultOccurrence(config, targetRule, targetDate),
    dateKey: targetDateKey,
    weekday: targetWeekday,
  };
};

export const getStreamInfoDayAutocomplete = async ({
  guildId,
  query,
}: {
  guildId: string;
  query: string;
}) => {
  const config = await ensureGuildStreamConfig(guildId);

  if (!config) {
    return [];
  }

  const info = await getStreamInfo(guildId);
  const target = resolveTargetStream(DateTime.utc(), info.current, info.next);

  if (!target.occurrence) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const nowLocal = DateTime.utc().setZone(config.canonicalTimezone);
  const today = nowLocal.startOf('day');
  const targetDate = DateTime.fromJSDate(target.occurrence.startAt, {
    zone: 'utc',
  })
    .setZone(config.canonicalTimezone)
    .startOf('day');
  const daysBeforeTarget = Math.floor(targetDate.diff(today, 'days').days);

  if (daysBeforeTarget <= 0) {
    return [];
  }

  const options = Array.from({ length: daysBeforeTarget }).flatMap(
    (_, index) => {
      const date = today.plus({ days: index });
      const weekday = LUXON_WEEKDAY_TO_WEEKDAY[date.weekday];

      if (!weekday) {
        return [];
      }

      return [
        {
          name: `${WEEKDAY_LABELS[weekday]} before ${target.occurrence?.title ?? 'target stream'}`,
          value: weekday,
        },
      ];
    },
  );

  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) =>
    option.name.toLowerCase().includes(normalizedQuery),
  );
};

export const getStreamInfo = async (
  guildId: string,
): Promise<StreamInfoResult> => {
  const config = await ensureGuildStreamConfig(guildId);

  if (!config) {
    throw new Error(`GuildConfig not found for guildId=${guildId}`);
  }

  const defaults = await findEnabledStreamScheduleDefaults(guildId);

  const nowLocal = DateTime.utc().setZone(config.canonicalTimezone);
  const start = nowLocal
    .minus({ days: 1 })
    .startOf('day')
    .toFormat('yyyy-LL-dd');
  const end = nowLocal
    .plus({ days: config.lookaheadDays })
    .endOf('day')
    .toFormat('yyyy-LL-dd');

  const overrideRows = await findStreamScheduleOverridesInDateRange({
    guildId,
    start,
    end,
  });

  const overrides = new Map<string, StreamScheduleOverride>();
  for (const row of overrideRows) {
    overrides.set(row.streamDateKey, row);
  }

  const occurrences = buildOccurrences(config, defaults, overrides);
  const now = DateTime.utc();
  const current = findCurrentOccurrence(occurrences, now);
  const next = findNextOccurrence(occurrences, now);

  return {
    timezone: config.canonicalTimezone,
    current,
    next,
  };
};

export const setDefaultGameName = async (guildId: string, gameName: string) => {
  await ensureGuildStreamConfig(guildId);

  return updateDefaultGameName(guildId, gameName);
};

export const setStreamInfo = async (input: SetStreamInfoInput) => {
  const config = await findGuildStreamConfig(input.guildId);

  if (!config) {
    throw new Error(`GuildConfig not found for guildId=${input.guildId}`);
  }

  const target = await buildTargetOccurrenceForWeekday({
    guildId: input.guildId,
    targetWeekday: input.targetWeekday,
  });
  const targetOccurrence = target.occurrence;

  const explicitGameName = input.gameName;
  const hasExplicitGameName =
    explicitGameName !== null && explicitGameName !== undefined;
  const hasExplicitStreamKind =
    input.streamKind !== null && input.streamKind !== undefined;
  const hasExplicitMusicMode =
    input.musicMode !== null && input.musicMode !== undefined;
  const inferredStreamKind =
    input.streamKind ??
    (hasExplicitMusicMode ? StreamKind.MUSIC : targetOccurrence.streamKind);
  const switchingToGameWithoutExplicitGame =
    inferredStreamKind === StreamKind.GAME &&
    !hasExplicitGameName &&
    targetOccurrence.streamKind !== StreamKind.GAME;
  const shouldPersistGameName =
    hasExplicitGameName && inferredStreamKind === StreamKind.GAME;

  const updateData: {
    resolvedFromWeekday: typeof targetOccurrence.weekday;
    streamKind?: typeof input.streamKind;
    musicMode?: typeof input.musicMode;
    titleOverride?: string | null;
    gameName?: string | null;
  } = {
    resolvedFromWeekday: targetOccurrence.weekday,
  };

  if (hasExplicitStreamKind || hasExplicitMusicMode) {
    updateData.streamKind = inferredStreamKind;
  } else if (targetOccurrence.streamKind === StreamKind.MUSIC) {
    updateData.streamKind = StreamKind.MUSIC;
  }

  if (input.musicMode !== null && input.musicMode !== undefined) {
    updateData.musicMode = input.musicMode;
  }

  if (input.title !== null && input.title !== undefined) {
    updateData.titleOverride = input.title;
  }

  if (shouldPersistGameName) {
    updateData.gameName = null;
  } else if (hasExplicitGameName) {
    updateData.gameName = explicitGameName;
  } else if (switchingToGameWithoutExplicitGame) {
    updateData.gameName = null;
  }

  const overrideInput = {
    guildId: input.guildId,
    streamDateKey: targetOccurrence.dateKey,
    startAtUtc: targetOccurrence.startAt,
    status: ScheduleStatus.SCHEDULED,
    ...updateData,
    createGameName: shouldPersistGameName ? null : (explicitGameName ?? null),
  };
  const cancelledOverrideInput = target.movedFromOccurrence
    ? {
        guildId: input.guildId,
        streamDateKey: target.movedFromOccurrence.dateKey,
        resolvedFromWeekday: target.movedFromOccurrence.weekday,
        startAtUtc: target.movedFromOccurrence.startAt,
        status: ScheduleStatus.CANCELLED,
      }
    : null;

  if (!shouldPersistGameName) {
    if (cancelledOverrideInput) {
      return upsertMovedTargetStreamOverride({
        guildId: input.guildId,
        override: overrideInput,
        cancelledOverride: cancelledOverrideInput,
      });
    }

    return upsertTargetStreamOverride(overrideInput);
  }

  const defaultGameName = explicitGameName;
  if (defaultGameName === null || defaultGameName === undefined) {
    if (cancelledOverrideInput) {
      return upsertMovedTargetStreamOverride({
        guildId: input.guildId,
        override: overrideInput,
        cancelledOverride: cancelledOverrideInput,
      });
    }

    return upsertTargetStreamOverride(overrideInput);
  }

  if (cancelledOverrideInput) {
    return upsertMovedTargetStreamOverride({
      guildId: input.guildId,
      defaultGameName,
      override: overrideInput,
      cancelledOverride: cancelledOverrideInput,
    });
  }

  const override = await updateDefaultGameAndTargetStreamOverride({
    guildId: input.guildId,
    defaultGameName,
    override: overrideInput,
  });

  return override;
};

export const skipStream = async (input: SkipStreamInput) => {
  await ensureGuildStreamConfig(input.guildId);

  const targetOccurrence = await buildSkipTargetOccurrenceForWeekday({
    guildId: input.guildId,
    targetWeekday: input.targetWeekday,
  });

  return upsertTargetStreamOverride({
    guildId: input.guildId,
    streamDateKey: targetOccurrence.dateKey,
    resolvedFromWeekday: targetOccurrence.weekday,
    startAtUtc: targetOccurrence.startAt,
    status: ScheduleStatus.CANCELLED,
  });
};

export const resetStreamTitle = async (guildId: string) => {
  const info = await getStreamInfo(guildId);
  const target = resolveTargetStream(DateTime.utc(), info.current, info.next);
  const targetOccurrence = target.occurrence;

  if (!targetOccurrence) {
    throw new Error('No target stream found');
  }

  return upsertStreamTitleResetOverride({
    guildId,
    streamDateKey: targetOccurrence.dateKey,
    resolvedFromWeekday: targetOccurrence.weekday,
    startAtUtc: targetOccurrence.startAt,
  });
};

export const resetStreamInfo = async (guildId: string) => {
  const info = await getStreamInfo(guildId);
  const target = resolveTargetStream(DateTime.utc(), info.current, info.next);
  const targetOccurrence = target.occurrence;

  if (!targetOccurrence) {
    throw new Error('No target stream found');
  }

  return deleteStreamScheduleOverrideForDate({
    guildId,
    streamDateKey: targetOccurrence.dateKey,
  });
};
