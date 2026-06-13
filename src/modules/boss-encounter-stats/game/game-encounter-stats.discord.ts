import { EmbedBuilder } from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../../config/discord-command-categories';
import type { GameBossDeathRankingView } from '../../bosses/bosses.service';
import { getGameBossStatsRows } from '../../bosses/bosses.stats';

const EMBED_FIELD_VALUE_LIMIT = 1024;

const buildBossStatsFields = (
  bossRows: ReturnType<typeof getGameBossStatsRows>,
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
    const line = [`${index + 1}. ${boss.name}`, `${boss.deaths} deaths`].join(
      ' - ',
    );
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
