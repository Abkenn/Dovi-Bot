import {
  type BossTopicTermKind,
  BossTrackingAttemptResult,
  BossTrackingAttemptTimingStatus,
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';

const ACTIVE_SESSION_STATUSES = [
  BossTrackingSessionStatus.ACTIVE,
  BossTrackingSessionStatus.PAUSED,
];

const getSecondsBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));

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
  status: { in: ACTIVE_SESSION_STATUSES },
} as const;

const pauseOtherActiveSessions = async ({
  tx,
  guildId,
  exceptSessionId,
  pausedAt,
  reason,
}: {
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  guildId: string;
  exceptSessionId?: string;
  pausedAt: Date;
  reason: string;
}) => {
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

const getReconciliation = ({
  startDeaths,
  finalDeaths,
  recordedDeathCount,
}: {
  startDeaths: number;
  finalDeaths: number;
  recordedDeathCount: number;
}) => {
  const deathCount = finalDeaths - startDeaths;

  if (deathCount < 0) {
    throw new Error('Final deaths cannot be lower than starting deaths.');
  }

  if (deathCount === recordedDeathCount) {
    return {
      deathCount,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.TRUSTED,
      reconciliationNote: null,
    };
  }

  const difference = deathCount - recordedDeathCount;
  const missedDeathCount = Math.abs(difference);
  const reconciliationNote =
    difference > 0
      ? `Final death count has ${difference} more death${difference === 1 ? '' : 's'} than tracked manually.`
      : `Manual tracking recorded ${missedDeathCount} more death${missedDeathCount === 1 ? '' : 's'} than the final count.`;

  return {
    deathCount,
    attemptTimingStatus: BossTrackingAttemptTimingStatus.RECONCILED,
    reconciliationNote,
  };
};

const upsertBossTopicTerms = async ({
  tx,
  bossId,
  createdByUserId,
  topicTerms,
}: {
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  bossId: string;
  createdByUserId: string;
  topicTerms: {
    kind: BossTopicTermKind;
    value: string;
    normalizedValue: string;
  }[];
}) => {
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
        createdByUserId,
      },
      create: {
        bossId,
        kind: term.kind,
        value: term.value,
        normalizedValue: term.normalizedValue,
        createdByUserId,
      },
    });
  }
};

const deleteOrphanedBossAfterCancel = async ({
  tx,
  bossId,
}: {
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  bossId: string;
}) => {
  const boss = await tx.boss.findUnique({
    where: { id: bossId },
    select: {
      id: true,
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

  const hasDurableBossData =
    boss._count.stats > 0 ||
    boss._count.trials > 0 ||
    boss._count.trackingSessions > 0 ||
    boss.topicTerms.some((term) => term.createdByUserId === null);

  if (hasDurableBossData) {
    return boss.gameId;
  }

  await tx.boss.delete({ where: { id: boss.id } });

  return boss.gameId;
};

const deleteOrphanedGameAfterCancel = async ({
  tx,
  gameId,
  gameName,
}: {
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  gameId: string;
  gameName: string;
}) => {
  const game = await tx.bossGame.findUnique({
    where: { id: gameId },
    select: {
      id: true,
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
  const hasDurableGameData =
    game._count.bosses > 0 ||
    game._count.trials > 0 ||
    game._count.trackingSessions > 0 ||
    game.topicTerms.some((term) => term.createdByUserId === null) ||
    defaultStreamGameConfig !== null;

  if (hasDurableGameData) {
    return;
  }

  await tx.bossGame.delete({ where: { id: game.id } });
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
}: {
  guildId: string;
  channelId: string;
  trackerUserId: string;
  gameName: string;
  normalizedGameName: string;
  bossName: string;
  normalizedBossName: string;
  startDeaths: number;
  startedAt?: Date;
  vodLabel?: string;
  vodStartSeconds?: number;
  topicTerms: {
    kind: BossTopicTermKind;
    value: string;
    normalizedValue: string;
  }[];
}) =>
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
}: {
  guildId: string;
  normalizedGameName?: string;
  normalizedBossName?: string;
  canonicalBossName?: string;
  normalizedCanonicalBossName?: string;
  createdByUserId: string;
  runbackSeconds?: number;
  topicTerms: {
    kind: BossTopicTermKind;
    value: string;
    normalizedValue: string;
  }[];
}) =>
  prisma.$transaction(async (tx) => {
    const activeSession =
      normalizedBossName === undefined
        ? await tx.bossTrackingSession.findFirst({
            where: {
              guildId,
              ...activeSessionWhere,
            },
            include: activeSessionInclude,
            orderBy: { focusedAt: 'desc' },
          })
        : null;
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
        addedCount: extraTopicTerms.length,
      };
    };

    if (activeSession) {
      return applyUpdate(activeSession.boss);
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
}: {
  guildId: string;
  vodDeathSeconds?: number;
}) =>
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
  currentDeaths,
}: {
  guildId: string;
  reason: string | null;
  currentDeaths?: number;
}) =>
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

    const reconciliation =
      currentDeaths === undefined
        ? null
        : getReconciliation({
            startDeaths: session.startDeaths,
            finalDeaths: currentDeaths,
            recordedDeathCount: session.recordedDeathCount,
          });

    return tx.bossTrackingSession.update({
      where: { id: session.id },
      data: {
        status: BossTrackingSessionStatus.PAUSED,
        pausedAt: new Date(),
        focusedAt: new Date(),
        ...(reconciliation === null
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
}: {
  guildId: string;
  normalizedGameName?: string;
  normalizedBossName?: string;
  vodLabel?: string;
  vodResumeSeconds?: number;
}) =>
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
      ? getSecondsBetween(session.pausedAt, now)
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
  finalDeaths,
  manualTrackedSeconds,
  vodEndSeconds,
}: {
  guildId: string;
  result: BossTrackingEndResult;
  finalDeaths?: number;
  manualTrackedSeconds?: number;
  vodEndSeconds?: number;
}) =>
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
        ? getSecondsBetween(session.pausedAt, now)
        : 0;
    const resolvedFinalDeaths =
      finalDeaths ??
      session.startDeaths +
        Math.max(session.deathCount, session.recordedDeathCount);
    const reconciliation = getReconciliation({
      startDeaths: session.startDeaths,
      finalDeaths: resolvedFinalDeaths,
      recordedDeathCount: session.recordedDeathCount,
    });
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
        finalDeaths: resolvedFinalDeaths,
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
