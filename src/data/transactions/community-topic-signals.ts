import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import type {
  CommunityTopicMatch,
  CommunityTopicMessageInput,
} from '../../modules/community-topics/community-topic.types';

export const upsertCommunityTopicMessageSignals = async ({
  input,
  contentHash,
  matches,
}: {
  input: CommunityTopicMessageInput;
  contentHash: string;
  matches: CommunityTopicMatch[];
}) =>
  prisma.$transaction(async (tx) => {
    const scan = await tx.communityTopicMessageScan.upsert({
      where: { messageId: input.messageId },
      update: {
        guildId: input.guildId,
        channelId: input.channelId,
        authorUserId: input.authorUserId,
        messageCreatedAt: input.messageCreatedAt,
        contentHash,
        source: input.source,
        signalCount: matches.length,
        analyzedAt: new Date(),
      },
      create: {
        guildId: input.guildId,
        channelId: input.channelId,
        messageId: input.messageId,
        authorUserId: input.authorUserId,
        messageCreatedAt: input.messageCreatedAt,
        contentHash,
        source: input.source,
        signalCount: matches.length,
      },
    });

    await tx.communityTopicSignal.deleteMany({
      where: { scanId: scan.id },
    });

    if (matches.length === 0) {
      return scan;
    }

    await tx.communityTopicSignal.createMany({
      data: matches.map((match) => ({
        scanId: scan.id,
        guildId: input.guildId,
        channelId: input.channelId,
        messageId: input.messageId,
        authorUserId: input.authorUserId,
        messageCreatedAt: input.messageCreatedAt,
        topicKind: match.topicKind,
        entityKey: match.entityKey,
        entityName: match.entityName,
        gameName: match.gameName,
        matchedAliases: match.matchedAliases as Prisma.InputJsonValue,
        matchedWeakAliases: match.matchedWeakAliases as Prisma.InputJsonValue,
        contextWords: match.contextWords as Prisma.InputJsonValue,
        confidence: match.confidence,
        intensity: match.intensity,
      })),
    });

    return scan;
  });
