import { findHltbGame } from '../hltb/hltb.service';
import { getOpenCriticScore } from './opencritic.api';
import {
  getSteamEnglishReviewPercent,
  getSteamGame,
  searchSteamGames,
} from './steam.api';
import type { SteamAutocompleteChoice, SteamGameSummary } from './steam.types';

const normalizeTitle = (title: string): string =>
  title.trim().toLowerCase().split(' ').filter(Boolean).join(' ');

export const findSteamGame = async (
  query: string,
  signal?: AbortSignal,
): Promise<SteamGameSummary | null> => {
  const games = await searchSteamGames(query, signal);
  const normalizedQuery = normalizeTitle(query);
  const match =
    games.find((game) => normalizeTitle(game.title) === normalizedQuery) ??
    games[0];
  if (!match) {
    return null;
  }

  const game = await getSteamGame(match.id, signal);
  if (!game) {
    return null;
  }

  const [englishReviewPercent, hltbGame, openCriticScore] = await Promise.all([
    getSteamEnglishReviewPercent(game.id, signal).catch(() => null),
    findHltbGame(game.title, signal).catch(() => null),
    getOpenCriticScore(game.title, signal).catch(() => null),
  ]);

  return { englishReviewPercent, game, hltbGame, openCriticScore };
};

export const getSteamAutocomplete = async (
  query: string,
  signal?: AbortSignal,
): Promise<SteamAutocompleteChoice[]> => {
  if (normalizeTitle(query).length < 2) {
    return [];
  }

  const games = await searchSteamGames(query, signal);
  const seenTitles = new Set<string>();
  const choices: SteamAutocompleteChoice[] = [];
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
