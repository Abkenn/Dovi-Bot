import { describe, expect, it } from 'vitest';
import { BossTrackingAttemptTimingStatus } from '../../src/generated/prisma/enums';
import {
  getBossTrackingReconciliation,
  getBossTrackingReconciliationFromBossDeaths,
} from '../../src/modules/boss-tracking/boss-tracking.utils';

describe('boss tracking utils', () => {
  it('trusts matching final and recorded boss deaths', () => {
    expect(
      getBossTrackingReconciliationFromBossDeaths({
        deathCount: 3,
        totalDeaths: 18,
        recordedDeathCount: 3,
      }),
    ).toEqual({
      totalDeaths: 18,
      deathCount: 3,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.TRUSTED,
      reconciliationNote: null,
    });
  });

  it('marks one missed manually tracked death as reconciled', () => {
    expect(
      getBossTrackingReconciliationFromBossDeaths({
        deathCount: 4,
        totalDeaths: 19,
        recordedDeathCount: 3,
      }),
    ).toEqual({
      totalDeaths: 19,
      deathCount: 4,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.RECONCILED,
      reconciliationNote:
        'Final death count has 1 more death than tracked manually.',
    });
  });

  it('marks multiple missed manually tracked deaths as reconciled', () => {
    expect(
      getBossTrackingReconciliationFromBossDeaths({
        deathCount: 6,
        totalDeaths: 21,
        recordedDeathCount: 3,
      }),
    ).toMatchObject({
      deathCount: 6,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.RECONCILED,
      reconciliationNote:
        'Final death count has 3 more deaths than tracked manually.',
    });
  });

  it('marks over-recorded manual deaths as reconciled', () => {
    expect(
      getBossTrackingReconciliationFromBossDeaths({
        deathCount: 2,
        totalDeaths: 17,
        recordedDeathCount: 5,
      }),
    ).toMatchObject({
      deathCount: 2,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.RECONCILED,
      reconciliationNote:
        'Manual tracking recorded 3 more deaths than the final count.',
    });
  });

  it('derives boss deaths from start and final game deaths', () => {
    expect(
      getBossTrackingReconciliation({
        startDeaths: 10,
        totalDeaths: 14,
        recordedDeathCount: 4,
      }),
    ).toEqual({
      totalDeaths: 14,
      deathCount: 4,
      attemptTimingStatus: BossTrackingAttemptTimingStatus.TRUSTED,
      reconciliationNote: null,
    });
  });

  it('rejects negative boss death corrections', () => {
    expect(() =>
      getBossTrackingReconciliationFromBossDeaths({
        deathCount: -1,
        totalDeaths: 9,
        recordedDeathCount: 0,
      }),
    ).toThrow('Final boss deaths cannot be lower than 0.');
  });

  it('rejects final game deaths lower than starting deaths', () => {
    expect(() =>
      getBossTrackingReconciliation({
        startDeaths: 10,
        totalDeaths: 9,
        recordedDeathCount: 0,
      }),
    ).toThrow('Final deaths cannot be lower than starting deaths.');
  });
});
