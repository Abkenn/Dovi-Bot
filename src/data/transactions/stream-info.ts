import type {
  MusicMode,
  StreamKind,
  Weekday,
} from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { upsertStreamScheduleOverride } from '../entity-queries/stream-schedule-override';

export type TargetStreamOverrideInput = {
  guildId: string;
  streamDateKey: string;
  resolvedFromWeekday: Weekday | null;
  startAtUtc: Date;
  streamKind?: StreamKind | null;
  musicMode?: MusicMode | null;
  titleOverride?: string | null;
  gameName?: string | null;
  createGameName?: string | null;
};

const buildTargetStreamOverrideUpsertArgs = ({
  guildId,
  streamDateKey,
  resolvedFromWeekday,
  startAtUtc,
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
    streamKind: streamKind ?? null,
    musicMode: musicMode ?? null,
    titleOverride: titleOverride ?? null,
    gameName: createGameName,
  },
});

export const upsertTargetStreamOverride = (input: TargetStreamOverrideInput) =>
  upsertStreamScheduleOverride(buildTargetStreamOverrideUpsertArgs(input));

export const updateDefaultGameAndTargetStreamOverride = async ({
  guildId,
  defaultGameName,
  override,
}: {
  guildId: string;
  defaultGameName: string;
  override: TargetStreamOverrideInput;
}) =>
  prisma.$transaction(async (tx) => {
    await tx.guildConfig.update({
      where: { guildId },
      data: {
        defaultGameName,
      },
    });

    return tx.streamScheduleOverride.upsert(
      buildTargetStreamOverrideUpsertArgs({
        ...override,
        gameName: null,
        createGameName: null,
      }),
    );
  });
