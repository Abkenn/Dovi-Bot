import { describe, expect, it } from 'vitest';
import { StreamKind } from '../../src/generated/prisma/client';
import {
  deserializeStreamAnnouncementSnapshot,
  serializeStreamAnnouncementSnapshot,
} from '../../src/modules/stream-info/stream-announcement.snapshot';
import type { StreamInfoResult } from '../../src/modules/stream-info/stream-info.types';

const streamInfo: StreamInfoResult = {
  timezone: 'America/Sao_Paulo',
  current: {
    dateKey: '2026-09-18',
    weekday: 'FRIDAY',
    startAt: new Date('2026-09-18T18:10:00.000Z'),
    endAt: new Date('2026-09-18T22:30:00.000Z'),
    streamKind: StreamKind.MUSIC,
    musicMode: null,
    title: 'Music Stream',
    customTitle: null,
    musicTheme: null,
    gameName: 'Ace Combat 7: Skies Unknown',
    isCombined: true,
    streamUrl: 'https://youtube.test/music',
    videoTitle: 'Music picks + ACE COMBAT Later',
    videos: [
      {
        title: 'Music picks + ACE COMBAT Later',
        url: 'https://youtube.test/music',
        actualStartAt: new Date('2026-09-18T18:10:00.000Z'),
        scheduledStartAt: new Date('2026-09-18T18:10:00.000Z'),
      },
      {
        title: 'ACE COMBAT 7',
        url: 'https://youtube.test/game',
        actualStartAt: null,
        scheduledStartAt: null,
      },
    ],
    streamIsLive: true,
    isOverride: true,
  },
  previous: null,
  next: null,
};

describe('stream announcement snapshots', () => {
  it('persists both video titles, URLs, and timestamps', () => {
    const restored = deserializeStreamAnnouncementSnapshot(
      serializeStreamAnnouncementSnapshot(streamInfo),
    );

    expect(restored.current?.videos).toEqual(streamInfo.current?.videos);
  });

  it('continues to read snapshots created before multiple videos were supported', () => {
    const legacySnapshot = JSON.stringify({
      ...streamInfo,
      current: { ...streamInfo.current, videos: undefined },
    });

    expect(
      deserializeStreamAnnouncementSnapshot(legacySnapshot).current?.videos,
    ).toBeUndefined();
  });
});
