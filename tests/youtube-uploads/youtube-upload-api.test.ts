import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(
  (): {
    YOUTUBE_API_KEY: string | undefined;
    YOUTUBE_CHANNEL_HANDLES: string | undefined;
  } => ({
    YOUTUBE_API_KEY: 'youtube-key',
    YOUTUBE_CHANNEL_HANDLES: '@DaviVasc,@secondary',
  }),
);

vi.mock('@zod-schemas/env.zod', () => ({ env }));

describe('YouTube upload API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    env.YOUTUBE_API_KEY = 'youtube-key';
    env.YOUTUBE_CHANNEL_HANDLES = '@DaviVasc,@secondary';
  });

  it('uses the primary configured channel and excludes every livestream', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: { title: 'Davi Vasc' },
              contentDetails: { relatedPlaylists: { uploads: 'uploads-1' } },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              contentDetails: {
                videoId: 'normal-video',
                videoPublishedAt: '2026-09-24T11:00:00.000Z',
              },
            },
            {
              contentDetails: {
                videoId: 'stream-video',
                videoPublishedAt: '2026-09-24T10:00:00.000Z',
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 'normal-video', snippet: { title: 'Normal upload' } },
            {
              id: 'stream-video',
              snippet: { title: 'Past livestream' },
              liveStreamingDetails: {
                actualStartTime: '2026-09-24T10:00:00.000Z',
              },
            },
          ],
        }),
      });
    vi.stubGlobal('fetch', fetch);
    const { getRecentYouTubeUploads } = await import(
      '../../src/modules/youtube-uploads/youtube-upload.api'
    );

    await expect(getRecentYouTubeUploads()).resolves.toEqual([
      {
        id: 'normal-video',
        publishedAt: new Date('2026-09-24T11:00:00.000Z'),
        url: 'https://www.youtube.com/watch?v=normal-video',
      },
    ]);
    expect(
      new URL(fetch.mock.calls[0]?.[0]).searchParams.get('forHandle'),
    ).toBe('@DaviVasc');
  });

  it('does nothing when YouTube upload polling is not configured', async () => {
    env.YOUTUBE_API_KEY = undefined;
    env.YOUTUBE_CHANNEL_HANDLES = undefined;
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { getRecentYouTubeUploads } = await import(
      '../../src/modules/youtube-uploads/youtube-upload.api'
    );

    await expect(getRecentYouTubeUploads()).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does nothing when the configured handle cannot be resolved', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      }),
    );
    const { getRecentYouTubeUploads } = await import(
      '../../src/modules/youtube-uploads/youtube-upload.api'
    );

    await expect(getRecentYouTubeUploads()).resolves.toEqual([]);
  });

  it('does nothing when the uploads playlist has no usable videos', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: { title: 'Davi Vasc' },
              contentDetails: { relatedPlaylists: { uploads: 'uploads-1' } },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ contentDetails: {} }, {}],
        }),
      });
    vi.stubGlobal('fetch', fetch);
    const { getRecentYouTubeUploads } = await import(
      '../../src/modules/youtube-uploads/youtube-upload.api'
    );

    await expect(getRecentYouTubeUploads()).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reports a failed YouTube API request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      }),
    );
    const { getRecentYouTubeUploads } = await import(
      '../../src/modules/youtube-uploads/youtube-upload.api'
    );

    await expect(getRecentYouTubeUploads()).rejects.toThrow(
      'YouTube API request failed: 403 Forbidden',
    );
  });
});
