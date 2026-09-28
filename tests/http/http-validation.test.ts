import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(
  (): {
    YOUTUBE_API_KEY: string;
    YOUTUBE_CHANNEL_HANDLES: string;
    UPTIME_STATUS_MONITOR_URL: string | undefined;
    HEALTH_CHECK_MONITOR_URL: string | undefined;
  } => ({
    YOUTUBE_API_KEY: 'test-key',
    YOUTUBE_CHANNEL_HANDLES: '@test-channel',
    UPTIME_STATUS_MONITOR_URL: 'https://status.example/api/getMonitor/test',
    HEALTH_CHECK_MONITOR_URL: undefined,
  }),
);
vi.mock('@zod-schemas/env.zod', () => ({ env }));

describe('HTTP response validation', () => {
  beforeEach(() => {
    vi.resetModules();
    env.YOUTUBE_API_KEY = 'test-key';
    env.UPTIME_STATUS_MONITOR_URL =
      'https://status.example/api/getMonitor/test';
    env.HEALTH_CHECK_MONITOR_URL = undefined;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('rejects unconfigured YouTube requests before calling the transport', async () => {
    env.YOUTUBE_API_KEY = '';
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { getYouTubeChannels } = await import(
      '../../src/modules/youtube/youtube.api'
    );
    await expect(
      getYouTubeChannels({ part: 'contentDetails', forHandle: '@test' }),
    ).rejects.toThrow('YOUTUBE_API_KEY is not configured.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a malformed YouTube playlist id before requesting that playlist', async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        items: [{ contentDetails: { relatedPlaylists: { uploads: 123 } } }],
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const { getRecentYouTubeUploads } = await import(
      '../../src/modules/youtube-uploads/youtube-upload.api'
    );

    await expect(getRecentYouTubeUploads()).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed monitor counts instead of reporting an operational bot', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          status: 'ok',
          monitor: { statusClass: 'success' },
          statistics: { counts: { down: null, paused: 0 } },
        }),
      ),
    );
    const { fetchBotStatus } = await import(
      '../../src/modules/bot-status/bot-status.service'
    );

    await expect(fetchBotStatus({ includeDatabase: false })).rejects.toThrow();
  });

  it.each([
    'ok',
    'sleepy',
    undefined,
  ])('maps the database response %s', async (database) => {
    env.UPTIME_STATUS_MONITOR_URL = 'https://status.example/page/monitor';
    env.HEALTH_CHECK_MONITOR_URL = 'https://health.example/';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ status: 'ok', monitor: { statusClass: 'success' } }),
        )
        .mockResolvedValueOnce(Response.json({ database })),
    );
    const { fetchBotStatus } = await import(
      '../../src/modules/bot-status/bot-status.service'
    );
    await expect(fetchBotStatus({ includeDatabase: true })).resolves.toEqual({
      isOperational: true,
      database: database === 'ok' ? 'healthy' : 'sleepy',
    });
  });

  it('handles missing status fields and an unconfigured health check', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({})));
    const { fetchBotStatus } = await import(
      '../../src/modules/bot-status/bot-status.service'
    );
    await expect(fetchBotStatus({ includeDatabase: true })).resolves.toEqual({
      isOperational: false,
      database: 'unknown',
    });
  });

  it.each([
    'network',
    'http',
  ])('reports an unavailable database check as unknown (%s)', async (failure) => {
    env.HEALTH_CHECK_MONITOR_URL = 'https://health.example/';
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({}));
    if (failure === 'network')
      fetch.mockRejectedValueOnce(new Error('offline'));
    else fetch.mockResolvedValueOnce(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    const { fetchBotStatus } = await import(
      '../../src/modules/bot-status/bot-status.service'
    );
    await expect(fetchBotStatus({ includeDatabase: true })).resolves.toEqual({
      isOperational: false,
      database: 'unknown',
    });
  });

  it('preserves the status provider error and performs one request', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response('', { status: 503, statusText: 'Unavailable' }),
      );
    vi.stubGlobal('fetch', fetch);
    const { fetchBotStatus } = await import(
      '../../src/modules/bot-status/bot-status.service'
    );
    await expect(fetchBotStatus({ includeDatabase: false })).rejects.toThrow(
      'UptimeRobot status check failed: 503 Unavailable',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    undefined,
    'https://status.example/invalid',
  ])('rejects invalid monitor configuration %s', async (url) => {
    env.UPTIME_STATUS_MONITOR_URL = url;
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { fetchBotStatus } = await import(
      '../../src/modules/bot-status/bot-status.service'
    );
    await expect(fetchBotStatus({ includeDatabase: false })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
