import { z } from 'zod';
import { MusicMode, StreamKind, Weekday } from '../../generated/prisma/client';
import type { StreamInfoResult, StreamOccurrence } from './stream-info.types';

const optionalString = z.string().optional();
const streamVideoSchema = z.object({
  title: z.string(),
  url: z.string(),
  actualStartAt: z.string().nullable(),
  scheduledStartAt: z.string().nullable(),
});
const occurrenceSchema = z
  .object({
    dateKey: z.string(),
    weekday: z.enum(Weekday).nullable(),
    startAt: z.string(),
    endAt: z.string(),
    streamKind: z.enum(StreamKind),
    musicMode: z.enum(MusicMode).nullable(),
    title: z.string().nullable(),
    customTitle: z.string().nullable(),
    musicTheme: z.string().nullable(),
    gameName: z.string().nullable(),
    isCombined: z.boolean().optional().default(false),
    streamUrl: optionalString,
    videoTitle: optionalString,
    videos: z.array(streamVideoSchema).optional(),
    streamIsLive: z.boolean().optional(),
    isOverride: z.boolean(),
  })
  .transform(
    (occurrence): StreamOccurrence => ({
      ...occurrence,
      startAt: new Date(occurrence.startAt),
      endAt: new Date(occurrence.endAt),
      videos: occurrence.videos?.map((video) => ({
        ...video,
        actualStartAt: video.actualStartAt
          ? new Date(video.actualStartAt)
          : null,
        scheduledStartAt: video.scheduledStartAt
          ? new Date(video.scheduledStartAt)
          : null,
      })),
    }),
  );

const streamInfoSchema = z.object({
  timezone: z.string(),
  current: occurrenceSchema.nullable(),
  previous: occurrenceSchema.nullable(),
  next: occurrenceSchema.nullable(),
  following: occurrenceSchema.nullable().optional(),
});

export const serializeStreamAnnouncementSnapshot = (
  streamInfo: StreamInfoResult,
) => JSON.stringify(streamInfo);

export const deserializeStreamAnnouncementSnapshot = (
  snapshotJson: string,
): StreamInfoResult => streamInfoSchema.parse(JSON.parse(snapshotJson));
