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
  normalizedGameName?: string;
  normalizedBossQuery: string;
}) => {
  const game = normalizedGameName
    ? await prisma.bossGame.findFirst({
        where: {
          OR: [
            { normalizedName: normalizedGameName },
            {
              topicTerms: {
                some: { normalizedValue: normalizedGameName },
              },
            },
          ],
        },
        select: { id: true },
      })
    : null;

  if (normalizedGameName && !game) {
    return [];
  }

  return prisma.boss.findMany({
    where: {
      ...(game ? { gameId: game.id } : {}),
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
    orderBy: [{ game: { name: 'asc' } }, { name: 'asc' }],
    take: AUTOCOMPLETE_LIMIT * 2,
    select: { name: true, game: { select: { name: true } } },
  });
};

export const findBossWithDaviSpreadsheetStats = ({
  normalizedGameName,
  normalizedBossName,
}: {
  normalizedGameName?: string;
  normalizedBossName: string;
}) =>
  prisma.boss.findFirst({
    where: {
      normalizedName: normalizedBossName,
      ...(normalizedGameName
        ? { game: { normalizedName: normalizedGameName } }
        : {}),
    },
    include: {
      game: true,
      stats: {
        where: { source: BossEncounterSource.DAVI_SPREADSHEET },
        take: 1,
      },
    },
  });

export const countBossesByNormalizedName = (normalizedBossName: string) =>
  prisma.boss.count({
    where: { normalizedName: normalizedBossName },
  });
