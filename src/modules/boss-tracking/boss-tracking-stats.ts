import {
  BossTrackingAttemptResult,
  BossTrackingAttemptTimingStatus,
  BossTrackingEndResult,
} from '../../generated/prisma/enums';
import type {
  BossTrackingAverageAttemptTime,
  BossTrackingAverageFromSecondsInput,
  BossTrackingSessionView,
} from './boss-tracking.types';

type BossTrackingAttemptView = BossTrackingSessionView['attempts'][number];

const getAttemptSeconds = (attempt: BossTrackingAttemptView) => {
  if (attempt.vodStartSeconds !== null && attempt.vodEndSeconds !== null) {
    return Math.max(0, attempt.vodEndSeconds - attempt.vodStartSeconds);
  }

  if (!attempt.endedAt) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(
      (attempt.endedAt.getTime() - attempt.startedAt.getTime()) / 1000,
    ),
  );
};

const getTrackedAttemptSeconds = (session: BossTrackingSessionView) => {
  if (session.manualTrackedSeconds !== null) {
    return session.manualTrackedSeconds;
  }

  return session.attempts.reduce((totalSeconds, attempt) => {
    if (attempt.result === BossTrackingAttemptResult.IN_PROGRESS) {
      return totalSeconds;
    }

    return totalSeconds + (getAttemptSeconds(attempt) ?? 0);
  }, 0);
};

const hasVodContext = (session: BossTrackingSessionView) =>
  session.vodLabel !== null ||
  session.vodStartSeconds !== null ||
  session.vodEndSeconds !== null ||
  session.attempts.some(
    (attempt) =>
      attempt.vodStartSeconds !== null || attempt.vodEndSeconds !== null,
  ) ||
  session.pauses.some(
    (pause) => pause.vodLabel !== null || pause.vodResumeSeconds !== null,
  );

const getSummaryTrackedSeconds = (session: BossTrackingSessionView) => {
  if (session.manualTrackedSeconds !== null) {
    return session.manualTrackedSeconds;
  }

  if (session.vodStartSeconds !== null && session.vodEndSeconds !== null) {
    return Math.max(0, session.vodEndSeconds - session.vodStartSeconds);
  }

  return null;
};

const hasPartialVodAttemptTiming = (session: BossTrackingSessionView) =>
  session.attempts.some((attempt) => {
    if (attempt.result === BossTrackingAttemptResult.IN_PROGRESS) {
      return false;
    }

    const hasVodStart = attempt.vodStartSeconds !== null;
    const hasVodEnd = attempt.vodEndSeconds !== null;

    return hasVodStart !== hasVodEnd && getAttemptSeconds(attempt) === null;
  });

const wasStartedByLiveResumeWithoutVod = (
  session: BossTrackingSessionView,
  attempt: BossTrackingAttemptView,
) =>
  session.pauses.some((pause) => {
    if (
      !pause.endedAt ||
      pause.vodLabel !== null ||
      pause.vodResumeSeconds !== null
    ) {
      return false;
    }

    const secondsAfterResume = Math.abs(
      Math.floor(
        (attempt.startedAt.getTime() - pause.endedAt.getTime()) / 1000,
      ),
    );

    return secondsAfterResume <= 5;
  });

const hasUntimedVodAttempts = (session: BossTrackingSessionView) =>
  hasVodContext(session) &&
  session.manualTrackedSeconds === null &&
  session.attempts.some(
    (attempt) =>
      attempt.result !== BossTrackingAttemptResult.IN_PROGRESS &&
      getAttemptSeconds(attempt) === null &&
      attempt.vodStartSeconds === null &&
      attempt.vodEndSeconds === null &&
      !wasStartedByLiveResumeWithoutVod(session, attempt),
  );

export const getBossTrackingCompletedAttemptCount = (
  session: BossTrackingSessionView,
) => {
  const completedAttempts = session.attempts.filter(
    (attempt) => attempt.result !== BossTrackingAttemptResult.IN_PROGRESS,
  );

  if (completedAttempts.length > 0) {
    return completedAttempts.length;
  }

  if (session.endResult === BossTrackingEndResult.KILLED) {
    return session.recordedDeathCount + 1;
  }

  return session.recordedDeathCount;
};

const getRunbackSeconds = (session: BossTrackingSessionView) => {
  const attempts = [...session.attempts].sort(
    (left, right) => left.attemptNumber - right.attemptNumber,
  );

  return attempts.reduce((totalSeconds, attempt, index) => {
    const previousAttempt = attempts[index - 1];

    if (attempt.result === BossTrackingAttemptResult.IN_PROGRESS) {
      return totalSeconds;
    }

    if (attempt.runbackSeconds !== null) {
      return totalSeconds + attempt.runbackSeconds;
    }

    if (!previousAttempt) {
      return totalSeconds;
    }

    if (
      attempt.vodStartSeconds !== null &&
      previousAttempt.vodEndSeconds !== null
    ) {
      return attempt.vodStartSeconds === previousAttempt.vodEndSeconds
        ? totalSeconds + (session.boss.runbackSeconds ?? 0)
        : totalSeconds;
    }

    if (!previousAttempt.endedAt) {
      return totalSeconds;
    }

    const secondsAfterPreviousAttempt = Math.floor(
      (attempt.startedAt.getTime() - previousAttempt.endedAt.getTime()) / 1000,
    );

    return secondsAfterPreviousAttempt <= 5
      ? totalSeconds + (session.boss.runbackSeconds ?? 0)
      : totalSeconds;
  }, 0);
};

const getSummaryAttemptCount = (session: BossTrackingSessionView) => {
  if (session.endResult === BossTrackingEndResult.KILLED) {
    return session.deathCount + 1;
  }

  return session.deathCount;
};

export const getBossTrackingAverageAttemptCount = (
  session: BossTrackingSessionView,
) => {
  if (
    session.deathCount > session.recordedDeathCount &&
    getSummaryTrackedSeconds(session) !== null
  ) {
    return getSummaryAttemptCount(session);
  }

  return getBossTrackingCompletedAttemptCount(session);
};

const getAverageFromSeconds = ({
  trackedSeconds,
  attemptCount,
  runbackSeconds,
}: BossTrackingAverageFromSecondsInput): BossTrackingAverageAttemptTime => {
  const adjustedSeconds = Math.max(0, trackedSeconds - runbackSeconds);

  if (adjustedSeconds <= 0 || attemptCount <= 0) {
    return { seconds: null, reason: 'not enough timed attempts' };
  }

  return {
    seconds: Math.round(adjustedSeconds / attemptCount),
    reason: null,
  };
};

export const calculateBossTrackingAverageAttemptTime = (
  session: BossTrackingSessionView,
): BossTrackingAverageAttemptTime => {
  const runbackSecondsPerAttempt = session.boss.runbackSeconds;
  const hasSummaryDeaths = session.deathCount > session.recordedDeathCount;
  const summaryTrackedSeconds = getSummaryTrackedSeconds(session);

  if (hasPartialVodAttemptTiming(session)) {
    return { seconds: null, reason: 'partial attempt times' };
  }

  if (hasUntimedVodAttempts(session)) {
    return { seconds: null, reason: 'missing attempt times' };
  }

  if (hasSummaryDeaths) {
    if (
      summaryTrackedSeconds !== null &&
      runbackSecondsPerAttempt === null &&
      session.deathCount > 0
    ) {
      return {
        seconds: null,
        reason: 'average runback time not added',
      };
    }

    if (summaryTrackedSeconds !== null) {
      return getAverageFromSeconds({
        trackedSeconds: summaryTrackedSeconds,
        attemptCount: getSummaryAttemptCount(session),
        runbackSeconds: (runbackSecondsPerAttempt ?? 0) * session.deathCount,
      });
    }
  }

  if (
    session.attemptTimingStatus !== BossTrackingAttemptTimingStatus.TRUSTED &&
    session.deathCount <= session.recordedDeathCount
  ) {
    return { seconds: null, reason: 'death count was reconciled' };
  }

  return getAverageFromSeconds({
    trackedSeconds: getTrackedAttemptSeconds(session),
    attemptCount: getBossTrackingCompletedAttemptCount(session),
    runbackSeconds: getRunbackSeconds(session),
  });
};

export const getBossTrackingSessionTotalAttemptSeconds = (
  session: BossTrackingSessionView,
) => {
  if (session.manualTrackedSeconds !== null) {
    return session.manualTrackedSeconds;
  }

  if (session.vodStartSeconds !== null && session.vodEndSeconds !== null) {
    return Math.max(0, session.vodEndSeconds - session.vodStartSeconds);
  }

  if (!session.endedAt) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
    ) - session.totalPausedSeconds,
  );
};

export const getBossTrackingSessionWinningAttemptSeconds = (
  session: BossTrackingSessionView,
) => {
  if (session.endResult !== BossTrackingEndResult.KILLED) {
    return null;
  }

  const winningAttempt = session.attempts.find(
    (attempt) => attempt.result === BossTrackingAttemptResult.KILLED,
  );

  if (!winningAttempt) {
    return null;
  }

  if (
    session.manualTrackedSeconds !== null &&
    (winningAttempt.vodStartSeconds === null ||
      winningAttempt.vodEndSeconds === null)
  ) {
    return null;
  }

  return getAttemptSeconds(winningAttempt);
};

export const summarizeBossTrackingSessions = (
  sessions: BossTrackingSessionView[],
) => {
  const totalAttemptSeconds = sessions.reduce(
    (sum, session) =>
      sum + (getBossTrackingSessionTotalAttemptSeconds(session) ?? 0),
    0,
  );

  const attemptStats = sessions.reduce(
    (stats, session) => {
      const averageAttemptTime =
        calculateBossTrackingAverageAttemptTime(session);
      const attemptCount = getBossTrackingAverageAttemptCount(session);

      if (averageAttemptTime.seconds === null || attemptCount <= 0) {
        return stats;
      }

      return {
        attemptCount: stats.attemptCount + attemptCount,
        secondsWithoutRunbacks:
          stats.secondsWithoutRunbacks +
          averageAttemptTime.seconds * attemptCount,
      };
    },
    { attemptCount: 0, secondsWithoutRunbacks: 0 },
  );
  const averageAttemptSeconds =
    attemptStats.secondsWithoutRunbacks > 0 && attemptStats.attemptCount > 0
      ? Math.round(
          attemptStats.secondsWithoutRunbacks / attemptStats.attemptCount,
        )
      : null;
  const winningAttemptSeconds =
    sessions
      .map((session) => getBossTrackingSessionWinningAttemptSeconds(session))
      .find((seconds) => seconds !== null) ?? null;

  return {
    totalAttemptSeconds: totalAttemptSeconds > 0 ? totalAttemptSeconds : null,
    averageAttemptSeconds,
    averageAttemptCount: attemptStats.attemptCount,
    totalAttemptSecondsWithoutRunbacks:
      attemptStats.secondsWithoutRunbacks > 0
        ? attemptStats.secondsWithoutRunbacks
        : null,
    winningAttemptSeconds,
  };
};
