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
