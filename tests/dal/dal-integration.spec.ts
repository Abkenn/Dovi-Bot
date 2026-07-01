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

const coveredDalExports = {
  '../../src/data/boss-catalog.utils': [
    'hasDurableBossData',
    'hasDurableGameData',
  ],
  '../../src/data/boss-tracking.constants': [
    'OPEN_BOSS_TRACKING_SESSION_STATUSES',
  ],
  '../../src/data/hello-greetings': ['HELLO_GREETINGS'],
  '../../src/data/queries/boss-stats': [
    'areBossStatsTablesPresent',
    'countBossesByNormalizedName',
    'findBossGamesForAutocomplete',
    'findBossesForAutocomplete',
    'findBossWithDaviSpreadsheetStats',
    'findGameBossDeathRanking',
  ],
  '../../src/data/queries/boss-tracking': [
    'bossTrackingSessionInclude',
    'findActiveBossTrackingSession',
    'findBossTrackingStatusSession',
    'findLatestBossTrackingSession',
    'findOpenBossTrackingBossesForAutocomplete',
    'findTrackedGameStatus',
  ],
  '../../src/data/queries/boss-trial': [
    'areBossTrialTablesPresent',
    'attachBossTrialBumpMessage',
    'attachBossTrialMessageAndGetView',
    'claimBossTrialAutomaticBump',
    'claimBossTrialFinalResults',
    'claimBossTrialLiveResults',
    'createBossTrialView',
    'findBossTrialVoteVerdict',
    'getBossTrialView',
    'getPendingBossTrialLifecycleEvents',
    'upsertBossTrialVoteVerdict',
  ],
  '../../src/data/queries/boss-trial-stats': ['getBossTrialStatsRows'],
  '../../src/data/queries/command-logging': [
    'createCommandErrorLog',
    'createCommandExecutionLog',
  ],
  '../../src/data/queries/community-topic-catalog': [
    'areCommunityTopicCatalogTablesPresent',
    'findCommunityTopicCatalog',
  ],
  '../../src/data/queries/community-topic-signals': [
    'areCommunityTopicTablesPresent',
    'getCommunityTopicBossUserShares',
    'getCommunityTopicGameBossStats',
    'getCommunityTopicSignalStats',
  ],
  '../../src/data/queries/database-health': ['pingDatabase'],
  '../../src/data/queries/ping-me': [
    'deletePingMeProfile',
    'findPingMeProfile',
    'findPingMeProfilesForSources',
    'upsertPingMeProfile',
  ],
  '../../src/data/queries/poll-tournament': [
    'arePollTournamentTablesPresent',
    'attachPollTournamentAnnouncement',
    'attachPollTournamentHostMessage',
    'createPollTournament',
    'findAccessibleActivePollTournaments',
    'findManageablePollTournaments',
    'findNominatingPollTournamentsForGuild',
    'findPollTournamentStartCandidate',
    'findRunningPollTournamentViews',
    'getPollTournamentView',
  ],
  '../../src/data/queries/reaction-echo': ['advanceReactionEchoCounter'],
  '../../src/data/queries/stream-info': [
    'buildTargetStreamOverrideUpsertArgs',
    'deleteStreamScheduleOverrideForDate',
    'ensureGuildStreamConfig',
    'findEnabledStreamScheduleDefaults',
    'findGuildStreamConfig',
    'findStreamScheduleOverridesInDateRange',
    'updateDefaultGameName',
    'upsertStreamTitleResetOverride',
    'upsertTargetStreamOverride',
  ],
  '../../src/data/transactions/boss-topic-info': [
    'importCommunityTopicSeed',
    'updateBossGameTopicInfo',
  ],
  '../../src/data/transactions/boss-tracking': [
    'cancelBossTrackingSession',
    'endBossTrackingSession',
    'pauseBossTrackingSession',
    'recordBossTrackingDeath',
    'resumeBossTrackingSession',
    'startBossTrackingSession',
    'updateBossTrackingInfo',
  ],
  '../../src/data/transactions/community-topic-signals': [
    'upsertCommunityTopicMessageSignals',
  ],
  '../../src/data/transactions/davi-boss-stats-sync': [
    'upsertDaviSpreadsheetBossEncounter',
  ],
  '../../src/data/transactions/poll-tournament': [
    'activatePollTournamentBracket',
    'advancePollTournamentRound',
    'claimPollTournamentFinalization',
    'claimPollTournamentStart',
    'completePollTournament',
    'completePollTournamentBracket',
    'finalizePollTournamentStart',
    'nominatePollTournamentOptions',
    'recoverStalePollTournamentClaims',
    'removePollTournamentNominations',
    'releasePollTournamentFinalization',
    'releasePollTournamentStart',
  ],
  '../../src/data/transactions/stream-info': [
    'updateDefaultGameAndTargetStreamOverride',
    'upsertMovedTargetStreamOverride',
  ],
} as const satisfies Record<string, readonly string[]>;

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

test('keeps every runtime DAL export represented in integration coverage', async () => {
  for (const [modulePath, expectedExports] of Object.entries(
    coveredDalExports,
  )) {
    const module = (await import(modulePath)) as Record<string, unknown>;
    const runtimeExports = Object.entries(module)
      .filter(([, value]) => value !== undefined)
      .map(([name]) => name)
      .sort();

    expect(runtimeExports).toEqual([...expectedExports].sort());
  }
});

test('covers data-only DAL helpers and constants', async () => {
  const { hasDurableBossData, hasDurableGameData } = await import(
    '../../src/data/boss-catalog.utils'
  );
  const { OPEN_BOSS_TRACKING_SESSION_STATUSES } = await import(
    '../../src/data/boss-tracking.constants'
  );
  const { HELLO_GREETINGS } = await import('../../src/data/hello-greetings');

  expect(OPEN_BOSS_TRACKING_SESSION_STATUSES).toEqual(['ACTIVE', 'PAUSED']);
  expect(HELLO_GREETINGS.length).toBeGreaterThan(0);
  expect(
    hasDurableBossData({
      topicTerms: [],
      _count: { stats: 0, trials: 0, trackingSessions: 0 },
    }),
  ).toBe(false);
  expect(
    hasDurableBossData({
      topicTerms: [{ createdByUserId: null }],
      _count: { stats: 0, trials: 0, trackingSessions: 0 },
    }),
  ).toBe(true);
  expect(
    hasDurableGameData({
      topicTerms: [],
      defaultStreamGameConfig: null,
      _count: { bosses: 0, trials: 0, trackingSessions: 0 },
    }),
  ).toBe(false);
  expect(
    hasDurableGameData({
      topicTerms: [],
      defaultStreamGameConfig: { guildId },
      _count: { bosses: 0, trials: 0, trackingSessions: 0 },
    }),
  ).toBe(true);
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

  expect(
    queries.buildTargetStreamOverrideUpsertArgs({
      guildId,
      streamDateKey: '2026-06-10',
      resolvedFromWeekday: 'WEDNESDAY',
      startAtUtc: now,
      status: ScheduleStatus.SCHEDULED,
      gameName: 'Builder Game',
    }),
  ).toMatchObject({
    update: { status: ScheduleStatus.SCHEDULED, gameName: 'Builder Game' },
    create: {
      streamKind: null,
      musicMode: null,
      titleOverride: null,
      gameName: 'Builder Game',
    },
  });
  expect(
    queries.buildTargetStreamOverrideUpsertArgs({
      guildId,
      streamDateKey: '2026-06-11',
      resolvedFromWeekday: 'THURSDAY',
      startAtUtc: now,
      gameName: 'Ignored Builder Game',
      createGameName: null,
    }),
  ).toMatchObject({
    update: { gameName: 'Ignored Builder Game' },
    create: { gameName: null },
  });

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
    override: {
      guildId,
      streamDateKey: '2026-06-14',
      resolvedFromWeekday: 'SUNDAY',
      startAtUtc: now,
      status: ScheduleStatus.SCHEDULED,
      gameName: 'Moved Game',
    },
    cancelledOverride: {
      guildId,
      streamDateKey: '2026-06-15',
      resolvedFromWeekday: 'MONDAY',
      startAtUtc: now,
      status: ScheduleStatus.CANCELLED,
    },
  });
  await expect(queries.findGuildStreamConfig(guildId)).resolves.toMatchObject({
    defaultGameName: 'Transaction Game',
  });

  await transactions.upsertMovedTargetStreamOverride({
    guildId,
    defaultGameName: 'Moved Default Game',
    override: {
      guildId,
      streamDateKey: '2026-06-16',
      resolvedFromWeekday: 'TUESDAY',
      startAtUtc: now,
      status: ScheduleStatus.SCHEDULED,
      gameName: 'Ignored Move Game',
    },
    cancelledOverride: {
      guildId,
      streamDateKey: '2026-06-17',
      resolvedFromWeekday: 'WEDNESDAY',
      startAtUtc: now,
      status: ScheduleStatus.CANCELLED,
    },
  });
  await expect(queries.findGuildStreamConfig(guildId)).resolves.toMatchObject({
    defaultGameName: 'Moved Default Game',
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

  const crossGuildId = `${guildId}-other`;
  await trackingTransactions.startBossTrackingSession({
    guildId: crossGuildId,
    channelId: 'other-channel',
    trackerUserId: 'tracker',
    gameName: 'Tracking Game',
    normalizedGameName: 'tracking game',
    bossName: 'Cross Guild Tracking Boss',
    normalizedBossName: 'cross guild tracking boss',
    startDeaths: 12,
    startedAt: new Date(now.getTime() + 1_000),
    topicTerms: [],
  });
  const crossGuildEnded = await trackingTransactions.endBossTrackingSession({
    guildId: crossGuildId,
    result: BossTrackingEndResult.KILLED,
    reconciliation: {
      totalDeaths: 12,
      deathCount: 0,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.TRUSTED,
      reconciliationNote: null,
    },
  });
  await expect(
    trackingQueries.findBossTrackingStatusSession(),
  ).resolves.toMatchObject({
    id: crossGuildEnded.id,
    boss: { name: 'Cross Guild Tracking Boss' },
  });

  await expect(
    trackingQueries.findTrackedGameStatus('tracking game'),
  ).resolves.toMatchObject({
    name: 'Tracking Game',
    trackingSessions: [{ finalDeaths: 12 }],
  });

  await expect(
    trackingTransactions.updateBossTrackingInfo({
      guildId,
      createdByUserId: 'tracker',
      runbackSeconds: 30,
      topicTerms: [],
    }),
  ).resolves.toMatchObject({
    gameName: 'Tracking Game',
    bossName: 'Tracking Boss Prime',
    runbackSeconds: 30,
  });
});

test('covers boss tracking cancellation and orphan cleanup', async () => {
  const trackingTransactions = await import(
    '../../src/data/transactions/boss-tracking'
  );
  const trackingQueries = await import('../../src/data/queries/boss-tracking');
  const { prisma } = await import('../../src/lib/prisma');

  await expect(
    trackingTransactions.cancelBossTrackingSession(guildId),
  ).rejects.toThrow('No boss tracking session is active right now.');

  await trackingTransactions.startBossTrackingSession({
    guildId,
    channelId: 'channel',
    trackerUserId: 'tracker',
    gameName: 'Cancel Game',
    normalizedGameName: 'cancel game',
    bossName: 'Cancel Boss',
    normalizedBossName: 'cancel boss',
    startDeaths: 0,
    topicTerms: [topicTerm('Cancel Alias')],
  });
  const cancelled =
    await trackingTransactions.cancelBossTrackingSession(guildId);
  expect(cancelled.status).toBe('CANCELLED');
  await expect(
    trackingQueries.findLatestBossTrackingSession(guildId),
  ).resolves.toBeNull();
  await expect(
    prisma.bossGame.findUnique({ where: { normalizedName: 'cancel game' } }),
  ).resolves.toBeNull();

  await trackingTransactions.startBossTrackingSession({
    guildId,
    channelId: 'channel',
    trackerUserId: 'tracker',
    gameName: 'Durable Cancel Game',
    normalizedGameName: 'durable cancel game',
    bossName: 'Durable Cancel Boss',
    normalizedBossName: 'durable cancel boss',
    startDeaths: 0,
    topicTerms: [],
  });
  const durableBoss = await prisma.boss.findFirstOrThrow({
    where: {
      normalizedName: 'durable cancel boss',
      game: { normalizedName: 'durable cancel game' },
    },
  });
  await prisma.bossTopicTerm.create({
    data: {
      bossId: durableBoss.id,
      kind: BossTopicTermKind.ALIAS,
      value: 'System Durable Boss',
      normalizedValue: 'system durable boss',
      createdByUserId: null,
    },
  });

  await trackingTransactions.pauseBossTrackingSession({
    guildId,
    reason: null,
  });
  const durableCancelled =
    await trackingTransactions.cancelBossTrackingSession(guildId);
  expect(durableCancelled.status).toBe('CANCELLED');
  await expect(
    prisma.boss.findUnique({ where: { id: durableBoss.id } }),
  ).resolves.toMatchObject({ id: durableBoss.id });
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

test('enforces ping-me source guild direction in the DAL', async () => {
  const queries = await import('../../src/data/queries/ping-me');

  await queries.upsertPingMeProfile({
    userId: 'staging-user',
    sourceGuildId: 'staging',
    keywords: ['olive oil'],
  });
  await queries.upsertPingMeProfile({
    userId: 'prod-user',
    sourceGuildId: 'prod',
    keywords: ['cake'],
  });

  await expect(
    queries.findPingMeProfilesForSources(['staging']),
  ).resolves.toEqual([
    {
      userId: 'staging-user',
      sourceGuildId: 'staging',
      keywords: ['olive oil'],
    },
  ]);
  await expect(
    queries.findPingMeProfilesForSources(['staging', 'prod']),
  ).resolves.toHaveLength(2);
  await expect(queries.findPingMeProfilesForSources([])).toEqual([]);

  await queries.upsertPingMeProfile({
    userId: 'staging-user',
    sourceGuildId: 'staging',
    keywords: ['updated'],
  });
  await expect(
    queries.findPingMeProfile({
      userId: 'staging-user',
      sourceGuildId: 'staging',
    }),
  ).resolves.toMatchObject({ keywords: ['updated'] });

  await expect(
    queries.deletePingMeProfile({
      userId: 'staging-user',
      sourceGuildId: 'staging',
    }),
  ).resolves.toMatchObject({ count: 1 });
});

test('covers poll tournament nomination, bracket, and recovery lifecycle', async () => {
  const queries = await import('../../src/data/queries/poll-tournament');
  const transactions = await import(
    '../../src/data/transactions/poll-tournament'
  );
  const tournament = await queries.createPollTournament({
    guildId,
    hostUserId: 'poll-host',
    hostChannelId: 'host-channel',
    title: 'Best Game',
    maxNominationsPerUser: 3,
  });

  await expect(queries.arePollTournamentTablesPresent()).resolves.toBe(true);
  await queries.attachPollTournamentHostMessage({
    tournamentId: tournament.id,
    hostMessageId: 'host-message',
  });

  await expect(
    transactions.nominatePollTournamentOptions({
      tournamentId: tournament.id,
      guildId,
      nominatorUserId: 'nominator-1',
      nominations: [
        { text: 'A', normalizedText: 'a' },
        { text: 'B', normalizedText: 'b' },
        { text: 'C', normalizedText: 'c' },
      ],
    }),
  ).resolves.toMatchObject({
    outcome: 'SAVED',
    usedCount: 3,
    uniqueCount: 3,
    nominatorCount: 1,
  });
  await expect(
    transactions.nominatePollTournamentOptions({
      tournamentId: tournament.id,
      guildId,
      nominatorUserId: 'nominator-1',
      nominations: [{ text: 'G', normalizedText: 'g' }],
    }),
  ).resolves.toEqual({
    outcome: 'LIMIT_REACHED',
    usedCount: 3,
    maxNominationsPerUser: 3,
  });
  await transactions.nominatePollTournamentOptions({
    tournamentId: tournament.id,
    guildId,
    nominatorUserId: 'nominator-2',
    nominations: [
      { text: 'a', normalizedText: 'a' },
      { text: 'D', normalizedText: 'd' },
      { text: 'E', normalizedText: 'e' },
    ],
  });
  await transactions.nominatePollTournamentOptions({
    tournamentId: tournament.id,
    guildId,
    nominatorUserId: 'nominator-3',
    nominations: [{ text: 'F', normalizedText: 'f' }],
  });

  await expect(
    queries.findNominatingPollTournamentsForGuild(guildId),
  ).resolves.toEqual([
    { id: tournament.id, title: 'Best Game', hostUserId: 'poll-host' },
  ]);
  await expect(
    queries.findAccessibleActivePollTournaments({
      userId: 'someone-else',
      canAccessAll: false,
    }),
  ).resolves.toEqual([]);
  await expect(
    queries.findAccessibleActivePollTournaments({
      userId: 'someone-else',
      canAccessAll: true,
    }),
  ).resolves.toHaveLength(1);
  await expect(
    queries.findManageablePollTournaments({
      userId: 'poll-host',
      canAccessAll: false,
    }),
  ).resolves.toHaveLength(1);

  await transactions.removePollTournamentNominations({
    tournamentId: tournament.id,
    normalizedText: 'e',
    removedByUserId: 'poll-host',
    removedAt: now,
  });
  await transactions.nominatePollTournamentOptions({
    tournamentId: tournament.id,
    guildId,
    nominatorUserId: 'nominator-2',
    nominations: [{ text: 'E', normalizedText: 'e' }],
  });

  await expect(
    transactions.claimPollTournamentStart({
      tournamentId: tournament.id,
      hostUserId: 'not-the-host',
    }),
  ).resolves.toBe(false);
  await expect(
    transactions.claimPollTournamentStart({
      tournamentId: tournament.id,
      hostUserId: 'poll-host',
    }),
  ).resolves.toBe(true);
  await transactions.releasePollTournamentStart(tournament.id);
  await transactions.claimPollTournamentStart({
    tournamentId: tournament.id,
    hostUserId: 'poll-host',
  });

  const optionValues = ['a', 'b', 'c', 'd', 'e', 'f'];
  await transactions.finalizePollTournamentStart({
    tournamentId: tournament.id,
    plannedDurationDays: 10,
    startedAt: now,
    bracketStartIntervalMs: 86_400_000,
    pollDurationMs: 259_200_000,
    options: optionValues.map((value, index) => ({
      text: value.toUpperCase(),
      normalizedText: value,
      seedOrder: index,
      tieBreakOrder: optionValues.length - index - 1,
    })),
    rounds: [
      { kind: 'ELIMINATION', bracketSizes: [3, 3] },
      { kind: 'FINAL', bracketSizes: [2] },
    ],
  });
  await queries.attachPollTournamentAnnouncement({
    tournamentId: tournament.id,
    announcementMessageId: 'announcement-message',
  });

  let view = await queries.getPollTournamentView(tournament.id);
  expect(view.status).toBe('RUNNING');
  expect(view.rounds).toHaveLength(2);
  await expect(queries.findRunningPollTournamentViews()).resolves.toHaveLength(
    1,
  );

  const firstRound = view.rounds[0];
  expect(firstRound).toBeDefined();
  const winnerOptionIds: string[] = [];

  for (const [bracketIndex, bracket] of (
    firstRound?.brackets ?? []
  ).entries()) {
    const startedAt = new Date(now.getTime() + bracketIndex * 86_400_000);
    await transactions.activatePollTournamentBracket({
      bracketId: bracket.id,
      messageId: `bracket-message-${bracketIndex}`,
      startedAt,
      endsAt: new Date(startedAt.getTime() + 259_200_000),
      bracketStartIntervalMs: 86_400_000,
    });
    const winningEntry = bracket.entries[0];
    expect(winningEntry).toBeDefined();
    winnerOptionIds.push(winningEntry?.optionId ?? 'missing');
    await expect(
      transactions.completePollTournamentBracket({
        bracketId: bracket.id,
        results: bracket.entries.map((entry, index) => ({
          entryId: entry.id,
          voteCount: index === 0 ? 5 : 1,
        })),
      }),
    ).resolves.toBe(true);
  }

  await expect(
    transactions.advancePollTournamentRound({
      currentRoundId: firstRound?.id ?? 'missing',
      winnerOptionIds,
      nextStartsAt: new Date(now.getTime() + 432_000_000),
      bracketStartIntervalMs: 86_400_000,
      pollDurationMs: 259_200_000,
    }),
  ).resolves.toBe(true);
  view = await queries.getPollTournamentView(tournament.id);
  const finalBracket = view.rounds[1]?.brackets[0];
  expect(finalBracket?.entries).toHaveLength(2);
  await transactions.activatePollTournamentBracket({
    bracketId: finalBracket?.id ?? 'missing',
    messageId: 'final-message',
    startedAt: new Date(now.getTime() + 432_000_000),
    endsAt: new Date(now.getTime() + 691_200_000),
    bracketStartIntervalMs: 86_400_000,
  });
  await transactions.completePollTournamentBracket({
    bracketId: finalBracket?.id ?? 'missing',
    results: (finalBracket?.entries ?? []).map((entry, index) => ({
      entryId: entry.id,
      voteCount: index === 0 ? 8 : 4,
    })),
  });

  await expect(
    transactions.claimPollTournamentFinalization(tournament.id),
  ).resolves.toBe(true);
  await transactions.releasePollTournamentFinalization(tournament.id);
  await transactions.claimPollTournamentFinalization(tournament.id);
  await transactions.recoverStalePollTournamentClaims(
    new Date('2030-01-01T00:00:00.000Z'),
  );
  await expect(
    queries.getPollTournamentView(tournament.id),
  ).resolves.toMatchObject({ status: 'RUNNING' });
  await transactions.claimPollTournamentFinalization(tournament.id);
  await transactions.completePollTournament({
    tournamentId: tournament.id,
    completedAt: new Date('2026-06-30T00:00:00.000Z'),
  });
  await expect(
    queries.getPollTournamentView(tournament.id),
  ).resolves.toMatchObject({ status: 'COMPLETED' });

  const customLimitTournament = await queries.createPollTournament({
    guildId,
    hostUserId: 'custom-limit-host',
    hostChannelId: 'host-channel',
    title: 'Five Nominations Each',
    maxNominationsPerUser: 5,
  });
  await expect(
    transactions.nominatePollTournamentOptions({
      tournamentId: customLimitTournament.id,
      guildId,
      nominatorUserId: 'custom-limit-user',
      nominations: ['one', 'two', 'three', 'four', 'five'].map((value) => ({
        text: value,
        normalizedText: value,
      })),
    }),
  ).resolves.toMatchObject({
    outcome: 'SAVED',
    usedCount: 5,
    maxNominationsPerUser: 5,
  });
  await expect(
    transactions.nominatePollTournamentOptions({
      tournamentId: customLimitTournament.id,
      guildId,
      nominatorUserId: 'custom-limit-user',
      nominations: [{ text: 'six', normalizedText: 'six' }],
    }),
  ).resolves.toEqual({
    outcome: 'LIMIT_REACHED',
    usedCount: 5,
    maxNominationsPerUser: 5,
  });

  const concurrentTournament = await queries.createPollTournament({
    guildId,
    hostUserId: 'concurrent-host',
    hostChannelId: 'host-channel',
    title: 'Concurrent Poll',
    maxNominationsPerUser: 3,
  });
  const concurrentResults = await Promise.all([
    transactions.nominatePollTournamentOptions({
      tournamentId: concurrentTournament.id,
      guildId,
      nominatorUserId: 'concurrent-user',
      nominations: [
        { text: 'One', normalizedText: 'one' },
        { text: 'Two', normalizedText: 'two' },
      ],
    }),
    transactions.nominatePollTournamentOptions({
      tournamentId: concurrentTournament.id,
      guildId,
      nominatorUserId: 'concurrent-user',
      nominations: [
        { text: 'Three', normalizedText: 'three' },
        { text: 'Four', normalizedText: 'four' },
      ],
    }),
  ]);
  expect(concurrentResults.map(({ outcome }) => outcome).sort()).toEqual([
    'LIMIT_REACHED',
    'SAVED',
  ]);
  await expect(
    queries.getPollTournamentView(concurrentTournament.id),
  ).resolves.toMatchObject({ nominations: [{}, {}] });

  const staleTournament = await queries.createPollTournament({
    guildId,
    hostUserId: 'stale-host',
    hostChannelId: 'host-channel',
    title: 'Stale Poll',
    maxNominationsPerUser: 3,
  });
  await transactions.claimPollTournamentStart({
    tournamentId: staleTournament.id,
    hostUserId: 'stale-host',
  });
  await transactions.recoverStalePollTournamentClaims(
    new Date('2030-01-01T00:00:00.000Z'),
  );
  await expect(
    queries.findPollTournamentStartCandidate(staleTournament.id),
  ).resolves.toMatchObject({ status: 'NOMINATING' });
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

test('atomically advances and resets reaction echo counters', async () => {
  const { advanceReactionEchoCounter } = await import(
    '../../src/data/queries/reaction-echo'
  );
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      advanceReactionEchoCounter({
        ruleId: 'choccy-milk-sticker',
        every: 20,
        incrementBy: 1,
      }),
    ),
  );

  expect(results.filter(Boolean)).toHaveLength(1);
  await expect(
    advanceReactionEchoCounter({
      ruleId: 'choccy-milk-sticker',
      every: 20,
      incrementBy: 1,
    }),
  ).resolves.toBe(false);

  const { prisma } = await import('../../src/lib/prisma');
  await expect(
    prisma.reactionEchoCounter.findUnique({
      where: { ruleId: 'choccy-milk-sticker' },
      select: { count: true },
    }),
  ).resolves.toEqual({ count: 1 });
});
