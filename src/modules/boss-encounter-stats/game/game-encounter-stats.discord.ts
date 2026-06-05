import { EmbedBuilder } from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../../config/discord-command-categories';
import { BossTrackingEndResult } from '../../../generated/prisma/enums';
import type { GameBossDeathRankingView } from '../../bosses/bosses.service';

const getBotTrackedBossRows = (gameStats: GameBossDeathRankingView) =>
  gameStats.trackedBosses
    .map((boss) => {
      const deaths = boss.trackingSessions.reduce(
        (sum, session) => sum + session.deathCount,
        0,
      );
      const killed = boss.trackingSessions.some(
        (session) => session.endResult === BossTrackingEndResult.KILLED,
      );

      return {
        name: boss.name,
        deaths,
        killed,
      };
    })
    .sort((left, right) => {
      if (right.deaths !== left.deaths) {
        return right.deaths - left.deaths;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 10);

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
      {
        name: 'Bot-tracked bosses',
        value:
          getBotTrackedBossRows(gameStats)
            .map((boss, index) =>
              [
                `${index + 1}. ${boss.name}`,
                `${boss.deaths} deaths`,
                boss.killed ? 'killed' : 'pending',
              ].join(' - '),
            )
            .join('\n') || 'No bot-tracked boss stats found for this game yet.',
        inline: false,
      },
    );
