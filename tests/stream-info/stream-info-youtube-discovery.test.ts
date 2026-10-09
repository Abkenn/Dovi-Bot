import { DateTime } from 'luxon';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getYouTubeChannels: vi.fn(),
  getYouTubePlaylistItems: vi.fn(),
  getYouTubeVideos: vi.fn(),
}));
vi.mock('@zod-schemas/env.zod', () => ({
  env: { YOUTUBE_API_KEY: 'test', YOUTUBE_CHANNEL_HANDLES: '@test' },
}));
vi.mock('../../src/modules/youtube/youtube.api', () => api);

const ended = {
  id: 'old',
  snippet: { title: 'Last week', liveBroadcastContent: 'none' },
  liveStreamingDetails: {
    scheduledStartTime: '2026-10-03T18:10:00Z',
    actualEndTime: '2026-10-03T22:10:00Z',
  },
};
const upcoming = {
  id: 'new',
  snippet: { title: 'New public stream', liveBroadcastContent: 'upcoming' },
  liveStreamingDetails: { scheduledStartTime: '2026-10-09T18:10:00Z' },
};
const occurrence = {
  dateKey: '2026-10-09',
  weekday: 'FRIDAY' as const,
  startAt: new Date('2026-10-09T18:10:00Z'),
  endAt: new Date('2026-10-09T22:10:00Z'),
  streamKind: 'GAME' as const,
  musicMode: null,
  title: 'Game Stream',
  customTitle: null,
  musicTheme: null,
  gameName: 'Test',
  isOverride: false,
};

describe('YouTube discovery cache', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    api.getYouTubeChannels.mockResolvedValue({
      items: [{ contentDetails: { relatedPlaylists: { uploads: 'uploads' } } }],
    });
    api.getYouTubePlaylistItems.mockResolvedValue({
      items: [
        { contentDetails: { videoId: 'old' } },
        { contentDetails: { videoId: 'new' } },
      ],
    });
  });

  it.each([
    '2026-10-09T17:00:00Z',
    '2026-10-09T17:40:00Z',
  ])('discovers a newly public stream within 30 seconds despite cached ended streams at %s', async (start) => {
    api.getYouTubeVideos
      .mockResolvedValueOnce({ items: [ended] })
      .mockResolvedValue({ items: [ended, upcoming] });
    const { getYouTubeStreamResolution } = await import(
      '../../src/modules/stream-info/stream-info.youtube'
    );
    const now = DateTime.fromISO(start);
    const resolve = (time: DateTime) =>
      getYouTubeStreamResolution({
        occurrences: [occurrence],
        now: time,
        timezone: 'America/Sao_Paulo',
      });
    expect((await resolve(now)).current).toBeNull();
    await resolve(now.plus({ seconds: 5 }));
    expect(api.getYouTubeVideos).toHaveBeenCalledTimes(1);
    expect((await resolve(now.plus({ seconds: 30 }))).current?.streamUrl).toBe(
      'https://www.youtube.com/watch?v=new',
    );
    expect(api.getYouTubeVideos).toHaveBeenCalledTimes(2);
  });
});
