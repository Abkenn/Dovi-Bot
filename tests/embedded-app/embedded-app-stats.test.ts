import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BossTrackingAttemptResult,
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../src/generated/prisma/enums';

const queries = vi.hoisted(() => ({
  findEmbeddedAppGameStats: vi.fn(),
  getStreamInfo: vi.fn(),
}));

vi.mock('../../src/data/queries/embedded-app-stats', () => ({
  findEmbeddedAppGameStats: queries.findEmbeddedAppGameStats,
}));

vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: {
    STAGING_ENV: 'staging-guild',
    PROD_ENV: 'production-guild',
  },
}));

vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: queries.getStreamInfo,
}));

import { getEmbeddedAppStats } from '../../src/modules/embedded-app/embedded-app-stats.service';

const attempt = {
  id: 'attempt-3',
  attemptNumber: 3,
  startedAt: new Date('2026-07-10T18:00:00.000Z'),
  endedAt: null,
  vodStartSeconds: null,
  vodEndSeconds: null,
  runbackSeconds: null as number | null,
  result: BossTrackingAttemptResult.IN_PROGRESS,
};

const makeSession = ({
  id,
  bossName,
  status,
  endResult,
  deathCount,
  startedAt,
  endedAt,
}: {
  id: string;
  bossName: string;
  status: BossTrackingSessionStatus;
  endResult: BossTrackingEndResult | null;
  deathCount: number;
  startedAt: Date;
  endedAt: Date | null;
}) => ({
  id,
  guildId: 'staging-guild',
  channelId: 'channel-1',
  trackerUserId: 'tracker-1',
  status,
  startDeaths: 0,
  deathCount,
  recordedDeathCount: deathCount,
  finalDeaths: null,
  manualTrackedSeconds: null,
  vodLabel: null,
  vodStartSeconds: null,
  vodEndSeconds: null,
  attemptTimingStatus: 'TRUSTED' as const,
  reconciliationNote: null,
  totalPausedSeconds: 0,
  pausedAt: null,
  startedAt,
  focusedAt: endedAt ?? startedAt,
  endedAt,
  endResult,
  notes: null,
  game: {
    id: 'game-1',
    name: 'Dark Souls III',
    normalizedName: 'dark souls iii',
  },
  boss: {
    id: `boss-${id}`,
    name: bossName,
    normalizedName: bossName.toLowerCase(),
    runbackSeconds: 80,
    game: {
      id: 'game-1',
      name: 'Dark Souls III',
      normalizedName: 'dark souls iii',
    },
  },
  attempts: status === BossTrackingSessionStatus.ACTIVE ? [attempt] : [],
  pauses: [],
});

describe('embedded app stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current encounter and every imported, killed, or open boss', async () => {
    const killed = makeSession({
      id: 'killed',
      bossName: 'Iudex Gundyr',
      status: BossTrackingSessionStatus.ENDED,
      endResult: BossTrackingEndResult.KILLED,
      deathCount: 7,
      startedAt: new Date('2026-07-10T17:00:00.000Z'),
      endedAt: new Date('2026-07-10T17:30:00.000Z'),
    });
    const previousStream = makeSession({
      id: 'previous',
      bossName: 'Abyss Watchers',
      status: BossTrackingSessionStatus.ENDED,
      endResult: BossTrackingEndResult.KILLED,
      deathCount: 10,
      startedAt: new Date('2026-07-09T17:00:00.000Z'),
      endedAt: new Date('2026-07-09T17:45:00.000Z'),
    });
    const current = makeSession({
      id: 'current',
      bossName: 'Vordt',
      status: BossTrackingSessionStatus.ACTIVE,
      endResult: null,
      deathCount: 3,
      startedAt: new Date('2026-07-10T17:45:00.000Z'),
      endedAt: null,
    });
    queries.findEmbeddedAppGameStats.mockResolvedValue({
      game: { id: 'game-1', name: 'Dark Souls III' },
      gameDeaths: 130,
      sessions: [current, killed, previousStream],
      archiveGames: [
        {
          id: 'game-1',
          name: 'Dark Souls III',
          trackingSessions: [
            { startDeaths: 0, deathCount: 178, finalDeaths: 178 },
          ],
          bosses: [
            ...Array.from({ length: 19 }, (_, index) => ({
              id: `imported-${index}`,
              name: `Imported Boss ${index + 1}`,
              stats: [{ deaths: 19 - index }],
              trackingSessions: [],
            })),
            {
              id: 'boss-killed',
              name: 'Iudex Gundyr',
              stats: [],
              trackingSessions: [
                {
                  deathCount: 7,
                  endResult: BossTrackingEndResult.KILLED,
                  status: BossTrackingSessionStatus.ENDED,
                  focusedAt: killed.focusedAt,
                },
              ],
            },
            {
              id: 'boss-current',
              name: 'Vordt',
              stats: [],
              trackingSessions: [
                {
                  deathCount: 3,
                  endResult: null,
                  status: BossTrackingSessionStatus.ACTIVE,
                  focusedAt: current.focusedAt,
                },
              ],
            },
          ],
        },
        {
          id: 'game-0',
          name: 'Dark Souls II',
          trackingSessions: [],
          bosses: [
            {
              id: 'old-boss',
              name: 'Old Boss',
              stats: [{ deaths: 12 }],
              trackingSessions: [],
            },
          ],
        },
      ],
    });
    queries.getStreamInfo.mockResolvedValue({
      current: {
        startAt: new Date('2026-07-10T16:00:00.000Z'),
        endAt: new Date('2026-07-10T20:00:00.000Z'),
      },
      next: null,
      timezone: 'America/Sao_Paulo',
    });

    const stats = await getEmbeddedAppStats('staging-guild');

    expect(stats).toMatchObject({
      game: {
        id: 'game-1',
        name: 'Dark Souls III',
        deaths: 178,
        killedBossCount: 20,
      },
      currentBoss: {
        name: 'Vordt',
        deaths: 3,
        attemptNumber: 3,
        attemptStartedAt: '2026-07-10T18:00:00.000Z',
        runbackSeconds: 80,
      },
      lastKilledBoss: {
        name: 'Iudex Gundyr',
        deaths: 7,
      },
      currentStreamWindow: {
        startAt: '2026-07-10T16:00:00.000Z',
        endAt: '2026-07-10T20:00:00.000Z',
      },
      streamEncounters: [
        { name: 'Iudex Gundyr', deaths: 7, outcome: 'KILLED' },
        { name: 'Vordt', deaths: 3, outcome: 'ACTIVE' },
      ],
      games: [
        expect.objectContaining({
          id: 'game-1',
          name: 'Dark Souls III',
          deaths: 178,
          killedBossCount: 20,
        }),
        {
          id: 'game-0',
          name: 'Dark Souls II',
          deaths: 12,
          killedBossCount: 1,
          bosses: [{ name: 'Old Boss', deaths: 12, outcome: 'KILLED' }],
        },
      ],
    });
    expect(stats.bosses).toHaveLength(21);
    expect(stats.bosses).toContainEqual({
      name: 'Iudex Gundyr',
      deaths: 7,
      outcome: 'KILLED',
    });
    expect(stats.bosses).toContainEqual({
      name: 'Vordt',
      deaths: 3,
      outcome: 'ACTIVE',
    });
    const currentGame = stats.games.find((game) => game.id === stats.game?.id);
    expect(stats.game).toMatchObject({
      deaths: currentGame?.deaths,
      killedBossCount: currentGame?.killedBossCount,
    });
    expect(stats.bosses).toEqual(currentGame?.bosses);
    expect(stats.killedBosses).toEqual(
      stats.bosses.filter((boss) => boss.outcome === 'KILLED'),
    );
    expect(currentGame?.killedBosses).toEqual(
      currentGame?.bosses.filter((boss) => boss.outcome === 'KILLED'),
    );
    expect(queries.findEmbeddedAppGameStats).toHaveBeenCalledWith([
      'staging-guild',
      'production-guild',
    ]);
  });

  it('keeps Saturday updates in the last non-skipped Friday stream', async () => {
    const gael = {
      ...makeSession({
        id: 'gael',
        bossName: 'Slave Knight Gael',
        status: BossTrackingSessionStatus.PAUSED,
        endResult: null,
        deathCount: 8,
        startedAt: new Date('2026-07-25T16:51:01.334Z'),
        endedAt: null,
      }),
      guildId: 'staging-guild',
      focusedAt: new Date('2026-07-25T18:58:18.130Z'),
      pausedAt: new Date('2026-07-25T18:58:18.130Z'),
      attempts: [
        {
          ...attempt,
          attemptNumber: 9,
          startedAt: new Date('2026-07-25T18:58:08.489Z'),
        },
      ],
    };
    const midir = {
      ...makeSession({
        id: 'midir',
        bossName: 'Darkeater Midir',
        status: BossTrackingSessionStatus.PAUSED,
        endResult: null,
        deathCount: 16,
        startedAt: new Date('2026-07-24T20:02:47.423Z'),
        endedAt: null,
      }),
      guildId: 'production-guild',
      focusedAt: new Date('2026-07-24T21:09:37.757Z'),
      pausedAt: new Date('2026-07-24T21:09:37.757Z'),
      attempts: [
        {
          ...attempt,
          attemptNumber: 17,
          startedAt: new Date('2026-07-24T21:08:58.908Z'),
        },
      ],
    };
    const halflight = makeSession({
      id: 'halflight',
      bossName: 'Halflight Spear of the Church',
      status: BossTrackingSessionStatus.ENDED,
      endResult: BossTrackingEndResult.KILLED,
      deathCount: 1,
      startedAt: new Date('2026-07-25T16:10:00.000Z'),
      endedAt: new Date('2026-07-25T16:40:00.000Z'),
    });
    queries.findEmbeddedAppGameStats.mockResolvedValue({
      game: { id: 'game-1', name: 'Dark Souls III' },
      gameDeaths: 246,
      sessions: [gael, halflight, midir],
      archiveGames: [
        {
          id: 'game-1',
          name: 'Dark Souls III',
          trackingSessions: [
            { startDeaths: 0, deathCount: 246, finalDeaths: null },
          ],
          bosses: [
            {
              id: 'boss-midir',
              name: 'Darkeater Midir',
              stats: [],
              trackingSessions: [
                {
                  deathCount: 16,
                  endResult: null,
                  status: BossTrackingSessionStatus.PAUSED,
                  focusedAt: midir.focusedAt,
                },
              ],
            },
            {
              id: 'boss-halflight',
              name: 'Halflight Spear of the Church',
              stats: [],
              trackingSessions: [
                {
                  deathCount: 1,
                  endResult: BossTrackingEndResult.KILLED,
                  status: BossTrackingSessionStatus.ENDED,
                  focusedAt: halflight.focusedAt,
                },
              ],
            },
            {
              id: 'boss-gael',
              name: 'Slave Knight Gael',
              stats: [],
              trackingSessions: [
                {
                  deathCount: 8,
                  endResult: null,
                  status: BossTrackingSessionStatus.PAUSED,
                  focusedAt: gael.focusedAt,
                },
              ],
            },
            {
              id: 'boss-pontiff',
              name: 'Pontiff Sulyvahn',
              stats: [{ deaths: 12 }],
              trackingSessions: [],
            },
          ],
        },
      ],
    });
    queries.getStreamInfo.mockResolvedValue({
      current: null,
      previous: {
        startAt: new Date('2026-07-24T18:10:00.000Z'),
        endAt: new Date('2026-07-24T22:10:00.000Z'),
      },
      next: {
        startAt: new Date('2026-07-31T18:10:00.000Z'),
        endAt: new Date('2026-07-31T22:10:00.000Z'),
      },
      timezone: 'America/Sao_Paulo',
    });

    await expect(
      getEmbeddedAppStats('production-guild'),
    ).resolves.toMatchObject({
      currentBoss: {
        name: 'Slave Knight Gael',
        status: 'PAUSED',
        pausedAt: '2026-07-25T18:58:18.130Z',
      },
      bosses: [
        { name: 'Darkeater Midir', deaths: 16, outcome: 'PAUSED' },
        { name: 'Pontiff Sulyvahn', deaths: 12, outcome: 'KILLED' },
        { name: 'Slave Knight Gael', deaths: 8, outcome: 'PAUSED' },
        {
          name: 'Halflight Spear of the Church',
          deaths: 1,
          outcome: 'KILLED',
        },
      ],
      streamEncounters: [
        { name: 'Darkeater Midir', deaths: 16, outcome: 'PAUSED' },
        {
          name: 'Halflight Spear of the Church',
          deaths: 1,
          outcome: 'KILLED',
        },
        { name: 'Slave Knight Gael', deaths: 8, outcome: 'PAUSED' },
      ],
    });
  });

  it('keeps pre-stream Saturday VOD updates with Friday', async () => {
    const midir = makeSession({
      id: 'midir-friday',
      bossName: 'Darkeater Midir',
      status: BossTrackingSessionStatus.PAUSED,
      endResult: null,
      deathCount: 16,
      startedAt: new Date('2026-07-24T20:02:47.423Z'),
      endedAt: null,
    });
    const halflight = makeSession({
      id: 'halflight-vod',
      bossName: 'Halflight Spear of the Church',
      status: BossTrackingSessionStatus.ENDED,
      endResult: BossTrackingEndResult.KILLED,
      deathCount: 1,
      startedAt: new Date('2026-07-25T16:10:00.000Z'),
      endedAt: new Date('2026-07-25T16:40:00.000Z'),
    });
    queries.findEmbeddedAppGameStats.mockResolvedValue({
      game: { id: 'game-1', name: 'Dark Souls III' },
      gameDeaths: 17,
      sessions: [halflight, midir],
      archiveGames: [
        {
          id: 'game-1',
          name: 'Dark Souls III',
          trackingSessions: [
            { startDeaths: 0, deathCount: 17, finalDeaths: null },
          ],
          bosses: [],
        },
      ],
    });
    queries.getStreamInfo.mockResolvedValue({
      current: null,
      previous: {
        startAt: new Date('2026-07-24T18:10:00.000Z'),
        endAt: new Date('2026-07-24T22:10:00.000Z'),
      },
      next: {
        startAt: new Date('2026-07-25T18:10:00.000Z'),
        endAt: new Date('2026-07-25T22:10:00.000Z'),
      },
      timezone: 'America/Sao_Paulo',
    });

    await expect(
      getEmbeddedAppStats('production-guild'),
    ).resolves.toMatchObject({
      streamEncounters: [
        { name: 'Darkeater Midir', deaths: 16, outcome: 'PAUSED' },
        {
          name: 'Halflight Spear of the Church',
          deaths: 1,
          outcome: 'KILLED',
        },
      ],
    });
  });

  it('uses the latest tracking run when no stream is currently happening', async () => {
    const lastStreamBoss = makeSession({
      id: 'last-stream',
      bossName: 'Abyss Watchers',
      status: BossTrackingSessionStatus.ENDED,
      endResult: BossTrackingEndResult.KILLED,
      deathCount: 10,
      startedAt: new Date('2026-07-09T17:00:00.000Z'),
      endedAt: new Date('2026-07-09T17:45:00.000Z'),
    });
    queries.findEmbeddedAppGameStats.mockResolvedValue({
      game: { id: 'game-1', name: 'Dark Souls III' },
      gameDeaths: 10,
      sessions: [lastStreamBoss],
      archiveGames: [
        {
          id: 'game-1',
          name: 'Dark Souls III',
          trackingSessions: [
            { startDeaths: 0, deathCount: 10, finalDeaths: null },
          ],
          bosses: [
            {
              id: 'boss-last-stream',
              name: 'Abyss Watchers',
              stats: [],
              trackingSessions: [
                {
                  deathCount: 10,
                  endResult: BossTrackingEndResult.KILLED,
                  status: BossTrackingSessionStatus.ENDED,
                  focusedAt: lastStreamBoss.focusedAt,
                },
              ],
            },
          ],
        },
      ],
    });
    queries.getStreamInfo.mockResolvedValue({
      current: null,
      next: null,
      timezone: 'America/Sao_Paulo',
    });

    await expect(getEmbeddedAppStats('staging-guild')).resolves.toMatchObject({
      lastKilledBoss: {
        name: 'Abyss Watchers',
        deaths: 10,
      },
      currentStreamWindow: null,
      streamEncounters: [
        { name: 'Abyss Watchers', deaths: 10, outcome: 'KILLED' },
      ],
    });
  });

  it('returns an empty state when staging has no tracking history', async () => {
    queries.findEmbeddedAppGameStats.mockResolvedValue({
      game: null,
      gameDeaths: 0,
      sessions: [],
      archiveGames: [],
    });

    await expect(getEmbeddedAppStats('staging-guild')).resolves.toEqual({
      game: null,
      currentBoss: null,
      lastKilledBoss: null,
      currentStreamWindow: null,
      streamEncounters: [],
      bosses: [],
      killedBosses: [],
      games: [],
    });
  });
});
