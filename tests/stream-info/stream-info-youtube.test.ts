import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { StreamKind } from '../../src/generated/prisma/client';
import type {
  StreamOccurrence,
  YouTubeStreamStatus,
} from '../../src/modules/stream-info/stream-info.types';
import { resolveYouTubeStreamStatus } from '../../src/modules/stream-info/stream-info.youtube-lifecycle';

const makeOccurrence = (
  overrides: Partial<StreamOccurrence> = {},
): StreamOccurrence => ({
  dateKey: '2026-06-12',
  weekday: 'FRIDAY',
  startAt: new Date('2026-06-12T18:10:00.000Z'),
  endAt: new Date('2026-06-12T22:10:00.000Z'),
  streamKind: StreamKind.GAME,
  musicMode: null,
  title: 'Game Stream',
  gameName: 'Test Game',
  isOverride: false,
  ...overrides,
});

const makeStatus = (
  overrides: Partial<YouTubeStreamStatus> = {},
): YouTubeStreamStatus => ({
  title: 'Live Stream',
  url: 'https://www.youtube.com/watch?v=video-1',
  scheduledStartAt: new Date('2026-06-12T18:10:00.000Z'),
  actualStartAt: null,
  actualEndAt: null,
  isLive: false,
  isUpcoming: true,
  ...overrides,
});

const resolve = ({
  now,
  status,
  occurrences = [makeOccurrence()],
}: {
  now: string;
  status: YouTubeStreamStatus;
  occurrences?: StreamOccurrence[];
}) =>
  resolveYouTubeStreamStatus({
    occurrences,
    status,
    now: DateTime.fromISO(now),
    timezone: 'America/Sao_Paulo',
  });

describe('stream info YouTube lifecycle', () => {
  it('uses actual stream start plus 260 minutes for a live stream', () => {
    const resolution = resolve({
      now: '2026-06-12T18:50:00.000Z',
      status: makeStatus({
        actualStartAt: new Date('2026-06-12T18:40:00.000Z'),
        isLive: true,
        isUpcoming: false,
      }),
    });

    expect(resolution.current?.startAt.toISOString()).toBe(
      '2026-06-12T18:40:00.000Z',
    );
    expect(resolution.current?.endAt.toISOString()).toBe(
      '2026-06-12T23:00:00.000Z',
    );
    expect(resolution.current?.streamUrl).toBe(
      'https://www.youtube.com/watch?v=video-1',
    );
    expect(resolution.current?.videoTitle).toBe('Live Stream');
  });

  it('keeps the ended stream link during the 10 minute grace window', () => {
    const resolution = resolve({
      now: '2026-06-12T22:09:00.000Z',
      status: makeStatus({
        actualStartAt: new Date('2026-06-12T18:40:00.000Z'),
        actualEndAt: new Date('2026-06-12T22:00:00.000Z'),
        isUpcoming: false,
      }),
    });

    expect(resolution.current?.endAt.toISOString()).toBe(
      '2026-06-12T22:10:00.000Z',
    );
    expect(resolution.current?.streamUrl).toBe(
      'https://www.youtube.com/watch?v=video-1',
    );
    expect(resolution.suppressedScheduledDateKey).toBeNull();
  });

  it('suppresses scheduled current after the ended-link grace expires', () => {
    const resolution = resolve({
      now: '2026-06-12T22:11:00.000Z',
      status: makeStatus({
        actualStartAt: new Date('2026-06-12T18:40:00.000Z'),
        actualEndAt: new Date('2026-06-12T22:00:00.000Z'),
        isUpcoming: false,
      }),
    });

    expect(resolution.current).toBeNull();
    expect(resolution.suppressedScheduledDateKey).toBe('2026-06-12');
  });

  it('uses the nearest future occurrence for an unmatched upcoming stream', () => {
    const resolution = resolve({
      now: '2026-06-12T05:00:00.000Z',
      status: makeStatus({
        scheduledStartAt: new Date('2026-06-12T06:00:00.000Z'),
      }),
    });

    expect(resolution.current).toMatchObject({
      dateKey: '2026-06-12',
      weekday: 'FRIDAY',
      title: 'Live Stream',
    });
    expect(resolution.current?.startAt.toISOString()).toBe(
      '2026-06-12T06:00:00.000Z',
    );
  });

  it('ignores an ended stream that does not match a schedule occurrence', () => {
    const resolution = resolve({
      now: '2026-06-12T18:00:00.000Z',
      status: makeStatus({
        scheduledStartAt: new Date('2026-06-10T18:10:00.000Z'),
        actualStartAt: new Date('2026-06-10T18:40:00.000Z'),
        actualEndAt: new Date('2026-06-10T22:00:00.000Z'),
        isUpcoming: false,
      }),
    });

    expect(resolution).toEqual({
      current: null,
      suppressedScheduledDateKey: null,
    });
  });

  it('returns no current stream when there are no occurrences to decorate', () => {
    const resolution = resolve({
      now: '2026-06-12T18:00:00.000Z',
      status: makeStatus(),
      occurrences: [],
    });

    expect(resolution).toEqual({
      current: null,
      suppressedScheduledDateKey: null,
    });
  });

  it('falls back to now when YouTube has no start timestamp', () => {
    const resolution = resolve({
      now: '2026-06-12T18:00:00.000Z',
      status: makeStatus({
        scheduledStartAt: null,
      }),
    });

    expect(resolution.current?.startAt.toISOString()).toBe(
      '2026-06-12T18:10:00.000Z',
    );
    expect(resolution.current?.endAt.toISOString()).toBe(
      '2026-06-12T22:20:00.000Z',
    );
  });
});
