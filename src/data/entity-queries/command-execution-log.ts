import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createCommandExecutionLog = <
  T extends Prisma.CommandExecutionLogCreateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandExecutionLogCreateArgs>,
) => prisma.commandExecutionLog.create(args);

export const findUniqueCommandExecutionLog = <
  T extends Prisma.CommandExecutionLogFindUniqueArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandExecutionLogFindUniqueArgs>,
) => prisma.commandExecutionLog.findUnique(args);

export const findUniqueCommandExecutionLogOrThrow = <
  T extends Prisma.CommandExecutionLogFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandExecutionLogFindUniqueOrThrowArgs>,
) => prisma.commandExecutionLog.findUniqueOrThrow(args);

export const findFirstCommandExecutionLog = <
  T extends Prisma.CommandExecutionLogFindFirstArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.CommandExecutionLogFindFirstArgs>,
) => prisma.commandExecutionLog.findFirst(args);

export const findManyCommandExecutionLogs = <
  T extends Prisma.CommandExecutionLogFindManyArgs,
>(
  args?: Prisma.SelectSubset<T, Prisma.CommandExecutionLogFindManyArgs>,
) => prisma.commandExecutionLog.findMany(args);

export const updateCommandExecutionLog = <
  T extends Prisma.CommandExecutionLogUpdateArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandExecutionLogUpdateArgs>,
) => prisma.commandExecutionLog.update(args);

export const updateManyCommandExecutionLogs = (
  args: Prisma.CommandExecutionLogUpdateManyArgs,
) => prisma.commandExecutionLog.updateMany(args);

export const upsertCommandExecutionLog = <
  T extends Prisma.CommandExecutionLogUpsertArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandExecutionLogUpsertArgs>,
) => prisma.commandExecutionLog.upsert(args);

export const deleteCommandExecutionLog = <
  T extends Prisma.CommandExecutionLogDeleteArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.CommandExecutionLogDeleteArgs>,
) => prisma.commandExecutionLog.delete(args);

export const deleteManyCommandExecutionLogs = (
  args: Prisma.CommandExecutionLogDeleteManyArgs,
) => prisma.commandExecutionLog.deleteMany(args);

export const countCommandExecutionLogs = (
  args?: Prisma.CommandExecutionLogCountArgs,
) => prisma.commandExecutionLog.count(args);
