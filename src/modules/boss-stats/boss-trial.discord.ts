import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import {
  BossTrialStatus,
  BossTrialVoteVerdict,
} from '../../generated/prisma/enums';
import { addDaviBossStatsField } from './boss-stats.discord';
import {
  type BossTrialView,
  getVoteBreakdown,
  getWinningVerdict,
  shouldShowBossTrialVotes,
} from './boss-trial.service';
import {
  BOSS_TRIAL_CUSTOM_ID_PREFIX,
  BOSS_TRIAL_VERDICT_LABELS,
  BOSS_TRIAL_VERDICTS,
} from './boss-trial.types';

export type BossTrialButtonAction =
  | {
      type: 'vote';
      trialId: string;
      verdict: BossTrialVoteVerdict;
    }
  | {
      type: 'publish';
      trialId: string;
    };

const toTimestamp = (date: Date, style: 'f' | 'R' = 'R') =>
  `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;

const formatDurationMinutes = (minutes: number) => {
  if (minutes === 60) {
    return '1 hour';
  }

  if (minutes === 24 * 60) {
    return '1 day';
  }

  return `${minutes} minutes`;
};

const getTrialStatusLabel = (trial: BossTrialView) => {
  if (trial.status === BossTrialStatus.RESULTS_PUBLISHED) {
    return 'Results published, voting still open';
  }

  return 'Voting open';
};

const getVoteVisibilityText = (trial: BossTrialView) => {
  if (!shouldShowBossTrialVotes(trial)) {
    return `Hidden until ${toTimestamp(trial.voteVisibilityHiddenUntil)}.`;
  }

  return 'Live totals visible.';
};

const getTimeRemainingText = (trial: BossTrialView) => {
  if (trial.finalResultsPostedAt) {
    return `Scheduled result posted ${toTimestamp(trial.finalResultsPostedAt)}.`;
  }

  return `Scheduled result ${toTimestamp(trial.endsAt)}.`;
};

const getVoteBreakdownText = (trial: BossTrialView) => {
  if (!shouldShowBossTrialVotes(trial)) {
    return 'Votes are hidden for now.';
  }

  const breakdown = getVoteBreakdown(trial);

  return BOSS_TRIAL_VERDICTS.map(
    (verdict) => `${BOSS_TRIAL_VERDICT_LABELS[verdict]}: ${breakdown[verdict]}`,
  ).join('\n');
};

export const buildBossTrialEmbed = (trial: BossTrialView) => {
  const embed = new EmbedBuilder()
    .setTitle('Boss Trial')
    .setColor(0xff3131)
    .addFields(
      { name: 'Game', value: trial.game.name, inline: true },
      { name: 'Boss', value: trial.boss.name, inline: true },
      {
        name: 'Duration',
        value: formatDurationMinutes(trial.durationMinutes),
        inline: true,
      },
      { name: 'Status', value: getTrialStatusLabel(trial), inline: true },
      {
        name: 'Vote visibility',
        value: getVoteVisibilityText(trial),
        inline: true,
      },
      {
        name: 'Time remaining',
        value: getTimeRemainingText(trial),
        inline: true,
      },
      { name: 'Votes', value: getVoteBreakdownText(trial), inline: false },
    )
    .setTimestamp(trial.createdAt);

  return addDaviBossStatsField(embed, trial.boss);
};

export const buildBossTrialFinalResultsEmbed = (trial: BossTrialView) => {
  const breakdown = getVoteBreakdown(trial);
  const winningVerdict = getWinningVerdict(trial);
  const totalVoters = trial.votes.length;
  const winnerText =
    totalVoters > 0
      ? BOSS_TRIAL_VERDICT_LABELS[winningVerdict]
      : 'No votes yet';

  return new EmbedBuilder()
    .setTitle('Boss Trial Results')
    .setColor(0xff3131)
    .addFields(
      { name: 'Game', value: trial.game.name, inline: true },
      { name: 'Boss', value: trial.boss.name, inline: true },
      { name: 'Winning verdict', value: winnerText, inline: true },
      { name: 'Total voters', value: String(totalVoters), inline: true },
      {
        name: 'Vote breakdown',
        value: BOSS_TRIAL_VERDICTS.map(
          (verdict) =>
            `${BOSS_TRIAL_VERDICT_LABELS[verdict]}: ${breakdown[verdict]}`,
        ).join('\n'),
        inline: false,
      },
    )
    .setTimestamp(new Date());
};

export const buildBossTrialVoteButtons = (trialId: string) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `${BOSS_TRIAL_CUSTOM_ID_PREFIX}:vote:${trialId}:${BossTrialVoteVerdict.PEAK}`,
      )
      .setLabel('Peak')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(
        `${BOSS_TRIAL_CUSTOM_ID_PREFIX}:vote:${trialId}:${BossTrialVoteVerdict.FAIR}`,
      )
      .setLabel('Fair')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(
        `${BOSS_TRIAL_CUSTOM_ID_PREFIX}:vote:${trialId}:${BossTrialVoteVerdict.MID}`,
      )
      .setLabel('Mid')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(
        `${BOSS_TRIAL_CUSTOM_ID_PREFIX}:vote:${trialId}:${BossTrialVoteVerdict.BULLSHIT}`,
      )
      .setLabel('Bullshit')
      .setStyle(ButtonStyle.Danger),
  );

export const buildBossTrialRequesterControls = (trialId: string) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${BOSS_TRIAL_CUSTOM_ID_PREFIX}:publish:${trialId}`)
      .setLabel('Publish Results Again')
      .setStyle(ButtonStyle.Secondary),
  );

export const parseBossTrialButtonAction = (
  customId: string,
): BossTrialButtonAction | null => {
  const [prefix, action, trialId, verdict] = customId.split(':');

  if (prefix !== BOSS_TRIAL_CUSTOM_ID_PREFIX || !trialId) {
    return null;
  }

  if (action === 'publish') {
    return { type: 'publish', trialId };
  }

  if (
    action === 'vote' &&
    BOSS_TRIAL_VERDICTS.includes(verdict as BossTrialVoteVerdict)
  ) {
    return {
      type: 'vote',
      trialId,
      verdict: verdict as BossTrialVoteVerdict,
    };
  }

  return null;
};
