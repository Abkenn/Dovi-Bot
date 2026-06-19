export type UpsertStreamInfoMessageInput = {
  guildId: string;
  channelId: string;
  messageId: string;
};

export type StreamInfoCommandTarget = {
  guildId: string;
  channelId: string;
};
