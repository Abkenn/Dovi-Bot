export const COMMUNITY_TOPIC_KINDS = {
  BOSS: 'BOSS',
  GAME: 'GAME',
} as const;

export type CommunityTopicKind =
  (typeof COMMUNITY_TOPIC_KINDS)[keyof typeof COMMUNITY_TOPIC_KINDS];

export type CommunityTopicSeed = {
  games: CommunityTopicSeedGame[];
  bosses: CommunityTopicSeedBoss[];
};

export type CommunityTopicSeedGame = {
  canonicalName: string;
  aliases: string[];
};

export type CommunityTopicSeedBoss = {
  canonicalName: string;
  game: string;
  aliases: string[];
  weakAliases: string[];
  contextWords: string[];
  notes: string;
};

export type CommunityTopicMatch = {
  topicKind: CommunityTopicKind;
  entityKey: string;
  entityName: string;
  gameName: string | null;
  matchedAliases: string[];
  matchedWeakAliases: string[];
  contextWords: string[];
  confidence: number;
  intensity: number;
};

export type CommunityTopicMessageInput = {
  guildId: string;
  channelId: string;
  messageId: string;
  authorUserId: string;
  messageCreatedAt: Date;
  content: string;
  source: 'BACKFILL' | 'REALTIME';
};
