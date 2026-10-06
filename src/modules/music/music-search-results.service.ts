import type { MusicActivityResult, MusicSearchInput } from './music.types';
import { toMusicActivityResults } from './music-activity';
import { searchMusicCatalog } from './music-search.service';

export const getMusicSearchResults = async (
  input: MusicSearchInput,
): Promise<MusicActivityResult[] | null> => {
  const matches = await searchMusicCatalog(input.query, { game: input.game });
  return matches ? toMusicActivityResults(matches) : null;
};
