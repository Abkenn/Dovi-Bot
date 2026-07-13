import { EmbedBuilder } from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  BossTrackingAttemptResult,
  BossTrackingAttemptTimingStatus,
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../src/generated/prisma/enums';
import type { BossTrackingSessionView } from '../../src/modules/boss-tracking/boss-tracking.types';
import { getBossTrackingReconciliationFromBossDeaths } from '../../src/modules/boss-tracking/boss-tracking.utils';
import {
  calculateBossTrackingAverageAttemptTime,
  getBossTrackingAverageAttemptCount,
  getBossTrackingCompletedAttemptCount,
  getBossTrackingSessionTotalAttemptSeconds,
  getBossTrackingSessionWinningAttemptSeconds,
  summarizeBossTrackingSessions,
} from '../../src/modules/boss-tracking/boss-tracking-stats';
import {
  addBossStatsField,
  addBotTrackedBossStatsField,
} from '../../src/modules/bosses/bosses.discord';
import {
  summarizeRecentBossEncounters,
  summarizeTrackedGameStatus,
} from '../../src/modules/bosses/bosses.stats';
import { embedFieldToLabelValueRows } from '../utils/discord-output';

type AttemptCommand = {
  at: string;
  startedAt?: string;
  result: BossTrackingAttemptResult;
  runbackSeconds?: number | null;
  vodStartSeconds?: number | null;
  vodEndSeconds?: number | null;
};

type PauseCommand = {
  startedAt: string;
  endedAt: string;
};

type TrackingScenarioInput = {
  sessionId: string;
  bossName: string;
  startAt: string;
  endAt: string;
  startDeaths: number;
  finalDeaths: number;
  bossRunbackSeconds?: number | null;
  attempts: AttemptCommand[];
  pauses?: PauseCommand[];
  recordedDeathCount?: number;
  vodLabel?: string | null;
  vodStartSeconds?: number | null;
  vodEndSeconds?: number | null;
};

const commandTime = (value: string) => new Date(`${value.replace(' ', 'T')}Z`);

const secondsBetween = (start: string, end: string) =>
  Math.floor(
    (commandTime(end).getTime() - commandTime(start).getTime()) / 1000,
  );

const totalPauseSeconds = (pauses: readonly PauseCommand[] = []) =>
  pauses.reduce(
    (sum, pause) => sum + secondsBetween(pause.startedAt, pause.endedAt),
    0,
  );

const getAttemptStartedAt = ({
  attempt,
  attempts,
  index,
  sessionStartedAt,
}: {
  attempt: AttemptCommand;
  attempts: AttemptCommand[];
  index: number;
  sessionStartedAt: string;
}) => {
  if (attempt.startedAt !== undefined) {
    return commandTime(attempt.startedAt);
  }

  if (index === 0) {
    return commandTime(sessionStartedAt);
  }

  const previousAttempt = attempts[index - 1];
  if (!previousAttempt) {
    throw new Error(`Missing previous attempt for index ${index}`);
  }

  return commandTime(previousAttempt.at);
};

const TEST_GAME = {
  id: 'test-game',
  name: 'Test Game',
  normalizedName: 'test game',
};

const makeTrackingScenario = ({
  sessionId,
  bossName,
  startAt,
  endAt,
  startDeaths,
  finalDeaths,
  bossRunbackSeconds = null,
  attempts,
  pauses = [],
  recordedDeathCount,
  vodLabel = null,
  vodStartSeconds = null,
  vodEndSeconds = null,
}: TrackingScenarioInput): BossTrackingSessionView => {
  const deathCount = finalDeaths - startDeaths;

  return {
    id: sessionId,
    guildId: 'guild-1',
    channelId: 'channel-1',
    trackerUserId: 'user-1',
    status: BossTrackingSessionStatus.ENDED,
    startDeaths,
    deathCount,
    recordedDeathCount: recordedDeathCount ?? deathCount,
    finalDeaths,
    manualTrackedSeconds: null,
    vodLabel,
    vodStartSeconds,
    vodEndSeconds,
    attemptTimingStatus: BossTrackingAttemptTimingStatus.TRUSTED,
    reconciliationNote: null,
    totalPausedSeconds: totalPauseSeconds(pauses),
    pausedAt: null,
    startedAt: commandTime(startAt),
    focusedAt: commandTime(endAt),
    endedAt: commandTime(endAt),
    endResult: BossTrackingEndResult.KILLED,
    notes: null,
    game: TEST_GAME,
    boss: {
      id: bossName.toLowerCase().replaceAll(' ', '-'),
      name: bossName,
      normalizedName: bossName.toLowerCase(),
      runbackSeconds: bossRunbackSeconds,
      game: TEST_GAME,
    },
    attempts: attempts.map((attempt, index) => ({
      id: `${sessionId}-attempt-${index + 1}`,
      attemptNumber: index + 1,
      startedAt: getAttemptStartedAt({
        attempt,
        attempts,
        index,
        sessionStartedAt: startAt,
      }),
      endedAt: commandTime(attempt.at),
      vodStartSeconds: attempt.vodStartSeconds ?? null,
      vodEndSeconds: attempt.vodEndSeconds ?? null,
      runbackSeconds: attempt.runbackSeconds ?? null,
      result: attempt.result,
    })),
    pauses: pauses.map((pause, index) => ({
      id: `${sessionId}-pause-${index + 1}`,
      startedAt: commandTime(pause.startedAt),
      endedAt: commandTime(pause.endedAt),
      reason: null,
      vodLabel: null,
      vodResumeSeconds: null,
    })),
  };
};

const botTrackedRowsFor = (session: BossTrackingSessionView) =>
  embedFieldToLabelValueRows(
    addBotTrackedBossStatsField(new EmbedBuilder(), {
      runbackSeconds: session.boss.runbackSeconds,
      trackingSessions: [session],
    }),
    'Bot-tracked stats',
  );

const oneDeathRunbackScenario = () =>
  makeTrackingScenario({
    sessionId: 'one-death-runback-session',
    bossName: 'One Death Boss',
    startAt: '2026-06-12 21:39:15.731',
    endAt: '2026-06-12 21:44:23.387',
    startDeaths: 54,
    finalDeaths: 55,
    bossRunbackSeconds: 160,
    attempts: [
      {
        at: '2026-06-12 21:40:30.664',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-12 21:44:23.387',
        result: BossTrackingAttemptResult.KILLED,
      },
    ],
  });

const multiDeathPausedScenario = () =>
  makeTrackingScenario({
    sessionId: 'multi-death-paused-session',
    bossName: 'Multi Death Paused Boss',
    startAt: '2026-06-13 18:44:34.933',
    endAt: '2026-06-13 19:10:41.532',
    startDeaths: 56,
    finalDeaths: 66,
    bossRunbackSeconds: 30,
    attempts: [
      {
        at: '2026-06-13 18:45:41.481',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 18:48:43.825',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 18:51:32.031',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 18:55:04.930',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 18:57:46.746',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 19:00:38.707',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 19:01:56.293',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 19:03:51.806',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 19:05:38.773',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 19:08:03.962',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 19:10:41.532',
        result: BossTrackingAttemptResult.KILLED,
      },
    ],
    pauses: [
      {
        startedAt: '2026-06-13 18:47:13.113',
        endedAt: '2026-06-13 18:48:04.458',
      },
      {
        startedAt: '2026-06-13 18:49:54.878',
        endedAt: '2026-06-13 18:50:51.692',
      },
      {
        startedAt: '2026-06-13 18:52:27.506',
        endedAt: '2026-06-13 18:54:06.961',
      },
    ],
  });

const gameDeathsCorrectionScenario = () =>
  makeTrackingScenario({
    sessionId: 'game-deaths-correction-session',
    bossName: 'Game Deaths Correction Boss',
    startAt: '2026-06-13 21:27:16.407',
    endAt: '2026-06-13 21:44:10.084',
    startDeaths: 77,
    finalDeaths: 84,
    bossRunbackSeconds: 18,
    attempts: [
      {
        at: '2026-06-13 21:27:55.186',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 21:28:40.818',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 21:33:55.523',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 21:34:52.266',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 21:36:48.315',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 21:37:51.463',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 21:40:24.696',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-13 21:44:10.084',
        result: BossTrackingAttemptResult.KILLED,
      },
    ],
    pauses: [
      {
        startedAt: '2026-06-13 21:28:05.828',
        endedAt: '2026-06-13 21:28:16.689',
      },
      {
        startedAt: '2026-06-13 21:29:50.793',
        endedAt: '2026-06-13 21:33:23.908',
      },
    ],
  });

const vodPauseThenLiveScenario = () =>
  makeTrackingScenario({
    sessionId: 'vod-pause-then-live-session',
    bossName: 'Vod Pause Then Live Boss',
    startAt: '2026-06-06 22:27:34.833',
    endAt: '2026-06-12 19:04:02.653',
    startDeaths: 36,
    finalDeaths: 44,
    bossRunbackSeconds: 50,
    vodLabel: 'vod-a',
    vodStartSeconds: 14_583,
    attempts: [
      {
        at: '2026-06-06 22:28:04.124',
        vodStartSeconds: 14_583,
        vodEndSeconds: 14_745,
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        startedAt: '2026-06-12 18:10:14.268',
        at: '2026-06-12 18:13:51.824',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-12 18:19:23.745',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-12 18:35:01.101',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-12 18:43:15.939',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-12 18:49:18.461',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-12 18:54:50.609',
        result: BossTrackingAttemptResult.DEATH,
      },
      {
        at: '2026-06-12 19:04:02.653',
        result: BossTrackingAttemptResult.KILLED,
      },
    ],
    pauses: [
      {
        startedAt: '2026-06-06 22:28:15.146',
        endedAt: '2026-06-12 18:10:14.268',
      },
      {
        startedAt: '2026-06-12 18:24:08.577',
        endedAt: '2026-06-12 18:29:43.088',
      },
    ],
  });

describe('boss tracking stats', () => {
  it('uses a one-death start, death, end, and later runback update flow', () => {
    const rows = botTrackedRowsFor(oneDeathRunbackScenario());

    expect(rows).toEqual({
      Deaths: '1',
      'Total attempt time': '5m 7s',
      Killed: 'Yes',
      'Avg attempt': '1m 13s',
      'Winning attempt': '1m 12s',
      'Total attempt time (without runbacks)': '2m 26s',
    });
  });

  it('does not count pause time as fight time', () => {
    const rows = botTrackedRowsFor(multiDeathPausedScenario());

    expect(rows).toMatchObject({
      Deaths: '10',
      'Total attempt time': '22m 40s',
      'Avg attempt': '1m 36s',
      'Winning attempt': '2m 7s',
      'Total attempt time (without runbacks)': '17m 36s',
    });
  });

  it('keeps final game deaths separate from boss deaths', () => {
    const rows = botTrackedRowsFor(gameDeathsCorrectionScenario());

    expect(rows).toMatchObject({
      Deaths: '7',
      'Total attempt time': '13m 10s',
      'Avg attempt': '1m 23s',
      'Winning attempt': '3m 27s',
      'Total attempt time (without runbacks)': '11m 4s',
    });
  });

  it('keeps VOD start, long pause, live resume, and later runback usable', () => {
    const rows = botTrackedRowsFor(vodPauseThenLiveScenario());

    expect(rows).toMatchObject({
      Deaths: '8',
      Killed: 'Yes',
      'Avg attempt': '5m 44s',
      'Winning attempt': '8m 22s',
      'Total attempt time (without runbacks)': '45m 52s',
    });
  });

  it('prefers imported raw winning attempt over bot-tracked winning attempt', () => {
    const rows = embedFieldToLabelValueRows(
      addBossStatsField(new EmbedBuilder(), {
        stats: [
          {
            deaths: null,
            totalAttemptTimeSeconds: null,
            winningAttemptTimeSeconds: 232,
            difficultyCoefficient: null,
          },
        ],
        runbackSeconds: 160,
        trackingSessions: [oneDeathRunbackScenario()],
      }),
      'Davi stats',
    );

    expect(rows).toMatchObject({
      Deaths: '1',
      'Winning attempt': '3m 52s',
    });
  });

  it('uses bot-tracked winning attempt when no imported boss record exists', () => {
    const rows = embedFieldToLabelValueRows(
      addBossStatsField(new EmbedBuilder(), {
        stats: [],
        runbackSeconds: 160,
        trackingSessions: [oneDeathRunbackScenario()],
      }),
      'Davi stats',
    );

    expect(rows).toMatchObject({
      Deaths: '1',
      'Winning attempt': '1m 12s',
    });
  });

  it('reconciles final game deaths without rewriting boss deaths', () => {
    const reconciliation = getBossTrackingReconciliationFromBossDeaths({
      deathCount: 7,
      totalDeaths: 84,
      recordedDeathCount: 7,
    });

    expect(reconciliation).toEqual({
      totalDeaths: 84,
      deathCount: 7,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.TRUSTED,
      reconciliationNote: null,
    });
  });

  it('uses final game deaths for ended game tracking status', () => {
    const correctionScenario = gameDeathsCorrectionScenario();
    const status = summarizeTrackedGameStatus({
      name: TEST_GAME.name,
      trackingSessions: [
        {
          startDeaths: correctionScenario.startDeaths,
          deathCount: correctionScenario.deathCount,
          finalDeaths: correctionScenario.finalDeaths,
        },
      ],
      bosses: [
        {
          id: correctionScenario.boss.id,
          name: correctionScenario.boss.name,
          trackingSessions: [
            {
              deathCount: correctionScenario.deathCount,
              endResult: BossTrackingEndResult.KILLED,
            },
          ],
        },
      ],
    });

    expect(status).toEqual({
      gameName: TEST_GAME.name,
      deaths: 84,
      killedBossCount: 1,
      pendingBossCount: 0,
    });
  });

  it('uses imported encounters when a legacy game has no tracked sessions', () => {
    const status = summarizeTrackedGameStatus({
      name: 'Elden Ring',
      trackingSessions: [],
      bosses: [
        {
          id: 'margit',
          name: 'Margit',
          stats: [{ deaths: 8 }],
          trackingSessions: [],
        },
        {
          id: 'godrick',
          name: 'Godrick',
          stats: [{ deaths: 4 }],
          trackingSessions: [],
        },
      ],
    });

    expect(status).toEqual({
      gameName: 'Elden Ring',
      deaths: 12,
      killedBossCount: 2,
      pendingBossCount: 0,
    });
  });

  it('shows imported encounters when no recent tracked encounters exist', () => {
    expect(
      summarizeRecentBossEncounters([
        {
          name: 'Margit',
          stats: [
            {
              deaths: 8,
              totalAttemptTimeSeconds: 900,
              winningAttemptTimeSeconds: 120,
              difficultyCoefficient: null,
            },
          ],
          trackingSessions: [],
        },
      ]),
    ).toEqual([
      {
        bossName: 'Margit',
        deaths: 8,
        averageAttemptSeconds: 100,
        winningAttemptSeconds: 120,
      },
    ]);
  });

  it('summarizes the three most recently fought distinct bosses', () => {
    const oldest = oneDeathRunbackScenario();
    const middle = multiDeathPausedScenario();
    const newest = gameDeathsCorrectionScenario();
    const latestPending = {
      ...vodPauseThenLiveScenario(),
      focusedAt: commandTime('2026-06-14 19:04:02.653'),
      endResult: BossTrackingEndResult.ABANDONED,
    };

    expect(
      summarizeRecentBossEncounters([
        { name: oldest.boss.name, trackingSessions: [oldest] },
        { name: middle.boss.name, trackingSessions: [middle] },
        { name: newest.boss.name, trackingSessions: [newest] },
        {
          name: latestPending.boss.name,
          trackingSessions: [latestPending],
        },
      ]),
    ).toEqual([
      {
        bossName: latestPending.boss.name,
        deaths: 8,
        averageAttemptSeconds: 344,
        winningAttemptSeconds: null,
      },
      {
        bossName: newest.boss.name,
        deaths: 7,
        averageAttemptSeconds: 83,
        winningAttemptSeconds: 207,
      },
      {
        bossName: middle.boss.name,
        deaths: 10,
        averageAttemptSeconds: 96,
        winningAttemptSeconds: 127,
      },
    ]);
  });

  it('falls back to recorded deaths for attempt count when attempts are absent', () => {
    const killedSession = {
      ...oneDeathRunbackScenario(),
      attempts: [],
      recordedDeathCount: 2,
      deathCount: 2,
      endResult: BossTrackingEndResult.KILLED,
    };
    const abandonedSession = {
      ...killedSession,
      endResult: BossTrackingEndResult.ABANDONED,
    };

    expect(getBossTrackingCompletedAttemptCount(killedSession)).toBe(3);
    expect(getBossTrackingCompletedAttemptCount(abandonedSession)).toBe(2);
  });

  it('uses summary attempt count when final deaths exceed recorded deaths and summary time exists', () => {
    const session = {
      ...oneDeathRunbackScenario(),
      deathCount: 3,
      recordedDeathCount: 1,
      manualTrackedSeconds: 300,
    };

    expect(getBossTrackingAverageAttemptCount(session)).toBe(4);
  });

  it('uses manual tracked seconds before live session duration', () => {
    const session = {
      ...oneDeathRunbackScenario(),
      manualTrackedSeconds: 123,
    };

    expect(getBossTrackingSessionTotalAttemptSeconds(session)).toBe(123);
  });

  it('uses VOD summary range before live session duration', () => {
    const session = {
      ...oneDeathRunbackScenario(),
      vodStartSeconds: 50,
      vodEndSeconds: 170,
    };

    expect(getBossTrackingSessionTotalAttemptSeconds(session)).toBe(120);
  });

  it('returns no total attempt time for active sessions without manual or VOD summary time', () => {
    const session = {
      ...oneDeathRunbackScenario(),
      endedAt: null,
      endResult: null,
      status: BossTrackingSessionStatus.ACTIVE,
    };

    expect(getBossTrackingSessionTotalAttemptSeconds(session)).toBeNull();
  });

  it('reports partial VOD attempt timing before calculating averages', () => {
    const session = oneDeathRunbackScenario();
    const firstAttempt = session.attempts[0];

    if (!firstAttempt) {
      throw new Error('Expected test session to have a first attempt.');
    }

    firstAttempt.endedAt = null;
    firstAttempt.vodStartSeconds = 10;

    expect(calculateBossTrackingAverageAttemptTime(session)).toEqual({
      seconds: null,
      reason: 'partial attempt times',
    });
  });

  it('reports missing VOD attempt timing when a VOD session has untimed attempts', () => {
    const session = {
      ...oneDeathRunbackScenario(),
      vodLabel: 'vod-a',
    };
    const firstAttempt = session.attempts[0];

    if (!firstAttempt) {
      throw new Error('Expected test session to have a first attempt.');
    }

    firstAttempt.endedAt = null;

    expect(calculateBossTrackingAverageAttemptTime(session)).toEqual({
      seconds: null,
      reason: 'missing attempt times',
    });
  });

  it('does not treat a live resume without VOD metadata as a missing VOD attempt', () => {
    const session = {
      ...oneDeathRunbackScenario(),
      vodLabel: 'vod-a',
      pauses: [
        {
          id: 'pause-1',
          startedAt: commandTime('2026-06-12 21:40:00.000'),
          endedAt: commandTime('2026-06-12 21:41:00.000'),
          reason: null,
          vodLabel: null,
          vodResumeSeconds: null,
        },
      ],
    };
    const firstAttempt = session.attempts[0];

    if (!firstAttempt) {
      throw new Error('Expected test session to have a first attempt.');
    }

    firstAttempt.startedAt = commandTime('2026-06-12 21:41:03.000');
    firstAttempt.endedAt = null;

    expect(calculateBossTrackingAverageAttemptTime(session)).toEqual({
      seconds: 102,
      reason: null,
    });
  });

  it('requires average runback when summary deaths exceed recorded deaths', () => {
    const baseSession = oneDeathRunbackScenario();
    const session = {
      ...baseSession,
      deathCount: 3,
      recordedDeathCount: 1,
      manualTrackedSeconds: 300,
      boss: {
        ...baseSession.boss,
        runbackSeconds: null,
      },
    };

    expect(calculateBossTrackingAverageAttemptTime(session)).toEqual({
      seconds: null,
      reason: 'average runback time not added',
    });
  });

  it('uses summary timing when final deaths add missed deaths and runback is known', () => {
    const baseSession = oneDeathRunbackScenario();
    const session = {
      ...baseSession,
      deathCount: 3,
      recordedDeathCount: 1,
      manualTrackedSeconds: 300,
      boss: {
        ...baseSession.boss,
        runbackSeconds: 40,
      },
    };

    expect(calculateBossTrackingAverageAttemptTime(session)).toEqual({
      seconds: 45,
      reason: null,
    });
  });

  it('does not trust reconciled lower-or-equal death counts for average timing', () => {
    const session = {
      ...oneDeathRunbackScenario(),
      attemptTimingStatus: BossTrackingAttemptTimingStatus.RECONCILED,
    };

    expect(calculateBossTrackingAverageAttemptTime(session)).toEqual({
      seconds: null,
      reason: 'death count was reconciled',
    });
  });

  it('ignores in-progress attempts and unresolved wins in session summaries', () => {
    const session = {
      ...oneDeathRunbackScenario(),
      endResult: BossTrackingEndResult.KILLED,
      attempts: [
        {
          id: 'attempt-1',
          attemptNumber: 1,
          startedAt: commandTime('2026-06-12 21:39:15.731'),
          endedAt: commandTime('2026-06-12 21:40:15.731'),
          vodStartSeconds: null,
          vodEndSeconds: null,
          runbackSeconds: null,
          result: BossTrackingAttemptResult.DEATH,
        },
        {
          id: 'attempt-2',
          attemptNumber: 2,
          startedAt: commandTime('2026-06-12 21:40:15.731'),
          endedAt: null,
          vodStartSeconds: null,
          vodEndSeconds: null,
          runbackSeconds: null,
          result: BossTrackingAttemptResult.IN_PROGRESS,
        },
      ],
    };

    expect(getBossTrackingSessionWinningAttemptSeconds(session)).toBeNull();
    expect(summarizeBossTrackingSessions([session])).toMatchObject({
      averageAttemptSeconds: 60,
      averageAttemptCount: 1,
      winningAttemptSeconds: null,
    });
  });
});
