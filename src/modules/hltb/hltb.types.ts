export type HltbSearchGame = {
  id: number;
  title: string;
};

export type HltbGame = HltbSearchGame & {
  mainStoryHours: number | null;
  mainExtraHours: number | null;
  completionistHours: number | null;
  rushedMainStoryHours: number | null;
  leisureCompletionistHours: number | null;
};

export type HltbAutocompleteChoice = {
  name: string;
  value: string;
};

export type SearchHltbGamesInput = {
  query: string;
  signal?: AbortSignal | undefined;
};
