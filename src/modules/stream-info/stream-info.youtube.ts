import { env } from '@zod-schemas/env.zod';
import type { DateTime } from 'luxon';
import type { StreamOccurrence } from './stream-info.types';

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
      actualStartTime?: string;
      actualEndTime?: string;
    };
  }[];
};

type YouTubeStreamStatus = {
  title: string;
  url: string;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  isLive: boolean;
};

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_POLL_BEFORE_SCHEDULE_MS = 60 * 60 * 1000;
const YOUTUBE_POLL_AFTER_SCHEDULE_START_MS = 16 * 60 * 60 * 1000;
const YOUTUBE_RECENT_END_GRACE_MS = 10 * 60 * 1000;
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

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
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

        const actualStartAt = toDate(item.liveStreamingDetails.actualStartTime);
        const actualEndAt = toDate(item.liveStreamingDetails.actualEndTime);
        const isLive =
          item.snippet.liveBroadcastContent === 'live' && actualEndAt === null;

        if (!isLive && !actualEndAt) {
          return null;
        }

        return {
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${item.id}`,
          actualStartAt,
          actualEndAt,
          isLive,
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

    const now = Date.now();
    const recentlyEndedStatuses = statuses
      .filter(
        (status) =>
          status.actualEndAt &&
          status.actualEndAt.getTime() + YOUTUBE_RECENT_END_GRACE_MS >= now,
      )
      .sort(
        (a, b) =>
          (b.actualEndAt?.getTime() ?? 0) - (a.actualEndAt?.getTime() ?? 0),
      );

    return recentlyEndedStatuses[0] ?? null;
  };

const shouldPollYouTube = (
  occurrences: readonly StreamOccurrence[],
  now: DateTime,
): boolean => {
  if (!env.YOUTUBE_API_KEY || getYouTubeChannelHandles().length === 0) {
    return false;
  }

  const nowMs = now.toMillis();

  return occurrences.some((occurrence) => {
    const startMs = occurrence.startAt.getTime();

    return (
      nowMs >= startMs - YOUTUBE_POLL_BEFORE_SCHEDULE_MS &&
      nowMs <= startMs + YOUTUBE_POLL_AFTER_SCHEDULE_START_MS
    );
  });
};

const getYouTubeStreamStatus = async (
  occurrences: readonly StreamOccurrence[],
  now: DateTime,
): Promise<YouTubeStreamStatus | null> => {
  const nowMs = now.toMillis();
  const cachedStatus = streamCache?.status;
  const cachedStatusIsActive =
    cachedStatus?.isLive ||
    (cachedStatus?.actualEndAt &&
      cachedStatus.actualEndAt.getTime() + YOUTUBE_RECENT_END_GRACE_MS >=
        nowMs);

  if (streamCache && streamCache.expiresAt > nowMs) {
    return streamCache.status;
  }

  if (!shouldPollYouTube(occurrences, now) && !cachedStatusIsActive) {
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

const getStatusTime = (status: YouTubeStreamStatus): number | null =>
  (status.actualStartAt ?? status.actualEndAt)?.getTime() ?? null;

const findMatchingOccurrence = (
  occurrences: readonly StreamOccurrence[],
  status: YouTubeStreamStatus,
): StreamOccurrence | null => {
  const statusTime = getStatusTime(status);

  if (!statusTime) {
    return null;
  }

  return (
    occurrences
      .filter((occurrence) => {
        const startMs = occurrence.startAt.getTime();

        return (
          statusTime >= startMs - YOUTUBE_POLL_BEFORE_SCHEDULE_MS &&
          statusTime <= startMs + YOUTUBE_POLL_AFTER_SCHEDULE_START_MS
        );
      })
      .sort(
        (a, b) =>
          Math.abs(a.startAt.getTime() - statusTime) -
          Math.abs(b.startAt.getTime() - statusTime),
      )[0] ?? null
  );
};

const applyYouTubeStreamStatus = (
  occurrence: StreamOccurrence,
  status: YouTubeStreamStatus,
  now: DateTime,
): StreamOccurrence => {
  const endAt = status.actualEndAt
    ? new Date(status.actualEndAt.getTime() + YOUTUBE_RECENT_END_GRACE_MS)
    : new Date(now.toMillis() + YOUTUBE_RECENT_END_GRACE_MS);

  return {
    ...occurrence,
    startAt: status.actualStartAt ?? occurrence.startAt,
    endAt,
    streamUrl: status.url,
  };
};

export const getYouTubeCurrentOccurrence = async ({
  occurrences,
  now,
}: {
  occurrences: readonly StreamOccurrence[];
  now: DateTime;
}): Promise<StreamOccurrence | null> => {
  const status = await getYouTubeStreamStatus(occurrences, now);

  if (!status) {
    return null;
  }

  const occurrence = findMatchingOccurrence(occurrences, status);

  if (!occurrence) {
    return null;
  }

  return applyYouTubeStreamStatus(occurrence, status, now);
};
