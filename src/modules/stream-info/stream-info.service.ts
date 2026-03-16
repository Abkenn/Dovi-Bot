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
  parseTimeToMinutes,
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

      const resolved = applyOverrideToOccurrence(base, override);
      if (resolved) {
        occurrences.push(resolved);
      }
    }
  }

  return occurrences.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
};

export const getStreamInfo = async (
  guildId: string,
): Promise<StreamInfoResult> => {
  const config = await prisma.guildConfig.findUnique({
    where: { guildId },
  });

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

  const dateKey = input.date ?? targetOccurrence.dateKey;
  const targetLocalDate = DateTime.fromFormat(dateKey, 'yyyy-LL-dd', {
    zone: config.canonicalTimezone,
  });

  let startAtUtc: Date | null = null;

  if (input.time) {
    const minutes = parseTimeToMinutes(input.time);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    startAtUtc = targetLocalDate
      .set({
        hour: hours,
        minute: mins,
        second: 0,
        millisecond: 0,
      })
      .toUTC()
      .toJSDate();
  }

  const updateData: {
    resolvedFromWeekday: typeof targetOccurrence.weekday;
    startAtUtc?: Date | null;
    streamKind?: typeof input.streamKind;
    musicMode?: typeof input.musicMode;
    titleOverride?: string | null;
    gameName?: string | null;
  } = {
    resolvedFromWeekday: targetOccurrence.weekday,
  };

  if (input.time) {
    updateData.startAtUtc = startAtUtc;
  }

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
  }

  return prisma.streamScheduleOverride.upsert({
    where: {
      guildId_streamDateKey: {
        guildId: input.guildId,
        streamDateKey: dateKey,
      },
    },
    update: updateData,
    create: {
      guildId: input.guildId,
      streamDateKey: dateKey,
      resolvedFromWeekday: targetOccurrence.weekday,
      startAtUtc: startAtUtc ?? targetOccurrence.startAt,
      streamKind: input.streamKind ?? null,
      musicMode: input.musicMode ?? null,
      titleOverride: input.title ?? null,
      gameName: input.gameName ?? null,
    },
  });
};
