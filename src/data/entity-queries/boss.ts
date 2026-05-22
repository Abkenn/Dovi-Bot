import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createBoss = <T extends Prisma.BossCreateArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossCreateArgs>,
) => prisma.boss.create(args);

export const findUniqueBoss = <T extends Prisma.BossFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossFindUniqueArgs>,
) => prisma.boss.findUnique(args);

export const findUniqueBossOrThrow = <
  T extends Prisma.BossFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossFindUniqueOrThrowArgs>,
) => prisma.boss.findUniqueOrThrow(args);

export const findFirstBoss = <T extends Prisma.BossFindFirstArgs>(
  args?: Prisma.SelectSubset<T, Prisma.BossFindFirstArgs>,
) => prisma.boss.findFirst(args);

export const findManyBosses = <T extends Prisma.BossFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.BossFindManyArgs>,
) => prisma.boss.findMany(args);

export const updateBoss = <T extends Prisma.BossUpdateArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossUpdateArgs>,
) => prisma.boss.update(args);

export const updateManyBosses = (args: Prisma.BossUpdateManyArgs) =>
  prisma.boss.updateMany(args);

export const upsertBoss = <T extends Prisma.BossUpsertArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossUpsertArgs>,
) => prisma.boss.upsert(args);

export const deleteBoss = <T extends Prisma.BossDeleteArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossDeleteArgs>,
) => prisma.boss.delete(args);

export const deleteManyBosses = (args: Prisma.BossDeleteManyArgs) =>
  prisma.boss.deleteMany(args);

export const countBosses = (args?: Prisma.BossCountArgs) =>
  prisma.boss.count(args);
