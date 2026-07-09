import { prisma } from '../../lib/prisma';
import type { DeletedLogInput, RecentLogInput } from './message-logging.types';

export const RECENT_MESSAGE_LIMIT_PER_CHANNEL = 20;
export const DELETED_MESSAGE_LIMIT_PER_GUILD = 10;

const pruneRecentMessageLogs = ({
  guildId,
  channelId,
}: {
  guildId: string;
  channelId: string;
}) =>
  prisma.$executeRaw`
    delete from "RecentLog"
    where id in (
      select id
      from (
        select
          id,
          row_number() over (
            partition by "guildId", "channelId"
            order by "messageCreatedAt" desc, "loggedAt" desc
          ) as position
        from "RecentLog"
        where "guildId" = ${guildId} and "channelId" = ${channelId}
      ) ranked
      where position > ${RECENT_MESSAGE_LIMIT_PER_CHANNEL}
    )
  `;

const pruneDeletedMessageLogs = (guildId: string) =>
  prisma.$executeRaw`
    delete from "DeletedLog"
    where id in (
      select id
      from (
        select
          id,
          row_number() over (
            partition by "guildId"
            order by "deletedAt" desc
          ) as position
        from "DeletedLog"
        where "guildId" = ${guildId}
      ) ranked
      where position > ${DELETED_MESSAGE_LIMIT_PER_GUILD}
    )
  `;

export const recordRecentLog = async (input: RecentLogInput) => {
  const log = await prisma.recentLog.upsert({
    where: { messageId: input.messageId },
    update: {
      channelName: input.channelName,
      authorUsername: input.authorUsername,
      content: input.content,
      messageCreatedAt: input.messageCreatedAt,
    },
    create: input,
  });

  await pruneRecentMessageLogs({
    guildId: input.guildId,
    channelId: input.channelId,
  });

  return log;
};

export const findRecentLog = (messageId: string) =>
  prisma.recentLog.findUnique({
    where: { messageId },
  });

export const recordDeletedLog = async (input: DeletedLogInput) => {
  const log = await prisma.deletedLog.upsert({
    where: { messageId: input.messageId },
    update: {
      channelName: input.channelName,
      authorUserId: input.authorUserId,
      authorUsername: input.authorUsername,
      content: input.content,
      messageCreatedAt: input.messageCreatedAt,
      deletedAt: input.deletedAt,
    },
    create: input,
  });

  await pruneDeletedMessageLogs(input.guildId);

  return log;
};
