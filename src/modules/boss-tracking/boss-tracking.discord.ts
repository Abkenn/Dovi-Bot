import { EmbedBuilder } from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../config/discord-command-categories';
import {
  BossTrackingAttemptTimingStatus,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import type { BossTrackingSessionView } from './boss-tracking.service';

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

const getCurrentAttemptNumber = (session: BossTrackingSessionView) =>
  session.attempts[0]?.attemptNumber ?? session.deathCount + 1;

const getTimingStatus = (session: BossTrackingSessionView) => {
  if (session.attemptTimingStatus === BossTrackingAttemptTimingStatus.TRUSTED) {
    return 'Trusted';
  }

  return session.reconciliationNote
    ? `Reconciled: ${session.reconciliationNote}`
    : 'Reconciled';
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

export const buildBossTrackingEmbed = ({
  session,
  title,
}: {
  session: BossTrackingSessionView;
  title: string;
}) =>
  new EmbedBuilder()
    .setTitle(title)
    .setColor(getCommandCategoryAccentColor(COMMAND_CATEGORIES.BOSSES))
    .addFields(
      { name: 'Game', value: session.game.name, inline: true },
      { name: 'Boss', value: session.boss.name, inline: true },
      { name: 'Status', value: getStatusLabel(session), inline: true },
      {
        name: 'Deaths',
        value: String(
          session.finalDeaths ?? session.startDeaths + session.deathCount,
        ),
        inline: true,
      },
      {
        name: 'Session deaths',
        value: String(session.deathCount),
        inline: true,
      },
      {
        name: 'Tracked deaths',
        value: String(session.recordedDeathCount),
        inline: true,
      },
      {
        name: 'Current attempt',
        value: String(getCurrentAttemptNumber(session)),
        inline: true,
      },
      {
        name: 'Tracked time',
        value: formatDuration(getTrackedSeconds(session)),
        inline: true,
      },
      {
        name: 'Attempt timing',
        value: getTimingStatus(session),
        inline: false,
      },
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
