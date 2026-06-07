import type { BossTopicTermKind } from '../../generated/prisma/enums';
import type { PrismaTransactionClient } from '../../types/prisma/types';

export type BossTopicTermInput = {
  kind: BossTopicTermKind;
  value: string;
  normalizedValue: string;
};

export type UpsertBossGameTopicTermsInput = {
  tx: PrismaTransactionClient;
  gameId: string;
  createdByUserId?: string;
  topicTerms: BossTopicTermInput[];
};

export type UpsertBossTopicTermsInput = {
  tx: PrismaTransactionClient;
  bossId: string;
  createdByUserId?: string;
  topicTerms: BossTopicTermInput[];
};

export type UpdateBossGameTopicInfoInput = {
  gameName: string;
  normalizedGameName: string;
  canonicalGameName?: string;
  normalizedCanonicalGameName?: string;
  createdByUserId: string;
  topicTerms: BossTopicTermInput[];
};

export type CommunityTopicSeedImport = {
  games: {
    name: string;
    normalizedName: string;
    topicTerms: BossTopicTermInput[];
  }[];
  bosses: {
    gameName: string;
    normalizedGameName: string;
    name: string;
    normalizedName: string;
    topicTerms: BossTopicTermInput[];
  }[];
};
