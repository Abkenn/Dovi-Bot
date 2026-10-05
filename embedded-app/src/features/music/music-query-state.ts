import type { MusicData, MusicQueryState } from './music.types';

export const resolveMusicData = ({
  offline,
  searching,
  facts,
  pages,
  failed,
}: MusicQueryState): MusicData => {
  if (offline) return { kind: 'error' };
  if (searching && pages?.length) {
    if (pages[0]?.results === null) return { kind: 'results', results: null };
    return {
      kind: 'results',
      results: pages.flatMap((page) => page.results ?? []),
    };
  }
  if (!searching && facts !== undefined) return { kind: 'facts', facts };
  if (failed) return { kind: 'error' };
  return { kind: 'loading' };
};
