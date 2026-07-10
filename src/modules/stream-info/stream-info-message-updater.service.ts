import {
  deleteExpiredStreamInfoMessages,
  deleteLastStreamInfoMessage,
  findLastStreamInfoMessages,
  findLastStreamInfoMessagesForGuild,
  findLatestStreamInfoCommandTargets,
  upsertLastStreamInfoMessage,
} from '@data/queries/stream-info-message';
import {
  type Client,
  type Collection,
  type Message,
  type MessageEditOptions,
  MessageFlags,
  type MessageManager,
  type Snowflake,
} from 'discord.js';
import { DateTime } from 'luxon';
import { BOT_GUILDS } from '../../config/discord-access';
import { getNumberProperty, isUnknownRecord } from '../../lib/type-guards';
import { buildComponentEmbedMessageFromEmbeds } from '../discord/component-embed';
import {
  buildEmbeddedAppStatsButton,
  buildStreamInfoEmbed,
  buildStreamReminderButton,
} from './stream-info.discord';
import { getStreamInfo } from './stream-info.service';
import type { StreamInfoMessagePointer } from './stream-info-message-updater.types';
import { deliverStreamReminders } from './stream-reminder.service';
import { getStreamReminderOccurrence } from './stream-reminder.utils';

const UNKNOWN_MESSAGE_CODE = 10008;
const MISSING_ACCESS_CODE = 50001;
const UNKNOWN_CHANNEL_CODE = 10003;
const STREAM_INFO_MESSAGE_RETENTION_HOURS = 24;

const getRecentMessageCutoff = () =>
  DateTime.utc()
    .minus({ hours: STREAM_INFO_MESSAGE_RETENTION_HOURS })
    .toJSDate();

const getChannelKey = ({
  guildId,
  channelId,
}: Pick<StreamInfoMessagePointer, 'guildId' | 'channelId'>) =>
  `${guildId}:${channelId}`;

const shouldForgetMessage = (error: unknown): boolean => {
  const code = getNumberProperty(error, 'code');

  return [UNKNOWN_MESSAGE_CODE, MISSING_ACCESS_CODE, UNKNOWN_CHANNEL_CODE].some(
    (forgettableCode) => forgettableCode === code,
  );
};

type MessageBackedChannel = {
  messages: MessageManager;
};

const hasMessages = (channel: unknown): channel is MessageBackedChannel =>
  typeof channel === 'object' && channel !== null && 'messages' in channel;

const hasContent = (value: unknown, content: string): boolean => {
  if (typeof value === 'string') {
    return value.includes(content);
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasContent(item, content));
  }

  if (!isUnknownRecord(value)) {
    return false;
  }

  return Object.values(value).some((item) => hasContent(item, content));
};

const isStreamInfoMessage = (message: Message, botUserId: string): boolean => {
  if (message.author.id !== botUserId) {
    return false;
  }

  if (message.embeds.some((embed) => embed.title === 'Stream Info')) {
    return true;
  }

  return hasContent(message.components, 'Stream Info');
};

const findRecentStreamInfoMessage = async ({
  channel,
  botUserId,
}: {
  channel: MessageBackedChannel;
  botUserId: string;
}): Promise<Message | null> => {
  const messages = (await channel.messages.fetch({
    limit: 25,
  })) as Collection<Snowflake, Message>;

  return (
    Array.from(messages.values()).find((message) =>
      isStreamInfoMessage(message, botUserId),
    ) ?? null
  );
};

const buildStreamInfoMessageEdit = async (guildId: string, client: Client) => {
  const streamInfo = await getStreamInfo(guildId);
  await deliverStreamReminders({
    client,
    guildId,
    occurrence: streamInfo.current,
  });
  const embed = buildStreamInfoEmbed(streamInfo);
  const reminderButton = buildStreamReminderButton(
    getStreamReminderOccurrence(streamInfo),
  );
  const statsButton = buildEmbeddedAppStatsButton(
    guildId,
    BOT_GUILDS.STAGING_ENV,
  );
  const { flags: _flags, ...componentMessage } =
    buildComponentEmbedMessageFromEmbeds([embed]);

  return {
    ...componentMessage,
    components: [
      ...(componentMessage.components ?? []),
      ...(reminderButton ? [reminderButton] : []),
      ...(statsButton ? [statsButton] : []),
    ],
    allowedMentions: { parse: [] },
    flags: MessageFlags.IsComponentsV2,
  } satisfies MessageEditOptions;
};

const editStreamInfoMessage = async ({
  client,
  guildId,
  message,
}: {
  client: Client;
  guildId: string;
  message: Message;
}) => {
  await message.edit(await buildStreamInfoMessageEdit(guildId, client));
};

export const registerLastStreamInfoMessage = async ({
  guildId,
  channelId,
  message,
}: {
  guildId: string;
  channelId: string;
  message: Message | undefined;
}) => {
  if (!message) {
    return;
  }

  await upsertLastStreamInfoMessage({
    guildId,
    channelId,
    messageId: message.id,
  }).catch((error) => {
    console.error('Failed to store stream info message', error);
  });
};

export const refreshStreamInfoMessage = async ({
  client,
  pointer,
}: {
  client: Client;
  pointer: StreamInfoMessagePointer;
}) => {
  try {
    const channel = await client.channels.fetch(pointer.channelId);
    if (!hasMessages(channel)) {
      await deleteLastStreamInfoMessage(pointer.messageId);
      return;
    }

    const message = await channel.messages.fetch(pointer.messageId);
    await editStreamInfoMessage({
      client,
      guildId: pointer.guildId,
      message,
    });
  } catch (error) {
    if (shouldForgetMessage(error)) {
      await deleteLastStreamInfoMessage(pointer.messageId);
      return;
    }

    console.error('Failed to refresh stream info message', error);
  }
};

export const adoptLastStreamInfoMessage = async ({
  client,
  pointer,
}: {
  client: Client;
  pointer: Omit<StreamInfoMessagePointer, 'messageId'>;
}) => {
  const botUserId = client.user?.id;
  if (!botUserId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(pointer.channelId);
    if (!hasMessages(channel)) {
      return;
    }

    const message = await findRecentStreamInfoMessage({
      channel,
      botUserId,
    });
    if (!message) {
      return;
    }

    const streamInfoMessagePointer = {
      ...pointer,
      messageId: message.id,
    };

    await editStreamInfoMessage({
      client,
      guildId: pointer.guildId,
      message,
    });

    await upsertLastStreamInfoMessage(streamInfoMessagePointer).catch(
      (error) => {
        console.error('Failed to store adopted stream info message', error);
      },
    );
  } catch (error) {
    console.error('Failed to adopt stream info message', error);
  }
};

export const refreshLastStreamInfoMessages = async (client: Client) => {
  const recentCutoff = getRecentMessageCutoff();
  await deleteExpiredStreamInfoMessages(recentCutoff).catch((error) => {
    console.error('Failed to delete expired stream info messages', error);
  });

  const pointers = await findLastStreamInfoMessages(recentCutoff).catch(
    (error) => {
      console.error('Failed to load stored stream info messages', error);

      return [];
    },
  );
  const trackedChannelKeys = new Set(pointers.map(getChannelKey));

  for (const pointer of pointers) {
    await refreshStreamInfoMessage({ client, pointer });
  }

  const commandTargets = await findLatestStreamInfoCommandTargets(recentCutoff);
  for (const target of commandTargets) {
    if (trackedChannelKeys.has(getChannelKey(target))) {
      continue;
    }

    await adoptLastStreamInfoMessage({
      client,
      pointer: target,
    });
  }
};

export const refreshGuildStreamInfoMessages = async ({
  client,
  guildId,
}: {
  client: Client;
  guildId: string;
}) => {
  const pointers = await findLastStreamInfoMessagesForGuild(
    guildId,
    getRecentMessageCutoff(),
  ).catch((error) => {
    console.error('Failed to load stored stream info messages', error);
    return [];
  });

  for (const pointer of pointers) {
    await refreshStreamInfoMessage({ client, pointer });
  }
};
