import { EmbedBuilder } from 'discord.js';
import { DISCORD_STYLE } from '../../config/discord-style';
import type {
  CommunityTopicBossUserShareRow,
  CommunityTopicGameBossRow,
  CommunityTopicStatRow,
  CommunityTopicUserEntityStatRow,
  CommunityTopicUserStatRow,
} from '../../data/queries/community-topic-signals';

const formatStatRows = (rows: CommunityTopicStatRow[], emptyMessage: string) =>
  rows.length === 0
    ? emptyMessage
    : rows
        .map((row, index) => {
          const label = row.gameName
            ? `${row.entityName} (${row.gameName})`
            : row.entityName;

          return `${index + 1}. **${label}** - ${row.count} signals`;
        })
        .join('\n');

const formatUserRows = (rows: CommunityTopicUserStatRow[]) =>
  rows.length === 0
    ? 'No user signals yet.'
    : rows
        .map(
          (row, index) =>
            `${index + 1}. <@${row.userId}> - ${row.count} signals`,
        )
        .join('\n');

const formatUserEntityRows = (rows: CommunityTopicUserEntityStatRow[]) =>
  rows.length === 0
    ? 'No user/entity signals yet.'
    : rows
        .map((row, index) => {
          const label = row.gameName
            ? `${row.entityName} (${row.gameName})`
            : row.entityName;

          return `${index + 1}. <@${row.userId}> - **${label}** (${row.count})`;
        })
        .join('\n');

export const buildCommunityTopicStatsEmbed = ({
  title,
  stats,
}: {
  title: string;
  stats: NonNullable<
    Awaited<
      ReturnType<
        typeof import('./community-topic.service').getCommunityTopicStats
      >
    >
  >;
}) =>
  new EmbedBuilder()
    .setTitle(title)
    .setColor(DISCORD_STYLE.BOT_ACCENT_COLOR)
    .addFields(
      {
        name: 'Top games',
        value: formatStatRows(stats.games, 'No game signals yet.'),
      },
      {
        name: 'Top bosses',
        value: formatStatRows(stats.bosses, 'No boss signals yet.'),
      },
      {
        name: 'Top users',
        value: formatUserRows(stats.users),
      },
      {
        name: 'Top user bosses',
        value: formatUserEntityRows(stats.userBosses),
      },
      {
        name: 'Top user games',
        value: formatUserEntityRows(stats.userGames),
      },
    );

const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

const formatBossUserShareRows = ({
  users,
  totalIntensity,
}: {
  users: CommunityTopicBossUserShareRow[];
  totalIntensity: number;
}) => {
  if (users.length === 0 || totalIntensity <= 0) {
    return 'No discussion signals found for this boss yet.';
  }

  const topUsers = users.slice(0, 3);
  const topLines = topUsers.map(
    (user, index) =>
      `${index + 1}. **${formatPercent(user.ratio)}** <@${user.userId}>`,
  );
  const otherRatio = Math.max(
    0,
    1 - topUsers.reduce((sum, user) => sum + user.ratio, 0),
  );

  if (users.length > 3 && otherRatio > 0) {
    topLines.push(`**${formatPercent(otherRatio)}** Others`);
  }

  return topLines.join('\n');
};

export const buildCommunityTopicBossDiscussionEmbed = ({
  stats,
}: {
  stats: NonNullable<
    Awaited<
      ReturnType<
        typeof import('./community-topic.service').getCommunityTopicBossDiscussionStats
      >
    >
  >;
}) =>
  new EmbedBuilder()
    .setTitle('Game Discussion Stats')
    .setColor(DISCORD_STYLE.BOT_ACCENT_COLOR)
    .addFields(
      {
        name: 'Boss',
        value: `${stats.bossName} (${stats.gameName})`,
        inline: false,
      },
      {
        name: 'Discussion share',
        value: formatBossUserShareRows({
          users: stats.users,
          totalIntensity: stats.totalIntensity,
        }),
        inline: false,
      },
      {
        name: 'Signals',
        value:
          stats.totalCount === 0
            ? 'No signals yet.'
            : `${stats.totalCount} mentions`,
        inline: false,
      },
    );

const formatGameBossRows = (bosses: CommunityTopicGameBossRow[]) => {
  if (bosses.length === 0) {
    return 'No boss discussion signals found for this game yet.';
  }

  return bosses
    .map((boss, index) => {
      const topUser = boss.topUserId ? `, top: <@${boss.topUserId}>` : '';

      return `${index + 1}. **${boss.entityName}** (${boss.count} mentions${topUser})`;
    })
    .join('\n');
};

export const buildCommunityTopicGameDiscussionEmbed = ({
  stats,
}: {
  stats: NonNullable<
    Awaited<
      ReturnType<
        typeof import('./community-topic.service').getCommunityTopicGameDiscussionStats
      >
    >
  >;
}) =>
  new EmbedBuilder()
    .setTitle('Game Discussion Stats')
    .setColor(DISCORD_STYLE.BOT_ACCENT_COLOR)
    .addFields({
      name: stats.gameName,
      value: formatGameBossRows(stats.bosses),
      inline: false,
    });
