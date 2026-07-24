import type { CurrentBoss } from '@/live-stats.types';

type CurrentAttemptDisplay = {
  elapsedSeconds: number | null;
  state: 'LIVE' | 'PAUSED' | 'RUNBACK';
};

export const CURRENT_ATTEMPT_STATE_LABEL = {
  LIVE: 'Live',
  PAUSED: 'Paused',
  RUNBACK: 'Runback',
} as const;

export const getCurrentAttemptDisplay = (
  boss: CurrentBoss,
  elapsedSeconds: number | null,
): CurrentAttemptDisplay => {
  if (boss.status === 'PAUSED') {
    return {
      elapsedSeconds:
        elapsedSeconds === null
          ? null
          : Math.max(0, elapsedSeconds - (boss.runbackSeconds ?? 0)),
      state: 'PAUSED',
    };
  }

  const isRunback =
    elapsedSeconds !== null &&
    boss.runbackSeconds !== null &&
    elapsedSeconds < boss.runbackSeconds;

  return {
    elapsedSeconds:
      elapsedSeconds === null
        ? null
        : Math.max(0, elapsedSeconds - (boss.runbackSeconds ?? 0)),
    state: isRunback ? 'RUNBACK' : 'LIVE',
  };
};
