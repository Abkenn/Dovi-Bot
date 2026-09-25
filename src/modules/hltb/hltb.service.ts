import { searchHltbGames } from './hltb.api';
import type { HltbAutocompleteChoice, HltbGame } from './hltb.types';

const normalizeTitle = (title: string): string =>
  title.trim().toLowerCase().split(' ').filter(Boolean).join(' ');

export const findHltbGame = async (
  query: string,
  signal?: AbortSignal,
): Promise<HltbGame | null> => {
  const games = await searchHltbGames({ query, signal });
  const normalizedQuery = normalizeTitle(query);

  return (
    games.find((game) => normalizeTitle(game.title) === normalizedQuery) ??
    games[0] ??
    null
  );
};

export const getHltbAutocomplete = async (
  query: string,
  signal?: AbortSignal,
): Promise<HltbAutocompleteChoice[]> => {
  if (normalizeTitle(query).length < 2) {
    return [];
  }

  const games = await searchHltbGames({ query, signal });
  const seenTitles = new Set<string>();
  const choices: HltbAutocompleteChoice[] = [];
  for (const game of games) {
    const normalizedTitle = normalizeTitle(game.title);
    if (seenTitles.has(normalizedTitle)) {
      continue;
    }

    seenTitles.add(normalizedTitle);
    choices.push({ name: game.title, value: game.title });
  }

  return choices.slice(0, 25);
};
