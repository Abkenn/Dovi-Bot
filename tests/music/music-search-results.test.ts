import { beforeEach, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({ searchMusicCatalog: vi.fn() }));
vi.mock('../../src/modules/music/music-search.service', () => service);

import { getMusicSearchResults } from '../../src/modules/music/music-search-results.service';

beforeEach(() => vi.resetAllMocks());

it('searches in the requested mode and returns activity results for pagination', async () => {
  service.searchMusicCatalog.mockResolvedValue(
    Array.from({ length: 21 }, (_, index) => ({
      title: `Theme ${index}`,
      game: 'Series',
      count: 2,
      lastDate: '2026-01-01',
      lastOffsetSeconds: 90,
      lastStream: 'D1',
      video: { videoId: 'video', title: 'Stream' },
    })),
  );
  const input = { query: 'Series', game: true, cursor: 20 };
  const results = await getMusicSearchResults(input);
  expect(results).toHaveLength(21);
  expect(results?.at(20)).toEqual({
    title: 'Theme 20',
    game: 'Series',
    count: 2,
    date: '2026-01-01',
    offsetSeconds: 90,
    url: 'https://www.youtube.com/watch?v=video&t=90s',
  });
  expect(service.searchMusicCatalog).toHaveBeenCalledWith('Series', {
    game: true,
  });
});

it('distinguishes an unavailable catalog from an available catalog with no matches', async () => {
  service.searchMusicCatalog
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce([]);
  const input = { query: 'Theme', game: false, cursor: 0 };
  expect(await getMusicSearchResults(input)).toBeNull();
  expect(await getMusicSearchResults(input)).toEqual([]);
  expect(service.searchMusicCatalog).toHaveBeenCalledWith('Theme', {
    game: false,
  });
});
