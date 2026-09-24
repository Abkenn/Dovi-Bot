import { buildAnnouncementLinkMessage } from '../discord/announcement-link-message';
import type { BuildYouTubeUploadAnnouncementInput } from './youtube-upload.types';

export const buildYouTubeUploadAnnouncement = ({
  roleId,
  url,
}: BuildYouTubeUploadAnnouncementInput) =>
  buildAnnouncementLinkMessage({ url, roleId });
