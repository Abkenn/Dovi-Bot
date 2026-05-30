import { prisma } from '../../lib/prisma';

export const areCommunityTopicCatalogTablesPresent = async () => {
  const tables = await prisma.$queryRaw<{ tableName: string | null }[]>`
    select to_regclass('public."BossGame"')::text as "tableName"
    union all
    select to_regclass('public."Boss"')::text as "tableName"
    union all
    select to_regclass('public."BossTopicTerm"')::text as "tableName"
    union all
    select to_regclass('public."BossGameTopicTerm"')::text as "tableName"
  `;

  return tables.every((table) => table.tableName !== null);
};

export const findCommunityTopicCatalog = () =>
  prisma.bossGame.findMany({
    orderBy: { name: 'asc' },
    include: {
      topicTerms: {
        orderBy: { value: 'asc' },
      },
      bosses: {
        orderBy: { name: 'asc' },
        include: {
          topicTerms: {
            orderBy: { value: 'asc' },
          },
        },
      },
    },
  });

export type CommunityTopicCatalog = Awaited<
  ReturnType<typeof findCommunityTopicCatalog>
>;
