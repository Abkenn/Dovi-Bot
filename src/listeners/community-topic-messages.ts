import { Listener } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';
import { Events, type Message } from 'discord.js';
import { BOT_GUILDS } from '../config/discord-access';
import { recordCommunityTopicMessage } from '../modules/community-topics/community-topic.service';

const DEFAULT_CHANNEL_SELECTORS = [
  'general',
  'gaming-talk',
  'media',
  'music-talk',
];

const getTrackingChannelSelectors = () =>
  new Set(
    (
      env.COMMUNITY_TOPIC_TRACKING_CHANNELS ??
      DEFAULT_CHANNEL_SELECTORS.join(',')
    )
      .split(',')
      .map((selector) => selector.trim().replace(/^#/, '').toLowerCase())
      .filter(Boolean),
  );

const getMessageChannelName = (message: Message) => {
  const channel = message.channel;

  if ('name' in channel && typeof channel.name === 'string') {
    return channel.name.toLowerCase();
  }

  return null;
};

const shouldTrackMessage = (message: Message) => {
  if (!env.ENABLE_COMMUNITY_TOPIC_TRACKING) {
    return false;
  }

  if (!message.inGuild() || message.author.bot) {
    return false;
  }

  if (message.guildId !== BOT_GUILDS.PROD_ENV) {
    return false;
  }

  const channelSelectors = getTrackingChannelSelectors();
  const channelName = getMessageChannelName(message);

  return (
    channelSelectors.has(message.channelId) ||
    (channelName !== null && channelSelectors.has(channelName))
  );
};

export class CommunityTopicMessagesListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.MessageCreate,
    });
  }

  public override async run(message: Message) {
    if (!shouldTrackMessage(message)) {
      return;
    }

    const guildId = message.guildId;

    if (!guildId) {
      return;
    }

    try {
      await recordCommunityTopicMessage({
        guildId,
        channelId: message.channelId,
        messageId: message.id,
        authorUserId: message.author.id,
        messageCreatedAt: message.createdAt,
        content: message.content,
        source: 'REALTIME',
      });
    } catch (error) {
      console.error('Failed to record community topic message.', error);
    }
  }
}
