import type { BossTrackingReconciliation } from '../../data/transactions/boss-tracking.types';
import { BossTrackingAttemptTimingStatus } from '../../generated/prisma/enums';
import type { GetBossTrackingReconciliationInput } from './boss-tracking.types';

export const getBossTrackingReconciliation = ({
  startDeaths,
  totalDeaths,
  recordedDeathCount,
}: GetBossTrackingReconciliationInput): BossTrackingReconciliation => {
  const deathCount = totalDeaths - startDeaths;

  if (deathCount < 0) {
    throw new Error('Final deaths cannot be lower than starting deaths.');
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
