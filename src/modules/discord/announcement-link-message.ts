import type { MessageCreateOptions } from 'discord.js';

type BuildAnnouncementLinkMessageInput = {
  url: string;
  roleId?: string | undefined;
  userId?: string | undefined;
};

type AnnouncementLinkMessage = Pick<
  MessageCreateOptions,
  'allowedMentions' | 'content'
>;

const getMention = (roleId?: string, userId?: string) => {
  if (roleId) return `<@&${roleId}>`;
  if (userId) return `<@${userId}>`;
  return null;
};

const getAllowedMentions = (roleId?: string, userId?: string) => {
  if (roleId) return { roles: [roleId] };
  if (userId) return { users: [userId] };
  return { parse: [] };
};

export const buildAnnouncementLinkMessage = ({
  url,
  roleId,
  userId,
}: BuildAnnouncementLinkMessageInput): AnnouncementLinkMessage => ({
  content: [getMention(roleId, userId), url]
    .filter((line) => line !== null)
    .join('\n'),
  allowedMentions: getAllowedMentions(roleId, userId),
});
