export type HltbGame = {
  id: number;
  title: string;
  mainStoryHours: number | null;
  mainExtraHours: number | null;
  completionistHours: number | null;
};

export type HltbAutocompleteChoice = {
  name: string;
  value: string;
};

export type SearchHltbGamesInput = {
  query: string;
  signal?: AbortSignal | undefined;
};
