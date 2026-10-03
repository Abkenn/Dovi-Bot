import { env } from '@zod-schemas/env.zod';
import { z } from 'zod';
import { youtubeApi } from '../../lib/api';
import type {
  YouTubeChannelParams,
  YouTubePlaylistParams,
  YouTubeVideoParams,
} from './youtube.types';

const channelSchema = z.object({
  items: z
    .array(
      z.object({
        contentDetails: z
          .object({
            relatedPlaylists: z
              .object({ uploads: z.string().optional() })
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const playlistSchema = z.object({
  nextPageToken: z.string().optional(),
  items: z
    .array(
      z.object({
        contentDetails: z
          .object({
            videoId: z.string().optional(),
            videoPublishedAt: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const videosSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        snippet: z
          .object({
            title: z.string().optional(),
            liveBroadcastContent: z.string().optional(),
          })
          .optional(),
        liveStreamingDetails: z
          .object({
            scheduledStartTime: z.string().optional(),
            actualStartTime: z.string().optional(),
            actualEndTime: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const getYouTubeJson = async <T>(
  path: 'channels' | 'playlistItems' | 'videos',
  params: YouTubeChannelParams | YouTubePlaylistParams | YouTubeVideoParams,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> => {
  if (!env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not configured.');
  }

  const response = await youtubeApi.get<T>(path, {
    searchParams: { ...params, key: env.YOUTUBE_API_KEY },
    signal: signal ?? null,
  });
  if (!response.ok) {
    throw new Error(
      `YouTube API request failed: ${response.status} ${response.statusText}`,
    );
  }
  return schema.parse(await response.json());
};

export const getYouTubeChannels = (
  params: YouTubeChannelParams,
  signal?: AbortSignal,
) => getYouTubeJson('channels', params, channelSchema, signal);

export const getYouTubePlaylistItems = (
  params: YouTubePlaylistParams,
  signal?: AbortSignal,
) => getYouTubeJson('playlistItems', params, playlistSchema, signal);

export const getYouTubeVideos = (
  params: YouTubeVideoParams,
  signal?: AbortSignal,
) => getYouTubeJson('videos', params, videosSchema, signal);
