import { describe, expect, it } from 'vitest';
import { buildSteamMessage } from '../../src/modules/steam/steam.discord';

describe('Steam Discord output', () => {
  it('links the Steam game and includes the HLTB range when available', () => {
    expect(
      buildSteamMessage({
        englishReviewPercent: 91,
        game: { id: 42, title: 'Moonlit Archive' },
        hltbGame: {
          completionistHours: 35,
          id: 42,
          leisureCompletionistHours: 54,
          mainExtraHours: 19,
          mainStoryHours: 12,
          rushedMainStoryHours: 8,
          title: 'Moonlit Archive',
        },
        openCriticScore: 88,
      }),
    ).toBe(
      '[Moonlit Archive](<https://store.steampowered.com/app/42/>) (~8-54 hours)\nEnglish Reviews: 91%\nOpenCritic: 88',
    );
  });

  it('omits the range when HLTB has no match', () => {
    expect(
      buildSteamMessage({
        englishReviewPercent: 80,
        game: { id: 42, title: 'Quiet Horizon' },
        hltbGame: null,
        openCriticScore: null,
      }),
    ).toBe(
      '[Quiet Horizon](<https://store.steampowered.com/app/42/>)\nEnglish Reviews: 80%',
    );
  });
});
