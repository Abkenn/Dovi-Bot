import { EmbedBuilder } from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../config/discord-command-categories';
import type { GameTrackingStatusView } from './boss-tracking.types';

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
};

const formatRecentBossEncounter = (
  encounter: GameTrackingStatusView['recentBossEncounters'][number],
) => {
  const averageAttempt =
    encounter.averageAttemptSeconds === null
      ? 'Unknown'
      : formatDuration(encounter.averageAttemptSeconds);
  const stats = [
    `Deaths: ${encounter.deaths}`,
    `Avg attempt: ${averageAttempt}`,
  ];

  if (encounter.winningAttemptSeconds !== null) {
    stats.push(
      `Winning attempt: ${formatDuration(encounter.winningAttemptSeconds)}`,
    );
  }

  return `**${encounter.bossName}**\n${stats.join(' | ')}`;
};

export const buildGameTrackingStatusEmbed = (status: GameTrackingStatusView) =>
  new EmbedBuilder()
    .setTitle('Game Tracking Status')
    .setColor(
      getCommandCategoryAccentColor(
        COMMAND_CATEGORIES.STREAM_GAME_TRACKING_TOOLS,
      ),
    )
    .addFields(
      { name: 'Game', value: status.gameName, inline: true },
      { name: 'Deaths', value: String(status.deaths), inline: true },
      {
        name: 'Bosses',
        value: `${status.killedBossCount} killed / ${status.pendingBossCount} pending`,
        inline: false,
      },
      {
        name: 'Recent Boss Encounters',
        value:
          status.recentBossEncounters
            .map(formatRecentBossEncounter)
            .join('\n\n') || 'No boss encounters recorded yet.',
        inline: false,
      },
    );
