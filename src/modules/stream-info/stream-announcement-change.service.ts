import {
  completeStreamAnnouncementChangeRequest,
  createStreamAnnouncement,
  createStreamAnnouncementChangeRequest,
  deleteStreamAnnouncementByMessageId,
  findPendingStreamAnnouncementChangeRequest,
  findStreamAnnouncementByDate,
  findStreamAnnouncementByMessageId,
  findStreamAnnouncementPlan,
  setStreamAnnouncementDecision,
  updateStreamAnnouncementSnapshot,
  upsertStreamAnnouncementUrlOverride,
} from '@data/queries/stream-announcement';
import type {
  Message,
  MessageCreateOptions,
  MessageEditOptions,
  MessageManager,
} from 'discord.js';
import { BOT_GUILDS } from '../../config/discord-access';
import {
  PROD_STREAM_ANNOUNCEMENT_CHANNEL_ID,
  PROD_STREAM_ANNOUNCEMENT_ROLE_ID,
} from './stream-announcement.config';
import {
  deserializeStreamAnnouncementSnapshot,
  serializeStreamAnnouncementSnapshot,
} from './stream-announcement.snapshot';
import type {
  ApplyStreamAnnouncementChangeInput,
  CreateStreamAnnouncementChangeRequestInput,
  EditTrackedStreamAnnouncementInput,
  PreparedStreamAnnouncementChange,
  PrepareStreamAnnouncementChangeInput,
  StreamAnnouncementEdits,
} from './stream-announcement.types';
import {
  applyStreamAnnouncementEdits,
  findEditableStreamAnnouncementOccurrence,
} from './stream-announcement.utils';
import { buildStreamAnnouncementMessage } from './stream-info.discord';
import { getStreamInfo, setStreamInfo } from './stream-info.service';
import type { StreamInfoResult, StreamOccurrence } from './stream-info.types';

const UPDATE_LEAD_MS = 60 * 60 * 1000;

type MessageBackedChannel = { messages: MessageManager };
type SendableChannel = {
  send: (options: MessageCreateOptions) => Promise<Message>;
};

const hasMessages = (channel: unknown): channel is MessageBackedChannel =>
  typeof channel === 'object' && channel !== null && 'messages' in channel;

const canSendMessages = (channel: unknown): channel is SendableChannel =>
  typeof channel === 'object' && channel !== null && 'send' in channel;

const getEdits = (
  input: PrepareStreamAnnouncementChangeInput,
): StreamAnnouncementEdits => {
  const edits: StreamAnnouncementEdits = {};
  if (input.streamKind) edits.streamKind = input.streamKind;
  if (input.musicMode) edits.musicMode = input.musicMode;
  if (input.musicTheme) edits.musicTheme = input.musicTheme;
  if (input.gameName) edits.gameName = input.gameName;
  if (input.title) edits.title = input.title;
  if (input.streamUrl) edits.streamUrl = input.streamUrl;
  return edits;
};

const getOccurrence = (
  streamInfo: StreamInfoResult,
  streamDateKey: string,
): StreamOccurrence => {
  const occurrence = [
    streamInfo.current,
    streamInfo.previous,
    streamInfo.next,
  ].find((candidate) => candidate?.dateKey === streamDateKey);
  if (!occurrence) {
    throw new Error('The stored announcement no longer has its stream data.');
  }
  return occurrence;
};

const createRequest = async ({
  action,
  channelId,
  guildId,
  messageId,
  streamDateKey,
  requestedByUserId,
  streamInfo,
  streamUrl,
}: CreateStreamAnnouncementChangeRequestInput): Promise<PreparedStreamAnnouncementChange> => {
  const request = await createStreamAnnouncementChangeRequest({
    requestedByUserId,
    action,
    targetGuildId: guildId,
    targetChannelId: channelId,
    targetMessageId: messageId,
    streamDateKey,
    streamUrl,
    streamInfoJson: serializeStreamAnnouncementSnapshot(streamInfo),
  });

  return {
    action,
    requestId: request.id,
    streamDateKey,
    streamInfo,
    streamUrl,
    targetGuildId: guildId,
  };
};

const prepareExistingMessageChange = async (
  input: PrepareStreamAnnouncementChangeInput,
  messageId: string,
) => {
  const record = await findStreamAnnouncementByMessageId(messageId);
  if (!record) {
    throw new Error(
      'That announcement message is not tracked in staging or prod.',
    );
  }
  const stored = deserializeStreamAnnouncementSnapshot(record.streamInfoJson);
  const streamInfo = applyStreamAnnouncementEdits(
    stored,
    record.streamDateKey,
    getEdits(input),
  );
  const occurrence = getOccurrence(streamInfo, record.streamDateKey);

  return createRequest({
    action: input.action,
    channelId: record.channelId,
    guildId: record.guildId,
    messageId: record.messageId,
    requestedByUserId: input.requestedByUserId,
    streamDateKey: record.streamDateKey,
    streamInfo,
    streamUrl: occurrence.streamUrl ?? record.streamUrl,
  });
};

const getImplicitOccurrence = async (
  action: PrepareStreamAnnouncementChangeInput['action'],
  streamInfo: StreamInfoResult,
  now: Date,
) => {
  if (action === 'PUSH') {
    return streamInfo.current ?? streamInfo.next ?? streamInfo.previous;
  }
  return findEditableStreamAnnouncementOccurrence(streamInfo, now);
};

export const prepareStreamAnnouncementChange = async (
  input: PrepareStreamAnnouncementChangeInput,
): Promise<PreparedStreamAnnouncementChange> => {
  if (input.announcementMessageId) {
    if (input.action === 'PUSH') {
      throw new Error('Manual push does not use announcement_message.');
    }
    return prepareExistingMessageChange(input, input.announcementMessageId);
  }
  if (input.action === 'DELETE') {
    throw new Error('Delete requires announcement_message.');
  }

  const now = input.now ?? new Date();
  const streamInfo = await getStreamInfo(BOT_GUILDS.PROD_ENV);
  const occurrence = await getImplicitOccurrence(input.action, streamInfo, now);
  if (!occurrence) {
    const upcoming = streamInfo.next;
    if (
      input.action === 'UPDATE' &&
      upcoming &&
      now.getTime() < upcoming.startAt.getTime() - UPDATE_LEAD_MS
    ) {
      throw new Error(
        'It is too early to update the incoming announcement. Try again within one hour of the stream.',
      );
    }
    throw new Error(
      'Provide announcement_message with the message ID you want to update.',
    );
  }

  const existing = await findStreamAnnouncementByDate(
    BOT_GUILDS.PROD_ENV,
    occurrence.dateKey,
  );
  if (existing && input.action === 'UPDATE') {
    return prepareExistingMessageChange(input, existing.messageId);
  }
  if (
    input.action === 'UPDATE' &&
    now.getTime() >= occurrence.startAt.getTime()
  ) {
    throw new Error(
      'Provide announcement_message with the message ID you want to update.',
    );
  }

  const plan = await findStreamAnnouncementPlan({
    guildId: BOT_GUILDS.PROD_ENV,
    streamDateKey: occurrence.dateKey,
  });
  const edits = getEdits(input);
  const updatedStreamInfo = applyStreamAnnouncementEdits(
    streamInfo,
    occurrence.dateKey,
    edits,
  );
  const updatedOccurrence = getOccurrence(
    updatedStreamInfo,
    occurrence.dateKey,
  );
  const streamUrl =
    updatedOccurrence.streamUrl ?? plan?.streamUrlOverride ?? null;
  if (!streamUrl && input.action === 'PUSH') {
    throw new Error('Add stream_url before manually pushing the announcement.');
  }

  return createRequest({
    action: input.action,
    channelId: PROD_STREAM_ANNOUNCEMENT_CHANNEL_ID,
    guildId: BOT_GUILDS.PROD_ENV,
    messageId: null,
    requestedByUserId: input.requestedByUserId,
    streamDateKey: occurrence.dateKey,
    streamInfo: updatedStreamInfo,
    streamUrl: streamUrl ?? '',
  });
};

const applyIncomingUpdate = async (
  streamInfo: StreamInfoResult,
  streamDateKey: string,
  streamUrl: string,
) => {
  const updatedStreamInfo = applyStreamAnnouncementEdits(
    streamInfo,
    streamDateKey,
    { streamUrl },
  );
  const occurrence = getOccurrence(updatedStreamInfo, streamDateKey);
  await setStreamInfo({
    guildId: BOT_GUILDS.PROD_ENV,
    streamKind: occurrence.streamKind,
    musicMode: occurrence.musicMode,
    musicTheme: occurrence.musicTheme,
    gameName: occurrence.gameName,
    title: occurrence.customTitle,
  });
  if (streamUrl) {
    await upsertStreamAnnouncementUrlOverride(
      { guildId: BOT_GUILDS.PROD_ENV, streamDateKey },
      streamUrl,
    );
  }
};

const editTrackedAnnouncement = async ({
  channelId,
  client,
  guildId,
  messageId,
  streamDateKey,
  streamInfo,
  streamUrl,
}: EditTrackedStreamAnnouncementInput) => {
  const channel = await client.channels.fetch(channelId);
  if (!hasMessages(channel)) {
    throw new Error('The announcement channel is unavailable.');
  }
  const updatedStreamInfo = applyStreamAnnouncementEdits(
    streamInfo,
    streamDateKey,
    { streamUrl },
  );
  const occurrence = getOccurrence(updatedStreamInfo, streamDateKey);
  const announcementInput = {
    occurrence: { ...occurrence, streamUrl },
    streamInfo: updatedStreamInfo,
  };
  const announcement =
    guildId === BOT_GUILDS.PROD_ENV
      ? buildStreamAnnouncementMessage({
          ...announcementInput,
          roleId: PROD_STREAM_ANNOUNCEMENT_ROLE_ID,
        })
      : buildStreamAnnouncementMessage(announcementInput);
  const payload = {
    ...announcement,
    allowedMentions: { parse: [] },
  } satisfies MessageEditOptions;
  const message = await channel.messages.fetch(messageId);
  await message.edit(payload);
  await updateStreamAnnouncementSnapshot({
    messageId,
    streamInfoJson: serializeStreamAnnouncementSnapshot(updatedStreamInfo),
    streamUrl,
  });
};

export const applyStreamAnnouncementChange = async ({
  client,
  requestId,
  userId,
}: ApplyStreamAnnouncementChangeInput) => {
  const request = await findPendingStreamAnnouncementChangeRequest(
    requestId,
    userId,
  );
  if (!request) {
    throw new Error('This announcement change is no longer available.');
  }
  const streamInfo = deserializeStreamAnnouncementSnapshot(
    request.streamInfoJson,
  );
  const occurrence = getOccurrence(streamInfo, request.streamDateKey);

  if (request.action === 'UPDATE' && !request.targetMessageId) {
    await applyIncomingUpdate(
      streamInfo,
      request.streamDateKey,
      request.streamUrl,
    );
    const posted = await findStreamAnnouncementByDate(
      BOT_GUILDS.PROD_ENV,
      request.streamDateKey,
    );
    if (posted) {
      await editTrackedAnnouncement({
        channelId: posted.channelId,
        client,
        guildId: posted.guildId,
        messageId: posted.messageId,
        streamDateKey: request.streamDateKey,
        streamInfo,
        streamUrl: request.streamUrl || posted.streamUrl,
      });
    }
  } else {
    const channel = await client.channels.fetch(request.targetChannelId);

    if (request.action === 'PUSH') {
      if (!canSendMessages(channel)) {
        throw new Error('The announcement channel is unavailable.');
      }
      const message = await channel.send(
        buildStreamAnnouncementMessage({
          occurrence: { ...occurrence, streamUrl: request.streamUrl },
          roleId: PROD_STREAM_ANNOUNCEMENT_ROLE_ID,
          streamInfo,
        }),
      );
      await createStreamAnnouncement({
        guildId: request.targetGuildId,
        channelId: request.targetChannelId,
        messageId: message.id,
        streamDateKey: request.streamDateKey,
        streamUrl: request.streamUrl,
        streamInfoJson: request.streamInfoJson,
      });
    } else {
      const targetMessageId = request.targetMessageId;
      if (!targetMessageId || !hasMessages(channel)) {
        throw new Error('The announcement channel is unavailable.');
      }

      if (request.action === 'DELETE') {
        const message = await channel.messages.fetch(targetMessageId);
        await message.delete();
        await deleteStreamAnnouncementByMessageId(targetMessageId);
        await setStreamAnnouncementDecision({
          guildId: request.targetGuildId,
          streamDateKey: request.streamDateKey,
          decision: 'DECLINED',
        });
      } else {
        await editTrackedAnnouncement({
          channelId: request.targetChannelId,
          client,
          guildId: request.targetGuildId,
          messageId: targetMessageId,
          streamDateKey: request.streamDateKey,
          streamInfo,
          streamUrl: request.streamUrl,
        });
      }
    }
  }

  await completeStreamAnnouncementChangeRequest(request.id, 'APPLIED');
  return request.action;
};

export const declineStreamAnnouncementChange = async (
  requestId: string,
  userId: string,
) => {
  const request = await findPendingStreamAnnouncementChangeRequest(
    requestId,
    userId,
  );
  if (!request) {
    throw new Error('This announcement change is no longer available.');
  }
  await completeStreamAnnouncementChangeRequest(request.id, 'DECLINED');
};
