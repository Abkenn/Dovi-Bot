import { describe, expect, it } from 'vitest';
import { buildGameTrackingStatusEmbed } from '../../src/modules/boss-tracking/boss-tracking-game-status.discord';
import { getEmbedFieldValue } from '../utils/discord-output';

describe('boss tracking Discord output', () => {
  it('shows compact stats for the three recent boss encounters', () => {
    const embed = buildGameTrackingStatusEmbed({
      gameName: 'Test Game',
      deaths: 12,
      killedBossCount: 2,
      pendingBossCount: 1,
      recentBossEncounters: [
        {
          bossName: 'Pending Boss',
          deaths: 5,
          averageAttemptSeconds: 75,
          winningAttemptSeconds: null,
        },
        {
          bossName: 'Killed Boss',
          deaths: 7,
          averageAttemptSeconds: 90,
          winningAttemptSeconds: 123,
        },
      ],
    });

    expect(getEmbedFieldValue(embed, 'Boss Encounters')).toBe(
      '**Pending Boss**\nDeaths: 5 | Avg attempt: 1m 15s\n\n' +
        '**Killed Boss**\nDeaths: 7 | Avg attempt: 1m 30s | Winning attempt: 2m 3s',
    );
  });

  it('formats unknown, seconds-only, and hour-long attempt times', () => {
    const embed = buildGameTrackingStatusEmbed({
      gameName: 'Test Game',
      deaths: 0,
      killedBossCount: 1,
      pendingBossCount: 2,
      recentBossEncounters: [
        {
          bossName: 'Unknown Boss',
          deaths: 0,
          averageAttemptSeconds: null,
          winningAttemptSeconds: null,
        },
        {
          bossName: 'Quick Boss',
          deaths: 1,
          averageAttemptSeconds: 45,
          winningAttemptSeconds: null,
        },
        {
          bossName: 'Long Boss',
          deaths: 2,
          averageAttemptSeconds: 3_661,
          winningAttemptSeconds: 3_600,
        },
      ],
    });

    expect(getEmbedFieldValue(embed, 'Boss Encounters')).toContain(
      'Avg attempt: Unknown',
    );
    expect(getEmbedFieldValue(embed, 'Boss Encounters')).toContain(
      'Avg attempt: 45s',
    );
    expect(getEmbedFieldValue(embed, 'Boss Encounters')).toContain(
      'Avg attempt: 1h 1m 1s | Winning attempt: 1h 0m 0s',
    );
  });

  it('shows an empty state before any boss encounter', () => {
    const embed = buildGameTrackingStatusEmbed({
      gameName: 'Test Game',
      deaths: 0,
      killedBossCount: 0,
      pendingBossCount: 0,
      recentBossEncounters: [],
    });

    expect(getEmbedFieldValue(embed, 'Boss Encounters')).toBe(
      'No boss encounters recorded yet.',
    );
  });
});
