import { areBossStatsTablesPresent } from '@data/queries/boss-stats';
import { upsertDaviSpreadsheetBossEncounter } from '@data/transactions/davi-boss-stats-sync';
import { env } from '@zod-schemas/env.zod';
import {
  normalizeBossStatName,
  parseDaviBossStatsRow,
} from './boss-stats-parsing';
import type { DaviBossStatsSpreadsheetRow } from './davi-boss-stats-spreadsheet';
import { fetchDaviBossStatsSpreadsheetRows } from './davi-boss-stats-spreadsheet';
import { createEmptyDaviBossStatsSyncResult } from './davi-boss-stats-sync.types';

const assertNotAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new Error('Davi boss stats sync was aborted.');
  }
};

export const isDaviBossStatsSyncConfigured = () =>
  Boolean(env.DAVI_BOSS_STATS_SPREADSHEET_URL && env.DAVI_DISCORD_USER_ID);

const getDaviBossStatsSyncConfig = () => {
  if (!env.DAVI_BOSS_STATS_SPREADSHEET_URL || !env.DAVI_DISCORD_USER_ID) {
    throw new Error(
      'Davi boss stats sync is not configured. Set DAVI_BOSS_STATS_SPREADSHEET_URL and DAVI_DISCORD_USER_ID.',
    );
  }

  return {
    spreadsheetUrl: env.DAVI_BOSS_STATS_SPREADSHEET_URL,
    daviDiscordUserId: env.DAVI_DISCORD_USER_ID,
  };
};

const assertBossStatsStorageExists = async () => {
  if (!(await areBossStatsTablesPresent())) {
    throw new Error(
      'Boss stats tables do not exist yet. Apply the Prisma schema before running boss stats sync.',
    );
  }
};

const upsertDaviEncounterStat = async ({
  row,
  daviDiscordUserId,
}: {
  row: DaviBossStatsSpreadsheetRow;
  daviDiscordUserId: string;
}) => {
  const parsedRow = parseDaviBossStatsRow(row);

  return upsertDaviSpreadsheetBossEncounter({
    gameName: row.game,
    normalizedGameName: normalizeBossStatName(row.game),
    bossName: row.boss,
    normalizedBossName: normalizeBossStatName(row.boss),
    daviDiscordUserId,
    parsedRow,
    rawTotalAttemptTime: row.totalAttemptTime || null,
    rawWinningAttemptTime: row.winningAttemptTime || null,
    rawDifficultyCoefficient: row.difficultyCoefficient || null,
    sourceRowNumber: row.rowNumber,
  });
};

export const syncDaviBossStats = async ({
  signal,
}: {
  signal?: AbortSignal;
} = {}) => {
  const result = createEmptyDaviBossStatsSyncResult();
  const config = getDaviBossStatsSyncConfig();

  await assertBossStatsStorageExists();

  const rows = await fetchDaviBossStatsSpreadsheetRows(
    signal
      ? {
          spreadsheetUrl: config.spreadsheetUrl,
          signal,
        }
      : {
          spreadsheetUrl: config.spreadsheetUrl,
        },
  );

  result.rowsRead = rows.length;

  for (const row of rows) {
    assertNotAborted(signal);

    try {
      if (!row.game || !row.boss) {
        result.skipped += 1;
        result.invalidRows.push(`Row ${row.rowNumber}: missing game or boss.`);
        continue;
      }

      const action = await upsertDaviEncounterStat({
        row,
        daviDiscordUserId: config.daviDiscordUserId,
      });

      if (action === 'updated') {
        result.updated += 1;
      } else {
        result.imported += 1;
      }
    } catch (error) {
      result.failed += 1;
      result.invalidRows.push(
        `Row ${row.rowNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return result;
};
