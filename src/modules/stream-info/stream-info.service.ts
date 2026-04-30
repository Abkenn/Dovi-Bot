import { DateTime } from 'luxon';
import type {
  GuildConfig,
  StreamScheduleDefault,
  StreamScheduleOverride,
} from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { resolveTargetStream } from './stream-info.target';
import type {
  SetStreamInfoInput,
  StreamInfoResult,
  StreamOccurrence,
} from './stream-info.types';
import {
  applyOverrideToOccurrence,
  buildDefaultOccurrence,
  WEEKDAY_TO_LUXON,
} from './stream-info.utils';

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
  const config = await prisma.guildConfig.upsert({
    where: { guildId },
    update: {},
    create: {
      guildId,
      canonicalTimezone: 'America/Sao_Paulo',
      currentWindowMinutes: 240,
      lookaheadDays: 21,
      defaultStreamKind: 'GAME',
    },
  });

  await prisma.streamScheduleDefault.upsert({
    where: {
      guildId_weekday: {
        guildId,
        weekday: 'FRIDAY',
      },
    },
    update: {},
    create: {
      guildId,
      weekday: 'FRIDAY',
      startMinutes: 15 * 60 + 10,
      durationMinutes: 240,
      isEnabled: true,
    },
  });

  await prisma.streamScheduleDefault.upsert({
    where: {
      guildId_weekday: {
        guildId,
        weekday: 'SATURDAY',
      },
    },
    update: {},
    create: {
      guildId,
      weekday: 'SATURDAY',
      startMinutes: 15 * 60 + 10,
      durationMinutes: 240,
      isEnabled: true,
    },
  });

  return config;
};

export const getStreamInfo = async (
  guildId: string,
): Promise<StreamInfoResult> => {
  const config = await ensureGuildStreamConfig(guildId);

  if (!config) {
    throw new Error(`GuildConfig not found for guildId=${guildId}`);
  }

  const defaults = await prisma.streamScheduleDefault.findMany({
    where: {
      guildId,
      isEnabled: true,
    },
    orderBy: {
      weekday: 'asc',
    },
  });

  const nowLocal = DateTime.utc().setZone(config.canonicalTimezone);
  const start = nowLocal
    .minus({ days: 1 })
    .startOf('day')
    .toFormat('yyyy-LL-dd');
  const end = nowLocal
    .plus({ days: config.lookaheadDays })
    .endOf('day')
    .toFormat('yyyy-LL-dd');

  const overrideRows = await prisma.streamScheduleOverride.findMany({
    where: {
      guildId,
      streamDateKey: {
        gte: start,
        lte: end,
      },
    },
  });

  const overrides = new Map<string, StreamScheduleOverride>();
  for (const row of overrideRows) {
    overrides.set(row.streamDateKey, row);
  }

  const occurrences = buildOccurrences(config, defaults, overrides);
  const nowMs = DateTime.utc().toMillis();

  const current =
    occurrences.find(
      (item) =>
        nowMs >= item.startAt.getTime() && nowMs <= item.endAt.getTime(),
    ) ?? null;

  const next =
    occurrences.find((item) => item.startAt.getTime() > nowMs) ?? null;

  return {
    timezone: config.canonicalTimezone,
    current,
    next,
  };
};

export const setDefaultGameName = async (guildId: string, gameName: string) => {
  await ensureGuildStreamConfig(guildId);

  return prisma.guildConfig.update({
    where: { guildId },
    data: {
      defaultGameName: gameName,
    },
  });
};

export const setStreamInfo = async (input: SetStreamInfoInput) => {
  const config = await prisma.guildConfig.findUnique({
    where: { guildId: input.guildId },
  });

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
    input.streamKind === 'GAME' &&
    (input.gameName === null || input.gameName === undefined) &&
    targetOccurrence.streamKind !== 'GAME';

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

  if (input.gameName !== null && input.gameName !== undefined) {
    updateData.gameName = input.gameName;
  } else if (switchingToGameWithoutExplicitGame) {
    updateData.gameName = null;
  }

  return prisma.streamScheduleOverride.upsert({
    where: {
      guildId_streamDateKey: {
        guildId: input.guildId,
        streamDateKey: targetOccurrence.dateKey,
      },
    },
    update: updateData,
    create: {
      guildId: input.guildId,
      streamDateKey: targetOccurrence.dateKey,
      resolvedFromWeekday: targetOccurrence.weekday,
      startAtUtc: targetOccurrence.startAt,
      streamKind: input.streamKind ?? null,
      musicMode: input.musicMode ?? null,
      titleOverride: input.title ?? null,
      gameName: input.gameName ?? null,
    },
  });
};

export const resetStreamTitle = async (guildId: string) => {
  const info = await getStreamInfo(guildId);
  const target = resolveTargetStream(DateTime.utc(), info.current, info.next);
  const targetOccurrence = target.occurrence;

  if (!targetOccurrence) {
    throw new Error('No target stream found');
  }

  return prisma.streamScheduleOverride.upsert({
    where: {
      guildId_streamDateKey: {
        guildId,
        streamDateKey: targetOccurrence.dateKey,
      },
    },
    update: {
      titleOverride: null,
      resolvedFromWeekday: targetOccurrence.weekday,
    },
    create: {
      guildId,
      streamDateKey: targetOccurrence.dateKey,
      resolvedFromWeekday: targetOccurrence.weekday,
      startAtUtc: targetOccurrence.startAt,
      titleOverride: null,
    },
  });
};

export const resetStreamInfo = async (guildId: string) => {
  const info = await getStreamInfo(guildId);
  const target = resolveTargetStream(DateTime.utc(), info.current, info.next);
  const targetOccurrence = target.occurrence;

  if (!targetOccurrence) {
    throw new Error('No target stream found');
  }

  return prisma.streamScheduleOverride.deleteMany({
    where: {
      guildId,
      streamDateKey: targetOccurrence.dateKey,
    },
  });
};
