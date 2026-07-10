import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BossTrackingAttemptResult,
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../src/generated/prisma/enums';

const queries = vi.hoisted(() => ({
  findEmbeddedAppGameStats: vi.fn(),
}));

vi.mock('../../src/data/queries/embedded-app-stats', () => ({
  findEmbeddedAppGameStats: queries.findEmbeddedAppGameStats,
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

  it('returns the current encounter and every killed boss in game history', async () => {
    const killed = makeSession({
      id: 'killed',
      bossName: 'Iudex Gundyr',
      status: BossTrackingSessionStatus.ENDED,
      endResult: BossTrackingEndResult.KILLED,
      deathCount: 7,
      startedAt: new Date('2026-07-09T18:00:00.000Z'),
      endedAt: new Date('2026-07-09T18:30:00.000Z'),
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
      sessions: [current, killed],
    });

    await expect(getEmbeddedAppStats('staging-guild')).resolves.toMatchObject({
      game: {
        id: 'game-1',
        name: 'Dark Souls III',
        deaths: 10,
        killedBossCount: 1,
      },
      currentBoss: {
        name: 'Vordt',
        deaths: 3,
        attemptNumber: 3,
        attemptStartedAt: '2026-07-10T18:00:00.000Z',
      },
      killedBosses: [
        {
          name: 'Iudex Gundyr',
          deaths: 7,
          killedAt: '2026-07-09T18:30:00.000Z',
        },
      ],
    });
  });

  it('returns an empty state when staging has no tracking history', async () => {
    queries.findEmbeddedAppGameStats.mockResolvedValue(null);

    await expect(getEmbeddedAppStats('staging-guild')).resolves.toEqual({
      game: null,
      currentBoss: null,
      killedBosses: [],
    });
  });
});
