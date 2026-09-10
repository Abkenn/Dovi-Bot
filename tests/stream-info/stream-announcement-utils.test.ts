import { describe, expect, it } from 'vitest';
import { StreamKind } from '../../src/generated/prisma/client';
import {
  applyStreamAnnouncementEdits,
  findEditableStreamAnnouncementOccurrence,
  isStreamAnnouncementEligible,
  isStreamAnnouncementReviewDue,
} from '../../src/modules/stream-info/stream-announcement.utils';
import type {
  StreamInfoResult,
  StreamOccurrence,
} from '../../src/modules/stream-info/stream-info.types';

const occurrence: StreamOccurrence = {
  dateKey: '2026-09-11',
  weekday: 'FRIDAY',
  startAt: new Date('2026-09-11T18:10:00.000Z'),
  endAt: new Date('2026-09-11T22:10:00.000Z'),
  streamKind: StreamKind.GAME,
  musicMode: null,
  title: 'Game Stream',
  customTitle: null,
  musicTheme: null,
  gameName: 'Unknown',
  isOverride: false,
};

const streamInfo: StreamInfoResult = {
  timezone: 'America/Sao_Paulo',
  current: null,
  previous: occurrence,
  next: occurrence,
};

describe('stream announcement timing', () => {
  it('allows a late automatic announcement when a stream is already live', () => {
    expect(
      isStreamAnnouncementEligible({ ...occurrence, streamIsLive: true }),
    ).toBe(true);
  });

  it('starts the personal review window fifty minutes before any scheduled occurrence', () => {
    expect(
      isStreamAnnouncementReviewDue(
        occurrence,
        new Date('2026-09-11T17:19:59.999Z'),
      ),
    ).toBe(false);
    expect(
      isStreamAnnouncementReviewDue(
        occurrence,
        new Date('2026-09-11T17:20:00.000Z'),
      ),
    ).toBe(true);
  });

  it('allows implicit updates from one hour before through eight hours after start', () => {
    expect(
      findEditableStreamAnnouncementOccurrence(
        streamInfo,
        new Date('2026-09-11T17:10:00.000Z'),
      ),
    ).toEqual(occurrence);
    expect(
      findEditableStreamAnnouncementOccurrence(
        streamInfo,
        new Date('2026-09-12T02:10:00.000Z'),
      ),
    ).toEqual(occurrence);
  });

  it('rejects implicit updates outside the update window', () => {
    expect(
      findEditableStreamAnnouncementOccurrence(
        streamInfo,
        new Date('2026-09-11T17:09:59.999Z'),
      ),
    ).toBeNull();
    expect(
      findEditableStreamAnnouncementOccurrence(
        streamInfo,
        new Date('2026-09-12T02:10:00.001Z'),
      ),
    ).toBeNull();
  });

  it('applies music announcement edits without changing other occurrences', () => {
    const updated = applyStreamAnnouncementEdits(
      streamInfo,
      occurrence.dateKey,
      {
        streamKind: 'MUSIC',
        musicMode: 'DICTATORSHIP',
        musicTheme: 'Boss themes',
        gameName: 'Onimusha',
        title: 'Launch night',
        streamUrl: 'https://youtube.test/watch?v=stream',
      },
    );

    expect(updated.next).toMatchObject({
      streamKind: 'MUSIC',
      musicMode: 'DICTATORSHIP',
      musicTheme: 'Boss themes',
      gameName: 'Onimusha',
      customTitle: 'Launch night',
      streamUrl: 'https://youtube.test/watch?v=stream',
    });
  });

  it('clears music-only fields when changing an announcement to a game stream', () => {
    const updated = applyStreamAnnouncementEdits(
      {
        ...streamInfo,
        next: {
          ...occurrence,
          streamKind: 'MUSIC',
          musicMode: 'DEMOCRACY',
          musicTheme: 'Theme',
        },
      },
      occurrence.dateKey,
      { streamKind: 'GAME' },
    );

    expect(updated.next).toMatchObject({
      streamKind: 'GAME',
      musicMode: null,
      musicTheme: null,
    });
  });

  it('rejects edits when a stored date is absent from the snapshot', () => {
    expect(() =>
      applyStreamAnnouncementEdits(streamInfo, 'missing-date', {
        gameName: 'Onimusha',
      }),
    ).toThrow('no longer has its stream data');
  });
});
