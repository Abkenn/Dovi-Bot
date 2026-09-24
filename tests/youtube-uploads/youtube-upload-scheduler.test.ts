import type { Client } from 'discord.js';
import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  announceNewYouTubeUploads: vi.fn(),
}));

vi.mock(
  '../../src/modules/youtube-uploads/youtube-upload.service',
  () => service,
);

const client = {} as Client;

describe('YouTube upload polling schedule', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T12:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('backs off to six-hour checks for two days after an upload', async () => {
    const { getYouTubeUploadPollDelayMs } = await import(
      '../../src/modules/youtube-uploads/youtube-upload.scheduler'
    );
    const now = DateTime.fromISO('2026-09-24T12:00:00.000Z');

    expect(
      getYouTubeUploadPollDelayMs(new Date('2026-09-23T12:00:00.000Z'), now),
    ).toBe(6 * 60 * 60 * 1000);
  });

  it('returns to five-minute checks after the quiet period', async () => {
    const { getYouTubeUploadPollDelayMs } = await import(
      '../../src/modules/youtube-uploads/youtube-upload.scheduler'
    );
    const now = DateTime.fromISO('2026-09-24T12:00:00.000Z');

    expect(
      getYouTubeUploadPollDelayMs(new Date('2026-09-22T11:59:59.999Z'), now),
    ).toBe(5 * 60 * 1000);
    expect(getYouTubeUploadPollDelayMs(null, now)).toBe(5 * 60 * 1000);
  });

  it('waits six hours between polls after seeing a recent upload', async () => {
    service.announceNewYouTubeUploads.mockResolvedValue(
      new Date('2026-09-24T11:00:00.000Z'),
    );
    const { startYouTubeUploadScheduler } = await import(
      '../../src/modules/youtube-uploads/youtube-upload.scheduler'
    );

    startYouTubeUploadScheduler(client);
    startYouTubeUploadScheduler(client);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(service.announceNewYouTubeUploads).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000 - 1);
    expect(service.announceNewYouTubeUploads).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(service.announceNewYouTubeUploads).toHaveBeenCalledTimes(2);
  });

  it('retries in five minutes after a polling failure', async () => {
    const error = new Error('YouTube unavailable');
    service.announceNewYouTubeUploads
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(null);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { startYouTubeUploadScheduler } = await import(
      '../../src/modules/youtube-uploads/youtube-upload.scheduler'
    );

    startYouTubeUploadScheduler(client);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(consoleError).toHaveBeenCalledWith(
      'YouTube upload poll failed',
      error,
    );

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(service.announceNewYouTubeUploads).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });
});
