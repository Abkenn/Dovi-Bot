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

export type HltbSearchBody = {
  searchType: 'games';
  searchTerms: string[];
  searchPage: number;
  size: number;
  searchOptions: {
    games: {
      userId: number;
      platform: string;
      sortCategory: 'popular';
      rangeCategory: 'main';
      rangeTime: { min: number | null; max: number | null };
      gameplay: {
        perspective: string;
        flow: string;
        genre: string;
        difficulty: string;
      };
      rangeYear: { min: string; max: string };
      modifier: string;
    };
    users: { sortCategory: 'postcount' };
    lists: { sortCategory: 'follows' };
    filter: string;
    sort: number;
    randomizer: number;
  };
  useCache: boolean;
};
