import { expect, it } from 'vitest';
import { groupMusicGameTracks } from '../../src/modules/music/music-search';

it('counts aliases together, preserves different games, and keeps the latest date before timestamp', () => {
  expect(
    groupMusicGameTracks([
      {
        title: 'Main Theme - DS2',
        game: 'Dark Souls 2',
        streamDate: '2026-02-01',
        offsetSeconds: 60,
      },
      {
        title: 'Main Theme - Dark Souls 2',
        game: 'Dark Souls 2',
        streamDate: '2026-01-01',
        offsetSeconds: 999,
      },
      {
        title: 'Main Theme - DS3',
        game: 'Dark Souls 3',
        streamDate: '2026-02-01',
        offsetSeconds: 120,
      },
    ]),
  ).toEqual([
    {
      title: 'Main Theme - DS2',
      game: 'Dark Souls 2',
      streamDate: '2026-02-01',
      offsetSeconds: 60,
      count: 2,
    },
    {
      title: 'Main Theme - DS3',
      game: 'Dark Souls 3',
      streamDate: '2026-02-01',
      offsetSeconds: 120,
      count: 1,
    },
  ]);
});
