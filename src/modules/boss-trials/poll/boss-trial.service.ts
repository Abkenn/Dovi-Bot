import {
  areBossTrialTablesPresent,
  attachBossTrialBumpMessage as attachBossTrialBumpMessageRow,
  attachBossTrialMessageAndGetView,
  type BossTrialView,
  claimBossTrialAutomaticBump,
  claimBossTrialFinalResults,
  claimBossTrialLiveResults,
  createBossTrialView,
  findBossTrialVoteVerdict,
  getBossTrialView,
  getPendingBossTrialLifecycleEvents as getPendingBossTrialLifecycleEventRows,
  upsertBossTrialVoteVerdict,
} from '@data/queries/boss-trial';
import type { BossTrialVoteVerdict } from '../../../generated/prisma/enums';
import { BossTrialBumpMode } from '../../../generated/prisma/enums';
import { DAY_MINUTES, MINUTE_MS } from '../../../lib/time.constants';
import { getBossView } from '../../bosses/bosses.service';
import {
  BOSS_TRIAL_AUTOMATIC_BUMP_AFTER_MINUTES,
  BOSS_TRIAL_VERDICTS,
  getBossTrialBumpMode,
  getBossTrialDurationConfig,
} from '../boss-trial.config';
import type {
  BossTrialMessageInput,
  BossTrialWithVotes,
} from './boss-trial.types';

const BOSS_TRIAL_STORAGE_MISSING_RECHECK_MS = 5 * MINUTE_MS;
const AUTOMATIC_BUMP_MODES: readonly BossTrialBumpMode[] = [
  BossTrialBumpMode.DEFAULT,
  BossTrialBumpMode.MID_POLL_ONLY,
];

let bossTrialStorageReady: boolean | undefined;
let bossTrialStorageLastCheckedAt = 0;

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * MINUTE_MS);

export const isBossTrialStorageReady = async () => {
  if (bossTrialStorageReady) {
    return true;
  }

  const now = Date.now();

  if (
    bossTrialStorageReady === false &&
    now - bossTrialStorageLastCheckedAt < BOSS_TRIAL_STORAGE_MISSING_RECHECK_MS
  ) {
    return false;
  }

  bossTrialStorageReady = await areBossTrialTablesPresent();
  bossTrialStorageLastCheckedAt = now;

  return bossTrialStorageReady;
};

const assertBossTrialStorageReady = async () => {
  if (!(await isBossTrialStorageReady())) {
    throw new Error(
      'Boss trial schema is not ready yet. Apply the Prisma schema before using boss trials.',
    );
  }
};

export const createBossTrial = async ({
  guildId,
  channelId,
  requesterUserId,
  gameName,
  bossName,
  duration,
  bump,
}: {
  guildId: string;
  channelId: string;
  requesterUserId: string;
  gameName: string;
  bossName: string;
  duration: string | null;
  bump: string | null;
}) => {
  await assertBossTrialStorageReady();

  const boss = await getBossView({ gameName, bossName });
  const durationConfig = getBossTrialDurationConfig(duration);
  const requestedBumpMode = getBossTrialBumpMode(bump);
  const bumpMode =
    durationConfig.durationMinutes === DAY_MINUTES
      ? requestedBumpMode
      : BossTrialBumpMode.DEFAULT;
  const now = new Date();

  return createBossTrialView({
    guildId,
    channelId,
    requesterUserId,
    gameId: boss.gameId,
    bossId: boss.id,
    durationMinutes: durationConfig.durationMinutes,
    voteVisibilityHiddenUntil: addMinutes(now, durationConfig.hiddenMinutes),
    endsAt: addMinutes(now, durationConfig.durationMinutes),
    bumpMode,
  });
};

export const attachBossTrialMessage = async ({
  trialId,
  messageId,
}: BossTrialMessageInput) =>
  attachBossTrialMessageAndGetView({
    trialId,
    messageId,
  });

export const attachBossTrialBumpMessage = async ({
  trialId,
  messageId,
}: BossTrialMessageInput) =>
  attachBossTrialBumpMessageRow({
    trialId,
    messageId,
  });

export const recordBossTrialVote = async ({
  trialId,
  userId,
  verdict,
}: {
  trialId: string;
  userId: string;
  verdict: BossTrialVoteVerdict;
}) => {
  if (!BOSS_TRIAL_VERDICTS.includes(verdict)) {
    throw new Error('Unknown boss trial verdict.');
  }

  const existingVote = await findBossTrialVoteVerdict({
    trialId,
    userId,
  });

  if (existingVote?.verdict === verdict) {
    return {
      trial: await getBossTrialView(trialId),
      voteAction: 'unchanged' as const,
      previousVerdict: existingVote.verdict,
    };
  }

  const votedAt = new Date();

  await upsertBossTrialVoteVerdict({
    trialId,
    userId,
    verdict,
    votedAt,
  });

  return {
    trial: await getBossTrialView(trialId),
    voteAction: existingVote ? ('changed' as const) : ('created' as const),
    previousVerdict: existingVote?.verdict ?? null,
  };
};

export const getPendingBossTrialLifecycleEvents = async () => {
  const now = new Date();
  const automaticBumpCreatedAtCutoff = addMinutes(
    now,
    -BOSS_TRIAL_AUTOMATIC_BUMP_AFTER_MINUTES,
  );

  return getPendingBossTrialLifecycleEventRows({
    now,
    automaticBumpCreatedAtCutoff,
  });
};

export const getVoteBreakdown = (
  trial: BossTrialWithVotes,
): Record<BossTrialVoteVerdict, number> => {
  const breakdown = Object.fromEntries(
    BOSS_TRIAL_VERDICTS.map((verdict) => [verdict, 0]),
  ) as Record<BossTrialVoteVerdict, number>;

  for (const vote of trial.votes) {
    breakdown[vote.verdict] += 1;
  }

  return breakdown;
};

export const getWinningVerdicts = (trial: BossTrialWithVotes) => {
  const breakdown = getVoteBreakdown(trial);
  const highestVoteCount = Math.max(
    ...BOSS_TRIAL_VERDICTS.map((verdict) => breakdown[verdict]),
  );

  if (highestVoteCount <= 0) {
    return [];
  }

  return BOSS_TRIAL_VERDICTS.filter(
    (verdict) => breakdown[verdict] === highestVoteCount,
  );
};

export const shouldShowBossTrialVotes = (trial: {
  voteVisibilityHiddenUntil: Date;
}) => Date.now() >= trial.voteVisibilityHiddenUntil.getTime();

export const shouldPostBossTrialFinalResults = (trial: BossTrialView) =>
  !trial.finalResultsPostedAt && Date.now() >= trial.endsAt.getTime();

export const shouldPublishBossTrialLiveResults = (trial: BossTrialView) =>
  !trial.liveResultsPublishedAt && shouldShowBossTrialVotes(trial);

export const shouldPostBossTrialVotesVisibleBump = (trial: BossTrialView) =>
  trial.durationMinutes === DAY_MINUTES &&
  trial.bumpMode === BossTrialBumpMode.DEFAULT;

export const shouldPostBossTrialAutomaticBump = (trial: BossTrialView) => {
  const now = Date.now();
  const bumpAt =
    trial.createdAt.getTime() +
    BOSS_TRIAL_AUTOMATIC_BUMP_AFTER_MINUTES * MINUTE_MS;
  const isAutomaticBumpMode = AUTOMATIC_BUMP_MODES.includes(trial.bumpMode);

  return (
    trial.durationMinutes === DAY_MINUTES &&
    isAutomaticBumpMode &&
    !trial.automaticBumpPostedAt &&
    now >= bumpAt &&
    now < trial.endsAt.getTime()
  );
};

export type { BossTrialView };
export {
  claimBossTrialAutomaticBump,
  claimBossTrialFinalResults,
  claimBossTrialLiveResults,
  getBossTrialView,
};
