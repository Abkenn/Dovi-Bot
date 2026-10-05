import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MusicPlay } from '../../src/modules/music/music.types';

const dependencies = vi.hoisted(() => ({
  save: vi.fn(),
  read: vi.fn(),
  download: vi.fn(),
  handle: vi.fn(),
  video: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('ky', () => ({ default: { get: dependencies.download } }));
vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { PROD_ENV: 'prod', STAGING_ENV: 'staging' },
}));
vi.mock('../../src/data/transactions/music-catalog', () => ({
  replaceMusicCatalog: dependencies.save,
}));
vi.mock('../../src/data/queries/music-catalog', () => ({
  findMusicCatalog: dependencies.read,
  findMusicStreamVideo: dependencies.video,
}));
vi.mock('../../src/modules/music/music-youtube', () => ({
  getMusicChannelHandle: dependencies.handle,
  refreshMusicStreamVideos: dependencies.refresh,
}));

import {
  importMusicUpload,
  refreshStoredMusicCatalog,
} from '../../src/modules/music/music.service';
import {
  getMusicFacts,
  searchMusicCatalog,
} from '../../src/modules/music/music-search.service';

const upload = {
  authorId: '632504207441920011',
  guildId: 'prod',
  messageId: '123',
  attachmentId: '456',
  filename: 'List Music Stream Davi Vasc 32.0.txt',
  size: 120,
  url: 'https://cdn.discordapp.com/attachments/123/456/catalog.txt',
};
const text = 'Per Stream :\nStream 32 : 25/09/26\n1:00 Song - Game';

describe('music uploads and search', () => {
  it('returns only aggregated facts and handles an unavailable catalog', async () => {
    dependencies.read.mockResolvedValueOnce(null);
    expect(await getMusicFacts()).toBeNull();
    dependencies.read.mockResolvedValueOnce({
      rawText: 'private catalog text',
      plays: [],
    });
    expect(await getMusicFacts()).toEqual({ track: null, series: null });
  });
  it('groups repeated game tracks with counts and links only their latest occurrence', async () => {
    dependencies.read.mockResolvedValue({
      plays: [
        {
          title: "World's End Valentine",
          originalTitle: "OMORI - World's End Valentine",
          game: 'OMORI',
          streamLabel: 'Stream 1',
          streamDate: '2026-01-01',
          offsetSeconds: 60,
          musicMode: 'UNKNOWN',
        },
        {
          title: "World's End Valentine",
          originalTitle: "OMORI - World's End Valentine",
          game: 'OMORI',
          streamLabel: 'Stream 2',
          streamDate: '2026-02-01',
          offsetSeconds: 120,
          musicMode: 'UNKNOWN',
        },
        {
          title: "WORLD'S END VALENTINE",
          originalTitle: "OMORI - World's End Valentine",
          game: 'OMORI',
          streamLabel: 'Stream 2',
          streamDate: '2026-02-01',
          offsetSeconds: 180,
          musicMode: 'UNKNOWN',
        },
      ],
    });
    expect(await searchMusicCatalog('omori', { game: true })).toEqual([
      expect.objectContaining({
        count: 3,
        title: "WORLD'S END VALENTINE",
        streamDate: '2026-02-01',
        offsetSeconds: 180,
      }),
    ]);
    expect(dependencies.video).toHaveBeenCalledExactlyOnceWith(
      '@primary',
      '2026-02-01',
    );
  });
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.download.mockResolvedValue(new Response(text));
    dependencies.save.mockResolvedValue(true);
    dependencies.handle.mockReturnValue('@primary');
    dependencies.video.mockResolvedValue({
      videoId: 'video',
      title: 'Latest broadcast',
    });
    dependencies.refresh.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps song and game searches separate after importing a collector upload', async () => {
    dependencies.download.mockResolvedValue(
      new Response(`Per Stream :
Stream 1 : 01/01/26
1:00 Majula - Dark Souls II
Per Game :
Dark Souls :
Stream 1 : 1:00 Majula - DS2`),
    );
    dependencies.save.mockImplementationOnce(
      async (input: { plays: MusicPlay[] }) => {
        dependencies.read.mockResolvedValue({ plays: input.plays });
        return true;
      },
    );
    expect(await importMusicUpload(upload)).toBe('updated');
    expect(await searchMusicCatalog('dark souls')).toEqual([]);
    expect(dependencies.video).not.toHaveBeenCalled();
    expect(await searchMusicCatalog('majula')).toEqual([
      expect.objectContaining({
        title: 'Majula - DS2',
        count: 1,
        game: 'Dark Souls 2',
      }),
    ]);
    expect(await searchMusicCatalog('dark souls 2', { game: true })).toEqual([
      expect.objectContaining({ title: 'Majula - DS2', game: 'Dark Souls 2' }),
    ]);
  });

  it.each([
    { authorId: 'someone-else' },
    { guildId: 'staging' },
    { guildId: 'unrelated' },
    { filename: 'notes.txt' },
    { filename: '32.0.exe' },
    { size: 2_000_001 },
  ])('ignores ineligible attachments before download: %s', async (change) => {
    expect(await importMusicUpload({ ...upload, ...change })).toBe('ignored');
    expect(dependencies.download).not.toHaveBeenCalled();
    expect(dependencies.save).not.toHaveBeenCalled();
  });

  it('validates before replacing a complete catalog with source attribution', async () => {
    expect(await importMusicUpload(upload)).toBe('updated');
    expect(dependencies.save).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 123n,
        attachmentId: 456n,
        uploaderId: upload.authorId,
        rawText: text,
        plays: [expect.objectContaining({ title: 'Song - Game' })],
      }),
    );
  });

  it('accepts bare version filenames and same-version corrections', async () => {
    expect(await importMusicUpload({ ...upload, filename: '32.0.txt' })).toBe(
      'updated',
    );
    dependencies.download.mockResolvedValue(new Response(text));
    dependencies.save.mockResolvedValue(false);
    expect(await importMusicUpload(upload)).toBe('unchanged');
  });

  it.each([
    'https://example.com/file.txt',
    'http://cdn.discordapp.com/file.txt',
  ])('rejects unexpected download locations', async (url) => {
    await expect(importMusicUpload({ ...upload, url })).rejects.toThrow();
    expect(dependencies.download).not.toHaveBeenCalled();
  });

  it('keeps previous data on malformed content or failed downloads', async () => {
    dependencies.download.mockResolvedValue(new Response('not a catalog'));
    await expect(importMusicUpload(upload)).rejects.toThrow();
    dependencies.download.mockResolvedValue(new Response('', { status: 404 }));
    await expect(importMusicUpload(upload)).rejects.toThrow();
    expect(dependencies.save).not.toHaveBeenCalled();
  });

  it('bounds the actual response body even when attachment metadata is wrong', async () => {
    dependencies.download.mockResolvedValue(
      new Response('x'.repeat(2_000_001)),
    );
    await expect(importMusicUpload(upload)).rejects.toThrow();
    expect(dependencies.save).not.toHaveBeenCalled();
  });

  it('distinguishes an empty catalog from an unsuccessful search', async () => {
    dependencies.read.mockResolvedValue(null);
    expect(await searchMusicCatalog('song')).toBeNull();
    dependencies.read.mockResolvedValue({ plays: [] });
    expect(await searchMusicCatalog('song')).toEqual([]);
  });

  it('resolves only the latest occurrence of the best match and retains counts without video configuration', async () => {
    dependencies.read.mockResolvedValue({
      plays: [
        {
          title: 'Song - Game',
          originalTitle: 'Song - Game',
          streamLabel: 'Stream 1',
          streamDate: '2021-10-01',
          offsetSeconds: 60,
          musicMode: 'UNKNOWN',
        },
        {
          title: 'Song - Game',
          originalTitle: 'Song - Game',
          streamLabel: 'Stream 2',
          streamDate: '2022-01-01',
          offsetSeconds: 1365,
          musicMode: 'UNKNOWN',
        },
      ],
    });
    expect(await searchMusicCatalog('song')).toEqual([
      expect.objectContaining({
        count: 2,
        lastDate: '2022-01-01',
        lastOffsetSeconds: 1365,
        video: { videoId: 'video', title: 'Latest broadcast' },
      }),
    ]);
    expect(dependencies.video).toHaveBeenCalledExactlyOnceWith(
      '@primary',
      '2022-01-01',
    );
    dependencies.video.mockResolvedValue({ videoId: null, title: null });
    expect(await searchMusicCatalog('song')).toEqual([
      expect.objectContaining({ video: null }),
    ]);
    dependencies.handle.mockReturnValue(undefined);
    expect(await searchMusicCatalog('song')).toEqual([
      expect.objectContaining({ count: 2, video: null }),
    ]);
  });

  it('preserves a successful import when YouTube is unavailable', async () => {
    dependencies.refresh.mockRejectedValue(new Error('YouTube unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await importMusicUpload(upload)).toBe('updated');
    expect(dependencies.save).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalled();
  });

  it('reparses only the exact stored source for a game metadata refresh', async () => {
    dependencies.read.mockResolvedValue({
      messageId: 123n,
      attachmentId: 456n,
      uploaderId: upload.authorId,
      filename: upload.filename,
      rawText: text,
      plays: [],
    });
    dependencies.save.mockResolvedValue(true);
    expect(await refreshStoredMusicCatalog()).toBe(true);
    expect(dependencies.save).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 123n,
        attachmentId: 456n,
        allowCurrentSource: true,
        plays: [expect.objectContaining({ game: null })],
      }),
    );
    dependencies.read.mockResolvedValue(null);
    expect(await refreshStoredMusicCatalog()).toBe(false);
  });
});
