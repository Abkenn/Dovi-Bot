import {
  areCommunityTopicTablesPresent,
  getCommunityTopicSignalStats,
} from '../../data/queries/community-topic-signals';
import { upsertCommunityTopicMessageSignals } from '../../data/transactions/community-topic-signals';
import type { CommunityTopicMessageInput } from './community-topic.types';
import { getCommunityTopicMatcher } from './community-topic-matcher';

export const recordCommunityTopicMessage = async (
  input: CommunityTopicMessageInput,
) => {
  if (!input.content.trim()) {
    return { matchCount: 0, skipped: true };
  }

  const matcher = getCommunityTopicMatcher();
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
