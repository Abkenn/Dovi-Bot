import { prisma } from '../../lib/prisma';
import {
  buildTargetStreamOverrideUpsertArgs,
  type TargetStreamOverrideInput,
} from '../queries/stream-info';
import type { SetDefaultGameAndActivityInput } from './stream-info.types';

export const updateDefaultGameAndActivity = async ({
  guildId,
  gameName,
  normalizedGameName,
}: SetDefaultGameAndActivityInput) =>
  prisma.$transaction(async (tx) => {
    const existingGame = await tx.bossGame.findFirst({
      where: {
        OR: [
          { normalizedName: normalizedGameName },
          { name: { equals: gameName, mode: 'insensitive' } },
          { topicTerms: { some: { normalizedValue: normalizedGameName } } },
        ],
      },
      select: { id: true },
    });
    const game =
      existingGame ??
      (await tx.bossGame.upsert({
        where: { normalizedName: normalizedGameName },
        create: { name: gameName, normalizedName: normalizedGameName },
        update: {},
        select: { id: true },
      }));
    return tx.guildConfig.update({
      where: { guildId },
      data: { defaultGameName: gameName, embeddedAppLiveGameId: game.id },
    });
  });

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

export const upsertMovedTargetStreamOverride = async ({
  guildId,
  defaultGameName,
  override,
  cancelledOverride,
}: {
  guildId: string;
  defaultGameName?: string;
  override: TargetStreamOverrideInput;
  cancelledOverride: TargetStreamOverrideInput;
}) =>
  prisma.$transaction(async (tx) => {
    if (defaultGameName !== undefined) {
      await tx.guildConfig.update({
        where: { guildId },
        data: {
          defaultGameName,
        },
      });
    }

    const movedOverrideInput =
      defaultGameName !== undefined
        ? {
            ...override,
            gameName: null,
            createGameName: null,
          }
        : override;

    const movedOverride = await tx.streamScheduleOverride.upsert(
      buildTargetStreamOverrideUpsertArgs(movedOverrideInput),
    );

    await tx.streamScheduleOverride.upsert(
      buildTargetStreamOverrideUpsertArgs(cancelledOverride),
    );

    return movedOverride;
  });
