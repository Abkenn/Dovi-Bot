import { describe, expect, it } from 'vitest';
import type { CurrentBoss } from '@/live-stats.types';
import { getCurrentAttemptDisplay } from './current-attempt-display';

const boss = {
  name: 'Darkeater Midir',
  status: 'ACTIVE',
  deaths: 4,
  attemptNumber: 5,
  attemptStartedAt: '2026-07-17T20:00:00.000Z',
  runbackSeconds: 80,
  pausedAt: null,
  pauseReason: null,
} satisfies CurrentBoss;

describe('getCurrentAttemptDisplay', () => {
  it('subtracts runback time and identifies each active phase', () => {
    expect(getCurrentAttemptDisplay(boss, 70)).toEqual({
      elapsedSeconds: 0,
      state: 'RUNBACK',
    });
    expect(getCurrentAttemptDisplay(boss, 90)).toEqual({
      elapsedSeconds: 10,
      state: 'LIVE',
    });
    expect(
      getCurrentAttemptDisplay({ ...boss, runbackSeconds: null }, 90),
    ).toEqual({
      elapsedSeconds: 90,
      state: 'LIVE',
    });
    expect(getCurrentAttemptDisplay(boss, null)).toEqual({
      elapsedSeconds: null,
      state: 'LIVE',
    });
  });

  it('keeps pause state above runback state', () => {
    const pausedBoss = { ...boss, status: 'PAUSED' } satisfies CurrentBoss;

    expect(getCurrentAttemptDisplay(pausedBoss, 90)).toEqual({
      elapsedSeconds: 10,
      state: 'PAUSED',
    });
    expect(getCurrentAttemptDisplay(pausedBoss, null)).toEqual({
      elapsedSeconds: null,
      state: 'PAUSED',
    });
  });
});
