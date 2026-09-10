import {
  createStreamAnnouncement,
  findStreamAnnouncementByDate,
  findStreamAnnouncementPlan,
  markStreamAnnouncementReviewSent,
} from '@data/queries/stream-announcement';
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
  type MessageCreateOptions,
  MessageFlags,
  type MessageManager,
  type Snowflake,
} from 'discord.js';
import { DateTime } from 'luxon';
import { BOT_GUILDS } from '../../config/discord-access';
import { getNumberProperty, isUnknownRecord } from '../../lib/type-guards';
import {
  buildComponentEmbedMessageFromEmbeds,
  mergeButtonActionRows,
} from '../discord/component-embed';
import { buildEmbeddedAppStatsButton } from '../embedded-app/embedded-app-stats.discord';
import {
  PROD_STREAM_ANNOUNCEMENT_CHANNEL_ID,
  PROD_STREAM_ANNOUNCEMENT_ROLE_ID,
  STAGING_STREAM_ANNOUNCEMENT_CHANNEL_ID,
  STAGING_STREAM_ANNOUNCEMENT_VIDEO_TITLE,
  STAGING_STREAM_ANNOUNCEMENT_VIDEO_URL,
  STREAM_ANNOUNCEMENT_REVIEW_USER_ID,
} from './stream-announcement.config';
import { serializeStreamAnnouncementSnapshot } from './stream-announcement.snapshot';
import {
  applyStreamAnnouncementEdits,
  isStreamAnnouncementReviewDue,
} from './stream-announcement.utils';
import {
  buildStreamAnnouncementMessages,
  buildStreamAnnouncementReviewMessage,
  buildStreamInfoEmbed,
  STREAM_STAGING_REMINDER_CUSTOM_ID_PREFIX,
} from './stream-info.discord';
import { getStreamInfo } from './stream-info.service';
import type { StreamInfoMessagePointer } from './stream-info-message-updater.types';
import { deliverStreamReminders } from './stream-reminder.service';
import { isStreamReminderEligible } from './stream-reminder.utils';

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

type SendableChannel = {
  send: (options: MessageCreateOptions) => Promise<Message>;
};

const hasMessages = (channel: unknown): channel is MessageBackedChannel =>
  typeof channel === 'object' && channel !== null && 'messages' in channel;

const canSendMessages = (channel: unknown): channel is SendableChannel =>
  typeof channel === 'object' && channel !== null && 'send' in channel;

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

const buildStreamInfoMessageEdit = async (guildId: string) => {
  const streamInfo = await getStreamInfo(guildId);
  const embed = buildStreamInfoEmbed(streamInfo);
  const statsButton = buildEmbeddedAppStatsButton(guildId);
  const buttonRows = [statsButton].filter((button) => button !== null);
  const actionRows =
    buttonRows.length > 0 ? [mergeButtonActionRows(buttonRows)] : [];
  const componentMessage = buildComponentEmbedMessageFromEmbeds([embed]);

  return {
    components: [...(componentMessage.components ?? []), ...actionRows],
    allowedMentions: { parse: [] },
    flags: MessageFlags.IsComponentsV2 as const,
  };
};

export const announcePlannedStreamInfo = async (client: Client) => {
  const streamInfo = await getStreamInfo(BOT_GUILDS.PROD_ENV);
  const scheduledOccurrence = [streamInfo.current, streamInfo.next].find(
    (candidate) => candidate && isStreamReminderEligible(candidate),
  );

  if (!scheduledOccurrence) {
    return;
  }
  const plan = await findStreamAnnouncementPlan({
    guildId: BOT_GUILDS.PROD_ENV,
    streamDateKey: scheduledOccurrence.dateKey,
  });
  const streamUrl =
    plan?.streamUrlOverride ?? scheduledOccurrence.streamUrl ?? null;
  if (!streamUrl || plan?.automaticDecision === 'DECLINED') {
    return;
  }
  const occurrence = { ...scheduledOccurrence, streamUrl };
  const announcementStreamInfo = applyStreamAnnouncementEdits(
    streamInfo,
    occurrence.dateKey,
    { streamUrl },
  );

  await deliverStreamReminders({
    client,
    guildId: BOT_GUILDS.PROD_ENV,
    occurrence,
  });

  const existing = await findStreamAnnouncementByDate(
    BOT_GUILDS.PROD_ENV,
    occurrence.dateKey,
  );
  if (existing) {
    return;
  }

  const channel = await client.channels.fetch(
    PROD_STREAM_ANNOUNCEMENT_CHANNEL_ID,
  );
  if (!canSendMessages(channel)) {
    return;
  }

  const announcement = buildStreamAnnouncementMessages({
    occurrence,
    roleId: PROD_STREAM_ANNOUNCEMENT_ROLE_ID,
    streamInfo: announcementStreamInfo,
  });
  const linkMessage = await channel.send(announcement.link);
  const message = await channel.send(announcement.info);
  await createStreamAnnouncement({
    guildId: BOT_GUILDS.PROD_ENV,
    channelId: PROD_STREAM_ANNOUNCEMENT_CHANNEL_ID,
    messageId: message.id,
    linkMessageId: linkMessage.id,
    streamDateKey: occurrence.dateKey,
    streamInfoJson: serializeStreamAnnouncementSnapshot(announcementStreamInfo),
    streamUrl,
  });
};

export const sendStreamAnnouncementReviewReminder = async (client: Client) => {
  const streamInfo = await getStreamInfo(BOT_GUILDS.PROD_ENV);
  const occurrence = [streamInfo.current, streamInfo.next].find(
    (candidate) => candidate && isStreamAnnouncementReviewDue(candidate),
  );
  if (!occurrence) {
    return;
  }

  const planKey = {
    guildId: BOT_GUILDS.PROD_ENV,
    streamDateKey: occurrence.dateKey,
  };
  const plan = await findStreamAnnouncementPlan(planKey);
  if (plan?.reviewReminderNotifiedAt) {
    return;
  }
  const reviewStreamInfo = plan?.streamUrlOverride
    ? applyStreamAnnouncementEdits(streamInfo, occurrence.dateKey, {
        streamUrl: plan.streamUrlOverride,
      })
    : streamInfo;

  const channel = await client.channels.fetch(
    STAGING_STREAM_ANNOUNCEMENT_CHANNEL_ID,
  );
  if (!canSendMessages(channel)) {
    return;
  }

  const message = await channel.send(
    buildStreamAnnouncementReviewMessage(
      STREAM_ANNOUNCEMENT_REVIEW_USER_ID,
      reviewStreamInfo,
      occurrence,
    ),
  );
  await markStreamAnnouncementReviewSent({
    ...planKey,
    messageId: message.id,
  });
};

export const postStagingStreamAnnouncement = async (client: Client) => {
  const streamInfo = await getStreamInfo(BOT_GUILDS.STAGING_ENV);
  const sourceOccurrence = streamInfo.current ?? streamInfo.next;
  if (!sourceOccurrence) {
    throw new Error('No current or upcoming staging stream was found.');
  }

  const occurrence = {
    ...sourceOccurrence,
    streamUrl: STAGING_STREAM_ANNOUNCEMENT_VIDEO_URL,
    videoTitle: STAGING_STREAM_ANNOUNCEMENT_VIDEO_TITLE,
    streamIsLive: false,
  };
  const previewStreamInfo = streamInfo.current
    ? { ...streamInfo, current: occurrence }
    : { ...streamInfo, next: occurrence };
  const channel = await client.channels.fetch(
    STAGING_STREAM_ANNOUNCEMENT_CHANNEL_ID,
  );
  if (!canSendMessages(channel)) {
    throw new Error('The staging announcement channel is unavailable.');
  }

  const announcement = buildStreamAnnouncementMessages({
    occurrence,
    reminderCustomIdPrefix: STREAM_STAGING_REMINDER_CUSTOM_ID_PREFIX,
    streamInfo: previewStreamInfo,
    userId: STREAM_ANNOUNCEMENT_REVIEW_USER_ID,
  });
  const linkMessage = await channel.send(announcement.link);
  const message = await channel.send(announcement.info);
  await createStreamAnnouncement({
    guildId: BOT_GUILDS.STAGING_ENV,
    channelId: STAGING_STREAM_ANNOUNCEMENT_CHANNEL_ID,
    messageId: message.id,
    linkMessageId: linkMessage.id,
    streamDateKey: occurrence.dateKey,
    streamInfoJson: serializeStreamAnnouncementSnapshot(previewStreamInfo),
    streamUrl: STAGING_STREAM_ANNOUNCEMENT_VIDEO_URL,
  });
};

const editStreamInfoMessage = async ({
  guildId,
  message,
}: {
  guildId: string;
  message: Message;
}) => {
  await message.edit(await buildStreamInfoMessageEdit(guildId));
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

  await sendStreamAnnouncementReviewReminder(client);
  await announcePlannedStreamInfo(client);
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
