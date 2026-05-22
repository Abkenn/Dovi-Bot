import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createBossTrial = <T extends Prisma.BossTrialCreateArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialCreateArgs>,
) => prisma.bossTrial.create(args);

export const findUniqueBossTrial = <T extends Prisma.BossTrialFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialFindUniqueArgs>,
) => prisma.bossTrial.findUnique(args);

export const findUniqueBossTrialOrThrow = <
  T extends Prisma.BossTrialFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialFindUniqueOrThrowArgs>,
) => prisma.bossTrial.findUniqueOrThrow(args);

export const findFirstBossTrial = <T extends Prisma.BossTrialFindFirstArgs>(
  args?: Prisma.SelectSubset<T, Prisma.BossTrialFindFirstArgs>,
) => prisma.bossTrial.findFirst(args);

export const findManyBossTrials = <T extends Prisma.BossTrialFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.BossTrialFindManyArgs>,
) => prisma.bossTrial.findMany(args);

export const updateBossTrial = <T extends Prisma.BossTrialUpdateArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialUpdateArgs>,
) => prisma.bossTrial.update(args);

export const updateManyBossTrials = (args: Prisma.BossTrialUpdateManyArgs) =>
  prisma.bossTrial.updateMany(args);

export const upsertBossTrial = <T extends Prisma.BossTrialUpsertArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialUpsertArgs>,
) => prisma.bossTrial.upsert(args);

export const deleteBossTrial = <T extends Prisma.BossTrialDeleteArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialDeleteArgs>,
) => prisma.bossTrial.delete(args);

export const deleteManyBossTrials = (args: Prisma.BossTrialDeleteManyArgs) =>
  prisma.bossTrial.deleteMany(args);

export const countBossTrials = (args?: Prisma.BossTrialCountArgs) =>
  prisma.bossTrial.count(args);
