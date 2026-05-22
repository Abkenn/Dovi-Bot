import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createBossGame = <T extends Prisma.BossGameCreateArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossGameCreateArgs>,
) => prisma.bossGame.create(args);

export const findUniqueBossGame = <T extends Prisma.BossGameFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossGameFindUniqueArgs>,
) => prisma.bossGame.findUnique(args);

export const findUniqueBossGameOrThrow = <
  T extends Prisma.BossGameFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossGameFindUniqueOrThrowArgs>,
) => prisma.bossGame.findUniqueOrThrow(args);

export const findFirstBossGame = <T extends Prisma.BossGameFindFirstArgs>(
  args?: Prisma.SelectSubset<T, Prisma.BossGameFindFirstArgs>,
) => prisma.bossGame.findFirst(args);

export const findManyBossGames = <T extends Prisma.BossGameFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.BossGameFindManyArgs>,
) => prisma.bossGame.findMany(args);

export const updateBossGame = <T extends Prisma.BossGameUpdateArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossGameUpdateArgs>,
) => prisma.bossGame.update(args);

export const updateManyBossGames = (args: Prisma.BossGameUpdateManyArgs) =>
  prisma.bossGame.updateMany(args);

export const upsertBossGame = <T extends Prisma.BossGameUpsertArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossGameUpsertArgs>,
) => prisma.bossGame.upsert(args);

export const deleteBossGame = <T extends Prisma.BossGameDeleteArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossGameDeleteArgs>,
) => prisma.bossGame.delete(args);

export const deleteManyBossGames = (args: Prisma.BossGameDeleteManyArgs) =>
  prisma.bossGame.deleteMany(args);

export const countBossGames = (args?: Prisma.BossGameCountArgs) =>
  prisma.bossGame.count(args);
