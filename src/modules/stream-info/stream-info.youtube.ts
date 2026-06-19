import { env } from '@zod-schemas/env.zod';
import { DateTime } from 'luxon';
import type {
  StreamOccurrence,
  YouTubeStreamResolution,
  YouTubeStreamStatus,
} from './stream-info.types';
import {
  resolveYouTubeStreamStatus,
  YOUTUBE_POLL_AFTER_SCHEDULE_START_MS,
  YOUTUBE_RECENT_END_GRACE_MS,
} from './stream-info.youtube-lifecycle';

type YouTubeChannel = {
  handle: string;
  uploadsPlaylistId: string;
};

type YouTubeChannelResponse = {
  items?: {
    id?: string;
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }[];
};

type YouTubePlaylistItemsResponse = {
  items?: {
    contentDetails?: {
      videoId?: string;
    };
  }[];
};

type YouTubeVideosResponse = {
  items?: {
    id?: string;
    snippet?: {
      title?: string;
      liveBroadcastContent?: string;
    };
    liveStreamingDetails?: {
      scheduledStartTime?: string;
      actualStartTime?: string;
      actualEndTime?: string;
    };
  }[];
};

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_ACTIVE_CACHE_MS = 60 * 1000;
const YOUTUBE_INACTIVE_CACHE_MS = 5 * 60 * 1000;
const YOUTUBE_MAX_UPLOADS_PER_CHANNEL = 5;

let channelCache: YouTubeChannel[] | undefined;
let streamCache:
  | {
      expiresAt: number;
      status: YouTubeStreamStatus | null;
    }
  | undefined;

const getYouTubeChannelHandles = (): string[] =>
  env.YOUTUBE_CHANNEL_HANDLES?.split(',')
    .map((handle) => handle.trim())
    .filter(Boolean) ?? [];

const toDate = (value: string | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const date = DateTime.fromISO(value, { setZone: true });

  return date.isValid ? date.toUTC().toJSDate() : null;
};

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

const getYouTubeChannels = async (): Promise<YouTubeChannel[]> => {
  if (channelCache) {
    return channelCache;
  }

  const channels = await Promise.all(
    getYouTubeChannelHandles().map(async (handle) => {
      const response = await getJson<YouTubeChannelResponse>('channels', {
        part: 'contentDetails',
        forHandle: handle,
      });
      const uploadsPlaylistId =
        response.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      return uploadsPlaylistId
        ? {
            handle,
            uploadsPlaylistId,
          }
        : null;
    }),
  );

  channelCache = channels.filter((channel) => channel !== null);

  return channelCache;
};

const getRecentVideoIds = async (
  channel: YouTubeChannel,
): Promise<string[]> => {
  const response = await getJson<YouTubePlaylistItemsResponse>(
    'playlistItems',
    {
      part: 'contentDetails',
      playlistId: channel.uploadsPlaylistId,
      maxResults: String(YOUTUBE_MAX_UPLOADS_PER_CHANNEL),
    },
  );

  return (
    response.items
      ?.map((item) => item.contentDetails?.videoId)
      .filter((videoId) => videoId !== undefined) ?? []
  );
};

const getStreamStatuses = async (
  videoIds: readonly string[],
): Promise<YouTubeStreamStatus[]> => {
  if (videoIds.length === 0) {
    return [];
  }

  const response = await getJson<YouTubeVideosResponse>('videos', {
    part: 'snippet,liveStreamingDetails',
    id: videoIds.join(','),
  });

  return (
    response.items
      ?.map((item) => {
        if (!item.id || !item.snippet?.title || !item.liveStreamingDetails) {
          return null;
        }

        const scheduledStartAt = toDate(
          item.liveStreamingDetails.scheduledStartTime,
        );
        const actualStartAt = toDate(item.liveStreamingDetails.actualStartTime);
        const actualEndAt = toDate(item.liveStreamingDetails.actualEndTime);
        const isLive =
          item.snippet.liveBroadcastContent === 'live' && actualEndAt === null;
        const isUpcoming =
          item.snippet.liveBroadcastContent === 'upcoming' &&
          scheduledStartAt !== null &&
          actualEndAt === null;

        if (!isLive && !isUpcoming && !actualEndAt) {
          return null;
        }

        return {
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${item.id}`,
          scheduledStartAt,
          actualStartAt,
          actualEndAt,
          isLive,
          isUpcoming,
        };
      })
      .filter((status) => status !== null) ?? []
  );
};

const getFreshYouTubeStreamStatus =
  async (): Promise<YouTubeStreamStatus | null> => {
    const channels = await getYouTubeChannels();
    const recentVideoIds = await Promise.all(channels.map(getRecentVideoIds));
    const statuses = await getStreamStatuses([
      ...new Set(recentVideoIds.flat()),
    ]);
    const liveStatuses = statuses
      .filter((status) => status.isLive)
      .sort(
        (a, b) =>
          (b.actualStartAt?.getTime() ?? 0) - (a.actualStartAt?.getTime() ?? 0),
      );

    if (liveStatuses[0]) {
      return liveStatuses[0];
    }

    const now = DateTime.utc();
    const upcomingStatuses = statuses
      .filter(
        (status) =>
          status.isUpcoming &&
          status.scheduledStartAt &&
          DateTime.fromJSDate(status.scheduledStartAt).plus({
            milliseconds: YOUTUBE_POLL_AFTER_SCHEDULE_START_MS,
          }) >= now,
      )
      .sort((a, b) => {
        const aDistance = a.scheduledStartAt
          ? Math.abs(
              DateTime.fromJSDate(a.scheduledStartAt).diff(now).milliseconds,
            )
          : Number.POSITIVE_INFINITY;
        const bDistance = b.scheduledStartAt
          ? Math.abs(
              DateTime.fromJSDate(b.scheduledStartAt).diff(now).milliseconds,
            )
          : Number.POSITIVE_INFINITY;

        return aDistance - bDistance;
      });

    if (upcomingStatuses[0]) {
      return upcomingStatuses[0];
    }

    const endedStatuses = statuses
      .filter((status) => status.actualEndAt)
      .sort(
        (a, b) =>
          (b.actualEndAt?.getTime() ?? 0) - (a.actualEndAt?.getTime() ?? 0),
      );

    return endedStatuses[0] ?? null;
  };

const shouldPollYouTube = (): boolean => {
  if (!env.YOUTUBE_API_KEY || getYouTubeChannelHandles().length === 0) {
    return false;
  }

  return true;
};

const getYouTubeStreamStatus = async (
  now: DateTime,
): Promise<YouTubeStreamStatus | null> => {
  const nowMs = now.toMillis();
  const cachedStatus = streamCache?.status;
  const cachedStatusIsActive =
    cachedStatus?.isLive ||
    (cachedStatus?.isUpcoming &&
      cachedStatus.scheduledStartAt &&
      DateTime.fromJSDate(cachedStatus.scheduledStartAt).plus({
        milliseconds: YOUTUBE_POLL_AFTER_SCHEDULE_START_MS,
      }) >= now) ||
    (cachedStatus?.actualEndAt &&
      DateTime.fromJSDate(cachedStatus.actualEndAt).plus({
        milliseconds: YOUTUBE_RECENT_END_GRACE_MS,
      }) >= now);

  if (streamCache && streamCache.expiresAt > nowMs) {
    return streamCache.status;
  }

  if (!shouldPollYouTube() && !cachedStatusIsActive) {
    return null;
  }

  try {
    const status = await getFreshYouTubeStreamStatus();
    streamCache = {
      expiresAt:
        nowMs + (status ? YOUTUBE_ACTIVE_CACHE_MS : YOUTUBE_INACTIVE_CACHE_MS),
      status,
    };

    return status;
  } catch (error) {
    console.error('Failed to fetch YouTube stream status', error);

    return cachedStatusIsActive ? cachedStatus : null;
  }
};

export const getYouTubeStreamResolution = async ({
  occurrences,
  now,
  timezone,
}: {
  occurrences: readonly StreamOccurrence[];
  now: DateTime;
  timezone: string;
}): Promise<YouTubeStreamResolution> => {
  const status = await getYouTubeStreamStatus(now);

  if (!status) {
    return {
      current: null,
      suppressedScheduledDateKey: null,
    };
  }

  return resolveYouTubeStreamStatus({
    occurrences,
    status,
    now,
    timezone,
  });
};
