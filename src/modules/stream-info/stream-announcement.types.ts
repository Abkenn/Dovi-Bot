import type { Client } from 'discord.js';
import type { MusicMode, StreamKind } from '../../generated/prisma/client';
import type { StreamInfoResult } from './stream-info.types';

export type StreamAnnouncementEdits = {
  streamKind?: StreamKind;
  musicMode?: MusicMode;
  musicTheme?: string;
  gameName?: string;
  title?: string;
  streamUrl?: string;
};

export type StreamAnnouncementChangeAction = 'UPDATE' | 'PUSH' | 'DELETE';

export type PrepareStreamAnnouncementChangeInput = StreamAnnouncementEdits & {
  action: StreamAnnouncementChangeAction;
  announcementMessageId?: string;
  now?: Date;
  requestedByUserId: string;
};

export type PreparedStreamAnnouncementChange = {
  action: StreamAnnouncementChangeAction;
  requestId: string;
  streamDateKey: string;
  streamInfo: StreamInfoResult;
  streamUrl: string;
  targetGuildId: string;
};

export type ApplyStreamAnnouncementChangeInput = {
  client: Client;
  requestId: string;
  userId: string;
};

export type CreateStreamAnnouncementChangeRequestInput = {
  action: StreamAnnouncementChangeAction;
  channelId: string;
  guildId: string;
  messageId: string | null;
  requestedByUserId: string;
  streamDateKey: string;
  streamInfo: StreamInfoResult;
  streamUrl: string;
};

export type EditTrackedStreamAnnouncementInput = {
  channelId: string;
  client: Client;
  guildId: string;
  linkMessageId?: string | null;
  messageId: string;
  streamDateKey: string;
  streamInfo: StreamInfoResult;
  streamUrl: string;
};

export type RefreshTrackedStreamAnnouncementInput = {
  client: Client;
  guildId: string;
  streamDateKey: string;
};

export type BuildStreamAnnouncementChangePreviewInput = {
  action: StreamAnnouncementChangeAction;
  requestId: string;
  roleId?: string;
  streamInfo: StreamInfoResult;
  streamUrl: string;
};
