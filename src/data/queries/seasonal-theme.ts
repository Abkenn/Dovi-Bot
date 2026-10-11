import { prisma } from '../../lib/prisma';

export const findSeasonalThemeMode = async (guildId: string) =>
  (
    await prisma.guildConfig.findUnique({
      where: { guildId },
      select: { seasonalThemeMode: true },
    })
  )?.seasonalThemeMode ?? 'auto';

export const saveSeasonalThemeMode = (guildId: string, mode: string) =>
  prisma.guildConfig.upsert({
    where: { guildId },
    create: { guildId, seasonalThemeMode: mode },
    update: { seasonalThemeMode: mode },
    select: { seasonalThemeMode: true },
  });
