import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createCommandErrorLog = <
  T extends Prisma.CommandErrorLogCreateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandErrorLogCreateArgs>,
) => prisma.commandErrorLog.create(args);

export const findUniqueCommandErrorLog = <
  T extends Prisma.CommandErrorLogFindUniqueArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandErrorLogFindUniqueArgs>,
) => prisma.commandErrorLog.findUnique(args);

export const findUniqueCommandErrorLogOrThrow = <
  T extends Prisma.CommandErrorLogFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandErrorLogFindUniqueOrThrowArgs>,
) => prisma.commandErrorLog.findUniqueOrThrow(args);

export const findFirstCommandErrorLog = <
  T extends Prisma.CommandErrorLogFindFirstArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.CommandErrorLogFindFirstArgs>,
) => prisma.commandErrorLog.findFirst(args);

export const findManyCommandErrorLogs = <
  T extends Prisma.CommandErrorLogFindManyArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.CommandErrorLogFindManyArgs>,
) => prisma.commandErrorLog.findMany(args);

export const updateCommandErrorLog = <
  T extends Prisma.CommandErrorLogUpdateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandErrorLogUpdateArgs>,
) => prisma.commandErrorLog.update(args);

export const updateManyCommandErrorLogs = (
  args: Prisma.CommandErrorLogUpdateManyArgs,
) => prisma.commandErrorLog.updateMany(args);

export const upsertCommandErrorLog = <
  T extends Prisma.CommandErrorLogUpsertArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandErrorLogUpsertArgs>,
) => prisma.commandErrorLog.upsert(args);

export const deleteCommandErrorLog = <
  T extends Prisma.CommandErrorLogDeleteArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandErrorLogDeleteArgs>,
) => prisma.commandErrorLog.delete(args);

export const deleteManyCommandErrorLogs = (
  args: Prisma.CommandErrorLogDeleteManyArgs,
) => prisma.commandErrorLog.deleteMany(args);

export const countCommandErrorLogs = (args?: Prisma.CommandErrorLogCountArgs) =>
  prisma.commandErrorLog.count(args);
