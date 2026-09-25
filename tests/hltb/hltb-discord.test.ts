import { describe, expect, it } from 'vitest';
import { buildHltbMessage } from '../../src/modules/hltb/hltb.discord';

describe('HLTB Discord output', () => {
  it('shows the overall range and each median time on its own line', () => {
    expect(
      buildHltbMessage({
        completionistHours: 35,
        id: 10,
        leisureCompletionistHours: 54,
        mainExtraHours: 19,
        mainStoryHours: 12,
        rushedMainStoryHours: 8,
        title: 'Moonlit Archive',
      }),
    ).toBe(
      'Moonlit Archive (~8-54 hours)\nMain: 12 hours\nMain+Extra: 19 hours\nCompletionist: 35 hours',
    );
  });

  it('keeps the unavailable response on one line', () => {
    expect(
      buildHltbMessage({
        completionistHours: null,
        id: 10,
        leisureCompletionistHours: null,
        mainExtraHours: null,
        mainStoryHours: null,
        rushedMainStoryHours: null,
        title: 'Quiet Horizon',
      }),
    ).toBe('Quiet Horizon - No completion times available.');
  });
});
