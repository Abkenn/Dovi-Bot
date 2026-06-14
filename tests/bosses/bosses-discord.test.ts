import { EmbedBuilder } from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  BossTrackingAttemptResult,
  BossTrackingAttemptTimingStatus,
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../src/generated/prisma/enums';
import type { BossTrackingSessionView } from '../../src/modules/boss-tracking/boss-tracking.types';
import {
  addBossStatsField,
  addBotTrackedBossStatsField,
  addDaviBossStatsField,
} from '../../src/modules/bosses/bosses.discord';
import {
  embedFieldToLabelValueRows,
  getEmbedFieldValue,
} from '../utils/discord-output';

const TEST_GAME = {
  id: 'test-game',
  name: 'Test Game',
  normalizedName: 'test game',
};

const makeDate = (seconds: number) => new Date(seconds * 1000);

const makeSession = ({
  id,
  deathCount,
  endResult,
  attempts,
}: {
  id: string;
  deathCount: number;
  endResult: BossTrackingEndResult;
  attempts: {
    startedAtSeconds: number;
    endedAtSeconds: number;
    result: BossTrackingAttemptResult;
  }[];
}): BossTrackingSessionView => ({
  id,
  guildId: 'guild-1',
  channelId: 'channel-1',
  trackerUserId: 'user-1',
  status: BossTrackingSessionStatus.ENDED,
  startDeaths: 0,
  deathCount,
  recordedDeathCount: deathCount,
  finalDeaths: deathCount,
  manualTrackedSeconds: null,
  vodLabel: null,
  vodStartSeconds: null,
  vodEndSeconds: null,
  attemptTimingStatus: BossTrackingAttemptTimingStatus.TRUSTED,
  reconciliationNote: null,
  totalPausedSeconds: 0,
  pausedAt: null,
  startedAt: makeDate(attempts[0]?.startedAtSeconds ?? 0),
  focusedAt: makeDate(attempts.at(-1)?.endedAtSeconds ?? 0),
  endedAt: makeDate(attempts.at(-1)?.endedAtSeconds ?? 0),
  endResult,
  notes: null,
  game: TEST_GAME,
  boss: {
    id: 'test-boss',
    name: 'Test Boss',
    normalizedName: 'test boss',
    runbackSeconds: null,
    game: TEST_GAME,
  },
  attempts: attempts.map((attempt, index) => ({
    id: `${id}-attempt-${index + 1}`,
    attemptNumber: index + 1,
    startedAt: makeDate(attempt.startedAtSeconds),
    endedAt: makeDate(attempt.endedAtSeconds),
    vodStartSeconds: null,
    vodEndSeconds: null,
    runbackSeconds: null,
    result: attempt.result,
  })),
  pauses: [],
});

describe('bosses discord output', () => {
  it('shows a Davi stats fallback when imported stats are missing', () => {
    const value = getEmbedFieldValue(
      addDaviBossStatsField(new EmbedBuilder(), { stats: [] }),
      'Davi stats',
    );

    expect(value).toBe('No Davi stats found for this boss yet.');
  });

  it('wraps imported stats in spoilers when requested', () => {
    const value = getEmbedFieldValue(
      addDaviBossStatsField(
        new EmbedBuilder(),
        {
          stats: [
            {
              deaths: 2,
              totalAttemptTimeSeconds: 3661,
              winningAttemptTimeSeconds: 61,
              difficultyCoefficient: { toString: () => '12.34' },
            },
          ],
        },
        { spoiler: true },
      ),
      'Davi stats',
    );

    expect(value).toBe(
      '||Deaths: 2\nTotal attempt time: 1h 1m 1s\nWinning attempt: 1m 1s\nDifficulty coefficient: 12.34||',
    );
  });

  it('shows a Davi stats fallback when an imported record has no displayable fields', () => {
    const value = getEmbedFieldValue(
      addDaviBossStatsField(new EmbedBuilder(), {
        stats: [
          {
            deaths: null,
            totalAttemptTimeSeconds: null,
            winningAttemptTimeSeconds: null,
            difficultyCoefficient: null,
          },
        ],
      }),
      'Davi stats',
    );

    expect(value).toBe('No Davi stats found for this boss yet.');
  });

  it('formats combined imported-only stats with average and winning attempt', () => {
    const rows = embedFieldToLabelValueRows(
      addBossStatsField(new EmbedBuilder(), {
        stats: [
          {
            deaths: 1,
            totalAttemptTimeSeconds: 7200,
            winningAttemptTimeSeconds: 123,
            difficultyCoefficient: null,
          },
        ],
        runbackSeconds: null,
        trackingSessions: [],
      }),
      'Davi stats',
    );

    expect(rows).toEqual({
      Deaths: '1',
      'Total attempt time': '2h 0m 0s',
      'Avg attempt': '1h 0m 0s',
      'Winning attempt': '2m 3s',
    });
  });

  it('shows a combined stats fallback when imported and tracked stats are empty', () => {
    const value = getEmbedFieldValue(
      addBossStatsField(new EmbedBuilder(), {
        stats: [
          {
            deaths: null,
            totalAttemptTimeSeconds: null,
            winningAttemptTimeSeconds: null,
            difficultyCoefficient: null,
          },
        ],
        runbackSeconds: null,
        trackingSessions: [],
      }),
      'Davi stats',
    );

    expect(value).toBe('No Davi stats found for this boss yet.');
  });

  it('shows a bot-tracked stats fallback when no sessions exist', () => {
    const value = getEmbedFieldValue(
      addBotTrackedBossStatsField(new EmbedBuilder(), {
        runbackSeconds: null,
        trackingSessions: [],
      }),
      'Bot-tracked stats',
    );

    expect(value).toBe('No bot-tracked stats found for this boss yet.');
  });

  it('formats single unfinished bot-tracked stats without optional timing rows', () => {
    const rows = embedFieldToLabelValueRows(
      addBotTrackedBossStatsField(new EmbedBuilder(), {
        runbackSeconds: null,
        trackingSessions: [
          makeSession({
            id: 'unfinished-session',
            deathCount: 0,
            endResult: BossTrackingEndResult.ABANDONED,
            attempts: [],
          }),
        ],
      }),
      'Bot-tracked stats',
    );

    expect(rows).toEqual({
      Deaths: '0',
      Killed: 'No',
    });
  });

  it('formats multi-session bot-tracked stats', () => {
    const killedSession = makeSession({
      id: 'killed-session',
      deathCount: 1,
      endResult: BossTrackingEndResult.KILLED,
      attempts: [
        {
          startedAtSeconds: 0,
          endedAtSeconds: 60,
          result: BossTrackingAttemptResult.DEATH,
        },
        {
          startedAtSeconds: 60,
          endedAtSeconds: 180,
          result: BossTrackingAttemptResult.KILLED,
        },
      ],
    });
    const abandonedSession = makeSession({
      id: 'abandoned-session',
      deathCount: 1,
      endResult: BossTrackingEndResult.ABANDONED,
      attempts: [
        {
          startedAtSeconds: 300,
          endedAtSeconds: 345,
          result: BossTrackingAttemptResult.DEATH,
        },
      ],
    });

    const rows = embedFieldToLabelValueRows(
      addBotTrackedBossStatsField(new EmbedBuilder(), {
        runbackSeconds: null,
        trackingSessions: [killedSession, abandonedSession],
      }),
      'Bot-tracked stats',
    );

    expect(rows).toEqual({
      Deaths: '2',
      'Total attempt time': '3m 45s',
      Killed: 'Yes',
      Sessions: '2',
      'Avg attempt': '1m 15s',
      'Winning attempt': '2m 0s',
      'Total attempt time (without runbacks)': '3m 45s',
    });
  });
});
