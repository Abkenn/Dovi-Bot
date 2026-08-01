import { prisma } from '../../lib/prisma';
import type {
  StreamInfoCommandTarget,
  UpsertStreamInfoMessageInput,
} from './stream-info-message.types';

export const upsertLastStreamInfoMessage = ({
  guildId,
  channelId,
  messageId,
  announcementDateKey,
}: UpsertStreamInfoMessageInput) =>
  prisma.streamInfoMessage.upsert({
    where: {
      guildId_channelId: {
        guildId,
        channelId,
      },
    },
    update:
      announcementDateKey === undefined
        ? { messageId }
        : { messageId, announcementDateKey },
    create: {
      guildId,
      channelId,
      messageId,
      announcementDateKey: announcementDateKey ?? null,
    },
  });

export const findStreamInfoMessageForChannel = (
  guildId: string,
  channelId: string,
) =>
  prisma.streamInfoMessage.findUnique({
    where: { guildId_channelId: { guildId, channelId } },
  });

export const findLastStreamInfoMessages = (since: Date) =>
  prisma.streamInfoMessage.findMany({
    where: {
      updatedAt: {
        gte: since,
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

export const findLastStreamInfoMessagesForGuild = (
  guildId: string,
  since: Date,
) =>
  prisma.streamInfoMessage.findMany({
    where: {
      guildId,
      updatedAt: { gte: since },
    },
    orderBy: { updatedAt: 'desc' },
  });

export const deleteLastStreamInfoMessage = (messageId: string) =>
  prisma.streamInfoMessage.deleteMany({
    where: {
      messageId,
    },
  });

export const deleteExpiredStreamInfoMessages = (before: Date) =>
  prisma.streamInfoMessage.deleteMany({
    where: {
      announcementDateKey: null,
      updatedAt: {
        lt: before,
      },
    },
  });

export const findLatestStreamInfoCommandTargets = async (
  since: Date,
): Promise<StreamInfoCommandTarget[]> => {
  const logs = await prisma.commandExecutionLog.findMany({
    where: {
      commandName: 'streaminfo',
      createdAt: {
        gte: since,
      },
      guildId: {
        not: null,
      },
      channelId: {
        not: null,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });
  const seenTargets = new Set<string>();
  const targets: StreamInfoCommandTarget[] = [];

  for (const log of logs) {
    if (!log.guildId || !log.channelId) {
      continue;
    }

    const targetKey = `${log.guildId}:${log.channelId}`;
    if (seenTargets.has(targetKey)) {
      continue;
    }

    targets.push({
      guildId: log.guildId,
      channelId: log.channelId,
    });
    seenTargets.add(targetKey);
  }

  return targets;
};
