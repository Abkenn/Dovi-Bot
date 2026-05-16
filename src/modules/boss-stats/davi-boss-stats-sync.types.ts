export type DaviBossStatsSyncResult = {
  rowsRead: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  invalidRows: string[];
};

export const createEmptyDaviBossStatsSyncResult =
  (): DaviBossStatsSyncResult => ({
    rowsRead: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    invalidRows: [],
  });

export const formatDaviBossStatsSyncSummary = (
  result: DaviBossStatsSyncResult,
) =>
  `Davi boss stats sync finished: ${result.rowsRead} rows read, ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed.`;
