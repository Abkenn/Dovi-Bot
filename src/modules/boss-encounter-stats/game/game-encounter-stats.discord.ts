import { EmbedBuilder } from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../../config/discord-command-categories';
import type { GameBossDeathRankingView } from '../../bosses/bosses.service';

export const buildShowGameStatsEmbed = (gameStats: GameBossDeathRankingView) =>
  new EmbedBuilder()
    .setTitle('Game Stats')
    .setColor(getCommandCategoryAccentColor(COMMAND_CATEGORIES.BOSSES))
    .addFields(
      { name: 'Game', value: gameStats.game.name, inline: true },
      {
        name: 'Top deaths',
        value:
          gameStats.stats
            .map((stat, index) =>
              [
                `${index + 1}. ${stat.boss.name}`,
                stat.deaths === null ? null : `${stat.deaths} deaths`,
              ]
                .filter(Boolean)
                .join(' - '),
            )
            .join('\n') || 'No Davi boss death stats found for this game yet.',
        inline: false,
      },
    );
