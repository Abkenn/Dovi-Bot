import type { Client } from 'discord.js';
import { DateTime } from 'luxon';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const youtubeApi = vi.hoisted(() => ({
  getRecentYouTubeUploads: vi.fn(),
}));

vi.mock(
  '../../src/modules/youtube-uploads/youtube-upload.api',
  () => youtubeApi,
);

import { announceNewYouTubeUploads } from '../../src/modules/youtube-uploads/youtube-upload.service';

const makeClient = (existingContents: string[] = []) => {
  const send = vi.fn().mockResolvedValue({ id: 'announcement-1' });
  const fetchMessages = vi
    .fn()
    .mockResolvedValue(
      new Map(
        existingContents.map((content, index) => [String(index), { content }]),
      ),
    );
  const fetchChannel = vi.fn().mockResolvedValue({
    messages: { fetch: fetchMessages },
    send,
  });

  return {
    client: { channels: { fetch: fetchChannel } } as unknown as Client,
    fetchChannel,
    fetchMessages,
    send,
  };
};

describe('YouTube upload announcement service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('announces recent ordinary uploads from oldest to newest', async () => {
    youtubeApi.getRecentYouTubeUploads.mockResolvedValue([
      {
        id: 'video-2',
        publishedAt: new Date('2026-09-24T11:00:00.000Z'),
        url: 'https://www.youtube.com/watch?v=video-2',
      },
      {
        id: 'video-1',
        publishedAt: new Date('2026-09-24T10:00:00.000Z'),
        url: 'https://www.youtube.com/watch?v=video-1',
      },
    ]);
    const { client, send } = makeClient();

    const latestPublishedAt = await announceNewYouTubeUploads(
      client,
      DateTime.fromISO('2026-09-24T12:00:00.000Z'),
    );

    expect(latestPublishedAt).toEqual(new Date('2026-09-24T11:00:00.000Z'));
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0].content).toContain('video-1');
    expect(send.mock.calls[1]?.[0].content).toContain('video-2');
  });

  it('does not repost a URL already present in recent channel history', async () => {
    youtubeApi.getRecentYouTubeUploads.mockResolvedValue([
      {
        id: 'video-1',
        publishedAt: new Date('2026-09-24T11:00:00.000Z'),
        url: 'https://www.youtube.com/watch?v=video-1',
      },
    ]);
    const { client, send } = makeClient([
      'Old bot post\nhttps://www.youtube.com/watch?v=video-1',
    ]);

    const latestPublishedAt = await announceNewYouTubeUploads(
      client,
      DateTime.fromISO('2026-09-24T12:00:00.000Z'),
    );

    expect(latestPublishedAt).toEqual(new Date('2026-09-24T11:00:00.000Z'));
    expect(send).not.toHaveBeenCalled();
  });

  it('ignores uploads older than the restart catch-up window', async () => {
    youtubeApi.getRecentYouTubeUploads.mockResolvedValue([
      {
        id: 'old-video',
        publishedAt: new Date('2026-09-22T12:00:00.000Z'),
        url: 'https://www.youtube.com/watch?v=old-video',
      },
    ]);
    const { client, send } = makeClient();

    const latestPublishedAt = await announceNewYouTubeUploads(
      client,
      DateTime.fromISO('2026-09-24T12:00:00.000Z'),
    );

    expect(latestPublishedAt).toEqual(new Date('2026-09-22T12:00:00.000Z'));
    expect(send).not.toHaveBeenCalled();
  });

  it('returns no latest upload when the channel has no ordinary videos', async () => {
    youtubeApi.getRecentYouTubeUploads.mockResolvedValue([]);
    const { client, fetchChannel } = makeClient();

    await expect(announceNewYouTubeUploads(client)).resolves.toBeNull();
    expect(fetchChannel).not.toHaveBeenCalled();
  });

  it('fails safely when the configured Discord channel is unavailable', async () => {
    youtubeApi.getRecentYouTubeUploads.mockResolvedValue([
      {
        id: 'video-1',
        publishedAt: new Date('2026-09-24T11:00:00.000Z'),
        url: 'https://www.youtube.com/watch?v=video-1',
      },
    ]);
    const client = {
      channels: { fetch: vi.fn().mockResolvedValue(null) },
    } as unknown as Client;

    await expect(
      announceNewYouTubeUploads(
        client,
        DateTime.fromISO('2026-09-24T12:00:00.000Z'),
      ),
    ).rejects.toThrow(
      'The YouTube upload announcement channel is unavailable.',
    );
  });
});
