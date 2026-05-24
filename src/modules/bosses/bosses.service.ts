import {
  findBossesForAutocomplete,
  findBossGamesForAutocomplete,
  findBossWithDaviSpreadsheetStats,
} from '@data/queries/boss-stats';
import { normalizeBossName } from './bosses.utils';

export const getBossGameAutocomplete = async (query: string) => {
  const normalizedQuery = normalizeBossName(query);

  return findBossGamesForAutocomplete(normalizedQuery);
};

export const getBossAutocomplete = async ({
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
    normalizedGameName: normalizeBossName(gameName),
    normalizedBossQuery: normalizeBossName(query),
  });
};

export const getBossView = async ({
  gameName,
  bossName,
}: {
  gameName: string;
  bossName: string;
}) => {
  const boss = await findBossWithDaviSpreadsheetStats({
    normalizedGameName: normalizeBossName(gameName),
    normalizedBossName: normalizeBossName(bossName),
  });

  if (!boss) {
    throw new Error('Pick a boss from the autocomplete list for that game.');
  }

  return boss;
};

export type BossView = Awaited<ReturnType<typeof getBossView>>;
