import {
  findRecentLog,
  recordDeletedLog,
  recordRecentLog,
} from '@data/queries/message-logging';
import type { Message, PartialMessage } from 'discord.js';

const getChannelName = (message: Message | PartialMessage) => {
  const channel = message.channel;

  if ('name' in channel && typeof channel.name === 'string') {
    return channel.name;
  }

  return null;
};

const getAuthorUsername = (message: Message | PartialMessage) => {
  if (!message.author) {
    return null;
  }

  return message.author.tag;
};

export const recordRecentChannelMessage = (message: Message<true>) =>
  recordRecentLog({
    guildId: message.guildId,
    channelId: message.channelId,
    channelName: getChannelName(message),
    messageId: message.id,
    authorUserId: message.author.id,
    authorUsername: getAuthorUsername(message),
    content: message.content,
    messageCreatedAt: message.createdAt,
  });

export const recordDeletedMessage = async (
  message: Message | PartialMessage,
) => {
  if (!message.guildId) {
    return null;
  }

  const recentLog = await findRecentLog(message.id);
  const content = message.content || recentLog?.content || null;

  return recordDeletedLog({
    guildId: message.guildId,
    channelId: message.channelId,
    channelName: getChannelName(message) ?? recentLog?.channelName ?? null,
    messageId: message.id,
    authorUserId: message.author?.id ?? recentLog?.authorUserId ?? null,
    authorUsername:
      getAuthorUsername(message) ?? recentLog?.authorUsername ?? null,
    content,
    messageCreatedAt: message.createdAt ?? recentLog?.messageCreatedAt ?? null,
    deletedAt: new Date(),
  });
};
