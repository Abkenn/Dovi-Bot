import { env } from '@zod-schemas/env.zod';
import { DateTime } from 'luxon';
import type { YouTubeUpload } from './youtube-upload.types';

type YouTubeChannelResponse = {
  items?: {
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }[];
};

type YouTubePlaylistItemsResponse = {
  items?: {
    contentDetails?: { videoId?: string; videoPublishedAt?: string };
  }[];
};

type YouTubeVideosResponse = {
  items?: {
    id?: string;
    liveStreamingDetails?: object;
  }[];
};

type YouTubeUploadChannel = {
  uploadsPlaylistId: string;
};

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_MAX_RECENT_UPLOADS = 5;

let uploadChannelCache: YouTubeUploadChannel | null | undefined;

const getPrimaryYouTubeChannelHandle = () =>
  env.YOUTUBE_CHANNEL_HANDLES?.split(',')
    .map((handle) => handle.trim())
    .find(Boolean);

const getJson = async <T>(
  path: string,
  params: Record<string, string>,
): Promise<T> => {
  if (!env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not configured.');
  }

  const url = new URL(`${YOUTUBE_API_BASE_URL}/${path}`);
  for (const [key, value] of Object.entries({
    ...params,
    key: env.YOUTUBE_API_KEY,
  })) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `YouTube API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
};

const getUploadChannel = async (): Promise<YouTubeUploadChannel | null> => {
  if (uploadChannelCache !== undefined) {
    return uploadChannelCache;
  }

  const handle = getPrimaryYouTubeChannelHandle();
  if (!env.YOUTUBE_API_KEY || !handle) {
    uploadChannelCache = null;
    return uploadChannelCache;
  }

  const response = await getJson<YouTubeChannelResponse>('channels', {
    part: 'contentDetails',
    forHandle: handle,
  });
  const channel = response.items?.[0];
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;

  uploadChannelCache = uploadsPlaylistId ? { uploadsPlaylistId } : null;
  return uploadChannelCache;
};

const getPublishedAt = (value: string | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const date = DateTime.fromISO(value, { setZone: true });
  return date.isValid ? date.toUTC().toJSDate() : null;
};

export const getRecentYouTubeUploads = async (): Promise<YouTubeUpload[]> => {
  const channel = await getUploadChannel();
  if (!channel) {
    return [];
  }

  const playlist = await getJson<YouTubePlaylistItemsResponse>(
    'playlistItems',
    {
      part: 'contentDetails',
      playlistId: channel.uploadsPlaylistId,
      maxResults: String(YOUTUBE_MAX_RECENT_UPLOADS),
    },
  );
  const publishedByVideoId = new Map(
    playlist.items
      ?.map((item) => {
        const videoId = item.contentDetails?.videoId;
        const publishedAt = getPublishedAt(
          item.contentDetails?.videoPublishedAt,
        );
        return videoId && publishedAt
          ? ([videoId, publishedAt] as const)
          : null;
      })
      .filter((entry) => entry !== null) ?? [],
  );
  const videoIds = [...publishedByVideoId.keys()];
  if (videoIds.length === 0) {
    return [];
  }

  const videos = await getJson<YouTubeVideosResponse>('videos', {
    part: 'snippet,liveStreamingDetails',
    id: videoIds.join(','),
  });

  return (
    videos.items
      ?.map((video) => {
        if (!video.id || video.liveStreamingDetails) {
          return null;
        }
        const publishedAt = publishedByVideoId.get(video.id);
        if (!publishedAt) {
          return null;
        }

        return {
          id: video.id,
          publishedAt,
          url: `https://www.youtube.com/watch?v=${video.id}`,
        };
      })
      .filter((upload) => upload !== null) ?? []
  );
};
