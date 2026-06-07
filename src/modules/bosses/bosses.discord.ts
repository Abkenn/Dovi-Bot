import type { EmbedBuilder } from 'discord.js';
import type { BossTrackingSessionView } from '../boss-tracking/boss-tracking.types';
import {
  summarizeBotTrackedBossStats,
  summarizeCombinedBossStats,
} from './bosses.stats';

type BossWithDaviStats = {
  stats: {
    deaths: number | null;
    totalAttemptTimeSeconds: number | null;
    winningAttemptTimeSeconds: number | null;
    difficultyCoefficient: { toString(): string } | null;
  }[];
};

type BossWithBotTrackedStats = {
  runbackSeconds: number | null;
  trackingSessions: BossTrackingSessionView[];
};

type BossWithStats = BossWithDaviStats & BossWithBotTrackedStats;

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

export const getBotTrackedBossStatsText = (boss: BossWithBotTrackedStats) => {
  const stats = summarizeBotTrackedBossStats(boss);

  if (!stats) {
    return null;
  }

  const lines = [
    `Deaths: ${stats.deaths}`,
    stats.totalAttemptSeconds
      ? `Total attempt time: ${formatSeconds(stats.totalAttemptSeconds)}`
      : null,
    `Killed: ${stats.killed ? 'Yes' : 'No'}`,
    stats.sessionCount > 1 ? `Sessions: ${stats.sessionCount}` : null,
    stats.averageAttemptSeconds
      ? `Avg attempt: ${formatSeconds(stats.averageAttemptSeconds)}`
      : null,
    stats.winningAttemptSeconds
      ? `Winning attempt: ${formatSeconds(stats.winningAttemptSeconds)}`
      : null,
    stats.totalAttemptSecondsWithoutRunbacks
      ? `Total attempt time (without runbacks): ${formatSeconds(stats.totalAttemptSecondsWithoutRunbacks)}`
      : null,
  ].filter((line) => line !== null);

  return lines.join('\n');
};

export const getBossStatsText = (boss: BossWithStats) => {
  const stats = summarizeCombinedBossStats(boss);

  if (!stats) {
    return null;
  }

  const lines = [
    stats.deaths === null ? null : `Deaths: ${stats.deaths}`,
    stats.totalAttemptSeconds
      ? `Total attempt time: ${formatSeconds(stats.totalAttemptSeconds)}`
      : null,
    stats.averageAttemptSeconds
      ? `Avg attempt: ${formatSeconds(stats.averageAttemptSeconds)}`
      : null,
    stats.winningAttemptSeconds
      ? `Winning attempt: ${formatSeconds(stats.winningAttemptSeconds)}`
      : null,
    stats.difficultyCoefficient
      ? `Difficulty coefficient: ${stats.difficultyCoefficient.toString()}`
      : null,
    stats.totalAttemptSecondsWithoutRunbacks
      ? `Total attempt time (without runbacks): ${formatSeconds(stats.totalAttemptSecondsWithoutRunbacks)}`
      : null,
  ].filter((line) => line !== null);

  return lines.join('\n');
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

export const addBotTrackedBossStatsField = (
  embed: EmbedBuilder,
  boss: BossWithBotTrackedStats,
) => {
  embed.addFields({
    name: 'Bot-tracked stats',
    value:
      getBotTrackedBossStatsText(boss) ??
      'No bot-tracked stats found for this boss yet.',
    inline: false,
  });

  return embed;
};

export const addBossStatsField = (embed: EmbedBuilder, boss: BossWithStats) => {
  embed.addFields({
    name: 'Davi stats',
    value: getBossStatsText(boss) ?? 'No Davi stats found for this boss yet.',
    inline: false,
  });

  return embed;
};
