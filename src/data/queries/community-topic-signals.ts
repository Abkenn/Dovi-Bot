import { prisma } from '../../lib/prisma';

export type CommunityTopicStatRow = {
  entityName: string;
  gameName: string | null;
  count: number;
  intensity: number;
};

export type CommunityTopicUserStatRow = {
  userId: string;
  count: number;
  intensity: number;
};

export type CommunityTopicUserEntityStatRow = CommunityTopicUserStatRow & {
  entityName: string;
  gameName: string | null;
};

type CommunityTopicRawStatRow = {
  entityName: string;
  gameName: string | null;
  count: bigint;
  intensity: number | null;
};

type CommunityTopicRawUserStatRow = {
  userId: string;
  count: bigint;
  intensity: number | null;
};

type CommunityTopicRawUserEntityStatRow = CommunityTopicRawUserStatRow & {
  entityName: string;
  gameName: string | null;
};

const toStatRow = (row: CommunityTopicRawStatRow): CommunityTopicStatRow => ({
  entityName: row.entityName,
  gameName: row.gameName,
  count: Number(row.count),
  intensity: row.intensity ?? 0,
});

const toUserStatRow = (
  row: CommunityTopicRawUserStatRow,
): CommunityTopicUserStatRow => ({
  userId: row.userId,
  count: Number(row.count),
  intensity: row.intensity ?? 0,
});

const toUserEntityStatRow = (
  row: CommunityTopicRawUserEntityStatRow,
): CommunityTopicUserEntityStatRow => ({
  userId: row.userId,
  entityName: row.entityName,
  gameName: row.gameName,
  count: Number(row.count),
  intensity: row.intensity ?? 0,
});

export const areCommunityTopicTablesPresent = async () => {
  const schemaObjects = await prisma.$queryRaw<{ objectName: string | null }[]>`
    select to_regclass('public."CommunityTopicMessageScan"')::text as "objectName"
    union all
    select to_regclass('public."CommunityTopicSignal"')::text as "objectName"
  `;

  return (
    schemaObjects.length === 2 &&
    schemaObjects.every((object) => object.objectName !== null)
  );
};

export const getCommunityTopicSignalStats = async (guildId: string) => {
  const [games, bosses, users, userBosses, userGames] = await Promise.all([
    prisma.$queryRaw<CommunityTopicRawStatRow[]>`
      select "entityName", "gameName", count(*) as count, sum("intensity") as intensity
      from "CommunityTopicSignal"
      where "guildId" = ${guildId}
        and "topicKind" = 'GAME'
      group by "entityName", "gameName"
      order by intensity desc, count desc
      limit 10
    `,
    prisma.$queryRaw<CommunityTopicRawStatRow[]>`
      select "entityName", "gameName", count(*) as count, sum("intensity") as intensity
      from "CommunityTopicSignal"
      where "guildId" = ${guildId}
        and "topicKind" = 'BOSS'
      group by "entityName", "gameName"
      order by intensity desc, count desc
      limit 10
    `,
    prisma.$queryRaw<CommunityTopicRawUserStatRow[]>`
      select "authorUserId" as "userId", count(*) as count, sum("intensity") as intensity
      from "CommunityTopicSignal"
      where "guildId" = ${guildId}
      group by "authorUserId"
      order by intensity desc, count desc
      limit 10
    `,
    prisma.$queryRaw<CommunityTopicRawUserEntityStatRow[]>`
      select "authorUserId" as "userId", "entityName", "gameName", count(*) as count, sum("intensity") as intensity
      from "CommunityTopicSignal"
      where "guildId" = ${guildId}
        and "topicKind" = 'BOSS'
      group by "authorUserId", "entityName", "gameName"
      order by intensity desc, count desc
      limit 10
    `,
    prisma.$queryRaw<CommunityTopicRawUserEntityStatRow[]>`
      select "authorUserId" as "userId", "entityName", "gameName", count(*) as count, sum("intensity") as intensity
      from "CommunityTopicSignal"
      where "guildId" = ${guildId}
        and "topicKind" = 'GAME'
      group by "authorUserId", "entityName", "gameName"
      order by intensity desc, count desc
      limit 10
    `,
  ]);

  return {
    games: games.map(toStatRow),
    bosses: bosses.map(toStatRow),
    users: users.map(toUserStatRow),
    userBosses: userBosses.map(toUserEntityStatRow),
    userGames: userGames.map(toUserEntityStatRow),
  };
};
