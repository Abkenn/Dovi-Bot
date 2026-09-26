import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  findHltbGame: vi.fn(),
  getOpenCriticScore: vi.fn(),
  getSteamEnglishReviewPercent: vi.fn(),
  getSteamGame: vi.fn(),
  searchSteamGames: vi.fn(),
}));

vi.mock('../../src/modules/hltb/hltb.service', () => ({
  findHltbGame: dependencies.findHltbGame,
}));
vi.mock('../../src/modules/steam/steam.api', () => ({
  getSteamEnglishReviewPercent: dependencies.getSteamEnglishReviewPercent,
  getSteamGame: dependencies.getSteamGame,
  searchSteamGames: dependencies.searchSteamGames,
}));
vi.mock('../../src/modules/steam/opencritic.api', () => ({
  getOpenCriticScore: dependencies.getOpenCriticScore,
}));

import {
  findSteamGame,
  getSteamAutocomplete,
} from '../../src/modules/steam/steam.service';

const searchGame = { id: 42, title: 'Moonlit Archive' };
const steamGame = { id: 42, title: 'Moonlit Archive' };

describe('Steam service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.searchSteamGames.mockResolvedValue([searchGame]);
    dependencies.getSteamGame.mockResolvedValue(steamGame);
    dependencies.getSteamEnglishReviewPercent.mockResolvedValue(91);
    dependencies.getOpenCriticScore.mockResolvedValue(88);
    dependencies.findHltbGame.mockResolvedValue({
      rushedMainStoryHours: 8,
      leisureCompletionistHours: 54,
    });
  });

  it('combines the exact Steam game, English reviews, and optional HLTB data', async () => {
    await expect(findSteamGame(' moonlit   archive ')).resolves.toEqual({
      englishReviewPercent: 91,
      game: steamGame,
      hltbGame: {
        rushedMainStoryHours: 8,
        leisureCompletionistHours: 54,
      },
      openCriticScore: 88,
    });
  });

  it('returns null for missing or non-game Steam results', async () => {
    dependencies.searchSteamGames.mockResolvedValueOnce([]);
    await expect(findSteamGame('missing')).resolves.toBeNull();

    dependencies.getSteamGame.mockResolvedValueOnce(null);
    await expect(findSteamGame('soundtrack')).resolves.toBeNull();
  });

  it('returns unique autocomplete choices after two characters', async () => {
    dependencies.searchSteamGames.mockResolvedValue([
      searchGame,
      searchGame,
      { id: 43, title: 'Quiet Horizon' },
    ]);

    await expect(getSteamAutocomplete('mo')).resolves.toEqual([
      { name: 'Moonlit Archive', value: 'Moonlit Archive' },
      { name: 'Quiet Horizon', value: 'Quiet Horizon' },
    ]);
    await expect(getSteamAutocomplete('m')).resolves.toEqual([]);
  });

  it('keeps the game result when optional ratings fail', async () => {
    dependencies.getSteamEnglishReviewPercent.mockRejectedValueOnce(
      new Error('Steam unavailable'),
    );
    dependencies.findHltbGame.mockRejectedValueOnce(
      new Error('HLTB unavailable'),
    );
    dependencies.getOpenCriticScore.mockRejectedValueOnce(
      new Error('OpenCritic unavailable'),
    );

    await expect(findSteamGame('Moonlit Archive')).resolves.toEqual({
      englishReviewPercent: null,
      game: steamGame,
      hltbGame: null,
      openCriticScore: null,
    });
  });
});
