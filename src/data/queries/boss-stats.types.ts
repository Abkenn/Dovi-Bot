import type { Simplify } from 'type-fest';

export type FindBossesForAutocompleteInput = {
  normalizedGameName?: string;
  normalizedBossQuery: string;
};

export type FindOpenBossTrackingBossesForAutocompleteInput = Simplify<
  {
    guildId: string;
  } & FindBossesForAutocompleteInput
>;

export type FindBossWithDaviSpreadsheetStatsInput = {
  normalizedGameName?: string;
  normalizedBossName: string;
};

export type FindGameBossDeathRankingInput = {
  normalizedGameName: string;
  limit?: number | null;
};
