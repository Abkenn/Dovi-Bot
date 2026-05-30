import {
  countBossesByNormalizedName,
  findBossesForAutocomplete,
  findBossGamesForAutocomplete,
  findBossWithDaviSpreadsheetStats,
} from '@data/queries/boss-stats';
import { normalizeBossName } from './bosses.utils';

const BOSS_LOOKUP_SEPARATOR = '::';

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
  return findBossesForAutocomplete({
    ...(gameName ? { normalizedGameName: normalizeBossName(gameName) } : {}),
    normalizedBossQuery: normalizeBossName(query),
  });
};

export const toBossAutocompleteValue = ({
  gameName,
  bossName,
}: {
  gameName: string;
  bossName: string;
}) => `${gameName}${BOSS_LOOKUP_SEPARATOR}${bossName}`;

const parseBossAutocompleteValue = (value: string) => {
  const [gameName, ...bossNameParts] = value.split(BOSS_LOOKUP_SEPARATOR);
  const bossName = bossNameParts.join(BOSS_LOOKUP_SEPARATOR).trim();

  if (!gameName || !bossName) {
    return null;
  }

  return { gameName: gameName.trim(), bossName };
};

export const getBossView = async ({
  gameName,
  bossName,
}: {
  gameName?: string | null;
  bossName: string;
}) => {
  const parsedBoss = gameName ? null : parseBossAutocompleteValue(bossName);
  const resolvedGameName = gameName ?? parsedBoss?.gameName ?? null;
  const resolvedBossName = parsedBoss?.bossName ?? bossName;
  const normalizedBossName = normalizeBossName(resolvedBossName);

  if (!resolvedGameName) {
    const bossCount = await countBossesByNormalizedName(normalizedBossName);

    if (bossCount > 1) {
      throw new Error('More than one game has that boss. Pass game too.');
    }
  }

  const boss = await findBossWithDaviSpreadsheetStats({
    ...(resolvedGameName
      ? { normalizedGameName: normalizeBossName(resolvedGameName) }
      : {}),
    normalizedBossName,
  });

  if (!boss) {
    throw new Error('Pick a boss from autocomplete, or pass game too.');
  }

  return boss;
};

export type BossView = Awaited<ReturnType<typeof getBossView>>;
