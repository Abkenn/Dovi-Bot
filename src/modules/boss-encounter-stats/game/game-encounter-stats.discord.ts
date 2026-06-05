import { EmbedBuilder } from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../../config/discord-command-categories';
import type { GameBossDeathRankingView } from '../../bosses/bosses.service';

const getBossRows = (gameStats: GameBossDeathRankingView) => {
  const rows = new Map<
    string,
    { name: string; deaths: number; hasDeaths: boolean }
  >();

  for (const stat of gameStats.stats) {
    rows.set(stat.boss.id, {
      name: stat.boss.name,
      deaths: stat.deaths ?? 0,
      hasDeaths: stat.deaths !== null,
    });
  }

  for (const boss of gameStats.trackedBosses) {
    const existing = rows.get(boss.id);
    const trackedDeaths = boss.trackingSessions.reduce(
      (sum, session) => sum + session.deathCount,
      0,
    );

    rows.set(boss.id, {
      name: boss.name,
      deaths: (existing?.deaths ?? 0) + trackedDeaths,
      hasDeaths: true,
    });
  }

  return [...rows.values()]
    .filter((row) => row.hasDeaths)
    .sort((left, right) => {
      if (right.deaths !== left.deaths) {
        return right.deaths - left.deaths;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 10);
};

export const buildShowGameStatsEmbed = (
  gameStats: GameBossDeathRankingView,
) => {
  const bossRows = getBossRows(gameStats);

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
