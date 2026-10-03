import { prisma } from '../../lib/prisma';
import type { MusicStreamVideoInput } from './music-catalog.types';

export const findMusicCatalog = () =>
  prisma.musicCatalog.findUnique({
    where: { id: 'primary' },
    select: {
      messageId: true,
      attachmentId: true,
      uploaderId: true,
      filename: true,
      rawText: true,
      plays: {
        select: {
          streamLabel: true,
          streamDate: true,
          offsetSeconds: true,
          title: true,
          originalTitle: true,
          game: true,
          musicMode: true,
        },
      },
    },
  });

export const findMusicStreamVideo = (
  channelHandle: string,
  streamDate: string,
) =>
  prisma.musicStreamVideo.findUnique({
    where: { channelHandle_streamDate: { channelHandle, streamDate } },
    select: { videoId: true, title: true },
  });

export const saveMusicStreamVideo = (input: MusicStreamVideoInput) =>
  prisma.musicStreamVideo.upsert({
    where: {
      channelHandle_streamDate: {
        channelHandle: input.channelHandle,
        streamDate: input.streamDate,
      },
    },
    create: input,
    update: input,
  });
