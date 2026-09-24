import type {
  Client,
  Collection,
  Message,
  MessageCreateOptions,
  MessageManager,
  Snowflake,
} from 'discord.js';
import { DateTime } from 'luxon';
import {
  PROD_STREAM_ANNOUNCEMENT_CHANNEL_ID,
  PROD_STREAM_ANNOUNCEMENT_ROLE_ID,
} from '../stream-info/stream-announcement.config';
import { getRecentYouTubeUploads } from './youtube-upload.api';
import { buildYouTubeUploadAnnouncement } from './youtube-upload.discord';

const UPLOAD_CATCH_UP_HOURS = 24;
const RECENT_MESSAGE_LIMIT = 100;

type MessageBackedChannel = { messages: MessageManager };
type SendableChannel = {
  send: (options: MessageCreateOptions) => Promise<Message>;
};

const hasMessages = (channel: unknown): channel is MessageBackedChannel =>
  typeof channel === 'object' && channel !== null && 'messages' in channel;

const canSendMessages = (channel: unknown): channel is SendableChannel =>
  typeof channel === 'object' && channel !== null && 'send' in channel;

export const announceNewYouTubeUploads = async (
  client: Client,
  now: DateTime = DateTime.utc(),
) => {
  const uploads = await getRecentYouTubeUploads();
  const latestPublishedAt = uploads.reduce<Date | null>(
    (latest, upload) =>
      !latest || upload.publishedAt > latest ? upload.publishedAt : latest,
    null,
  );
  const cutoff = now.minus({ hours: UPLOAD_CATCH_UP_HOURS }).toMillis();
  const recentUploads = uploads
    .filter((upload) => upload.publishedAt.getTime() >= cutoff)
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  if (recentUploads.length === 0) {
    return latestPublishedAt;
  }

  const channel = await client.channels.fetch(
    PROD_STREAM_ANNOUNCEMENT_CHANNEL_ID,
  );
  if (!hasMessages(channel) || !canSendMessages(channel)) {
    throw new Error('The YouTube upload announcement channel is unavailable.');
  }

  const messages = (await channel.messages.fetch({
    limit: RECENT_MESSAGE_LIMIT,
  })) as Collection<Snowflake, Message>;
  const existingContents = Array.from(
    messages.values(),
    ({ content }) => content,
  );

  for (const upload of recentUploads) {
    if (existingContents.some((content) => content.includes(upload.url))) {
      continue;
    }

    await channel.send(
      buildYouTubeUploadAnnouncement({
        roleId: PROD_STREAM_ANNOUNCEMENT_ROLE_ID,
        url: upload.url,
      }),
    );
    existingContents.push(upload.url);
  }

  return latestPublishedAt;
};
