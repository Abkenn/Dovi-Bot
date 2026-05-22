import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createBossTrialVote = <T extends Prisma.BossTrialVoteCreateArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialVoteCreateArgs>,
) => prisma.bossTrialVote.create(args);

export const findUniqueBossTrialVote = <
  T extends Prisma.BossTrialVoteFindUniqueArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialVoteFindUniqueArgs>,
) => prisma.bossTrialVote.findUnique(args);

export const findUniqueBossTrialVoteOrThrow = <
  T extends Prisma.BossTrialVoteFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialVoteFindUniqueOrThrowArgs>,
) => prisma.bossTrialVote.findUniqueOrThrow(args);

export const findFirstBossTrialVote = <
  T extends Prisma.BossTrialVoteFindFirstArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.BossTrialVoteFindFirstArgs>,
) => prisma.bossTrialVote.findFirst(args);

export const findManyBossTrialVotes = <
  T extends Prisma.BossTrialVoteFindManyArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.BossTrialVoteFindManyArgs>,
) => prisma.bossTrialVote.findMany(args);

export const updateBossTrialVote = <T extends Prisma.BossTrialVoteUpdateArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialVoteUpdateArgs>,
) => prisma.bossTrialVote.update(args);

export const updateManyBossTrialVotes = (
  args: Prisma.BossTrialVoteUpdateManyArgs,
) => prisma.bossTrialVote.updateMany(args);

export const upsertBossTrialVote = <T extends Prisma.BossTrialVoteUpsertArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialVoteUpsertArgs>,
) => prisma.bossTrialVote.upsert(args);

export const deleteBossTrialVote = <T extends Prisma.BossTrialVoteDeleteArgs>(
  args: Prisma.SelectSubset<T, Prisma.BossTrialVoteDeleteArgs>,
) => prisma.bossTrialVote.delete(args);

export const deleteManyBossTrialVotes = (
  args: Prisma.BossTrialVoteDeleteManyArgs,
) => prisma.bossTrialVote.deleteMany(args);

export const countBossTrialVotes = (args?: Prisma.BossTrialVoteCountArgs) =>
  prisma.bossTrialVote.count(args);
