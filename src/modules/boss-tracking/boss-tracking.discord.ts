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
import type {
  BossTrackingSessionView,
  GameTrackingStatusView,
} from './boss-tracking.service';

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

  const pauses = [...session.pauses].sort(
    (left, right) => left.startedAt.getTime() - right.startedAt.getTime(),
  );
  const latestAttempt = [...session.attempts].sort(
    (left, right) => right.attemptNumber - left.attemptNumber,
  )[0];
  const latestVodEndSeconds =
    session.vodEndSeconds ??
    latestAttempt?.vodEndSeconds ??
    latestAttempt?.vodStartSeconds ??
    null;
  let trackedSeconds = 0;
  let segmentStartDate = session.startedAt;
  let segmentStartVodSeconds = session.vodStartSeconds;

  for (const pause of pauses) {
    if (segmentStartVodSeconds !== null && pause.vodPauseSeconds !== null) {
      trackedSeconds += Math.max(
        0,
        pause.vodPauseSeconds - segmentStartVodSeconds,
      );
    } else {
      trackedSeconds += Math.max(
        0,
        Math.floor(
          (pause.startedAt.getTime() - segmentStartDate.getTime()) / 1000,
        ),
      );
    }

    if (!pause.endedAt) {
      return trackedSeconds;
    }

    segmentStartDate = pause.endedAt;
    segmentStartVodSeconds = pause.vodResumeSeconds;
  }

  if (segmentStartVodSeconds !== null && latestVodEndSeconds !== null) {
    trackedSeconds += Math.max(0, latestVodEndSeconds - segmentStartVodSeconds);
  } else {
    const endedAt = session.endedAt ?? now;

    trackedSeconds += Math.max(
      0,
      Math.floor((endedAt.getTime() - segmentStartDate.getTime()) / 1000),
    );
  }

  if (session.status === BossTrackingSessionStatus.PAUSED && session.pausedAt) {
    return trackedSeconds;
  }

  return Math.max(0, trackedSeconds);
};

const getCompletedAttemptCount = (session: BossTrackingSessionView) => {
  const completedAttempts = session.attempts.filter((attempt) =>
    ['DEATH', 'KILLED', 'ABANDONED', 'CANCELLED'].includes(attempt.result),
  );

  if (completedAttempts.length > 0) {
    return completedAttempts.length;
  }

  return session.endResult === BossTrackingEndResult.KILLED
    ? session.recordedDeathCount + 1
    : session.recordedDeathCount;
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

const getAverageAttemptTime = (session: BossTrackingSessionView) => {
  if (session.attemptTimingStatus !== BossTrackingAttemptTimingStatus.TRUSTED) {
    return null;
  }

  const nonFirstAttemptCount = session.recordedDeathCount;
  const runbackSeconds =
    (session.boss.runbackSeconds ?? 0) * nonFirstAttemptCount;
  const trackedSeconds = Math.max(
    0,
    getTrackedSeconds(session) - runbackSeconds,
  );

  if (trackedSeconds <= 0) {
    return null;
  }

  const completedAttemptCount = getCompletedAttemptCount(session);

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
        COMMAND_CATEGORIES.STREAM_GAME_TRACKING_TOOLS,
      ),
    )
    .addFields(
      ...getFieldRows(
        [
          { name: 'Game', value: session.game.name },
          { name: 'Boss', value: session.boss.name },
          { name: 'Status', value: getStatusLabel(session) },
          { name: 'Deaths', value: String(session.deathCount) },
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
