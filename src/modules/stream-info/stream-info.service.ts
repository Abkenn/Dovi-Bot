import {
  deleteStreamScheduleOverrideForDate,
  ensureGuildStreamConfig as ensureGuildStreamConfigRows,
  findEnabledStreamScheduleDefaults,
  findGuildStreamConfig,
  findStreamScheduleOverridesInDateRange,
  updateDefaultGameName as updateDefaultGameNameRow,
  upsertStreamTitleResetOverride,
} from '@data/queries/stream-info';
import {
  updateDefaultGameAndTargetStreamOverride,
  upsertTargetStreamOverride,
} from '@data/transactions/stream-info';
import { DateTime } from 'luxon';
import type {
  GuildConfig,
  StreamScheduleDefault,
  StreamScheduleOverride,
} from '../../generated/prisma/client';
import { StreamKind } from '../../generated/prisma/client';
import { resolveTargetStream } from './stream-info.target';
import type {
  SetStreamInfoInput,
  StreamInfoResult,
  StreamOccurrence,
} from './stream-info.types';
import {
  applyOverrideToOccurrence,
  buildDefaultOccurrence,
  findCurrentOccurrence,
  findNextOccurrence,
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
        occurrences.push(base);
        continue;
      }

      const resolved = applyOverrideToOccurrence(config, base, override);
      if (resolved) {
        occurrences.push(resolved);
      }
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

  const info = await getStreamInfo(input.guildId);
  const target = resolveTargetStream(DateTime.utc(), info.current, info.next);
  const targetOccurrence = target.occurrence;

  if (!targetOccurrence) {
    throw new Error('No target stream found');
  }

  const switchingToGameWithoutExplicitGame =
    input.streamKind === StreamKind.GAME &&
    (input.gameName === null || input.gameName === undefined) &&
    targetOccurrence.streamKind !== StreamKind.GAME;
  const effectiveStreamKind = input.streamKind ?? targetOccurrence.streamKind;
  const shouldPersistGameName =
    input.gameName !== null &&
    input.gameName !== undefined &&
    effectiveStreamKind === StreamKind.GAME;

  const updateData: {
    resolvedFromWeekday: typeof targetOccurrence.weekday;
    streamKind?: typeof input.streamKind;
    musicMode?: typeof input.musicMode;
    titleOverride?: string | null;
    gameName?: string | null;
  } = {
    resolvedFromWeekday: targetOccurrence.weekday,
  };

  if (input.streamKind !== null && input.streamKind !== undefined) {
    updateData.streamKind = input.streamKind;
  }

  if (input.musicMode !== null && input.musicMode !== undefined) {
    updateData.musicMode = input.musicMode;
  }

  if (input.title !== null && input.title !== undefined) {
    updateData.titleOverride = input.title;
  }

  if (shouldPersistGameName) {
    updateData.gameName = null;
  } else if (input.gameName !== null && input.gameName !== undefined) {
    updateData.gameName = input.gameName;
  } else if (switchingToGameWithoutExplicitGame) {
    updateData.gameName = null;
  }

  const overrideInput = {
    guildId: input.guildId,
    streamDateKey: targetOccurrence.dateKey,
    startAtUtc: targetOccurrence.startAt,
    ...updateData,
    createGameName: shouldPersistGameName ? null : (input.gameName ?? null),
  };

  if (!shouldPersistGameName) {
    return upsertTargetStreamOverride(overrideInput);
  }

  const defaultGameName = input.gameName;
  if (defaultGameName === null || defaultGameName === undefined) {
    return upsertTargetStreamOverride(overrideInput);
  }

  const override = await updateDefaultGameAndTargetStreamOverride({
    guildId: input.guildId,
    defaultGameName,
    override: overrideInput,
  });

  return override;
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
