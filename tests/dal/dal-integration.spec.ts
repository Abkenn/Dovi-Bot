import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { Prisma } from '../../src/generated/prisma/client';
import {
  BossTopicTermKind,
  BossTrackingAttemptTimingStatus,
  BossTrackingEndResult,
  BossTrialBumpMode,
  BossTrialStatus,
  BossTrialVoteVerdict,
  CommandExecutionStatus,
  MusicMode,
  ScheduleStatus,
  StreamKind,
} from '../../src/generated/prisma/enums';
import {
  DEFAULT_GUILD_STREAM_CONFIG,
  DEFAULT_STREAM_SCHEDULE,
  startTimeToMinutes,
} from '../../src/modules/stream-info/stream-schedule.config';

const runtimeEnvPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '.runtime-env.json',
);
const runtimeEnv = JSON.parse(readFileSync(runtimeEnvPath, 'utf8')) as {
  databaseUrl: string | null;
  skipReason: string | null;
};

test.skip(Boolean(runtimeEnv.skipReason), runtimeEnv.skipReason ?? undefined);

if (runtimeEnv.databaseUrl) {
  process.env.DATABASE_URL = runtimeEnv.databaseUrl;
  process.env.DIRECT_URL = runtimeEnv.databaseUrl;
}

const now = new Date('2026-06-12T18:00:00.000Z');
const guildId = 'dal-guild';

const topicTerm = (value: string) => ({
  kind: BossTopicTermKind.ALIAS,
  value,
  normalizedValue: value.toLowerCase(),
});

const resetDatabase = async () => {
  const { prisma } = await import('../../src/lib/prisma');
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    select tablename
    from pg_tables
    where schemaname = 'public'
  `;

  if (tables.length === 0) {
    return;
  }

  const quotedTables = tables
    .map((table) => `"${table.tablename.replaceAll('"', '""')}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(
    `truncate table ${quotedTables} restart identity cascade`,
  );
};

const createBoss = async ({
  gameName = 'Test Game',
  normalizedGameName = 'test game',
  bossName = 'Test Boss',
  normalizedBossName = 'test boss',
}: {
  gameName?: string;
  normalizedGameName?: string;
  bossName?: string;
  normalizedBossName?: string;
} = {}) => {
  const { prisma } = await import('../../src/lib/prisma');
  const game = await prisma.bossGame.create({
    data: { name: gameName, normalizedName: normalizedGameName },
  });
  const boss = await prisma.boss.create({
    data: {
      gameId: game.id,
      name: bossName,
      normalizedName: normalizedBossName,
    },
  });

  return { game, boss };
};

test.beforeEach(async () => {
  await resetDatabase();
});

test.afterAll(async () => {
  const { prisma } = await import('../../src/lib/prisma');
  await prisma.$disconnect();
});

test('checks database health and schema presence helpers', async () => {
  const { pingDatabase } = await import(
    '../../src/data/queries/database-health'
  );
  const { areBossStatsTablesPresent } = await import(
    '../../src/data/queries/boss-stats'
  );
  const { areBossTrialTablesPresent } = await import(
    '../../src/data/queries/boss-trial'
  );
  const { areCommunityTopicCatalogTablesPresent } = await import(
    '../../src/data/queries/community-topic-catalog'
  );
  const { areCommunityTopicTablesPresent } = await import(
    '../../src/data/queries/community-topic-signals'
  );

  await expect(pingDatabase()).resolves.toBeDefined();
  await expect(areBossStatsTablesPresent()).resolves.toBe(true);
  await expect(areBossTrialTablesPresent()).resolves.toBe(true);
  await expect(areCommunityTopicCatalogTablesPresent()).resolves.toBe(true);
  await expect(areCommunityTopicTablesPresent()).resolves.toBe(true);
});

test('covers stream-info queries and transactions', async () => {
  const queries = await import('../../src/data/queries/stream-info');
  const transactions = await import('../../src/data/transactions/stream-info');

  const config = await queries.ensureGuildStreamConfig({
    guildId,
    defaultConfig: DEFAULT_GUILD_STREAM_CONFIG,
    defaultSchedule: DEFAULT_STREAM_SCHEDULE,
    startTimeToMinutes,
  });

  expect(config.guildId).toBe(guildId);
  await queries.updateDefaultGameName(guildId, 'Default Game');
  await expect(queries.findGuildStreamConfig(guildId)).resolves.toMatchObject({
    defaultGameName: 'Default Game',
  });
  await expect(
    queries.findEnabledStreamScheduleDefaults(guildId),
  ).resolves.toHaveLength(2);

  await queries.upsertTargetStreamOverride({
    guildId,
    streamDateKey: '2026-06-12',
    resolvedFromWeekday: 'FRIDAY',
    startAtUtc: now,
    status: ScheduleStatus.SCHEDULED,
    streamKind: StreamKind.MUSIC,
    musicMode: MusicMode.DEMOCRACY,
    titleOverride: 'Override Stream',
  });
  await expect(
    queries.findStreamScheduleOverridesInDateRange({
      guildId,
      start: '2026-06-01',
      end: '2026-06-30',
    }),
  ).resolves.toHaveLength(1);

  await queries.upsertStreamTitleResetOverride({
    guildId,
    streamDateKey: '2026-06-12',
    resolvedFromWeekday: 'FRIDAY',
    startAtUtc: now,
  });
  await expect(
    queries.findStreamScheduleOverridesInDateRange({
      guildId,
      start: '2026-06-12',
      end: '2026-06-12',
    }),
  ).resolves.toMatchObject([{ titleOverride: null }]);

  await transactions.updateDefaultGameAndTargetStreamOverride({
    guildId,
    defaultGameName: 'Transaction Game',
    override: {
      guildId,
      streamDateKey: '2026-06-13',
      resolvedFromWeekday: 'SATURDAY',
      startAtUtc: now,
      status: ScheduleStatus.SCHEDULED,
      streamKind: StreamKind.GAME,
      gameName: 'Ignored Game',
    },
  });
  await expect(queries.findGuildStreamConfig(guildId)).resolves.toMatchObject({
    defaultGameName: 'Transaction Game',
  });

  await transactions.upsertMovedTargetStreamOverride({
    guildId,
    defaultGameName: 'Moved Game',
    override: {
      guildId,
      streamDateKey: '2026-06-14',
      resolvedFromWeekday: 'SUNDAY',
      startAtUtc: now,
      status: ScheduleStatus.SCHEDULED,
    },
    cancelledOverride: {
      guildId,
      streamDateKey: '2026-06-15',
      resolvedFromWeekday: 'MONDAY',
      startAtUtc: now,
      status: ScheduleStatus.CANCELLED,
    },
  });
  await expect(
    queries.deleteStreamScheduleOverrideForDate({
      guildId,
      streamDateKey: '2026-06-12',
    }),
  ).resolves.toMatchObject({ count: 1 });
});

test('covers boss stats queries and spreadsheet sync transaction', async () => {
  const statsQueries = await import('../../src/data/queries/boss-stats');
  const { upsertDaviSpreadsheetBossEncounter } = await import(
    '../../src/data/transactions/davi-boss-stats-sync'
  );
  const { prisma } = await import('../../src/lib/prisma');

  await expect(
    upsertDaviSpreadsheetBossEncounter({
      gameName: 'Stats Game',
      normalizedGameName: 'stats game',
      bossName: 'Stats Boss',
      normalizedBossName: 'stats boss',
      daviDiscordUserId: 'davi',
      parsedRow: {
        deaths: 2,
        totalAttemptTimeSeconds: 300,
        winningAttemptTimeSeconds: 100,
        difficultyCoefficient: '1.500',
      },
      rawTotalAttemptTime: '5m',
      rawWinningAttemptTime: '1m40s',
      rawDifficultyCoefficient: '1.5',
      sourceRowNumber: 1,
    }),
  ).resolves.toBe('imported');
  await expect(
    upsertDaviSpreadsheetBossEncounter({
      gameName: 'Stats Game',
      normalizedGameName: 'stats game',
      bossName: 'Stats Boss Updated',
      normalizedBossName: 'stats boss',
      daviDiscordUserId: 'davi',
      parsedRow: {
        deaths: 3,
        totalAttemptTimeSeconds: 360,
        winningAttemptTimeSeconds: 90,
        difficultyCoefficient: '2.000',
      },
      rawTotalAttemptTime: '6m',
      rawWinningAttemptTime: '1m30s',
      rawDifficultyCoefficient: '2',
      sourceRowNumber: 2,
    }),
  ).resolves.toBe('updated');

  const game = await prisma.bossGame.findUniqueOrThrow({
    where: { normalizedName: 'stats game' },
  });
  const boss = await prisma.boss.findFirstOrThrow({
    where: { gameId: game.id, normalizedName: 'stats boss' },
  });
  await prisma.bossGameTopicTerm.create({
    data: {
      gameId: game.id,
      kind: BossTopicTermKind.ALIAS,
      value: 'Stats Alias',
      normalizedValue: 'stats alias',
    },
  });
  await prisma.bossTopicTerm.create({
    data: {
      bossId: boss.id,
      kind: BossTopicTermKind.ALIAS,
      value: 'Boss Alias',
      normalizedValue: 'boss alias',
    },
  });

  await expect(
    statsQueries.findBossGamesForAutocomplete('stats'),
  ).resolves.toEqual([{ name: 'Stats Game' }]);
  await expect(
    statsQueries.findBossesForAutocomplete({
      normalizedGameName: 'stats alias',
      normalizedBossQuery: 'boss alias',
    }),
  ).resolves.toEqual([
    { name: 'Stats Boss Updated', game: { name: 'Stats Game' } },
  ]);
  await expect(
    statsQueries.countBossesByNormalizedName('stats boss'),
  ).resolves.toBe(1);
  await expect(
    statsQueries.findBossWithDaviSpreadsheetStats({
      normalizedGameName: 'stats game',
      normalizedBossName: 'stats boss',
    }),
  ).resolves.toMatchObject({
    name: 'Stats Boss Updated',
    stats: [{ deaths: 3 }],
  });
  await expect(
    statsQueries.findGameBossDeathRanking({
      normalizedGameName: 'stats game',
      limit: null,
    }),
  ).resolves.toMatchObject({
    game: { name: 'Stats Game' },
    stats: [{ deaths: 3 }],
  });
});

test('covers boss tracking transactions and queries', async () => {
  const trackingTransactions = await import(
    '../../src/data/transactions/boss-tracking'
  );
  const trackingQueries = await import('../../src/data/queries/boss-tracking');

  const started = await trackingTransactions.startBossTrackingSession({
    guildId,
    channelId: 'channel',
    trackerUserId: 'tracker',
    gameName: 'Tracking Game',
    normalizedGameName: 'tracking game',
    bossName: 'Tracking Boss',
    normalizedBossName: 'tracking boss',
    startDeaths: 10,
    startedAt: now,
    vodLabel: 'vod',
    vodStartSeconds: 5,
    topicTerms: [topicTerm('Track Alias')],
  });
  expect(started.attempts).toHaveLength(1);

  await expect(
    trackingQueries.findActiveBossTrackingSession(guildId),
  ).resolves.toMatchObject({
    boss: { name: 'Tracking Boss' },
  });
  await expect(
    trackingQueries.findOpenBossTrackingBossesForAutocomplete({
      guildId,
      normalizedGameName: 'tracking game',
      normalizedBossQuery: 'track alias',
    }),
  ).resolves.toEqual([{ name: 'Tracking Boss', gameName: 'Tracking Game' }]);

  const updated = await trackingTransactions.updateBossTrackingInfo({
    guildId,
    normalizedGameName: 'tracking game',
    normalizedBossName: 'tracking boss',
    canonicalBossName: 'Tracking Boss Prime',
    normalizedCanonicalBossName: 'tracking boss prime',
    createdByUserId: 'tracker',
    runbackSeconds: 12,
    nextRunbackSeconds: 7,
    topicTerms: [topicTerm('Prime Alias')],
  });
  expect(updated).toMatchObject({
    bossName: 'Tracking Boss Prime',
    updatedRunbackSeconds: true,
    updatedNextRunbackSeconds: true,
  });

  const death = await trackingTransactions.recordBossTrackingDeath({
    guildId,
    vodDeathSeconds: 20,
  });
  expect(death.deathCount).toBe(1);
  expect(death.attempts).toHaveLength(2);

  const paused = await trackingTransactions.pauseBossTrackingSession({
    guildId,
    reason: 'break',
    reconciliation: {
      totalDeaths: 12,
      deathCount: 2,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.RECONCILED,
      reconciliationNote: 'manual correction',
    },
  });
  expect(paused.status).toBe('PAUSED');

  const resumed = await trackingTransactions.resumeBossTrackingSession({
    guildId,
    normalizedGameName: 'tracking game',
    normalizedBossName: 'tracking boss prime',
    vodLabel: 'vod',
    vodResumeSeconds: 30,
  });
  expect(resumed.status).toBe('ACTIVE');

  const ended = await trackingTransactions.endBossTrackingSession({
    guildId,
    result: BossTrackingEndResult.KILLED,
    manualTrackedSeconds: 120,
    vodEndSeconds: 45,
    reconciliation: {
      totalDeaths: 12,
      deathCount: 2,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.TRUSTED,
      reconciliationNote: null,
    },
  });
  expect(ended.status).toBe('ENDED');
  await expect(
    trackingQueries.findLatestBossTrackingSession(guildId),
  ).resolves.toMatchObject({
    id: ended.id,
  });
  await expect(
    trackingQueries.findTrackedGameStatus('tracking game'),
  ).resolves.toMatchObject({
    name: 'Tracking Game',
    trackingSessions: [{ finalDeaths: 12 }],
  });
});

test('covers boss topic info and community topic signal DAL', async () => {
  const { importCommunityTopicSeed, updateBossGameTopicInfo } = await import(
    '../../src/data/transactions/boss-topic-info'
  );
  const catalogQueries = await import(
    '../../src/data/queries/community-topic-catalog'
  );
  const signalTransactions = await import(
    '../../src/data/transactions/community-topic-signals'
  );
  const signalQueries = await import(
    '../../src/data/queries/community-topic-signals'
  );
  const trackingTransactions = await import(
    '../../src/data/transactions/boss-tracking'
  );

  await expect(
    importCommunityTopicSeed({
      games: [
        {
          name: 'Topic Game',
          normalizedName: 'topic game',
          topicTerms: [topicTerm('Topic Alias')],
        },
      ],
      bosses: [
        {
          gameName: 'Topic Game',
          normalizedGameName: 'topic game',
          name: 'Topic Boss',
          normalizedName: 'topic boss',
          topicTerms: [topicTerm('Topic Boss Alias')],
        },
      ],
    }),
  ).resolves.toEqual({ gameCount: 1, bossCount: 1, topicTermCount: 2 });

  await trackingTransactions.startBossTrackingSession({
    guildId,
    channelId: 'channel',
    trackerUserId: 'tracker',
    gameName: 'Topic Game',
    normalizedGameName: 'topic game',
    bossName: 'Topic Boss',
    normalizedBossName: 'topic boss',
    startDeaths: 5,
    topicTerms: [],
  });
  await expect(
    updateBossGameTopicInfo({
      guildId,
      gameName: 'Topic Game',
      normalizedGameName: 'topic game',
      canonicalGameName: 'Topic Game Prime',
      normalizedCanonicalGameName: 'topic game prime',
      createdByUserId: 'tracker',
      deaths: 6,
      topicTerms: [topicTerm('Prime Game Alias')],
    }),
  ).resolves.toMatchObject({
    gameName: 'Topic Game Prime',
    updatedDeaths: 6,
  });

  await expect(
    catalogQueries.findCommunityTopicCatalog(),
  ).resolves.toMatchObject([
    { name: 'Topic Game Prime', bosses: [{ name: 'Topic Boss' }] },
  ]);

  const input = {
    guildId,
    channelId: 'channel',
    messageId: 'message-1',
    authorUserId: 'user-1',
    messageCreatedAt: now,
    content: 'topic boss topic game',
    source: 'REALTIME' as const,
  };
  await signalTransactions.upsertCommunityTopicMessageSignals({
    input,
    contentHash: 'hash-1',
    matches: [
      {
        topicKind: 'GAME',
        entityKey: 'topic game prime',
        entityName: 'Topic Game Prime',
        gameName: null,
        matchedAliases: ['Topic Alias'],
        matchedWeakAliases: [],
        contextWords: [],
        confidence: 1,
        intensity: 2,
      },
      {
        topicKind: 'BOSS',
        entityKey: 'topic boss',
        entityName: 'Topic Boss',
        gameName: 'Topic Game Prime',
        matchedAliases: ['Topic Boss Alias'],
        matchedWeakAliases: [],
        contextWords: ['boss'],
        confidence: 0.9,
        intensity: 3,
      },
    ],
  });

  await expect(
    signalQueries.getCommunityTopicSignalStats(guildId),
  ).resolves.toMatchObject({
    games: [{ entityName: 'Topic Game Prime', count: 1, intensity: 2 }],
    bosses: [{ entityName: 'Topic Boss', count: 1, intensity: 3 }],
    users: [{ userId: 'user-1', count: 2, intensity: 5 }],
  });
  await expect(
    signalQueries.getCommunityTopicBossUserShares({
      guildId,
      entityKey: 'topic boss',
    }),
  ).resolves.toEqual([{ userId: 'user-1', count: 1, intensity: 3, ratio: 1 }]);
  await expect(
    signalQueries.getCommunityTopicGameBossStats({
      guildId,
      gameName: 'Topic Game Prime',
    }),
  ).resolves.toEqual([
    {
      entityName: 'Topic Boss',
      gameName: 'Topic Game Prime',
      count: 1,
      intensity: 3,
      topUserId: 'user-1',
    },
  ]);
});

test('covers boss trial queries and stats DAL', async () => {
  const trialQueries = await import('../../src/data/queries/boss-trial');
  const { getBossTrialStatsRows } = await import(
    '../../src/data/queries/boss-trial-stats'
  );
  const { game, boss } = await createBoss({
    gameName: 'Trial Game',
    normalizedGameName: 'trial game',
    bossName: 'Trial Boss',
    normalizedBossName: 'trial boss',
  });

  const trial = await trialQueries.createBossTrialView({
    guildId,
    channelId: 'channel',
    requesterUserId: 'requester',
    gameId: game.id,
    bossId: boss.id,
    durationMinutes: 1440,
    voteVisibilityHiddenUntil: new Date('2026-06-12T18:01:00.000Z'),
    endsAt: new Date('2026-06-12T19:00:00.000Z'),
    bumpMode: BossTrialBumpMode.DEFAULT,
  });
  await trialQueries.attachBossTrialMessageAndGetView({
    trialId: trial.id,
    messageId: 'trial-message',
  });
  await trialQueries.attachBossTrialBumpMessage({
    trialId: trial.id,
    messageId: 'bump-message',
  });
  await trialQueries.upsertBossTrialVoteVerdict({
    trialId: trial.id,
    userId: 'voter',
    verdict: BossTrialVoteVerdict.PEAK,
    votedAt: now,
  });

  await expect(
    trialQueries.findBossTrialVoteVerdict({
      trialId: trial.id,
      userId: 'voter',
    }),
  ).resolves.toEqual({ verdict: BossTrialVoteVerdict.PEAK });
  await expect(trialQueries.getBossTrialView(trial.id)).resolves.toMatchObject({
    messageId: 'trial-message',
    votes: [{ userId: 'voter' }],
    bumpMessages: [{ messageId: 'bump-message' }],
  });
  await expect(
    trialQueries.getPendingBossTrialLifecycleEvents({
      now: new Date('2026-06-12T18:02:00.000Z'),
      automaticBumpCreatedAtCutoff: new Date('2030-01-01T00:00:00.000Z'),
    }),
  ).resolves.toHaveLength(1);
  await expect(
    trialQueries.claimBossTrialLiveResults(trial.id),
  ).resolves.toMatchObject({
    id: trial.id,
  });
  await expect(
    trialQueries.claimBossTrialLiveResults(trial.id),
  ).resolves.toBeNull();
  await expect(
    trialQueries.claimBossTrialAutomaticBump(trial.id),
  ).resolves.toMatchObject({
    id: trial.id,
  });
  await expect(
    trialQueries.claimBossTrialFinalResults(trial.id),
  ).resolves.toMatchObject({
    status: BossTrialStatus.RESULTS_PUBLISHED,
  });

  await expect(getBossTrialStatsRows(guildId)).resolves.toMatchObject({
    totalTrials: 1,
    totalVotes: 1,
    creatorRows: [{ requesterUserId: 'requester' }],
    participantRows: [{ userId: 'voter' }],
  });
});

test('covers command logging DAL', async () => {
  const { createCommandExecutionLog, createCommandErrorLog } = await import(
    '../../src/data/queries/command-logging'
  );

  const execution = await createCommandExecutionLog({
    guildId,
    channelId: 'channel',
    userId: 'user',
    username: 'User',
    commandName: 'testcommand',
    optionsJson: { ok: true },
    status: CommandExecutionStatus.ERROR,
    note: 'note',
    durationMs: 12,
  });
  const error = await createCommandErrorLog({
    commandExecutionId: execution.id,
    errorName: 'Error',
    errorMessage: 'Boom',
    stack: null,
    discordCode: null,
    httpStatus: 500,
    rawJson: Prisma.JsonNull,
  });

  expect(error.commandExecutionId).toBe(execution.id);
});
