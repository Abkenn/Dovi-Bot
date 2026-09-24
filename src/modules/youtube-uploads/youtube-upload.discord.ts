import type { MessageCreateOptions } from 'discord.js';
import type { BuildYouTubeUploadAnnouncementInput } from './youtube-upload.types';

export const buildYouTubeUploadAnnouncement = ({
  roleId,
  url,
}: BuildYouTubeUploadAnnouncementInput): MessageCreateOptions => ({
  content: `<@&${roleId}>\n${url}`,
  allowedMentions: { roles: [roleId] },
});
