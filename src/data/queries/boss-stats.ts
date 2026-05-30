import { BossEncounterSource } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';

const AUTOCOMPLETE_LIMIT = 25;

export const areBossStatsTablesPresent = async () => {
  const tables = await prisma.$queryRaw<{ tableName: string | null }[]>`
    select to_regclass('public."BossGame"')::text as "tableName"
    union all
    select to_regclass('public."Boss"')::text as "tableName"
    union all
    select to_regclass('public."BossEncounterStat"')::text as "tableName"
  `;

  return tables.every((table) => table.tableName !== null);
};

export const findBossGamesForAutocomplete = (normalizedQuery: string) =>
  prisma.bossGame.findMany({
    ...(normalizedQuery
      ? {
          where: {
            OR: [
              { normalizedName: { contains: normalizedQuery } },
              {
                topicTerms: {
                  some: { normalizedValue: { contains: normalizedQuery } },
                },
              },
            ],
          },
        }
      : {}),
    orderBy: { name: 'asc' },
    take: AUTOCOMPLETE_LIMIT,
    select: { name: true },
  });

export const findBossesForAutocomplete = async ({
  normalizedGameName,
  normalizedBossQuery,
}: {
  normalizedGameName: string;
  normalizedBossQuery: string;
}) => {
  const game = await prisma.bossGame.findUnique({
    where: { normalizedName: normalizedGameName },
    select: { id: true },
  });

  if (!game) {
    return [];
  }

  return prisma.boss.findMany({
    where: {
      gameId: game.id,
      ...(normalizedBossQuery
        ? {
            OR: [
              { normalizedName: { contains: normalizedBossQuery } },
              {
                topicTerms: {
                  some: { normalizedValue: { contains: normalizedBossQuery } },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
    take: AUTOCOMPLETE_LIMIT,
    select: { name: true },
  });
};

export const findBossWithDaviSpreadsheetStats = ({
  normalizedGameName,
  normalizedBossName,
}: {
  normalizedGameName: string;
  normalizedBossName: string;
}) =>
  prisma.boss.findFirst({
    where: {
      normalizedName: normalizedBossName,
      game: {
        normalizedName: normalizedGameName,
      },
    },
    include: {
      game: true,
      stats: {
        where: { source: BossEncounterSource.DAVI_SPREADSHEET },
        take: 1,
      },
    },
  });
