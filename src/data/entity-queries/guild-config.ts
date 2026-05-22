import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export const createGuildConfig = <T extends Prisma.GuildConfigCreateArgs>(
  args: Prisma.SelectSubset<T, Prisma.GuildConfigCreateArgs>,
) => prisma.guildConfig.create(args);

export const findUniqueGuildConfig = <
  T extends Prisma.GuildConfigFindUniqueArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.GuildConfigFindUniqueArgs>,
) => prisma.guildConfig.findUnique(args);

export const findUniqueGuildConfigOrThrow = <
  T extends Prisma.GuildConfigFindUniqueOrThrowArgs,
>(
  args: Prisma.SelectSubset<T, Prisma.GuildConfigFindUniqueOrThrowArgs>,
) => prisma.guildConfig.findUniqueOrThrow(args);

export const findFirstGuildConfig = <T extends Prisma.GuildConfigFindFirstArgs>(
  args?: Prisma.SelectSubset<T, Prisma.GuildConfigFindFirstArgs>,
) => prisma.guildConfig.findFirst(args);

export const findManyGuildConfigs = <T extends Prisma.GuildConfigFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.GuildConfigFindManyArgs>,
) => prisma.guildConfig.findMany(args);

export const updateGuildConfig = <T extends Prisma.GuildConfigUpdateArgs>(
  args: Prisma.SelectSubset<T, Prisma.GuildConfigUpdateArgs>,
) => prisma.guildConfig.update(args);

export const updateManyGuildConfigs = (
  args: Prisma.GuildConfigUpdateManyArgs,
) => prisma.guildConfig.updateMany(args);

export const upsertGuildConfig = <T extends Prisma.GuildConfigUpsertArgs>(
  args: Prisma.SelectSubset<T, Prisma.GuildConfigUpsertArgs>,
) => prisma.guildConfig.upsert(args);

export const deleteGuildConfig = <T extends Prisma.GuildConfigDeleteArgs>(
  args: Prisma.SelectSubset<T, Prisma.GuildConfigDeleteArgs>,
) => prisma.guildConfig.delete(args);

export const deleteManyGuildConfigs = (
  args: Prisma.GuildConfigDeleteManyArgs,
) => prisma.guildConfig.deleteMany(args);

export const countGuildConfigs = (args?: Prisma.GuildConfigCountArgs) =>
  prisma.guildConfig.count(args);
