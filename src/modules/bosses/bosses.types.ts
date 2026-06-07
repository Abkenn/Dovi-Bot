export type GetBossAutocompleteInput = {
  gameName: string | null;
  query: string;
};

export type BossAutocompleteValueInput = {
  gameName: string;
  bossName: string;
};

export type GetBossViewInput = {
  gameName?: string | null;
  bossName: string;
};
