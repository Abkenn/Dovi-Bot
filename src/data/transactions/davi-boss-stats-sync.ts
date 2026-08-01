import { BossEncounterSource } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { normalizeBossIdentity } from '../boss-catalog.utils';

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
}) =>
  prisma.$transaction(async (tx) => {
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

    const existingBosses = await tx.boss.findMany({
      where: { gameId: game.id },
    });
    const exactBoss = existingBosses.find(
      (candidate) => candidate.normalizedName === normalizedBossName,
    );
    const aliasedBoss = exactBoss
      ? null
      : await tx.boss.findFirst({
          where: {
            gameId: game.id,
            topicTerms: { some: { normalizedValue: normalizedBossName } },
          },
        });
    const fuzzyBoss =
      exactBoss || aliasedBoss
        ? null
        : existingBosses.find(
            (candidate) =>
              normalizeBossIdentity(candidate.normalizedName) ===
              normalizeBossIdentity(normalizedBossName),
          );
    const resolveBoss = async () => {
      if (exactBoss) {
        return tx.boss.update({
          where: { id: exactBoss.id },
          data: { name: bossName },
        });
      }

      const matchingBoss = aliasedBoss ?? fuzzyBoss;

      if (matchingBoss) {
        return matchingBoss;
      }

      return tx.boss.create({
        data: {
          gameId: game.id,
          name: bossName,
          normalizedName: normalizedBossName,
        },
      });
    };
    const boss = await resolveBoss();

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
