import { EmbedBuilder } from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../config/discord-command-categories';
import { BossTrackingSessionStatus } from '../../generated/prisma/enums';
import type {
  BossTrackingSessionView,
  GameTrackingStatusView,
} from './boss-tracking.service';
import { calculateBossTrackingAverageAttemptTime } from './boss-tracking.service';

type BossTrackingEmbedField = {
  name: string;
  value: string;
  inline: boolean;
};

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

const getLatestPauseReason = (session: BossTrackingSessionView) => {
  if (session.status !== BossTrackingSessionStatus.PAUSED) {
    return null;
  }

  const reason = session.pauses[0]?.reason;

  return reason?.trim() || null;
};

const getStatusLabel = (session: BossTrackingSessionView) => {
  if (session.endResult) {
    return session.endResult === 'KILLED' ? 'Killed' : 'Abandoned';
  }

  if (session.status === BossTrackingSessionStatus.PAUSED) {
    return 'Paused';
  }

  if (session.status === BossTrackingSessionStatus.CANCELLED) {
    return 'Cancelled';
  }

  if (session.status === BossTrackingSessionStatus.ENDED) {
    return 'Ended';
  }

  return 'Active';
};

const getFieldRows = (fields: Omit<BossTrackingEmbedField, 'inline'>[]) => {
  return fields.map((field) => ({ ...field, inline: true }));
};

export const buildBossTrackingEmbed = ({
  session,
  title,
}: {
  session: BossTrackingSessionView;
  title: string;
}) => {
  const averageAttemptTime = calculateBossTrackingAverageAttemptTime(session);

  return new EmbedBuilder()
    .setTitle(title)
    .setColor(
      getCommandCategoryAccentColor(
        COMMAND_CATEGORIES.STREAM_GAME_TRACKING_TOOLS,
      ),
    )
    .addFields(
      ...getFieldRows([
        { name: 'Game', value: session.game.name },
        { name: 'Boss', value: session.boss.name },
        { name: 'Status', value: getStatusLabel(session) },
        { name: 'Deaths', value: String(session.deathCount) },
        {
          name: 'Avg attempt',
          value:
            (averageAttemptTime.seconds === null
              ? null
              : formatDuration(averageAttemptTime.seconds)) ??
            `Unknown (reason: ${averageAttemptTime.reason})`,
        },
      ]),
      ...(getLatestPauseReason(session)
        ? [
            {
              name: 'Latest pause',
              value: getLatestPauseReason(session) ?? '',
              inline: false,
            },
          ]
        : []),
    );
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
    );
