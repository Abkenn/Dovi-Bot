import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createStreamScheduleOverride = <
  T extends Prisma.StreamScheduleOverrideCreateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.StreamScheduleOverrideCreateArgs>,
) => prisma.streamScheduleOverride.create(args);

export const findUniqueStreamScheduleOverride = <
  T extends Prisma.StreamScheduleOverrideFindUniqueArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.StreamScheduleOverrideFindUniqueArgs>,
) => prisma.streamScheduleOverride.findUnique(args);

export const findUniqueStreamScheduleOverrideOrThrow = <
  T extends Prisma.StreamScheduleOverrideFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<
    T,
    Prisma.StreamScheduleOverrideFindUniqueOrThrowArgs
  >,
) => prisma.streamScheduleOverride.findUniqueOrThrow(args);

export const findFirstStreamScheduleOverride = <
  T extends Prisma.StreamScheduleOverrideFindFirstArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.StreamScheduleOverrideFindFirstArgs>,
) => prisma.streamScheduleOverride.findFirst(args);

export const findManyStreamScheduleOverrides = <
  T extends Prisma.StreamScheduleOverrideFindManyArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.StreamScheduleOverrideFindManyArgs>,
) => prisma.streamScheduleOverride.findMany(args);

export const updateStreamScheduleOverride = <
  T extends Prisma.StreamScheduleOverrideUpdateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.StreamScheduleOverrideUpdateArgs>,
) => prisma.streamScheduleOverride.update(args);

export const updateManyStreamScheduleOverrides = (
  args: Prisma.StreamScheduleOverrideUpdateManyArgs,
) => prisma.streamScheduleOverride.updateMany(args);

export const upsertStreamScheduleOverride = <
  T extends Prisma.StreamScheduleOverrideUpsertArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.StreamScheduleOverrideUpsertArgs>,
) => prisma.streamScheduleOverride.upsert(args);

export const deleteStreamScheduleOverride = <
  T extends Prisma.StreamScheduleOverrideDeleteArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.StreamScheduleOverrideDeleteArgs>,
) => prisma.streamScheduleOverride.delete(args);

export const deleteManyStreamScheduleOverrides = (
  args: Prisma.StreamScheduleOverrideDeleteManyArgs,
) => prisma.streamScheduleOverride.deleteMany(args);

export const countStreamScheduleOverrides = (
  args?: Prisma.StreamScheduleOverrideCountArgs,
) => prisma.streamScheduleOverride.count(args);
