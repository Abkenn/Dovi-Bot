import { EmbedBuilder } from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../../config/discord-command-categories';
import type { GameBossDeathRankingView } from '../../bosses/bosses.service';
import { getGameBossStatsRows } from '../../bosses/bosses.stats';

export const buildShowGameStatsEmbed = (
  gameStats: GameBossDeathRankingView,
) => {
  const bossRows = getGameBossStatsRows(gameStats);

  return new EmbedBuilder()
    .setTitle('Game Stats')
    .setColor(getCommandCategoryAccentColor(COMMAND_CATEGORIES.BOSSES))
    .addFields(
      { name: 'Game', value: gameStats.game.name, inline: true },
      {
        name: 'Boss stats',
        value:
          bossRows
            .map((boss, index) =>
              [`${index + 1}. ${boss.name}`, `${boss.deaths} deaths`].join(
                ' - ',
              ),
            )
            .join('\n') || 'No boss stats found for this game yet.',
        inline: false,
      },
    );
};
