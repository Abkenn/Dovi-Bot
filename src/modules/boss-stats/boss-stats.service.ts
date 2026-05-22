import {
  findBossesForAutocomplete,
  findBossGamesForAutocomplete,
  findBossWithDaviSpreadsheetStats,
} from '@data/queries/boss-stats';
import { normalizeBossStatName } from './boss-stats-parsing';

export const getBossStatsGameAutocomplete = async (query: string) => {
  const normalizedQuery = normalizeBossStatName(query);

  return findBossGamesForAutocomplete(normalizedQuery);
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

  return findBossesForAutocomplete({
    normalizedGameName: normalizeBossStatName(gameName),
    normalizedBossQuery: normalizeBossStatName(query),
  });
};

export const getBossStatsBossView = async ({
  gameName,
  bossName,
}: {
  gameName: string;
  bossName: string;
}) => {
  const boss = await findBossWithDaviSpreadsheetStats({
    normalizedGameName: normalizeBossStatName(gameName),
    normalizedBossName: normalizeBossStatName(bossName),
  });

  if (!boss) {
    throw new Error('Pick a boss from the autocomplete list for that game.');
  }

  return boss;
};

export type BossStatsBossView = Awaited<
  ReturnType<typeof getBossStatsBossView>
>;
