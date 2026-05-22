import type { StreamKind, Weekday } from '../../generated/prisma/client';
import {
  findUniqueGuildConfig,
  updateGuildConfig,
  upsertGuildConfig,
} from '../entity-queries/guild-config';
import {
  findManyStreamScheduleDefaults,
  upsertStreamScheduleDefault,
} from '../entity-queries/stream-schedule-default';
import {
  deleteManyStreamScheduleOverrides,
  findManyStreamScheduleOverrides,
  upsertStreamScheduleOverride,
} from '../entity-queries/stream-schedule-override';

type DefaultStreamScheduleRule = {
  weekday: Weekday;
  startTime: string;
  durationMinutes: number;
  isEnabled: boolean;
};

export const ensureGuildStreamConfig = async ({
  guildId,
  defaultConfig,
  defaultSchedule,
  startTimeToMinutes,
}: {
  guildId: string;
  defaultConfig: {
    canonicalTimezone: string;
    currentWindowMinutes: number;
    lookaheadDays: number;
    defaultStreamKind: StreamKind;
  };
  defaultSchedule: readonly DefaultStreamScheduleRule[];
  startTimeToMinutes: (startTime: string) => number;
}) => {
  const config = await upsertGuildConfig({
    where: { guildId },
    update: {},
    create: {
      guildId,
      ...defaultConfig,
    },
  });

  for (const rule of defaultSchedule) {
    await upsertStreamScheduleDefaultForRule({
      guildId,
      rule,
      startTimeToMinutes,
    });
  }

  return config;
};

const upsertStreamScheduleDefaultForRule = ({
  guildId,
  rule,
  startTimeToMinutes,
}: {
  guildId: string;
  rule: DefaultStreamScheduleRule;
  startTimeToMinutes: (startTime: string) => number;
}) =>
  upsertStreamScheduleDefault({
    where: {
      guildId_weekday: {
        guildId,
        weekday: rule.weekday,
      },
    },
    update: {},
    create: {
      guildId,
      weekday: rule.weekday,
      startMinutes: startTimeToMinutes(rule.startTime),
      durationMinutes: rule.durationMinutes,
      isEnabled: rule.isEnabled,
    },
  });

export const updateDefaultGameName = (guildId: string, gameName: string) =>
  updateGuildConfig({
    where: { guildId },
    data: {
      defaultGameName: gameName,
    },
  });

export const findGuildStreamConfig = (guildId: string) =>
  findUniqueGuildConfig({
    where: { guildId },
  });

export const findEnabledStreamScheduleDefaults = (guildId: string) =>
  findManyStreamScheduleDefaults({
    where: {
      guildId,
      isEnabled: true,
    },
    orderBy: {
      weekday: 'asc',
    },
  });

export const findStreamScheduleOverridesInDateRange = ({
  guildId,
  start,
  end,
}: {
  guildId: string;
  start: string;
  end: string;
}) =>
  findManyStreamScheduleOverrides({
    where: {
      guildId,
      streamDateKey: {
        gte: start,
        lte: end,
      },
    },
  });

export const upsertStreamTitleResetOverride = ({
  guildId,
  streamDateKey,
  resolvedFromWeekday,
  startAtUtc,
}: {
  guildId: string;
  streamDateKey: string;
  resolvedFromWeekday: Weekday | null;
  startAtUtc: Date;
}) =>
  upsertStreamScheduleOverride({
    where: {
      guildId_streamDateKey: {
        guildId,
        streamDateKey,
      },
    },
    update: {
      titleOverride: null,
      resolvedFromWeekday,
    },
    create: {
      guildId,
      streamDateKey,
      resolvedFromWeekday,
      startAtUtc,
      titleOverride: null,
    },
  });

export const deleteStreamScheduleOverrideForDate = ({
  guildId,
  streamDateKey,
}: {
  guildId: string;
  streamDateKey: string;
}) =>
  deleteManyStreamScheduleOverrides({
    where: {
      guildId,
      streamDateKey,
    },
  });
