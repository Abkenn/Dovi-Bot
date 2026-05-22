import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createStreamScheduleDefault = <
  T extends Prisma.StreamScheduleDefaultCreateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.StreamScheduleDefaultCreateArgs>,
) => prisma.streamScheduleDefault.create(args);

export const findUniqueStreamScheduleDefault = <
  T extends Prisma.StreamScheduleDefaultFindUniqueArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.StreamScheduleDefaultFindUniqueArgs>,
) => prisma.streamScheduleDefault.findUnique(args);

export const findUniqueStreamScheduleDefaultOrThrow = <
  T extends Prisma.StreamScheduleDefaultFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<
    T,
    Prisma.StreamScheduleDefaultFindUniqueOrThrowArgs
  >,
) => prisma.streamScheduleDefault.findUniqueOrThrow(args);

export const findFirstStreamScheduleDefault = <
  T extends Prisma.StreamScheduleDefaultFindFirstArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.StreamScheduleDefaultFindFirstArgs>,
) => prisma.streamScheduleDefault.findFirst(args);

export const findManyStreamScheduleDefaults = <
  T extends Prisma.StreamScheduleDefaultFindManyArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.StreamScheduleDefaultFindManyArgs>,
) => prisma.streamScheduleDefault.findMany(args);

export const updateStreamScheduleDefault = <
  T extends Prisma.StreamScheduleDefaultUpdateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.StreamScheduleDefaultUpdateArgs>,
) => prisma.streamScheduleDefault.update(args);

export const updateManyStreamScheduleDefaults = (
  args: Prisma.StreamScheduleDefaultUpdateManyArgs,
) => prisma.streamScheduleDefault.updateMany(args);

export const upsertStreamScheduleDefault = <
  T extends Prisma.StreamScheduleDefaultUpsertArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.StreamScheduleDefaultUpsertArgs>,
) => prisma.streamScheduleDefault.upsert(args);

export const deleteStreamScheduleDefault = <
  T extends Prisma.StreamScheduleDefaultDeleteArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.StreamScheduleDefaultDeleteArgs>,
) => prisma.streamScheduleDefault.delete(args);

export const deleteManyStreamScheduleDefaults = (
  args: Prisma.StreamScheduleDefaultDeleteManyArgs,
) => prisma.streamScheduleDefault.deleteMany(args);

export const countStreamScheduleDefaults = (
  args?: Prisma.StreamScheduleDefaultCountArgs,
) => prisma.streamScheduleDefault.count(args);
