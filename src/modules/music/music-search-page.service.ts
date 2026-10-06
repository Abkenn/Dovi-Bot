import { paginateArray } from '../../lib/pagination';
import type {
  MusicGameSearchView,
  MusicSearchPage,
  MusicSearchPageInput,
  MusicSearchView,
} from './music.types';
import { toMusicActivityResults } from './music-activity';
import { searchMusicCatalog } from './music-search.service';

export const getMusicSearchPage = async (
  input: MusicSearchPageInput,
): Promise<MusicSearchPage> => {
  const matches = await searchMusicCatalog(input.query, { game: input.game });
  if (!matches) return { results: null, total: 0, nextCursor: null };
  const page = paginateArray<MusicSearchView | MusicGameSearchView>(matches, {
    cursor: input.cursor,
    pageSize: 20,
  });
  return { ...page, results: toMusicActivityResults(page.results) };
};
