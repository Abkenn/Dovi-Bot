import type { HltbGame } from '../hltb/hltb.types';

export type SteamSearchGame = {
  id: number;
  title: string;
};

export type SteamGame = SteamSearchGame;

export type SteamGameSummary = {
  game: SteamGame;
  englishReviewPercent: number | null;
  hltbGame: HltbGame | null;
  openCriticScore: number | null;
};

export type SteamAutocompleteChoice = {
  name: string;
  value: string;
};
