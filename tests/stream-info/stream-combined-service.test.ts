import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicMode, StreamKind } from '../../src/generated/prisma/client';

const streamInfoQueries = vi.hoisted(() => ({
  findGuildStreamConfig: vi.fn(),
  upsertTargetStreamOverride: vi.fn(),
}));

vi.mock('@data/queries/stream-info', () => streamInfoQueries);

import { automaticallyCombinePlannedStream } from '../../src/modules/stream-info/stream-combined.service';

const occurrence = {
  dateKey: '2026-09-18',
  weekday: 'FRIDAY' as const,
  startAt: new Date('2026-09-18T18:10:00.000Z'),
  endAt: new Date('2026-09-18T22:10:00.000Z'),
  streamKind: StreamKind.MUSIC,
  musicMode: MusicMode.PATREON_CAPITALISM,
  title: 'Patreon Capitalism Stream',
  customTitle: 'Keep this title',
  musicTheme: 'Keep this theme',
  gameName: null,
  isCombined: false,
  streamUrl: 'https://youtube.test/planned',
  videoTitle: 'Listening to your music + AC7 Later',
  streamIsLive: false,
  isOverride: true,
};

describe('automatic combined stream service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamInfoQueries.findGuildStreamConfig.mockResolvedValue({
      defaultGameName: 'Ace Combat 7',
    });
    streamInfoQueries.upsertTargetStreamOverride.mockResolvedValue({});
  });

  it('persists combined only and returns the configured game for the announcement', async () => {
    const result = await automaticallyCombinePlannedStream(
      'production-guild',
      occurrence,
    );

    expect(streamInfoQueries.upsertTargetStreamOverride).toHaveBeenCalledWith({
      guildId: 'production-guild',
      streamDateKey: occurrence.dateKey,
      resolvedFromWeekday: 'FRIDAY',
      startAtUtc: occurrence.startAt,
      isCombined: true,
    });
    expect(result).toMatchObject({
      customTitle: 'Keep this title',
      gameName: 'Ace Combat 7',
      isCombined: true,
      musicTheme: 'Keep this theme',
    });
  });

  it.each([
    { ...occurrence, weekday: 'SATURDAY' as const },
    { ...occurrence, streamKind: StreamKind.GAME },
    { ...occurrence, videoTitle: 'Listening to your music + new game Later' },
  ])('does not persist when the occurrence does not qualify', async (candidate) => {
    const result = await automaticallyCombinePlannedStream(
      'production-guild',
      candidate,
    );

    expect(result).toBe(candidate);
    expect(streamInfoQueries.upsertTargetStreamOverride).not.toHaveBeenCalled();
  });
});
