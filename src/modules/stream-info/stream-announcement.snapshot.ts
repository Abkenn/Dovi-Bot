import { z } from 'zod';
import { MusicMode, StreamKind, Weekday } from '../../generated/prisma/client';
import type { StreamInfoResult, StreamOccurrence } from './stream-info.types';

const optionalString = z.string().optional();
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
    streamUrl: optionalString,
    videoTitle: optionalString,
    streamIsLive: z.boolean().optional(),
    isOverride: z.boolean(),
  })
  .transform(
    (occurrence): StreamOccurrence => ({
      ...occurrence,
      startAt: new Date(occurrence.startAt),
      endAt: new Date(occurrence.endAt),
    }),
  );

const streamInfoSchema = z.object({
  timezone: z.string(),
  current: occurrenceSchema.nullable(),
  previous: occurrenceSchema.nullable(),
  next: occurrenceSchema.nullable(),
});

export const serializeStreamAnnouncementSnapshot = (
  streamInfo: StreamInfoResult,
) => JSON.stringify(streamInfo);

export const deserializeStreamAnnouncementSnapshot = (
  snapshotJson: string,
): StreamInfoResult => streamInfoSchema.parse(JSON.parse(snapshotJson));
