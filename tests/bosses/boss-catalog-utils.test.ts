import { describe, expect, it } from 'vitest';
import {
  hasDurableBossData,
  hasDurableGameData,
  normalizeBossIdentity,
} from '../../src/data/boss-catalog.utils';

describe('boss catalog identity', () => {
  it('ignores punctuation, casing, and repeated spacing', () => {
    expect(normalizeBossIdentity('  sans. ')).toBe('sans');
    expect(normalizeBossIdentity('SANS')).toBe('sans');
    expect(normalizeBossIdentity('Boss  -  Name!')).toBe('boss name');
  });

  it('keeps different words distinct', () => {
    expect(normalizeBossIdentity('Sans Prime')).not.toBe(
      normalizeBossIdentity('Sans'),
    );
  });

  it('detects each durable boss data source', () => {
    const makeBoss = (
      stats: number,
      trials: number,
      trackingSessions: number,
      createdByUserId: string | null = 'user-1',
    ) => ({
      topicTerms: [{ createdByUserId }],
      _count: { stats, trials, trackingSessions },
    });

    expect(hasDurableBossData(makeBoss(0, 0, 0))).toBe(false);
    expect(hasDurableBossData(makeBoss(1, 0, 0))).toBe(true);
    expect(hasDurableBossData(makeBoss(0, 1, 0))).toBe(true);
    expect(hasDurableBossData(makeBoss(0, 0, 1))).toBe(true);
    expect(hasDurableBossData(makeBoss(0, 0, 0, null))).toBe(true);
  });

  it('detects each durable game data source', () => {
    const makeGame = (
      bosses: number,
      trials: number,
      trackingSessions: number,
      createdByUserId: string | null = 'user-1',
      defaultStreamGameConfig: unknown | null = null,
    ) => ({
      topicTerms: [{ createdByUserId }],
      defaultStreamGameConfig,
      _count: { bosses, trials, trackingSessions },
    });

    expect(hasDurableGameData(makeGame(0, 0, 0))).toBe(false);
    expect(hasDurableGameData(makeGame(1, 0, 0))).toBe(true);
    expect(hasDurableGameData(makeGame(0, 1, 0))).toBe(true);
    expect(hasDurableGameData(makeGame(0, 0, 1))).toBe(true);
    expect(hasDurableGameData(makeGame(0, 0, 0, null))).toBe(true);
    expect(hasDurableGameData(makeGame(0, 0, 0, 'user-1', {}))).toBe(true);
  });
});
