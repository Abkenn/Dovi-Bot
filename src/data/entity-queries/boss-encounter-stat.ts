import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createBossEncounterStat = <
  T extends Prisma.BossEncounterStatCreateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossEncounterStatCreateArgs>,
) => prisma.bossEncounterStat.create(args);

export const findUniqueBossEncounterStat = <
  T extends Prisma.BossEncounterStatFindUniqueArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossEncounterStatFindUniqueArgs>,
) => prisma.bossEncounterStat.findUnique(args);

export const findUniqueBossEncounterStatOrThrow = <
  T extends Prisma.BossEncounterStatFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossEncounterStatFindUniqueOrThrowArgs>,
) => prisma.bossEncounterStat.findUniqueOrThrow(args);

export const findFirstBossEncounterStat = <
  T extends Prisma.BossEncounterStatFindFirstArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.BossEncounterStatFindFirstArgs>,
) => prisma.bossEncounterStat.findFirst(args);

export const findManyBossEncounterStats = <
  T extends Prisma.BossEncounterStatFindManyArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.BossEncounterStatFindManyArgs>,
) => prisma.bossEncounterStat.findMany(args);

export const updateBossEncounterStat = <
  T extends Prisma.BossEncounterStatUpdateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossEncounterStatUpdateArgs>,
) => prisma.bossEncounterStat.update(args);

export const updateManyBossEncounterStats = (
  args: Prisma.BossEncounterStatUpdateManyArgs,
) => prisma.bossEncounterStat.updateMany(args);

export const upsertBossEncounterStat = <
  T extends Prisma.BossEncounterStatUpsertArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossEncounterStatUpsertArgs>,
) => prisma.bossEncounterStat.upsert(args);

export const deleteBossEncounterStat = <
  T extends Prisma.BossEncounterStatDeleteArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossEncounterStatDeleteArgs>,
) => prisma.bossEncounterStat.delete(args);

export const deleteManyBossEncounterStats = (
  args: Prisma.BossEncounterStatDeleteManyArgs,
) => prisma.bossEncounterStat.deleteMany(args);

export const countBossEncounterStats = (
  args?: Prisma.BossEncounterStatCountArgs,
) => prisma.bossEncounterStat.count(args);
