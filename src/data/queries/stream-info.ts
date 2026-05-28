import type {
  MusicMode,
  ScheduleStatus,
  StreamKind,
  Weekday,
} from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

type DefaultStreamScheduleRule = {
  weekday: Weekday;
  startTime: string;
  durationMinutes: number;
  isEnabled: boolean;
};

export type TargetStreamOverrideInput = {
  guildId: string;
  streamDateKey: string;
  resolvedFromWeekday: Weekday | null;
  startAtUtc: Date;
  status?: ScheduleStatus;
  streamKind?: StreamKind | null;
  musicMode?: MusicMode | null;
  titleOverride?: string | null;
  gameName?: string | null;
  createGameName?: string | null;
};

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
}: {
  guildId: string;
  rule: DefaultStreamScheduleRule;
  startTimeToMinutes: (startTime: string) => number;
}) =>
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
}: {
  guildId: string;
  start: string;
  end: string;
}) =>
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
}: {
  guildId: string;
  streamDateKey: string;
  resolvedFromWeekday: Weekday | null;
  startAtUtc: Date;
}) =>
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
