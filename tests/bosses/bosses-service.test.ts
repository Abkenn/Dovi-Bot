import { beforeEach, describe, expect, it, vi } from 'vitest';

const queries = vi.hoisted(() => ({
  countBossesByNormalizedName: vi.fn(),
  findBossesForAutocomplete: vi.fn(),
  findBossGamesForAutocomplete: vi.fn(),
  findBossWithDaviSpreadsheetStats: vi.fn(),
  findGameBossDeathRanking: vi.fn(),
}));

vi.mock('@data/queries/boss-stats', () => ({
  countBossesByNormalizedName: queries.countBossesByNormalizedName,
  findBossesForAutocomplete: queries.findBossesForAutocomplete,
  findBossGamesForAutocomplete: queries.findBossGamesForAutocomplete,
  findBossWithDaviSpreadsheetStats: queries.findBossWithDaviSpreadsheetStats,
  findGameBossDeathRanking: queries.findGameBossDeathRanking,
}));

import {
  getBossAutocomplete,
  getBossGameAutocomplete,
  getBossView,
  getGameBossDeathRanking,
  toBossAutocompleteValue,
} from '../../src/modules/bosses/bosses.service';

describe('bosses service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires real encounter data when autocompleting a stats command', async () => {
    queries.findBossesForAutocomplete.mockResolvedValue([
      { name: 'Gehrman', game: { name: 'Bloodborne' } },
    ]);

    await expect(
      getBossAutocomplete({
        gameName: null,
        query: 'gehr',
        requireEncounterData: true,
      }),
    ).resolves.toEqual([{ name: 'Gehrman', game: { name: 'Bloodborne' } }]);
    expect(queries.findBossesForAutocomplete).toHaveBeenCalledWith({
      normalizedBossQuery: 'gehr',
      requireEncounterData: true,
    });
  });

  it('normalizes game autocomplete searches', async () => {
    queries.findBossGamesForAutocomplete.mockResolvedValue([
      { name: 'Elden Ring' },
    ]);

    await expect(getBossGameAutocomplete(' Elden   Ring ')).resolves.toEqual([
      { name: 'Elden Ring' },
    ]);
    expect(queries.findBossGamesForAutocomplete).toHaveBeenCalledWith(
      'elden ring',
    );
  });

  it('deduplicates boss autocomplete results within a game', async () => {
    const boss = { name: 'Margit', game: { name: 'Elden Ring' } };
    queries.findBossesForAutocomplete.mockResolvedValue([boss, boss]);

    await expect(
      getBossAutocomplete({
        gameName: ' Elden Ring ',
        query: ' marg ',
      }),
    ).resolves.toEqual([boss]);
    expect(queries.findBossesForAutocomplete).toHaveBeenCalledWith({
      normalizedGameName: 'elden ring',
      normalizedBossQuery: 'marg',
    });
  });

  it('encodes game-qualified boss autocomplete values', () => {
    expect(
      toBossAutocompleteValue({ gameName: 'Bloodborne', bossName: 'Gehrman' }),
    ).toBe('Bloodborne::Gehrman');
  });

  it('resolves a game-qualified autocomplete boss without ambiguity lookup', async () => {
    const boss = { id: 'gehrman' };
    queries.findBossWithDaviSpreadsheetStats.mockResolvedValue(boss);

    await expect(
      getBossView({ bossName: 'Bloodborne::Gehrman' }),
    ).resolves.toBe(boss);
    expect(queries.countBossesByNormalizedName).not.toHaveBeenCalled();
    expect(queries.findBossWithDaviSpreadsheetStats).toHaveBeenCalledWith({
      normalizedGameName: 'bloodborne',
      normalizedBossName: 'gehrman',
    });
  });

  it('rejects an ambiguous unqualified boss', async () => {
    queries.countBossesByNormalizedName.mockResolvedValue(2);

    await expect(getBossView({ bossName: 'Guardian' })).rejects.toThrow(
      'More than one game has that boss',
    );
  });

  it('rejects a boss that has no stats record', async () => {
    queries.countBossesByNormalizedName.mockResolvedValue(1);
    queries.findBossWithDaviSpreadsheetStats.mockResolvedValue(null);

    await expect(getBossView({ bossName: 'Fake Boss' })).rejects.toThrow(
      'Pick a boss from autocomplete',
    );
  });

  it('returns game rankings with default and explicit limits', async () => {
    const ranking = { game: { name: 'Elden Ring' } };
    queries.findGameBossDeathRanking.mockResolvedValue(ranking);

    await expect(getGameBossDeathRanking(' Elden Ring ')).resolves.toBe(
      ranking,
    );
    expect(queries.findGameBossDeathRanking).toHaveBeenLastCalledWith({
      normalizedGameName: 'elden ring',
      limit: 10,
    });

    await getGameBossDeathRanking('Elden Ring', { limit: null });
    expect(queries.findGameBossDeathRanking).toHaveBeenLastCalledWith({
      normalizedGameName: 'elden ring',
      limit: null,
    });
  });

  it('rejects an unknown game ranking', async () => {
    queries.findGameBossDeathRanking.mockResolvedValue(null);

    await expect(getGameBossDeathRanking('Fake Game')).rejects.toThrow(
      'Pick a game from autocomplete',
    );
  });
});
