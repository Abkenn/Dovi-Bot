import type { Prisma } from '../../generated/prisma/client';
import { BossTrialStatus } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { getBossTrialView } from '../queries/boss-trial';

type BossTrialUpdateManyInput = NonNullable<
  Parameters<typeof prisma.bossTrial.updateMany>[0]
>;
type BossTrialTimestampField =
  | 'liveResultsPublishedAt'
  | 'automaticBumpPostedAt'
  | 'finalResultsPostedAt';

const claimBossTrialTimestamp = async (
  trialId: string,
  field: BossTrialTimestampField,
  data: BossTrialUpdateManyInput['data'] = {},
) => {
  const result = await prisma.bossTrial.updateMany({
    where: {
      id: trialId,
      [field]: null,
    },
    data: { ...data, [field]: new Date() },
  });

  if (result.count === 0) {
    return null;
  }

  return getBossTrialView(trialId);
};

export const claimBossTrialLiveResults = (trialId: string) =>
  claimBossTrialTimestamp(trialId, 'liveResultsPublishedAt');

export const claimBossTrialAutomaticBump = (trialId: string) =>
  claimBossTrialTimestamp(trialId, 'automaticBumpPostedAt');

export const claimBossTrialFinalResults = (trialId: string) =>
  claimBossTrialTimestamp(trialId, 'finalResultsPostedAt', {
    status: BossTrialStatus.RESULTS_PUBLISHED,
  } satisfies Prisma.BossTrialUpdateManyMutationInput);
