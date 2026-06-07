export type FindBossesForAutocompleteInput = {
  normalizedGameName?: string;
  normalizedBossQuery: string;
};

export type FindOpenBossTrackingBossesForAutocompleteInput = {
  guildId: string;
} & FindBossesForAutocompleteInput;

export type FindBossWithDaviSpreadsheetStatsInput = {
  normalizedGameName?: string;
  normalizedBossName: string;
};

export type FindGameBossDeathRankingInput = {
  normalizedGameName: string;
  limit: number;
};
