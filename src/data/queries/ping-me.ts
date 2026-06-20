import { prisma } from '../../lib/prisma';

type PingMeProfileKey = {
  userId: string;
  sourceGuildId: string;
};

type UpsertPingMeProfileInput = PingMeProfileKey & {
  keywords: string[];
};

export const findPingMeProfile = (key: PingMeProfileKey) =>
  prisma.pingMeSubscription.findUnique({
    where: {
      userId_sourceGuildId: key,
    },
  });

export const upsertPingMeProfile = (input: UpsertPingMeProfileInput) =>
  prisma.pingMeSubscription.upsert({
    where: {
      userId_sourceGuildId: {
        userId: input.userId,
        sourceGuildId: input.sourceGuildId,
      },
    },
    update: {
      keywords: input.keywords,
    },
    create: input,
  });

export const deletePingMeProfile = (key: PingMeProfileKey) =>
  prisma.pingMeSubscription.deleteMany({
    where: key,
  });

export const findPingMeProfilesForSources = (sourceGuildIds: string[]) => {
  if (sourceGuildIds.length === 0) {
    return [];
  }

  return prisma.pingMeSubscription.findMany({
    where: {
      sourceGuildId: {
        in: sourceGuildIds,
      },
    },
    select: {
      userId: true,
      sourceGuildId: true,
      keywords: true,
    },
  });
};
