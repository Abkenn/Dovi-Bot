import type { HltbGame } from '../hltb/hltb.types';

export type SteamSearchParams = { term: string; l: 'english'; cc: 'US' };
export type SteamDetailsParams = { appids: number; l: 'english'; cc: 'US' };
export type SteamReviewsParams = {
  json: 1;
  filter: 'all';
  language: 'english';
  purchase_type: 'all';
  num_per_page: 0;
  playtime_filter_min: 1;
};

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
