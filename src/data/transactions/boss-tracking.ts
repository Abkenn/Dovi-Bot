import {
  BossTrackingAttemptResult,
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { getElapsedSeconds } from '../../lib/time.utils';
import { hasDurableBossData, hasDurableGameData } from '../boss-catalog.utils';
import { OPEN_BOSS_TRACKING_SESSION_STATUSES } from '../boss-tracking.constants';
import type {
  DeleteOrphanedBossAfterCancelInput,
  DeleteOrphanedGameAfterCancelInput,
  EndBossTrackingSessionInput,
  PauseBossTrackingSessionInput,
  PauseOtherActiveSessionsInput,
  RecordBossTrackingDeathInput,
  ResumeBossTrackingSessionInput,
  StartBossTrackingSessionInput,
  UpdateBossTrackingInfoInput,
  UpsertBossTopicTermsInput,
} from './boss-tracking.types';

const activeSessionInclude = {
  game: true,
  boss: {
    include: { game: true },
  },
  attempts: {
    orderBy: { attemptNumber: 'desc' },
  },
  pauses: {
    orderBy: { startedAt: 'desc' },
  },
} as const;

const activeSessionWhere = {
  status: { in: OPEN_BOSS_TRACKING_SESSION_STATUSES },
} as const;

const pauseOtherActiveSessions = async ({
  tx,
  guildId,
  exceptSessionId,
  pausedAt,
  reason,
}: PauseOtherActiveSessionsInput) => {
  const sessions = await tx.bossTrackingSession.findMany({
    where: {
      guildId,
      status: BossTrackingSessionStatus.ACTIVE,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    select: { id: true },
  });

  for (const session of sessions) {
    await tx.bossTrackingSession.update({
      where: { id: session.id },
      data: {
        status: BossTrackingSessionStatus.PAUSED,
        pausedAt,
        pauses: {
          create: { reason },
        },
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

const deleteOrphanedBossAfterCancel = async ({
  tx,
  bossId,
}: DeleteOrphanedBossAfterCancelInput) => {
  const boss = await tx.boss.findUnique({
    where: { id: bossId },
    select: {
      gameId: true,
      topicTerms: { select: { createdByUserId: true } },
      _count: {
        select: {
          stats: true,
          trials: true,
          trackingSessions: true,
        },
      },
    },
  });

  if (!boss) {
    return null;
  }

  if (hasDurableBossData(boss)) {
    return boss.gameId;
  }

  await tx.boss.delete({ where: { id: bossId } });

  return boss.gameId;
};

const deleteOrphanedGameAfterCancel = async ({
  tx,
  gameId,
  gameName,
}: DeleteOrphanedGameAfterCancelInput) => {
  const game = await tx.bossGame.findUnique({
    where: { id: gameId },
    select: {
      topicTerms: { select: { createdByUserId: true } },
      _count: {
        select: {
          bosses: true,
          trials: true,
          trackingSessions: true,
        },
      },
    },
  });

  if (!game) {
    return;
  }

  const defaultStreamGameConfig = await tx.guildConfig.findFirst({
    where: {
      defaultGameName: {
        equals: gameName,
        mode: 'insensitive',
      },
    },
    select: { guildId: true },
  });

  if (hasDurableGameData({ ...game, defaultStreamGameConfig })) {
    return;
  }

  await tx.bossGame.delete({ where: { id: gameId } });
};

export const startBossTrackingSession = async ({
  guildId,
  channelId,
  trackerUserId,
  gameName,
  normalizedGameName,
  bossName,
  normalizedBossName,
  startDeaths,
  startedAt,
  vodLabel,
  vodStartSeconds,
  topicTerms,
}: StartBossTrackingSessionInput) =>
  prisma.$transaction(async (tx) => {
    const existingSession = await tx.bossTrackingSession.findFirst({
      where: {
        guildId,
        ...activeSessionWhere,
        boss: {
          normalizedName: normalizedBossName,
          game: {
            normalizedName: normalizedGameName,
          },
        },
      },
      include: activeSessionInclude,
      orderBy: { focusedAt: 'desc' },
    });

    if (existingSession) {
      throw new Error(
        `A boss tracking session is already open for ${existingSession.game.name} - ${existingSession.boss.name}. Use /trackbossresume if you want to switch back to it.`,
      );
    }

    const game = await tx.bossGame.upsert({
      where: { normalizedName: normalizedGameName },
      update: { name: gameName },
      create: {
        name: gameName,
        normalizedName: normalizedGameName,
      },
    });

    const boss = await tx.boss.upsert({
      where: {
        gameId_normalizedName: {
          gameId: game.id,
          normalizedName: normalizedBossName,
        },
      },
      update: { name: bossName },
      create: {
        gameId: game.id,
        name: bossName,
        normalizedName: normalizedBossName,
      },
    });

    await upsertBossTopicTerms({
      tx,
      bossId: boss.id,
      createdByUserId: trackerUserId,
      topicTerms,
    });

    const now = new Date();
    const sessionStartedAt = startedAt ?? now;
    await pauseOtherActiveSessions({
      tx,
      guildId,
      pausedAt: now,
      reason: `Switched to ${gameName} - ${bossName}.`,
    });

    return tx.bossTrackingSession.create({
      data: {
        guildId,
        channelId,
        trackerUserId,
        gameId: game.id,
        bossId: boss.id,
        startDeaths,
        startedAt: sessionStartedAt,
        focusedAt: now,
        ...(vodLabel === undefined ? {} : { vodLabel }),
        ...(vodStartSeconds === undefined ? {} : { vodStartSeconds }),
        attempts: {
          create: {
            attemptNumber: 1,
            startedAt: sessionStartedAt,
            ...(vodStartSeconds === undefined ? {} : { vodStartSeconds }),
          },
        },
      },
      include: activeSessionInclude,
    });
  });

export const updateBossTrackingInfo = async ({
  guildId,
  normalizedGameName,
  normalizedBossName,
  canonicalBossName,
  normalizedCanonicalBossName,
  createdByUserId,
  topicTerms,
  runbackSeconds,
  nextRunbackSeconds,
}: UpdateBossTrackingInfoInput) =>
  prisma.$transaction(async (tx) => {
    const bossFilter = normalizedBossName
      ? {
          boss: {
            normalizedName: normalizedBossName,
            ...(normalizedGameName
              ? { game: { normalizedName: normalizedGameName } }
              : {}),
          },
        }
      : {};
    const activeSession = await tx.bossTrackingSession.findFirst({
      where: {
        guildId,
        ...activeSessionWhere,
        ...bossFilter,
      },
      include: activeSessionInclude,
      orderBy: { focusedAt: 'desc' },
    });
    const latestSession =
      normalizedBossName === undefined && !activeSession
        ? await tx.bossTrackingSession.findFirst({
            where: { guildId },
            include: activeSessionInclude,
            orderBy: { focusedAt: 'desc' },
          })
        : null;

    const applyUpdate = async (boss: {
      id: string;
      name: string;
      gameId: string;
      normalizedName: string;
      runbackSeconds: number | null;
      game: { name: string };
    }) => {
      let updatedBoss = boss;
      const extraTopicTerms = [...topicTerms];
      const hasNameUpdate = Boolean(
        canonicalBossName && normalizedCanonicalBossName,
      );
      const hasRunbackUpdate = runbackSeconds !== undefined;
      const hasNextRunbackUpdate = nextRunbackSeconds !== undefined;

      if (hasNameUpdate && canonicalBossName && normalizedCanonicalBossName) {
        if (normalizedCanonicalBossName !== boss.normalizedName) {
          const existingBoss = await tx.boss.findUnique({
            where: {
              gameId_normalizedName: {
                gameId: boss.gameId,
                normalizedName: normalizedCanonicalBossName,
              },
            },
            select: { id: true },
          });

          if (existingBoss && existingBoss.id !== boss.id) {
            throw new Error(
              'Another boss already uses that name for this game.',
            );
          }

          extraTopicTerms.push({
            kind: 'ALIAS',
            value: boss.name,
            normalizedValue: boss.normalizedName,
          });
        }
      }

      if (hasNameUpdate || hasRunbackUpdate) {
        updatedBoss = await tx.boss.update({
          where: { id: boss.id },
          data: {
            ...(canonicalBossName && normalizedCanonicalBossName
              ? {
                  name: canonicalBossName,
                  normalizedName: normalizedCanonicalBossName,
                }
              : {}),
            ...(runbackSeconds === undefined ? {} : { runbackSeconds }),
          },
          include: { game: true },
        });
      }

      await upsertBossTopicTerms({
        tx,
        bossId: updatedBoss.id,
        createdByUserId,
        topicTerms: extraTopicTerms.filter((term) => term.normalizedValue),
      });

      return {
        gameName: updatedBoss.game.name,
        bossName: updatedBoss.name,
        runbackSeconds: updatedBoss.runbackSeconds,
        updatedName: hasNameUpdate,
        updatedRunbackSeconds: hasRunbackUpdate,
        nextRunbackSeconds: nextRunbackSeconds ?? null,
        updatedNextRunbackSeconds: hasNextRunbackUpdate,
        addedCount: extraTopicTerms.length,
      };
    };

    if (activeSession) {
      if (nextRunbackSeconds !== undefined) {
        const currentAttempt = activeSession.attempts[0];

        if (!currentAttempt) {
          throw new Error('The active boss tracking session has no attempt.');
        }

        await tx.bossTrackingAttempt.update({
          where: { id: currentAttempt.id },
          data: { runbackSeconds: nextRunbackSeconds },
        });
      }

      return applyUpdate(activeSession.boss);
    }

    if (nextRunbackSeconds !== undefined) {
      throw new Error(
        'Start or resume tracking this boss before setting next runback.',
      );
    }

    if (latestSession) {
      return applyUpdate(latestSession.boss);
    }

    if (normalizedBossName === undefined) {
      throw new Error(
        'No current tracked boss found. Pass boss or start tracking first.',
      );
    }

    const boss = await tx.boss.findFirst({
      where: {
        normalizedName: normalizedBossName,
        ...(normalizedGameName
          ? { game: { normalizedName: normalizedGameName } }
          : {}),
      },
      include: { game: true },
    });

    if (!boss) {
      throw new Error('No matching boss found. Start tracking it first.');
    }

    return applyUpdate(boss);
  });

export const recordBossTrackingDeath = async ({
  guildId,
  vodDeathSeconds,
}: RecordBossTrackingDeathInput) =>
  prisma.$transaction(async (tx) => {
    const session = await tx.bossTrackingSession.findFirst({
      where: {
        guildId,
        ...activeSessionWhere,
      },
      include: activeSessionInclude,
      orderBy: { focusedAt: 'desc' },
    });

    if (!session) {
      throw new Error('No boss tracking session is active right now.');
    }

    if (session.status === BossTrackingSessionStatus.PAUSED) {
      throw new Error('Resume boss tracking before recording a death.');
    }

    const currentAttempt = session.attempts[0];

    if (!currentAttempt) {
      throw new Error('The active boss tracking session has no attempt.');
    }

    await tx.bossTrackingAttempt.update({
      where: { id: currentAttempt.id },
      data: {
        endedAt: new Date(),
        ...(vodDeathSeconds === undefined
          ? {}
          : { vodEndSeconds: vodDeathSeconds }),
        result: BossTrackingAttemptResult.DEATH,
      },
    });

    return tx.bossTrackingSession.update({
      where: { id: session.id },
      data: {
        deathCount: { increment: 1 },
        recordedDeathCount: { increment: 1 },
        focusedAt: new Date(),
        attempts: {
          create: {
            attemptNumber: currentAttempt.attemptNumber + 1,
            ...(vodDeathSeconds === undefined
              ? {}
              : { vodStartSeconds: vodDeathSeconds }),
          },
        },
      },
      include: activeSessionInclude,
    });
  });

export const pauseBossTrackingSession = async ({
  guildId,
  reason,
  reconciliation,
}: PauseBossTrackingSessionInput) =>
  prisma.$transaction(async (tx) => {
    const session = await tx.bossTrackingSession.findFirst({
      where: {
        guildId,
        ...activeSessionWhere,
      },
      include: activeSessionInclude,
      orderBy: { focusedAt: 'desc' },
    });

    if (!session) {
      throw new Error('No boss tracking session is active right now.');
    }

    if (session.status === BossTrackingSessionStatus.PAUSED) {
      throw new Error('Boss tracking is already paused.');
    }

    return tx.bossTrackingSession.update({
      where: { id: session.id },
      data: {
        status: BossTrackingSessionStatus.PAUSED,
        pausedAt: new Date(),
        focusedAt: new Date(),
        ...(reconciliation === undefined
          ? {}
          : {
              deathCount: reconciliation.deathCount,
              attemptTimingStatus: reconciliation.attemptTimingStatus,
              reconciliationNote: reconciliation.reconciliationNote,
            }),
        pauses: {
          create: {
            ...(reason ? { reason } : {}),
          },
        },
      },
      include: activeSessionInclude,
    });
  });

export const resumeBossTrackingSession = async ({
  guildId,
  normalizedGameName,
  normalizedBossName,
  vodLabel,
  vodResumeSeconds,
}: ResumeBossTrackingSessionInput) =>
  prisma.$transaction(async (tx) => {
    const bossFilter = normalizedBossName
      ? {
          boss: {
            normalizedName: normalizedBossName,
            ...(normalizedGameName
              ? { game: { normalizedName: normalizedGameName } }
              : {}),
          },
        }
      : {};
    const session = await tx.bossTrackingSession.findFirst({
      where: {
        guildId,
        ...activeSessionWhere,
        ...bossFilter,
      },
      include: activeSessionInclude,
      orderBy: { focusedAt: 'desc' },
    });

    if (!session) {
      throw new Error('No boss tracking session is active right now.');
    }

    if (session.status !== BossTrackingSessionStatus.PAUSED) {
      throw new Error('Boss tracking is not paused.');
    }

    const now = new Date();
    await pauseOtherActiveSessions({
      tx,
      guildId,
      exceptSessionId: session.id,
      pausedAt: now,
      reason: `Switched back to ${session.game.name} - ${session.boss.name}.`,
    });

    const pausedSeconds = session.pausedAt
      ? getElapsedSeconds(session.pausedAt, now)
      : 0;
    const currentPause = session.pauses[0];
    const currentAttempt = session.attempts[0];

    if (currentPause && !currentPause.endedAt) {
      await tx.bossTrackingPause.update({
        where: { id: currentPause.id },
        data: {
          endedAt: now,
          ...(vodLabel === undefined ? {} : { vodLabel }),
          ...(vodResumeSeconds === undefined ? {} : { vodResumeSeconds }),
        },
      });
    }

    if (currentAttempt) {
      await tx.bossTrackingAttempt.update({
        where: { id: currentAttempt.id },
        data: {
          startedAt: now,
          vodStartSeconds: vodResumeSeconds ?? null,
        },
      });
    }

    return tx.bossTrackingSession.update({
      where: { id: session.id },
      data: {
        status: BossTrackingSessionStatus.ACTIVE,
        pausedAt: null,
        totalPausedSeconds: { increment: pausedSeconds },
        focusedAt: now,
      },
      include: activeSessionInclude,
    });
  });

export const endBossTrackingSession = async ({
  guildId,
  result,
  reconciliation,
  manualTrackedSeconds,
  vodEndSeconds,
}: EndBossTrackingSessionInput) =>
  prisma.$transaction(async (tx) => {
    const session = await tx.bossTrackingSession.findFirst({
      where: {
        guildId,
        ...activeSessionWhere,
      },
      include: activeSessionInclude,
      orderBy: { focusedAt: 'desc' },
    });

    if (!session) {
      throw new Error('No boss tracking session is active right now.');
    }

    const now = new Date();
    const pausedSeconds =
      session.status === BossTrackingSessionStatus.PAUSED && session.pausedAt
        ? getElapsedSeconds(session.pausedAt, now)
        : 0;
    const currentAttempt = session.attempts[0];
    const currentPause = session.pauses[0];
    if (
      session.status === BossTrackingSessionStatus.PAUSED &&
      currentPause &&
      !currentPause.endedAt
    ) {
      await tx.bossTrackingPause.update({
        where: { id: currentPause.id },
        data: { endedAt: now },
      });
    }

    if (currentAttempt) {
      await tx.bossTrackingAttempt.update({
        where: { id: currentAttempt.id },
        data: {
          endedAt: now,
          ...(vodEndSeconds === undefined ? {} : { vodEndSeconds }),
          result:
            result === BossTrackingEndResult.KILLED
              ? BossTrackingAttemptResult.KILLED
              : BossTrackingAttemptResult.ABANDONED,
        },
      });
    }

    return tx.bossTrackingSession.update({
      where: { id: session.id },
      data: {
        status: BossTrackingSessionStatus.ENDED,
        endedAt: now,
        endResult: result,
        pausedAt: null,
        focusedAt: now,
        totalPausedSeconds: { increment: pausedSeconds },
        finalDeaths: reconciliation.totalDeaths,
        ...(manualTrackedSeconds === undefined ? {} : { manualTrackedSeconds }),
        ...(vodEndSeconds === undefined ? {} : { vodEndSeconds }),
        deathCount: reconciliation.deathCount,
        attemptTimingStatus: reconciliation.attemptTimingStatus,
        reconciliationNote: reconciliation.reconciliationNote,
      },
      include: activeSessionInclude,
    });
  });

export const cancelBossTrackingSession = async (guildId: string) =>
  prisma.$transaction(async (tx) => {
    const session = await tx.bossTrackingSession.findFirst({
      where: {
        guildId,
        ...activeSessionWhere,
      },
      include: activeSessionInclude,
      orderBy: { focusedAt: 'desc' },
    });

    if (!session) {
      throw new Error('No boss tracking session is active right now.');
    }

    const currentAttempt = session.attempts[0];
    const currentPause = session.pauses[0];

    if (
      session.status === BossTrackingSessionStatus.PAUSED &&
      currentPause &&
      !currentPause.endedAt
    ) {
      await tx.bossTrackingPause.update({
        where: { id: currentPause.id },
        data: { endedAt: new Date() },
      });
    }

    if (currentAttempt) {
      await tx.bossTrackingAttempt.update({
        where: { id: currentAttempt.id },
        data: {
          endedAt: new Date(),
          result: BossTrackingAttemptResult.CANCELLED,
        },
      });
    }

    const cancelledSession = await tx.bossTrackingSession.update({
      where: { id: session.id },
      data: {
        status: BossTrackingSessionStatus.CANCELLED,
        endedAt: new Date(),
        pausedAt: null,
      },
      include: activeSessionInclude,
    });

    await tx.bossTrackingSession.delete({
      where: { id: session.id },
    });

    const gameId = await deleteOrphanedBossAfterCancel({
      tx,
      bossId: session.bossId,
    });

    if (gameId) {
      await deleteOrphanedGameAfterCancel({
        tx,
        gameId,
        gameName: session.game.name,
      });
    }

    return cancelledSession;
  });
