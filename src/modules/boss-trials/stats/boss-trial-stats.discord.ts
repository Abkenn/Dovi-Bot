import { EmbedBuilder } from 'discord.js';
import { BossTrialStatus } from '../../../generated/prisma/enums';
import {
  type BossTrialStatsTrial,
  getBossTrialResultText,
} from './boss-trial-stats.service';

type BossTrialStatsView = {
  totalTrials: number;
  totalVotes: number;
  trials: BossTrialStatsTrial[];
  creators: {
    userId: string;
    count: number;
  }[];
  participants: {
    userId: string;
    count: number;
  }[];
};

const toTimestamp = (date: Date, style: 'f' | 'R' = 'R') =>
  `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;

const formatLeaderboard = (
  rows: { userId: string; count: number }[],
  unit: string,
) => {
  if (rows.length === 0) {
    return 'No data yet.';
  }

  return rows
    .map(
      (row, index) =>
        `${index + 1}. <@${row.userId}> - ${row.count} ${unit}${
          row.count === 1 ? '' : 's'
        }`,
    )
    .join('\n');
};

const formatTrialLine = (trial: BossTrialStatsTrial) => {
  const status =
    trial.status === BossTrialStatus.RESULTS_PUBLISHED ? 'Finished' : 'Live';

  return [
    `**${trial.boss.name}** (${trial.game.name})`,
    `${status} - ${toTimestamp(trial.createdAt)}`,
    `Result: ${getBossTrialResultText(trial)}`,
  ].join('\n');
};

const formatTrials = (trials: BossTrialStatsTrial[]) => {
  if (trials.length === 0) {
    return 'No boss trials yet.';
  }

  return trials.map(formatTrialLine).join('\n\n');
};

export const buildBossTrialStatsEmbed = ({
  stats,
  title,
}: {
  stats: BossTrialStatsView;
  title: string;
}) =>
  new EmbedBuilder()
    .setTitle(title)
    .setColor(0xff3131)
    .addFields(
      {
        name: 'Totals',
        value: `${stats.totalTrials} trials\n${stats.totalVotes} votes`,
        inline: true,
      },
      {
        name: 'Recent trials',
        value: formatTrials(stats.trials),
        inline: false,
      },
      {
        name: 'Top trial creators',
        value: formatLeaderboard(stats.creators, 'trial'),
        inline: false,
      },
      {
        name: 'Top participants',
        value: formatLeaderboard(stats.participants, 'vote'),
        inline: false,
      },
    )
    .setTimestamp(new Date());
