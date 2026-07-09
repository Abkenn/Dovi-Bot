export type RecentLogInput = {
  guildId: string;
  channelId: string;
  channelName: string | null;
  messageId: string;
  authorUserId: string;
  authorUsername: string | null;
  content: string;
  messageCreatedAt: Date;
};

export type DeletedLogInput = {
  guildId: string;
  channelId: string;
  channelName: string | null;
  messageId: string;
  authorUserId: string | null;
  authorUsername: string | null;
  content: string | null;
  messageCreatedAt: Date | null;
  deletedAt: Date;
};
