import { describe, expect, it } from 'vitest';
import { buildHltbMessage } from '../../src/modules/hltb/hltb.discord';

describe('HLTB Discord output', () => {
  it('uses main plus extras as the headline and keeps other times compact', () => {
    expect(
      buildHltbMessage({
        completionistHours: 32,
        id: 10,
        mainExtraHours: 18,
        mainStoryHours: 11,
        title: 'Moonlit Archive',
      }),
    ).toBe(
      'Moonlit Archive - Main + Extras: 18 hours (Main Story: 11 hours, Completionist: 32 hours)',
    );
  });

  it('omits unavailable categories', () => {
    expect(
      buildHltbMessage({
        completionistHours: null,
        id: 10,
        mainExtraHours: null,
        mainStoryHours: 7.5,
        title: 'Quiet Horizon',
      }),
    ).toBe('Quiet Horizon - Main Story: 7.5 hours');
  });
});
