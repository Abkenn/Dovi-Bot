import { BossEncounterSource } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { normalizeBossStatName } from './boss-stats-parsing';

const AUTOCOMPLETE_LIMIT = 25;

export const getBossStatsGameAutocomplete = async (query: string) => {
  const normalizedQuery = normalizeBossStatName(query);

  return prisma.bossGame.findMany({
    ...(normalizedQuery
      ? { where: { normalizedName: { contains: normalizedQuery } } }
      : {}),
    orderBy: { name: 'asc' },
    take: AUTOCOMPLETE_LIMIT,
    select: { name: true },
  });
};

export const getBossStatsBossAutocomplete = async ({
  gameName,
  query,
}: {
  gameName: string | null;
  query: string;
}) => {
  if (!gameName) {
    return [];
  }

  const game = await prisma.bossGame.findUnique({
    where: { normalizedName: normalizeBossStatName(gameName) },
    select: { id: true },
  });

  if (!game) {
    return [];
  }

  const normalizedQuery = normalizeBossStatName(query);

  return prisma.boss.findMany({
    where: {
      gameId: game.id,
      ...(normalizedQuery
        ? { normalizedName: { contains: normalizedQuery } }
        : {}),
    },
    orderBy: { name: 'asc' },
    take: AUTOCOMPLETE_LIMIT,
    select: { name: true },
  });
};

export const getBossStatsBossView = async ({
  gameName,
  bossName,
}: {
  gameName: string;
  bossName: string;
}) => {
  const boss = await prisma.boss.findFirst({
    where: {
      normalizedName: normalizeBossStatName(bossName),
      game: {
        normalizedName: normalizeBossStatName(gameName),
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

  if (!boss) {
    throw new Error('Pick a boss from the autocomplete list for that game.');
  }

  return boss;
};

export type BossStatsBossView = Awaited<
  ReturnType<typeof getBossStatsBossView>
>;
