import { describe, expect, it, vi } from 'vitest';
import { StreamKind } from '../../src/generated/prisma/client';
import type {
  StreamInfoResult,
  StreamOccurrence,
} from '../../src/modules/stream-info/stream-info.types';
import {
  getStreamReminderOccurrence,
  isStreamReminderEligible,
} from '../../src/modules/stream-info/stream-reminder.utils';

const makeOccurrence = (
  overrides: Partial<StreamOccurrence> = {},
): StreamOccurrence => ({
  dateKey: '2026-07-10',
  weekday: 'FRIDAY',
  startAt: new Date('2026-07-10T18:10:00.000Z'),
  endAt: new Date('2026-07-10T22:10:00.000Z'),
  streamKind: StreamKind.GAME,
  musicMode: null,
  title: 'Game Stream',
  gameName: 'Dark Souls III',
  streamUrl: 'https://youtube.test/watch?v=stream',
  videoTitle: 'Upcoming Stream',
  streamIsLive: false,
  isOverride: false,
  ...overrides,
});

describe('stream reminder utils', () => {
  it('allows reminder signup two hours before an announced stream', () => {
    expect(
      isStreamReminderEligible(
        makeOccurrence(),
        new Date('2026-07-10T16:10:00.000Z'),
      ),
    ).toBe(true);
  });

  it('allows reminder signup two hours before the usual schedule without an announcement', () => {
    expect(
      isStreamReminderEligible(
        makeOccurrence({
          streamUrl: undefined,
          videoTitle: undefined,
          streamIsLive: undefined,
        }),
        new Date('2026-07-10T16:10:00.000Z'),
      ),
    ).toBe(true);
  });

  it('rejects reminder signup before the two hour window', () => {
    expect(
      isStreamReminderEligible(
        makeOccurrence(),
        new Date('2026-07-10T16:09:59.999Z'),
      ),
    ).toBe(false);
  });

  it('uses the next scheduled stream as the reminder target within two hours', () => {
    const next = makeOccurrence({
      streamUrl: undefined,
      videoTitle: undefined,
      streamIsLive: undefined,
    });
    const data: StreamInfoResult = {
      timezone: 'America/Sao_Paulo',
      current: null,
      next,
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T16:30:00.000Z'));

    expect(getStreamReminderOccurrence(data)).toBe(next);

    vi.useRealTimers();
  });

  it('does not choose a live stream as a reminder target', () => {
    const current = makeOccurrence({ streamIsLive: true });

    expect(
      getStreamReminderOccurrence({
        timezone: 'America/Sao_Paulo',
        current,
        next: null,
      }),
    ).toBeNull();
  });
});
