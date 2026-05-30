import { EmbedBuilder } from 'discord.js';
import { DISCORD_STYLE } from '../../config/discord-style';
import type {
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
