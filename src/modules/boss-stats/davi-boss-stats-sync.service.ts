import { env } from '@zod-schemas/env.zod';
import { BossEncounterSource } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
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
  const tables = await prisma.$queryRaw<{ tableName: string | null }[]>`
    select to_regclass('public."BossGame"')::text as "tableName"
    union all
    select to_regclass('public."Boss"')::text as "tableName"
    union all
    select to_regclass('public."BossEncounterStat"')::text as "tableName"
  `;

  if (tables.some((table) => !table.tableName)) {
    throw new Error(
      'Boss stats tables do not exist yet. Apply the Prisma schema before running boss stats sync.',
    );
  }
};

const upsertBoss = async (row: DaviBossStatsSpreadsheetRow) => {
  const game = await prisma.bossGame.upsert({
    where: { normalizedName: normalizeBossStatName(row.game) },
    update: { name: row.game },
    create: {
      name: row.game,
      normalizedName: normalizeBossStatName(row.game),
    },
  });

  return prisma.boss.upsert({
    where: {
      gameId_normalizedName: {
        gameId: game.id,
        normalizedName: normalizeBossStatName(row.boss),
      },
    },
    update: { name: row.boss },
    create: {
      gameId: game.id,
      name: row.boss,
      normalizedName: normalizeBossStatName(row.boss),
    },
  });
};

const upsertDaviEncounterStat = async ({
  row,
  daviDiscordUserId,
}: {
  row: DaviBossStatsSpreadsheetRow;
  daviDiscordUserId: string;
}) => {
  const boss = await upsertBoss(row);
  const parsedRow = parseDaviBossStatsRow(row);
  const statKey = {
    bossId: boss.id,
    playerDiscordUserId: daviDiscordUserId,
    source: BossEncounterSource.DAVI_SPREADSHEET,
  };

  const existingStat = await prisma.bossEncounterStat.findUnique({
    where: { bossId_playerDiscordUserId_source: statKey },
    select: { id: true },
  });

  await prisma.bossEncounterStat.upsert({
    where: { bossId_playerDiscordUserId_source: statKey },
    update: {
      ...parsedRow,
      rawTotalAttemptTime: row.totalAttemptTime || null,
      rawWinningAttemptTime: row.winningAttemptTime || null,
      rawDifficultyCoefficient: row.difficultyCoefficient || null,
      sourceRowNumber: row.rowNumber,
      syncedAt: new Date(),
    },
    create: {
      bossId: boss.id,
      playerDiscordUserId: daviDiscordUserId,
      source: BossEncounterSource.DAVI_SPREADSHEET,
      ...parsedRow,
      rawTotalAttemptTime: row.totalAttemptTime || null,
      rawWinningAttemptTime: row.winningAttemptTime || null,
      rawDifficultyCoefficient: row.difficultyCoefficient || null,
      sourceRowNumber: row.rowNumber,
    },
  });

  return existingStat ? 'updated' : 'imported';
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
