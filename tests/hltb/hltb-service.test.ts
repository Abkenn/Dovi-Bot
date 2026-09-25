import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  searchHltbGames: vi.fn(),
}));

vi.mock('../../src/modules/hltb/hltb.api', () => ({
  searchHltbGames: dependencies.searchHltbGames,
}));

import {
  findHltbGame,
  getHltbAutocomplete,
} from '../../src/modules/hltb/hltb.service';

const game = {
  completionistHours: 32,
  id: 10,
  mainExtraHours: 18,
  mainStoryHours: 11,
  title: 'Moonlit Archive',
};

describe('HLTB service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers an exact normalized title match', async () => {
    dependencies.searchHltbGames.mockResolvedValue([
      { ...game, id: 11, title: 'Moonlit Archive: Echoes' },
      game,
    ]);

    await expect(findHltbGame('  moonlit   archive ')).resolves.toEqual(game);
  });

  it('uses the first search result when no title matches exactly', async () => {
    dependencies.searchHltbGames.mockResolvedValue([game]);

    await expect(findHltbGame('moon archive')).resolves.toEqual(game);
  });

  it('returns null when no game is found', async () => {
    dependencies.searchHltbGames.mockResolvedValue([]);

    await expect(findHltbGame('unknown title')).resolves.toBeNull();
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
