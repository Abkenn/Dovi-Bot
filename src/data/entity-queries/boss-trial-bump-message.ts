import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createBossTrialBumpMessage = <
  T extends Prisma.BossTrialBumpMessageCreateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialBumpMessageCreateArgs>,
) => prisma.bossTrialBumpMessage.create(args);

export const findUniqueBossTrialBumpMessage = <
  T extends Prisma.BossTrialBumpMessageFindUniqueArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialBumpMessageFindUniqueArgs>,
) => prisma.bossTrialBumpMessage.findUnique(args);

export const findUniqueBossTrialBumpMessageOrThrow = <
  T extends Prisma.BossTrialBumpMessageFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<
    T,
    Prisma.BossTrialBumpMessageFindUniqueOrThrowArgs
  >,
) => prisma.bossTrialBumpMessage.findUniqueOrThrow(args);

export const findFirstBossTrialBumpMessage = <
  T extends Prisma.BossTrialBumpMessageFindFirstArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.BossTrialBumpMessageFindFirstArgs>,
) => prisma.bossTrialBumpMessage.findFirst(args);

export const findManyBossTrialBumpMessages = <
  T extends Prisma.BossTrialBumpMessageFindManyArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.BossTrialBumpMessageFindManyArgs>,
) => prisma.bossTrialBumpMessage.findMany(args);

export const updateBossTrialBumpMessage = <
  T extends Prisma.BossTrialBumpMessageUpdateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialBumpMessageUpdateArgs>,
) => prisma.bossTrialBumpMessage.update(args);

export const updateManyBossTrialBumpMessages = (
  args: Prisma.BossTrialBumpMessageUpdateManyArgs,
) => prisma.bossTrialBumpMessage.updateMany(args);

export const upsertBossTrialBumpMessage = <
  T extends Prisma.BossTrialBumpMessageUpsertArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialBumpMessageUpsertArgs>,
) => prisma.bossTrialBumpMessage.upsert(args);

export const deleteBossTrialBumpMessage = <
  T extends Prisma.BossTrialBumpMessageDeleteArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialBumpMessageDeleteArgs>,
) => prisma.bossTrialBumpMessage.delete(args);

export const deleteManyBossTrialBumpMessages = (
  args: Prisma.BossTrialBumpMessageDeleteManyArgs,
) => prisma.bossTrialBumpMessage.deleteMany(args);

export const countBossTrialBumpMessages = (
  args?: Prisma.BossTrialBumpMessageCountArgs,
) => prisma.bossTrialBumpMessage.count(args);
