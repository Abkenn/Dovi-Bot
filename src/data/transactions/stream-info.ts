import { prisma } from '../../lib/prisma';
import {
  buildTargetStreamOverrideUpsertArgs,
  type TargetStreamOverrideInput,
} from '../queries/stream-info';

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
