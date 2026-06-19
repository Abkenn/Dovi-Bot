import { prisma } from '../../lib/prisma';
import type {
  StreamInfoCommandTarget,
  UpsertStreamInfoMessageInput,
} from './stream-info-message.types';

export const upsertLastStreamInfoMessage = ({
  guildId,
  channelId,
  messageId,
}: UpsertStreamInfoMessageInput) =>
  prisma.streamInfoMessage.upsert({
    where: {
      guildId,
    },
    update: {
      channelId,
      messageId,
    },
    create: {
      guildId,
      channelId,
      messageId,
    },
  });

export const findLastStreamInfoMessages = () =>
  prisma.streamInfoMessage.findMany({
    orderBy: {
      updatedAt: 'desc',
    },
  });

export const deleteLastStreamInfoMessage = (guildId: string) =>
  prisma.streamInfoMessage.deleteMany({
    where: {
      guildId,
    },
  });

export const findLatestStreamInfoCommandTargets = async (): Promise<
  StreamInfoCommandTarget[]
> => {
  const logs = await prisma.commandExecutionLog.findMany({
    where: {
      commandName: 'streaminfo',
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
  const seenGuildIds = new Set<string>();
  const targets: StreamInfoCommandTarget[] = [];

  for (const log of logs) {
    if (!log.guildId || !log.channelId || seenGuildIds.has(log.guildId)) {
      continue;
    }

    targets.push({
      guildId: log.guildId,
      channelId: log.channelId,
    });
    seenGuildIds.add(log.guildId);
  }

  return targets;
};
