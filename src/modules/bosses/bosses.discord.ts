import type { EmbedBuilder } from 'discord.js';

type BossWithDaviStats = {
  stats: {
    deaths: number | null;
    totalAttemptTimeSeconds: number | null;
    winningAttemptTimeSeconds: number | null;
    difficultyCoefficient: { toString(): string } | null;
  }[];
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
  options: { spoiler?: boolean } = {},
) => {
  const daviStats = getDaviBossStatsText(boss);
  const fieldValue =
    daviStats && options.spoiler ? `||${daviStats}||` : daviStats;

  embed.addFields({
    name: 'Davi stats',
    value: fieldValue ?? 'No Davi stats found for this boss yet.',
    inline: false,
  });

  return embed;
};
