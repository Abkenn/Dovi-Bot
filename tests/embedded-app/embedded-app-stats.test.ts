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
  runbackSeconds: null,
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
    runbackSeconds: null,
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

  it('returns the current encounter and every imported or tracked killed boss', async () => {
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
      gameDeaths: 10,
      sessions: [current, killed, previousStream],
      archiveGames: [
        {
          id: 'game-1',
          name: 'Dark Souls III',
          trackingSessions: [
            { startDeaths: 0, deathCount: 10, finalDeaths: null },
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
                { deathCount: 7, endResult: BossTrackingEndResult.KILLED },
              ],
            },
            {
              id: 'boss-current',
              name: 'Vordt',
              stats: [],
              trackingSessions: [{ deathCount: 3, endResult: null }],
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
        deaths: 10,
        killedBossCount: 20,
      },
      currentBoss: {
        name: 'Vordt',
        deaths: 3,
        attemptNumber: 3,
        attemptStartedAt: '2026-07-10T18:00:00.000Z',
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
          deaths: 10,
          killedBossCount: 20,
        }),
        {
          id: 'game-0',
          name: 'Dark Souls II',
          deaths: 12,
          killedBossCount: 1,
          killedBosses: [{ name: 'Old Boss', deaths: 12 }],
        },
      ],
    });
    expect(stats.killedBosses).toHaveLength(20);
    expect(stats.killedBosses).toContainEqual({
      name: 'Iudex Gundyr',
      deaths: 7,
    });
    expect(stats.killedBosses).not.toContainEqual(
      expect.objectContaining({ name: 'Vordt' }),
    );
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
                { deathCount: 10, endResult: BossTrackingEndResult.KILLED },
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
      currentStreamWindow: null,
      streamEncounters: [],
      killedBosses: [],
      games: [],
    });
  });
});
