import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  getHltbGame: vi.fn(),
  searchHltbGames: vi.fn(),
}));

vi.mock('../../src/modules/hltb/hltb.api', () => ({
  getHltbGame: dependencies.getHltbGame,
  searchHltbGames: dependencies.searchHltbGames,
}));

import {
  findHltbGame,
  getHltbAutocomplete,
} from '../../src/modules/hltb/hltb.service';

const game = {
  id: 10,
  title: 'Moonlit Archive',
};

const gameDetails = {
  ...game,
  completionistHours: 35,
  leisureCompletionistHours: 54,
  mainExtraHours: 19,
  mainStoryHours: 12,
  rushedMainStoryHours: 8,
};

describe('HLTB service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.getHltbGame.mockResolvedValue(gameDetails);
  });

  it('prefers an exact normalized title match', async () => {
    dependencies.searchHltbGames.mockResolvedValue([
      { ...game, id: 11, title: 'Moonlit Archive: Echoes' },
      game,
    ]);

    await expect(findHltbGame('  moonlit   archive ')).resolves.toEqual(
      gameDetails,
    );
    expect(dependencies.getHltbGame).toHaveBeenCalledWith(game.id, undefined);
  });

  it('uses the first search result when no title matches exactly', async () => {
    dependencies.searchHltbGames.mockResolvedValue([game]);

    await expect(findHltbGame('moon archive')).resolves.toEqual(gameDetails);
  });

  it('returns null when no game is found', async () => {
    dependencies.searchHltbGames.mockResolvedValue([]);

    await expect(findHltbGame('unknown title')).resolves.toBeNull();
    expect(dependencies.getHltbGame).not.toHaveBeenCalled();
  });

  it('does not call HLTB autocomplete for fewer than two characters', async () => {
    await expect(getHltbAutocomplete('m')).resolves.toEqual([]);
    expect(dependencies.searchHltbGames).not.toHaveBeenCalled();
  });

  it('returns unique game titles for autocomplete', async () => {
    dependencies.searchHltbGames.mockResolvedValue([
      game,
      { ...game, id: 11 },
      { ...game, id: 12, title: 'Quiet Horizon' },
    ]);

    await expect(getHltbAutocomplete('moon')).resolves.toEqual([
      { name: 'Moonlit Archive', value: 'Moonlit Archive' },
      { name: 'Quiet Horizon', value: 'Quiet Horizon' },
    ]);
  });
});
