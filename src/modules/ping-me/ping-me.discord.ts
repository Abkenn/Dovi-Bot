import {
  ChannelType,
  escapeMarkdown,
  type GuildMember,
  type Message,
  PermissionFlagsBits,
} from 'discord.js';
import { BOT_GUILDS } from '../../config/discord-access';
import { shouldForwardPingMeMessage } from './ping-me.matcher';
import type { PingMeNotification } from './ping-me.types';

const getChannelLabel = (message: Message<true>) => {
  if ('name' in message.channel) {
    return `#${escapeMarkdown(message.channel.name)}`;
  }

  return 'that channel';
};

const getAuthorLabel = (message: Message<true>) =>
  escapeMarkdown(message.member?.displayName ?? message.author.displayName);

const formatMatchedKeywords = (notification: PingMeNotification) =>
  notification.matchedKeywords
    .map((keyword) => `"${escapeMarkdown(keyword)}"`)
    .join(', ');

const canViewPrivateThread = async (
  message: Message<true>,
  member: GuildMember,
) => {
  if (
    !message.channel.isThread() ||
    message.channel.type !== ChannelType.PrivateThread
  ) {
    return true;
  }

  try {
    await message.channel.members.fetch(member.id);
    return true;
  } catch {
    return false;
  }
};

const canAccessMessage = async (
  message: Message<true>,
  member: GuildMember,
) => {
  const permissions = message.channel.permissionsFor(member);
  const hasReadPermissions = permissions?.has([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
  ]);

  if (!hasReadPermissions) {
    return false;
  }

  return canViewPrivateThread(message, member);
};

type PlainPingMeDmInput = {
  message: Message<true>;
  notification: PingMeNotification;
  isTestNotification: boolean;
  canAccess: boolean;
};

const guildBoundary = {
  stagingGuildId: BOT_GUILDS.STAGING_ENV,
  prodGuildId: BOT_GUILDS.PROD_ENV,
};

const sendPlainPingMeDm = async ({
  message,
  notification,
  isTestNotification,
  canAccess,
}: PlainPingMeDmInput) => {
  const user = await message.client.users.fetch(notification.userId);
  const prefix = isTestNotification ? '**Ping-me test:**' : '**Ping-me:**';
  const accessNote =
    !isTestNotification && !canAccess
      ? "\nThe original message isn't included because you cannot access it."
      : '';

  await user.send(
    prefix +
      ' ' +
      getAuthorLabel(message) +
      ' mentioned ' +
      formatMatchedKeywords(notification) +
      ' in ' +
      getChannelLabel(message) +
      '.' +
      accessNote,
  );
};

export const sendPingMeNotification = async (
  message: Message<true>,
  notification: PingMeNotification,
) => {
  const canForward = shouldForwardPingMeMessage(message.guildId, guildBoundary);

  if (!canForward) {
    await sendPlainPingMeDm({
      message,
      notification,
      isTestNotification: true,
      canAccess: true,
    });
    return;
  }

  let member: GuildMember | null = null;

  try {
    member = await message.guild.members.fetch(notification.userId);
  } catch {
    member = null;
  }

  const canAccess = member ? await canAccessMessage(message, member) : false;

  if (!canAccess) {
    await sendPlainPingMeDm({
      message,
      notification,
      isTestNotification: false,
      canAccess: false,
    });
    return;
  }

  const user = await message.client.users.fetch(notification.userId);
  const dm = await user.createDM();

  try {
    await message.forward(dm);
  } catch {
    await user.send(
      '**Ping-me:** ' +
        getAuthorLabel(message) +
        ' mentioned ' +
        formatMatchedKeywords(notification) +
        ' in ' +
        getChannelLabel(message) +
        '. [Open message](' +
        message.url +
        ')',
    );
  }
};
