import { prisma } from '../../lib/prisma';
import type {
  EnsureGuildStreamConfigInput,
  FindStreamScheduleOverridesInDateRangeInput,
  TargetStreamOverrideInput,
  UpsertStreamScheduleDefaultForRuleInput,
  UpsertStreamTitleResetOverrideInput,
} from './stream-info.types';

export type { TargetStreamOverrideInput } from './stream-info.types';

export const buildTargetStreamOverrideUpsertArgs = ({
  guildId,
  streamDateKey,
  resolvedFromWeekday,
  startAtUtc,
  status,
  streamKind,
  musicMode,
  titleOverride,
  gameName,
  createGameName = gameName ?? null,
}: TargetStreamOverrideInput) => ({
  where: {
    guildId_streamDateKey: {
      guildId,
      streamDateKey,
    },
  },
  update: {
    resolvedFromWeekday,
    ...(status !== undefined ? { status } : {}),
    ...(streamKind !== undefined ? { streamKind } : {}),
    ...(musicMode !== undefined ? { musicMode } : {}),
    ...(titleOverride !== undefined ? { titleOverride } : {}),
    ...(gameName !== undefined ? { gameName } : {}),
  },
  create: {
    guildId,
    streamDateKey,
    resolvedFromWeekday,
    startAtUtc,
    ...(status !== undefined ? { status } : {}),
    streamKind: streamKind ?? null,
    musicMode: musicMode ?? null,
    titleOverride: titleOverride ?? null,
    gameName: createGameName,
  },
});

export const ensureGuildStreamConfig = async ({
  guildId,
  defaultConfig,
  defaultSchedule,
  startTimeToMinutes,
}: EnsureGuildStreamConfigInput) => {
  const config = await prisma.guildConfig.upsert({
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
}: UpsertStreamScheduleDefaultForRuleInput) =>
  prisma.streamScheduleDefault.upsert({
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
  prisma.guildConfig.update({
    where: { guildId },
    data: {
      defaultGameName: gameName,
    },
  });

export const upsertTargetStreamOverride = (input: TargetStreamOverrideInput) =>
  prisma.streamScheduleOverride.upsert(
    buildTargetStreamOverrideUpsertArgs(input),
  );

export const findGuildStreamConfig = (guildId: string) =>
  prisma.guildConfig.findUnique({
    where: { guildId },
  });

export const findEnabledStreamScheduleDefaults = (guildId: string) =>
  prisma.streamScheduleDefault.findMany({
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
}: FindStreamScheduleOverridesInDateRangeInput) =>
  prisma.streamScheduleOverride.findMany({
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
}: UpsertStreamTitleResetOverrideInput) =>
  prisma.streamScheduleOverride.upsert({
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
  prisma.streamScheduleOverride.deleteMany({
    where: {
      guildId,
      streamDateKey,
    },
  });
