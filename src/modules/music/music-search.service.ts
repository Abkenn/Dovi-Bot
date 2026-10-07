import {
  findMusicCatalog,
  findMusicStreamVideo,
  findMusicStreamVideos,
} from '../../data/queries/music-catalog';
import type { MusicSearchOptions } from './music.types';
import { buildMusicFacts } from './music-activity';
import {
  findMusicGamePlays,
  groupMusicGameTracks,
  searchMusicPlays,
} from './music-search';
import { getMusicChannelHandle } from './music-youtube';

export const getMusicFacts = async () => {
  const catalog = await findMusicCatalog();
  return catalog ? buildMusicFacts(catalog.plays) : null;
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
    const handle = getMusicChannelHandle();
    const videos =
      handle && plays.length
        ? await findMusicStreamVideos(handle, [
            ...new Set(plays.map((play) => play.streamDate)),
          ])
        : [];
    const videosByDate = new Map(
      videos.map((video) => [video.streamDate, video]),
    );
    return plays.map((play) => {
      const video = videosByDate.get(play.streamDate);
      return {
        ...play,
        video:
          video?.videoId && video.title
            ? { videoId: video.videoId, title: video.title }
            : null,
      };
    });
  }
  const best = searchMusicPlays(catalog.plays, query)[0];
  if (!best) return [];
  const video = await resolveMusicVideo(best.lastDate);
  return [{ ...best, video }];
};
