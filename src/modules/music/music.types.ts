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
  requesterUserId: string;
  guildId: string | null;
};

export type MusicPaginationSession = MusicPaginationInput & {
  expiresAt: number;
};
