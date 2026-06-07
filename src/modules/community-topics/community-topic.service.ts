import {
  areCommunityTopicTablesPresent,
  getCommunityTopicBossUserShares,
  getCommunityTopicGameBossStats,
  getCommunityTopicSignalStats,
} from '../../data/queries/community-topic-signals';
import { upsertCommunityTopicMessageSignals } from '../../data/transactions/community-topic-signals';
import type {
  GetCommunityTopicBossDiscussionStatsInput,
  GetCommunityTopicGameDiscussionStatsInput,
} from './community-topic.service.types';
import type { CommunityTopicMessageInput } from './community-topic.types';
import {
  getCommunityTopicMatcher,
  toCommunityTopicEntityKey,
} from './community-topic-matcher';

export const recordCommunityTopicMessage = async (
  input: CommunityTopicMessageInput,
) => {
  if (!input.content.trim()) {
    return { matchCount: 0, skipped: true };
  }

  const matcher = await getCommunityTopicMatcher();

  if (!matcher) {
    return { matchCount: 0, skipped: true };
  }

  const matches = matcher.matchContent(input.content);

  if (matches.length === 0) {
    return { matchCount: 0, skipped: true };
  }

  await upsertCommunityTopicMessageSignals({
    input,
    contentHash: matcher.getContentHash(input.content),
    matches,
  });

  return {
    matchCount: matches.length,
    skipped: false,
  };
};

export const getCommunityTopicStats = async (guildId: string) => {
  const tablesPresent = await areCommunityTopicTablesPresent();

  if (!tablesPresent) {
    return null;
  }

  return getCommunityTopicSignalStats(guildId);
};

export const getCommunityTopicBossDiscussionStats = async ({
  guildId,
  gameName,
  bossName,
}: GetCommunityTopicBossDiscussionStatsInput) => {
  const tablesPresent = await areCommunityTopicTablesPresent();

  if (!tablesPresent) {
    return null;
  }

  const entityKey = `${toCommunityTopicEntityKey(
    gameName,
  )}:${toCommunityTopicEntityKey(bossName)}`;
  const users = await getCommunityTopicBossUserShares({
    guildId,
    entityKey,
  });
  const totalCount = users.reduce((sum, user) => sum + user.count, 0);
  const totalIntensity = users.reduce((sum, user) => sum + user.intensity, 0);

  return {
    gameName,
    bossName,
    entityKey,
    totalCount,
    totalIntensity,
    users,
  };
};

export const getCommunityTopicGameDiscussionStats = async ({
  guildId,
  gameName,
}: GetCommunityTopicGameDiscussionStatsInput) => {
  const tablesPresent = await areCommunityTopicTablesPresent();

  if (!tablesPresent) {
    return null;
  }

  return {
    gameName,
    bosses: await getCommunityTopicGameBossStats({
      guildId,
      gameName,
    }),
  };
};
