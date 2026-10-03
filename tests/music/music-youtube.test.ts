import { beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshMusicStreamVideos } from '../../src/modules/music/music-youtube';

const dependencies = vi.hoisted(() => ({
  channels: vi.fn(),
  playlist: vi.fn(),
  videos: vi.fn(),
  save: vi.fn(),
  env: {
    YOUTUBE_API_KEY: 'test',
    YOUTUBE_CHANNEL_HANDLES: '@primary,@secondary',
  },
}));
vi.mock('@zod-schemas/env.zod', () => ({ env: dependencies.env }));
vi.mock('../../src/modules/youtube/youtube.api', () => ({
  getYouTubeChannels: dependencies.channels,
  getYouTubePlaylistItems: dependencies.playlist,
  getYouTubeVideos: dependencies.videos,
}));
vi.mock('../../src/data/queries/music-catalog', () => ({
  saveMusicStreamVideo: dependencies.save,
}));

describe('music stream video matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.env.YOUTUBE_API_KEY = 'test';
    dependencies.channels.mockResolvedValue({
      items: [{ contentDetails: { relatedPlaylists: { uploads: 'uploads' } } }],
    });
    dependencies.playlist.mockResolvedValue({
      items: [{ contentDetails: { videoId: 'stream' } }],
    });
    dependencies.videos.mockResolvedValue({
      items: [
        {
          id: 'stream',
          snippet: { title: 'Music stream' },
          liveStreamingDetails: {
            actualStartTime: '2026-09-12T01:00:00Z',
            actualEndTime: '2026-09-12T04:00:00Z',
          },
        },
      ],
    });
  });

  it('uses the primary channel and the actual stream date in Sao Paulo', async () => {
    await refreshMusicStreamVideos(['2026-09-11']);
    expect(dependencies.channels).toHaveBeenCalledWith(
      { part: 'contentDetails', forHandle: '@primary' },
      expect.any(AbortSignal),
    );
    expect(dependencies.save).toHaveBeenCalledWith({
      channelHandle: '@primary',
      streamDate: '2026-09-11',
      videoId: 'stream',
      title: 'Music stream',
    });
  });

  it('follows playlist pagination and ignores regular uploads and wrong dates', async () => {
    dependencies.playlist.mockResolvedValueOnce({
      nextPageToken: 'page2',
      items: [{ contentDetails: { videoId: 'upload' } }],
    });
    dependencies.videos.mockResolvedValueOnce({
      items: [{ id: 'upload', snippet: { title: 'Regular upload' } }],
    });
    await refreshMusicStreamVideos(['2026-09-11']);
    expect(dependencies.playlist).toHaveBeenLastCalledWith(
      {
        part: 'contentDetails',
        playlistId: 'uploads',
        maxResults: 50,
        pageToken: 'page2',
      },
      expect.any(AbortSignal),
    );
    expect(dependencies.save).toHaveBeenCalledTimes(1);
    dependencies.save.mockClear();
    await refreshMusicStreamVideos(['2026-09-10']);
    expect(dependencies.save).toHaveBeenCalledWith({
      channelHandle: '@primary',
      streamDate: '2026-09-10',
      videoId: null,
      title: null,
    });
  });

  it('links the first stream when multiple streams share the same date', async () => {
    dependencies.videos.mockResolvedValue({
      items: [
        {
          id: 'later',
          snippet: { title: 'Later stream' },
          liveStreamingDetails: {
            actualStartTime: '2026-09-11T22:00:00Z',
            actualEndTime: '2026-09-12T00:00:00Z',
          },
        },
        {
          id: 'first',
          snippet: { title: 'First stream' },
          liveStreamingDetails: {
            actualStartTime: '2026-09-11T18:00:00Z',
            actualEndTime: '2026-09-11T22:00:00Z',
          },
        },
      ],
    });
    await refreshMusicStreamVideos(['2026-09-11']);
    expect(dependencies.save).toHaveBeenCalledWith({
      channelHandle: '@primary',
      streamDate: '2026-09-11',
      videoId: 'first',
      title: 'First stream',
    });
  });

  it('does nothing without API configuration, dates or a channel', async () => {
    await refreshMusicStreamVideos([]);
    dependencies.env.YOUTUBE_API_KEY = '';
    await refreshMusicStreamVideos(['2026-09-11']);
    expect(dependencies.channels).not.toHaveBeenCalled();
    dependencies.env.YOUTUBE_API_KEY = 'test';
    dependencies.channels.mockResolvedValue({ items: [] });
    await refreshMusicStreamVideos(['2026-09-11']);
    expect(dependencies.playlist).not.toHaveBeenCalled();
  });
});
