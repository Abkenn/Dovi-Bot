import { BOT_GUILDS } from '../../config/discord-access';
import {
  findMusicCatalog,
  findMusicStreamVideo,
} from '../../data/queries/music-catalog';
import { replaceMusicCatalog } from '../../data/transactions/music-catalog';
import {
  MUSIC_CATALOG_MAX_BYTES,
  MUSIC_CATALOG_UPLOADER_ID,
} from './music.config';
import type { MusicUpload } from './music.types';
import { parseMusicCatalog } from './music-catalog.parser';
import { isDigits } from './music-normalization';
import {
  findMusicGamePlays,
  groupMusicGameTracks,
  searchMusicPlays,
} from './music-search';
import {
  getMusicChannelHandle,
  refreshMusicStreamVideos,
} from './music-youtube';

const isCatalogFilename = (filename: string) => {
  const name = filename.toLowerCase();
  if (!name.endsWith('.txt')) return false;
  const stem = name.slice(0, -4);
  const version = stem.slice(stem.lastIndexOf(' ') + 1).split('.');
  if (version.length !== 2 || !version.every(isDigits)) return false;
  return stem === version.join('.') || stem.startsWith('list music stream ');
};

const downloadCatalog = async (url: string) => {
  const location = new URL(url);
  if (
    location.protocol !== 'https:' ||
    !['cdn.discordapp.com', 'media.discordapp.net'].includes(location.hostname)
  ) {
    throw new Error('Unexpected music attachment URL.');
  }
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    redirect: 'error',
  });
  if (!response.ok || !response.body)
    throw new Error('Could not download music catalog.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MUSIC_CATALOG_MAX_BYTES)
        throw new Error('Music catalog exceeds size limit.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Buffer.concat(chunks),
  );
};

export const importMusicUpload = async (upload: MusicUpload) => {
  if (
    upload.authorId !== MUSIC_CATALOG_UPLOADER_ID ||
    upload.guildId !== BOT_GUILDS.PROD_ENV ||
    !isCatalogFilename(upload.filename) ||
    upload.size > MUSIC_CATALOG_MAX_BYTES
  )
    return 'ignored';

  const rawText = await downloadCatalog(upload.url);
  const plays = parseMusicCatalog(rawText);
  const updated = await replaceMusicCatalog({
    messageId: BigInt(upload.messageId),
    attachmentId: BigInt(upload.attachmentId),
    uploaderId: upload.authorId,
    filename: upload.filename,
    rawText,
    plays,
  });
  if (updated) {
    try {
      await refreshMusicStreamVideos([
        ...new Set(plays.map((play) => play.streamDate)),
      ]);
    } catch (error) {
      console.error(
        'Music catalog updated, but stream video lookup failed.',
        error,
      );
    }
  }
  return updated ? 'updated' : 'unchanged';
};

type MusicSearchOptions = {
  game: boolean;
};

const resolveMusicVideo = async (streamDate: string) => {
  const handle = getMusicChannelHandle();
  const cachedVideo = handle
    ? await findMusicStreamVideo(handle, streamDate)
    : null;
  return cachedVideo?.videoId && cachedVideo.title
    ? { videoId: cachedVideo.videoId, title: cachedVideo.title }
    : null;
};

export const searchMusicCatalog = async (
  query: string,
  options: MusicSearchOptions = { game: false },
) => {
  const catalog = await findMusicCatalog();
  if (!catalog) return null;
  if (options.game) {
    const plays = groupMusicGameTracks(
      findMusicGamePlays(catalog.plays, query),
    );
    return Promise.all(
      plays.map(async (play) => ({
        ...play,
        video: await resolveMusicVideo(play.streamDate),
      })),
    );
  }
  const best = searchMusicPlays(catalog.plays, query)[0];
  if (!best) return [];
  const video = await resolveMusicVideo(best.lastDate);
  return [{ ...best, video }];
};

export const refreshStoredMusicCatalog = async () => {
  const catalog = await findMusicCatalog();
  if (!catalog) return false;
  const plays = parseMusicCatalog(catalog.rawText);
  return replaceMusicCatalog({
    messageId: catalog.messageId,
    attachmentId: catalog.attachmentId,
    uploaderId: catalog.uploaderId,
    filename: catalog.filename,
    rawText: catalog.rawText,
    plays,
    allowCurrentSource: true,
  });
};
