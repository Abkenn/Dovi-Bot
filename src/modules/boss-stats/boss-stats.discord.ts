import { EmbedBuilder } from 'discord.js';
import type { BossStatsBossView } from './boss-stats.service';

type BossWithDaviStats = {
  stats: BossStatsBossView['stats'];
};

const formatSeconds = (seconds: number | null) => {
  if (seconds === null) {
    return null;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

export const getDaviBossStatsText = (boss: BossWithDaviStats) => {
  const stats = boss.stats[0];

  if (!stats) {
    return null;
  }

  const totalTime = formatSeconds(stats.totalAttemptTimeSeconds);
  const winningTime = formatSeconds(stats.winningAttemptTimeSeconds);
  const lines = [
    stats.deaths === null ? null : `Deaths: ${stats.deaths}`,
    totalTime ? `Total attempt time: ${totalTime}` : null,
    winningTime ? `Winning attempt: ${winningTime}` : null,
    stats.difficultyCoefficient
      ? `Difficulty coefficient: ${stats.difficultyCoefficient.toString()}`
      : null,
  ].filter((line) => line !== null);

  return lines.length > 0 ? lines.join('\n') : null;
};

export const addDaviBossStatsField = (
  embed: EmbedBuilder,
  boss: BossWithDaviStats,
) => {
  const daviStats = getDaviBossStatsText(boss);

  embed.addFields({
    name: 'Davi stats',
    value: daviStats ?? 'No Davi stats found for this boss yet.',
    inline: false,
  });

  return embed;
};

export const buildShowBossStatsEmbed = (boss: BossStatsBossView) =>
  addDaviBossStatsField(
    new EmbedBuilder()
      .setTitle('Boss Stats')
      .setColor(0xff3131)
      .addFields(
        { name: 'Game', value: boss.game.name, inline: true },
        { name: 'Boss', value: boss.name, inline: true },
      ),
    boss,
  );
