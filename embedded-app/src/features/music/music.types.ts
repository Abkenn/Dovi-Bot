import type { ArchivedGame } from '@/live-stats.types';
import type {
  MusicActivityResult,
  MusicFacts,
  MusicSearchInput,
  MusicSearchPage,
} from '../../../../src/modules/music/music.types';
export type SearchState = MusicSearchInput;
export type MusicPageProps = {
  games: ArchivedGame[];
  initialSearch?: SearchState;
  offline?: boolean;
};
export type MusicData =
  | { kind: 'loading' }
  | { kind: 'facts'; facts: MusicFacts | null }
  | { kind: 'results'; results: MusicActivityResult[] | null }
  | { kind: 'error' };

export type MusicLoadMoreProps = {
  hasNextPage: boolean;
  loading: boolean;
  failed: boolean;
  loadMore: () => unknown;
};

export type MusicQueryState = {
  offline: boolean;
  searching: boolean;
  facts: MusicFacts | null | undefined;
  pages: MusicSearchPage[] | undefined;
  failed: boolean;
};
