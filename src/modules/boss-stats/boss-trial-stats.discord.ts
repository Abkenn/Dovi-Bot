import { type Client, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { BossTrialStatus } from '../../generated/prisma/enums';
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
    displayName?: string;
  }[];
  participants: {
    userId: string;
    count: number;
    displayName?: string;
  }[];
};

const toTimestamp = (date: Date, style: 'f' | 'R' = 'R') =>
  `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;

const formatLeaderboard = (
  rows: { userId: string; count: number; displayName?: string }[],
  unit: string,
) => {
  if (rows.length === 0) {
    return 'No data yet.';
  }

  return rows
    .map(
      (row, index) =>
        `${index + 1}. ${row.displayName ?? `User ${row.userId}`} - ${
          row.count
        } ${unit}${row.count === 1 ? '' : 's'}`,
    )
    .join('\n');
};

const sanitizeDisplayName = (displayName: string) =>
  escapeMarkdown(displayName.replaceAll('@', '@ '));

const fetchGuildDisplayName = async ({
  client,
  guildId,
  userId,
}: {
  client: Client;
  guildId: string;
  userId: string;
}) => {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  const member = await guild?.members.fetch(userId).catch(() => null);

  if (member) {
    return sanitizeDisplayName(member.displayName);
  }

  const user = await client.users.fetch(userId).catch(() => null);

  if (user) {
    return sanitizeDisplayName(user.displayName);
  }

  return `User ${userId}`;
};

export const addBossTrialStatsDisplayNames = async ({
  client,
  guildId,
  stats,
}: {
  client: Client;
  guildId: string;
  stats: BossTrialStatsView;
}): Promise<BossTrialStatsView> => {
  const userIds = [
    ...new Set([
      ...stats.creators.map((row) => row.userId),
      ...stats.participants.map((row) => row.userId),
    ]),
  ];
  const displayNames = new Map<string, string>(
    await Promise.all(
      userIds.map(
        async (userId) =>
          [
            userId,
            await fetchGuildDisplayName({ client, guildId, userId }),
          ] as const,
      ),
    ),
  );

  return {
    ...stats,
    creators: stats.creators.map((row) => ({
      ...row,
      displayName: displayNames.get(row.userId) ?? `User ${row.userId}`,
    })),
    participants: stats.participants.map((row) => ({
      ...row,
      displayName: displayNames.get(row.userId) ?? `User ${row.userId}`,
    })),
  };
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
