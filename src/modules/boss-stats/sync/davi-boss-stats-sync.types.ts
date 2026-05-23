export type DaviBossStatsSpreadsheetRow = {
  rowNumber: number;
  game: string;
  boss: string;
  deaths: string;
  totalAttemptTime: string;
  winningAttemptTime: string;
  difficultyCoefficient: string;
};

export type ParsedDaviBossStatsRow = {
  deaths: number | null;
  totalAttemptTimeSeconds: number | null;
  winningAttemptTimeSeconds: number | null;
  difficultyCoefficient: string | null;
};

export type DaviBossStatsSyncResult = {
  rowsRead: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  invalidRows: string[];
};
