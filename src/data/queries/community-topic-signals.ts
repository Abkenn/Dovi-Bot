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

export type CommunityTopicBossUserShareRow = {
  userId: string;
  count: number;
  intensity: number;
  ratio: number;
};

export type CommunityTopicGameBossRow = {
  entityName: string;
  gameName: string;
  count: number;
  intensity: number;
  topUserId: string | null;
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

export const getCommunityTopicBossUserShares = async ({
  guildId,
  entityKey,
}: {
  guildId: string;
  entityKey: string;
}) => {
  const rows = await prisma.communityTopicSignal.groupBy({
    by: ['authorUserId'],
    where: {
      guildId,
      topicKind: 'BOSS',
      entityKey,
    },
    _count: { _all: true },
    _sum: { intensity: true },
    orderBy: [
      { _sum: { intensity: 'desc' } },
      { _count: { authorUserId: 'desc' } },
    ],
  });
  const totalIntensity = rows.reduce(
    (sum, row) => sum + (row._sum.intensity ?? 0),
    0,
  );

  return rows.map((row) => {
    const intensity = row._sum.intensity ?? 0;

    return {
      userId: row.authorUserId,
      count: row._count._all,
      intensity,
      ratio: totalIntensity > 0 ? intensity / totalIntensity : 0,
    };
  });
};

export const getCommunityTopicGameBossStats = async ({
  guildId,
  gameName,
}: {
  guildId: string;
  gameName: string;
}) => {
  const rows = await prisma.$queryRaw<
    {
      entityName: string;
      gameName: string;
      count: bigint;
      intensity: number | null;
      topUserId: string | null;
    }[]
  >`
    with boss_totals as (
      select
        "entityKey",
        "entityName",
        "gameName",
        count(*) as count,
        sum("intensity") as intensity
      from "CommunityTopicSignal"
      where "guildId" = ${guildId}
        and "topicKind" = 'BOSS'
        and "gameName" = ${gameName}
      group by "entityKey", "entityName", "gameName"
    ),
    boss_users as (
      select
        "entityKey",
        "authorUserId",
        sum("intensity") as intensity,
        row_number() over (
          partition by "entityKey"
          order by sum("intensity") desc, count(*) desc
        ) as rank
      from "CommunityTopicSignal"
      where "guildId" = ${guildId}
        and "topicKind" = 'BOSS'
        and "gameName" = ${gameName}
      group by "entityKey", "authorUserId"
    )
    select
      boss_totals."entityName",
      boss_totals."gameName",
      boss_totals.count,
      boss_totals.intensity,
      boss_users."authorUserId" as "topUserId"
    from boss_totals
    left join boss_users
      on boss_users."entityKey" = boss_totals."entityKey"
      and boss_users.rank = 1
    order by boss_totals.intensity desc, boss_totals.count desc
    limit 5
  `;

  return rows.map((row) => ({
    entityName: row.entityName,
    gameName: row.gameName,
    count: Number(row.count),
    intensity: row.intensity ?? 0,
    topUserId: row.topUserId,
  }));
};
