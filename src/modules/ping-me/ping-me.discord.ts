import {
  ChannelType,
  type GuildMember,
  type Message,
  PermissionFlagsBits,
} from 'discord.js';
import { buildPingMeDmOptions } from './ping-me.discord-message';
import type { PingMeNotification } from './ping-me.types';

const getAuthorLabel = (message: Message<true>) =>
  message.member?.displayName ?? message.author.displayName;

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

export const sendPingMeNotification = async (
  message: Message<true>,
  notification: PingMeNotification,
) => {
  let member: GuildMember | null = null;

  try {
    member = await message.guild.members.fetch(notification.userId);
  } catch {
    member = null;
  }

  const canAccess = member ? await canAccessMessage(message, member) : false;
  const user = await message.client.users.fetch(notification.userId);

  await user.send(
    buildPingMeDmOptions({
      authorLabel: getAuthorLabel(message),
      matchedKeyword: notification.matchedKeyword,
      channelId: message.channelId,
      messageUrl: message.url,
      canAccess,
    }),
  );
};
