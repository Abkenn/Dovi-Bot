import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageEditOptions,
} from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../../config/discord-command-categories';
import type {
  AllGameBossDeathRankingView,
  GameBossDeathRankingView,
} from '../../bosses/bosses.service';
import { getGameBossStatsRows } from '../../bosses/bosses.stats';
import { buildComponentEmbedMessageFromEmbeds } from '../../discord/component-embed';

const EMBED_FIELD_VALUE_LIMIT = 1024;
const ALL_GAME_STATS_PAGE_SIZE = 10;
const ALL_GAME_STATS_CUSTOM_ID_PREFIX = 'all-game-stats';

const buildBossStatsFields = (
  bossRows: ReturnType<typeof getGameBossStatsRows>,
  options: { startIndex?: number } = {},
) => {
  if (bossRows.length === 0) {
    return [
      {
        name: 'Boss stats',
        value: 'No boss stats found for this game yet.',
        inline: false,
      },
    ];
  }

  const fields: { name: string; value: string; inline: false }[] = [];
  let currentValue = '';

  for (const [index, boss] of bossRows.entries()) {
    const rank = (options.startIndex ?? 0) + index + 1;
    const line = [`${rank}. ${boss.name}`, `${boss.deaths} deaths`].join(' - ');
    const nextValue = currentValue ? `${currentValue}\n${line}` : line;

    if (nextValue.length > EMBED_FIELD_VALUE_LIMIT && currentValue) {
      fields.push({
        name: fields.length === 0 ? 'Boss stats' : 'Boss stats continued',
        value: currentValue,
        inline: false,
      });
      currentValue = line;
      continue;
    }

    currentValue = nextValue;
  }

  if (currentValue) {
    fields.push({
      name: fields.length === 0 ? 'Boss stats' : 'Boss stats continued',
      value: currentValue,
      inline: false,
    });
  }

  return fields;
};

export const buildShowGameStatsEmbed = (
  gameStats: GameBossDeathRankingView,
  options: { limit?: number | null } = {},
) => {
  const bossRows = getGameBossStatsRows(gameStats, options);

  return new EmbedBuilder()
    .setTitle('Game Stats')
    .setColor(getCommandCategoryAccentColor(COMMAND_CATEGORIES.BOSSES))
    .addFields(
      { name: 'Game', value: gameStats.game.name, inline: true },
      ...buildBossStatsFields(bossRows),
    );
};

export const buildShowAllGameStatsEmbed = (
  ranking: AllGameBossDeathRankingView,
) =>
  new EmbedBuilder()
    .setTitle('All Games Stats')
    .setColor(getCommandCategoryAccentColor(COMMAND_CATEGORIES.BOSSES))
    .addFields(
      ...buildBossStatsFields(
        ranking.bosses.map((boss) => ({
          name: `${boss.name} (${boss.gameName})`,
          deaths: boss.deaths,
          hasDeaths: true,
        })),
      ),
    );

export const parseAllGameStatsPageAction = (customId: string) => {
  const [prefix, requesterUserId, pageText] = customId.split(':');
  const page = Number(pageText);

  if (
    prefix !== ALL_GAME_STATS_CUSTOM_ID_PREFIX ||
    !requesterUserId ||
    !Number.isInteger(page) ||
    page < 1
  ) {
    return null;
  }

  return { requesterUserId, page };
};

export const buildShowAllGameStatsPageMessage = ({
  ranking,
  page,
  requesterUserId,
}: {
  ranking: AllGameBossDeathRankingView;
  page: number;
  requesterUserId: string;
}): MessageEditOptions => {
  const pageCount = Math.max(
    1,
    Math.ceil(ranking.bosses.length / ALL_GAME_STATS_PAGE_SIZE),
  );
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const startIndex = (safePage - 1) * ALL_GAME_STATS_PAGE_SIZE;
  const pageBosses = ranking.bosses.slice(
    startIndex,
    startIndex + ALL_GAME_STATS_PAGE_SIZE,
  );
  const embed = new EmbedBuilder()
    .setTitle('All Games Stats')
    .setDescription(`Page ${safePage} of ${pageCount}`)
    .setColor(getCommandCategoryAccentColor(COMMAND_CATEGORIES.BOSSES))
    .addFields(
      ...buildBossStatsFields(
        pageBosses.map((boss) => ({
          name: `${boss.name} (${boss.gameName})`,
          deaths: boss.deaths,
          hasDeaths: true,
        })),
        { startIndex },
      ),
    );
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `${ALL_GAME_STATS_CUSTOM_ID_PREFIX}:${requesterUserId}:${safePage - 1}`,
      )
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage === 1),
    new ButtonBuilder()
      .setCustomId(
        `${ALL_GAME_STATS_CUSTOM_ID_PREFIX}:${requesterUserId}:${safePage + 1}`,
      )
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage === pageCount),
  );
  const componentMessage = buildComponentEmbedMessageFromEmbeds([embed]);

  return {
    ...componentMessage,
    components: [...(componentMessage.components ?? []), buttons],
  };
};
