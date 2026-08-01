import type { BossTrackingReconciliation } from '../../data/transactions/boss-tracking.types';
import { BossTrackingAttemptTimingStatus } from '../../generated/prisma/enums';
import type {
  GetBossTrackingReconciliationFromBossDeathsInput,
  GetBossTrackingReconciliationInput,
} from './boss-tracking.types';

const AUTOCOMPLETE_BOSS_SEPARATOR = ' - ';

export const parseBossTrackingSelection = ({
  bossName,
  gameName,
}: {
  bossName: string | null | undefined;
  gameName: string | null | undefined;
}) => {
  const cleanBossName = bossName?.trim() || null;
  const cleanGameName = gameName?.trim() || null;

  if (!cleanBossName || cleanGameName) {
    return { bossName: cleanBossName, gameName: cleanGameName };
  }

  const separatorIndex = cleanBossName.indexOf(AUTOCOMPLETE_BOSS_SEPARATOR);

  if (separatorIndex < 1) {
    return { bossName: cleanBossName, gameName: cleanGameName };
  }

  const parsedGameName = cleanBossName.slice(0, separatorIndex).trim();
  const parsedBossName = cleanBossName
    .slice(separatorIndex + AUTOCOMPLETE_BOSS_SEPARATOR.length)
    .trim();

  if (!parsedGameName || !parsedBossName) {
    return { bossName: cleanBossName, gameName: cleanGameName };
  }

  return { bossName: parsedBossName, gameName: parsedGameName };
};

export const getBossTrackingReconciliationFromBossDeaths = ({
  deathCount,
  recordedDeathCount,
  totalDeaths,
}: GetBossTrackingReconciliationFromBossDeathsInput): BossTrackingReconciliation => {
  if (deathCount < 0) {
    throw new Error('Final boss deaths cannot be lower than 0.');
  }

  if (deathCount === recordedDeathCount) {
    return {
      totalDeaths,
      deathCount,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.TRUSTED,
      reconciliationNote: null,
    };
  }

  const difference = deathCount - recordedDeathCount;
  const missedDeathCount = Math.abs(difference);
  const hasOneDeathDifference = difference === 1;
  const hasOneMissedDeath = missedDeathCount === 1;
  let reconciliationNote = `Manual tracking recorded ${missedDeathCount} more death${hasOneMissedDeath ? '' : 's'} than the final count.`;

  if (difference > 0) {
    reconciliationNote = `Final death count has ${difference} more death${hasOneDeathDifference ? '' : 's'} than tracked manually.`;
  }

  return {
    totalDeaths,
    deathCount,
    attemptTimingStatus: BossTrackingAttemptTimingStatus.RECONCILED,
    reconciliationNote,
  };
};

export const getBossTrackingReconciliation = ({
  startDeaths,
  totalDeaths,
  recordedDeathCount,
}: GetBossTrackingReconciliationInput): BossTrackingReconciliation => {
  const deathCount = totalDeaths - startDeaths;

  if (deathCount < 0) {
    throw new Error('Final deaths cannot be lower than starting deaths.');
  }

  return getBossTrackingReconciliationFromBossDeaths({
    deathCount,
    totalDeaths,
    recordedDeathCount,
  });
};
