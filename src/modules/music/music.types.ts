export type MusicPlay = {
  musicMode:
    | 'DEMOCRACY'
    | 'CAPITALISM'
    | 'PATREON_CAPITALISM'
    | 'DICTATORSHIP'
    | 'UNKNOWN';
  streamLabel: string;
  streamDate: string;
  offsetSeconds: number;
  title: string;
  originalTitle: string;
  game: string | null;
};

export type MusicSearchResult = {
  title: string;
  count: number;
  lastStream: string;
  lastDate: string;
  lastOffsetSeconds: number;
  game?: string | null;
};

export type MusicGameResult = Omit<
  Pick<MusicPlay, 'title' | 'game' | 'streamDate' | 'offsetSeconds'>,
  'game'
> & {
  game: string;
};

export type MusicSearchView = MusicSearchResult & {
  video: { videoId: string; title: string } | null;
};

export type MusicGameTrackResult = MusicGameResult & { count: number };

export type MusicGameSearchView = MusicGameTrackResult & {
  video: { videoId: string; title: string } | null;
};

export type MusicUpload = {
  authorId: string;
  guildId: string;
  messageId: string;
  attachmentId: string;
  filename: string;
  url: string;
  size: number;
};

export type MusicPaginationInput = {
  pages: string[];
  guildId: string | null;
  activityQuery?: string;
};

export type MusicSearchOptions = { game: boolean };
export type MusicSearchInput = MusicSearchOptions & { query: string };
export type MusicActivityResult = {
  title: string;
  game: string | null;
  count: number;
  date: string;
  offsetSeconds: number;
  url: string | null;
};
export type MusicFact = { title: string; count: number };
export type MusicFacts = { track: MusicFact | null; series: MusicFact | null };
export type MusicFactsResponse = { facts: MusicFacts | null };
export type MusicSearchResponse = { results: MusicActivityResult[] | null };

export type MusicPaginationSession = MusicPaginationInput & {
  expiresAt: number;
};
