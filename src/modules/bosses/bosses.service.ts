import {
  countBossesByNormalizedName,
  findBossesForAutocomplete,
  findBossGamesForAutocomplete,
  findBossWithDaviSpreadsheetStats,
  findGameBossDeathRanking,
} from '@data/queries/boss-stats';
import type { AsyncReturnType } from 'type-fest';
import type {
  BossAutocompleteValueInput,
  GetBossAutocompleteInput,
  GetBossViewInput,
} from './bosses.types';
import { normalizeBossName } from './bosses.utils';

const BOSS_LOOKUP_SEPARATOR = '::';
const AUTOCOMPLETE_LIMIT = 25;

export const getBossGameAutocomplete = async (query: string) => {
  const normalizedQuery = normalizeBossName(query);

  return findBossGamesForAutocomplete(normalizedQuery);
};

export const getBossAutocomplete = async ({
  gameName,
  query,
}: GetBossAutocompleteInput) => {
  const bosses = await findBossesForAutocomplete({
    ...(gameName ? { normalizedGameName: normalizeBossName(gameName) } : {}),
    normalizedBossQuery: normalizeBossName(query),
  });
  const seen = new Set<string>();

  return bosses
    .filter((boss) => {
      const key = `${boss.game.name}:${boss.name}`.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, AUTOCOMPLETE_LIMIT);
};

export const toBossAutocompleteValue = ({
  gameName,
  bossName,
}: BossAutocompleteValueInput) =>
  `${gameName}${BOSS_LOOKUP_SEPARATOR}${bossName}`;

const parseBossAutocompleteValue = (value: string) => {
  const [gameName, ...bossNameParts] = value.split(BOSS_LOOKUP_SEPARATOR);
  const bossName = bossNameParts.join(BOSS_LOOKUP_SEPARATOR).trim();

  if (!gameName || !bossName) {
    return null;
  }

  return { gameName: gameName.trim(), bossName };
};

export const getBossView = async ({ gameName, bossName }: GetBossViewInput) => {
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

export const getGameBossDeathRanking = async (gameName: string) => {
  const gameStats = await findGameBossDeathRanking({
    normalizedGameName: normalizeBossName(gameName),
    limit: 10,
  });

  if (!gameStats) {
    throw new Error('Pick a game from autocomplete.');
  }

  return gameStats;
};

export type BossView = AsyncReturnType<typeof getBossView>;
export type GameBossDeathRankingView = AsyncReturnType<
  typeof getGameBossDeathRanking
>;
