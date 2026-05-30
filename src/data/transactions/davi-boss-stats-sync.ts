import { BossEncounterSource } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';

type ParsedDaviBossStatsRow = {
  deaths: number | null;
  totalAttemptTimeSeconds: number | null;
  winningAttemptTimeSeconds: number | null;
  difficultyCoefficient: string | null;
};

export const upsertDaviSpreadsheetBossEncounter = async ({
  gameName,
  normalizedGameName,
  bossName,
  normalizedBossName,
  daviDiscordUserId,
  parsedRow,
  rawTotalAttemptTime,
  rawWinningAttemptTime,
  rawDifficultyCoefficient,
  sourceRowNumber,
}: {
  gameName: string;
  normalizedGameName: string;
  bossName: string;
  normalizedBossName: string;
  daviDiscordUserId: string;
  parsedRow: ParsedDaviBossStatsRow;
  rawTotalAttemptTime: string | null;
  rawWinningAttemptTime: string | null;
  rawDifficultyCoefficient: string | null;
  sourceRowNumber: number;
}) => {
  return prisma.$transaction(async (tx) => {
    // Spreadsheet sync is intentionally source-scoped. It may refresh the
    // official DAVI_SPREADSHEET stat row, but live command tracking lives in
    // BossTrackingSession/BossTrackingAttempt and must not be deleted here.
    const game = await tx.bossGame.upsert({
      where: { normalizedName: normalizedGameName },
      update: { name: gameName },
      create: {
        name: gameName,
        normalizedName: normalizedGameName,
      },
    });

    const boss = await tx.boss.upsert({
      where: {
        gameId_normalizedName: {
          gameId: game.id,
          normalizedName: normalizedBossName,
        },
      },
      update: { name: bossName },
      create: {
        gameId: game.id,
        name: bossName,
        normalizedName: normalizedBossName,
      },
    });

    const statKey = {
      bossId: boss.id,
      playerDiscordUserId: daviDiscordUserId,
      source: BossEncounterSource.DAVI_SPREADSHEET,
    };

    const existingStat = await tx.bossEncounterStat.findUnique({
      where: { bossId_playerDiscordUserId_source: statKey },
      select: { id: true },
    });

    await tx.bossEncounterStat.upsert({
      where: { bossId_playerDiscordUserId_source: statKey },
      update: {
        ...parsedRow,
        rawTotalAttemptTime,
        rawWinningAttemptTime,
        rawDifficultyCoefficient,
        sourceRowNumber,
        syncedAt: new Date(),
      },
      create: {
        bossId: boss.id,
        playerDiscordUserId: daviDiscordUserId,
        source: BossEncounterSource.DAVI_SPREADSHEET,
        ...parsedRow,
        rawTotalAttemptTime,
        rawWinningAttemptTime,
        rawDifficultyCoefficient,
        sourceRowNumber,
      },
    });

    return existingStat ? 'updated' : 'imported';
  });
};
