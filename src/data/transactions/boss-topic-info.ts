import { BossTopicTermKind as TermKind } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import type {
  CommunityTopicSeedImport,
  UpdateBossGameTopicInfoInput,
  UpsertBossGameTopicTermsInput,
  UpsertBossTopicTermsInput,
} from './boss-topic-info.types';

export type { CommunityTopicSeedImport } from './boss-topic-info.types';

const upsertBossGameTopicTerms = async ({
  tx,
  gameId,
  createdByUserId,
  topicTerms,
}: UpsertBossGameTopicTermsInput) => {
  for (const term of topicTerms) {
    await tx.bossGameTopicTerm.upsert({
      where: {
        gameId_kind_normalizedValue: {
          gameId,
          kind: term.kind,
          normalizedValue: term.normalizedValue,
        },
      },
      update: {
        value: term.value,
        ...(createdByUserId === undefined ? {} : { createdByUserId }),
      },
      create: {
        gameId,
        kind: term.kind,
        value: term.value,
        normalizedValue: term.normalizedValue,
        ...(createdByUserId === undefined ? {} : { createdByUserId }),
      },
    });
  }
};

const upsertBossTopicTerms = async ({
  tx,
  bossId,
  createdByUserId,
  topicTerms,
}: UpsertBossTopicTermsInput) => {
  for (const term of topicTerms) {
    await tx.bossTopicTerm.upsert({
      where: {
        bossId_kind_normalizedValue: {
          bossId,
          kind: term.kind,
          normalizedValue: term.normalizedValue,
        },
      },
      update: {
        value: term.value,
        ...(createdByUserId === undefined ? {} : { createdByUserId }),
      },
      create: {
        bossId,
        kind: term.kind,
        value: term.value,
        normalizedValue: term.normalizedValue,
        ...(createdByUserId === undefined ? {} : { createdByUserId }),
      },
    });
  }
};

export const updateBossGameTopicInfo = async ({
  gameName,
  normalizedGameName,
  canonicalGameName,
  normalizedCanonicalGameName,
  createdByUserId,
  topicTerms,
}: UpdateBossGameTopicInfoInput) =>
  prisma.$transaction(async (tx) => {
    const existingGame = await tx.bossGame.findFirst({
      where: {
        OR: [
          { normalizedName: normalizedGameName },
          {
            topicTerms: {
              some: { normalizedValue: normalizedGameName },
            },
          },
        ],
      },
    });
    const game = existingGame
      ? existingGame.normalizedName === normalizedGameName
        ? await tx.bossGame.update({
            where: { id: existingGame.id },
            data: { name: gameName },
          })
        : existingGame
      : await tx.bossGame.create({
          data: {
            name: gameName,
            normalizedName: normalizedGameName,
          },
        });
    const extraTopicTerms = [...topicTerms];
    let updatedGame = game;

    if (canonicalGameName && normalizedCanonicalGameName) {
      if (normalizedCanonicalGameName !== game.normalizedName) {
        const existingGame = await tx.bossGame.findUnique({
          where: { normalizedName: normalizedCanonicalGameName },
          select: { id: true },
        });

        if (existingGame && existingGame.id !== game.id) {
          throw new Error('Another game already uses that name.');
        }

        extraTopicTerms.push({
          kind: TermKind.ALIAS,
          value: game.name,
          normalizedValue: game.normalizedName,
        });
      }

      updatedGame = await tx.bossGame.update({
        where: { id: game.id },
        data: {
          name: canonicalGameName,
          normalizedName: normalizedCanonicalGameName,
        },
      });
    }

    await upsertBossGameTopicTerms({
      tx,
      gameId: updatedGame.id,
      createdByUserId,
      topicTerms: extraTopicTerms.filter((term) => term.normalizedValue),
    });

    return {
      gameName: updatedGame.name,
      updatedName: Boolean(canonicalGameName),
      addedCount: extraTopicTerms.length,
    };
  });

export const importCommunityTopicSeed = async (
  seed: CommunityTopicSeedImport,
) =>
  prisma.$transaction(
    async (tx) => {
      let gameCount = 0;
      let bossCount = 0;
      let topicTermCount = 0;

      for (const seedGame of seed.games) {
        const game = await tx.bossGame.upsert({
          where: { normalizedName: seedGame.normalizedName },
          update: { name: seedGame.name },
          create: {
            name: seedGame.name,
            normalizedName: seedGame.normalizedName,
          },
        });

        await upsertBossGameTopicTerms({
          tx,
          gameId: game.id,
          topicTerms: seedGame.topicTerms,
        });

        gameCount += 1;
        topicTermCount += seedGame.topicTerms.length;
      }

      for (const seedBoss of seed.bosses) {
        const game = await tx.bossGame.upsert({
          where: { normalizedName: seedBoss.normalizedGameName },
          update: { name: seedBoss.gameName },
          create: {
            name: seedBoss.gameName,
            normalizedName: seedBoss.normalizedGameName,
          },
        });
        const boss = await tx.boss.upsert({
          where: {
            gameId_normalizedName: {
              gameId: game.id,
              normalizedName: seedBoss.normalizedName,
            },
          },
          update: { name: seedBoss.name },
          create: {
            gameId: game.id,
            name: seedBoss.name,
            normalizedName: seedBoss.normalizedName,
          },
        });

        await upsertBossTopicTerms({
          tx,
          bossId: boss.id,
          topicTerms: seedBoss.topicTerms,
        });

        bossCount += 1;
        topicTermCount += seedBoss.topicTerms.length;
      }

      return { gameCount, bossCount, topicTermCount };
    },
    { timeout: 180_000 },
  );
