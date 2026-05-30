import { EmbedBuilder } from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../config/discord-command-categories';
import {
  BossTrackingAttemptTimingStatus,
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import type { BossTrackingSessionView } from './boss-tracking.service';

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

const getTrackedSeconds = (
  session: BossTrackingSessionView,
  now = new Date(),
) => {
  if (session.manualTrackedSeconds !== null) {
    return session.manualTrackedSeconds;
  }

  const endedAt = session.endedAt ?? now;
  const pausedSeconds =
    session.status === BossTrackingSessionStatus.PAUSED && session.pausedAt
      ? Math.floor((endedAt.getTime() - session.pausedAt.getTime()) / 1000)
      : 0;

  return Math.max(
    0,
    Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000) -
      session.totalPausedSeconds -
      Math.max(0, pausedSeconds),
  );
};

const getLatestPauseReason = (session: BossTrackingSessionView) => {
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

const getDisplayedDeaths = (session: BossTrackingSessionView) =>
  session.finalDeaths ?? session.startDeaths + session.deathCount;

const getAverageAttemptTime = (session: BossTrackingSessionView) => {
  if (session.attemptTimingStatus !== BossTrackingAttemptTimingStatus.TRUSTED) {
    return null;
  }

  const trackedSeconds = getTrackedSeconds(session);

  if (trackedSeconds <= 0) {
    return null;
  }

  const completedAttemptCount =
    session.endResult === BossTrackingEndResult.KILLED
      ? session.recordedDeathCount + 1
      : session.recordedDeathCount;

  if (completedAttemptCount <= 0) {
    return null;
  }

  return formatDuration(Math.round(trackedSeconds / completedAttemptCount));
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
  const averageAttemptTime = getAverageAttemptTime(session);

  return new EmbedBuilder()
    .setTitle(title)
    .setColor(
      getCommandCategoryAccentColor(
        COMMAND_CATEGORIES.DAVI_STREAM_TRACKING_TOOLS,
      ),
    )
    .addFields(
      ...getFieldRows(
        [
          { name: 'Game', value: session.game.name },
          { name: 'Boss', value: session.boss.name },
          { name: 'Status', value: getStatusLabel(session) },
          { name: 'Deaths', value: String(getDisplayedDeaths(session)) },
          averageAttemptTime
            ? {
                name: 'Avg attempt',
                value: averageAttemptTime,
              }
            : null,
        ].filter(
          (field): field is Omit<BossTrackingEmbedField, 'inline'> =>
            field !== null,
        ),
      ),
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
