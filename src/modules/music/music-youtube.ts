import { env } from '@zod-schemas/env.zod';
import { DateTime } from 'luxon';
import { saveMusicStreamVideo } from '../../data/queries/music-catalog';
import {
  getYouTubeChannels,
  getYouTubePlaylistItems,
  getYouTubeVideos,
} from '../youtube/youtube.api';
import type { YouTubePlaylistParams } from '../youtube/youtube.types';

export const getMusicChannelHandle = () =>
  env.YOUTUBE_CHANNEL_HANDLES?.split(',')
    .map((handle) => handle.trim())
    .find(Boolean);

export const refreshMusicStreamVideos = async (dates: string[]) => {
  const channelHandle = getMusicChannelHandle();
  if (!env.YOUTUBE_API_KEY || !channelHandle || !dates.length) return;
  const signal = AbortSignal.timeout(120_000);
  const channel = await getYouTubeChannels(
    { part: 'contentDetails', forHandle: channelHandle },
    signal,
  );
  const playlistId =
    channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) return;
  const requestedDates = new Set(dates);
  const candidates = new Map<string, Map<string, string>>();
  const params: YouTubePlaylistParams = {
    part: 'contentDetails',
    playlistId,
    maxResults: 50,
  };
  for (let page = 0; page < 100; page++) {
    const playlist = await getYouTubePlaylistItems({ ...params }, signal);
    const ids =
      playlist.items?.flatMap((item) =>
        item.contentDetails?.videoId ? [item.contentDetails.videoId] : [],
      ) ?? [];
    if (ids.length) {
      const videos = await getYouTubeVideos(
        { part: 'snippet,liveStreamingDetails', id: ids.join(',') },
        signal,
      );
      for (const video of videos.items ?? []) {
        const startedAt = video.liveStreamingDetails?.actualStartTime;
        if (
          !video.id ||
          !video.snippet?.title ||
          !startedAt ||
          !video.liveStreamingDetails?.actualEndTime
        )
          continue;
        const streamDate = DateTime.fromISO(startedAt)
          .setZone('America/Sao_Paulo')
          .toISODate();
        if (!streamDate || !requestedDates.has(streamDate)) continue;
        const onDate = candidates.get(streamDate) ?? new Map<string, string>();
        onDate.set(video.id, video.snippet.title);
        candidates.set(streamDate, onDate);
      }
    }
    if (!playlist.nextPageToken) break;
    if (page === 99)
      throw new Error('Music stream archive exceeds lookup limit.');
    params.pageToken = playlist.nextPageToken;
  }
  for (const streamDate of requestedDates) {
    const videos = candidates.get(streamDate);
    const candidate = videos?.size === 1 ? [...videos.entries()][0] : undefined;
    await saveMusicStreamVideo({
      channelHandle,
      streamDate,
      videoId: candidate?.[0] ?? null,
      title: candidate?.[1] ?? null,
    });
  }
};
