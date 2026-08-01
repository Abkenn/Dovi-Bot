export type UpsertStreamInfoMessageInput = {
  guildId: string;
  channelId: string;
  messageId: string;
  announcementDateKey?: string | null;
};

export type StreamInfoCommandTarget = {
  guildId: string;
  channelId: string;
};
