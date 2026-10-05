import { expect, it } from 'vitest';
import { buildEmbeddedAppActivityUrl } from '../../src/modules/embedded-app/embedded-app-link';
import type { MusicPlay } from '../../src/modules/music/music.types';
import {
  buildMusicFacts,
  toMusicActivityResults,
} from '../../src/modules/music/music-activity';
import {
  encodeMusicActivityTarget,
  parseMusicActivityTarget,
} from '../../src/modules/music/music-activity-target';

const play = (title: string, game: string | null): MusicPlay => ({
  title,
  originalTitle: title,
  game,
  musicMode: 'DEMOCRACY',
  streamLabel: 'D1',
  streamDate: '2026-01-01',
  offsetSeconds: 90,
});

it('counts track aliases and series plays, excluding a popular standalone game', () => {
  const plays = [
    play('Theme - DS2', 'Dark Souls 2'),
    play('Theme - Dark Souls 2', 'Dark Souls 2'),
    play('Other', 'Dark Souls 3'),
    ...Array.from({ length: 5 }, () => play('Standalone', 'Cuphead')),
  ];
  expect(buildMusicFacts(plays)).toEqual({
    track: { title: 'Standalone', count: 5 },
    series: { title: 'Dark Souls', count: 3 },
  });
  expect(buildMusicFacts([])).toEqual({ track: null, series: null });
});

it('maps command search results into compact UI results with exact timestamp links', () => {
  expect(
    toMusicActivityResults([
      {
        title: 'Theme - DS2',
        game: 'Dark Souls 2',
        count: 3,
        streamDate: '2026-01-01',
        offsetSeconds: 90,
        video: { videoId: 'video', title: 'Stream' },
      },
    ]),
  ).toEqual([
    {
      title: 'Theme - Dark Souls 2',
      game: 'Dark Souls 2',
      count: 3,
      date: '2026-01-01',
      offsetSeconds: 90,
      url: 'https://www.youtube.com/watch?v=video&t=90s',
    },
  ]);
});

it('round trips long Unicode queries and rejects malformed launch targets', () => {
  const state = { query: 'A & B: 音楽 🎶'.repeat(6), game: true };
  expect(parseMusicActivityTarget(encodeMusicActivityTarget(state))).toEqual(
    state,
  );
  expect(parseMusicActivityTarget('Dark Souls')).toBeNull();
  expect(parseMusicActivityTarget('music:%')).toBeNull();
  expect(
    parseMusicActivityTarget(
      encodeMusicActivityTarget({ query: '', game: false }),
    ),
  ).toBeNull();
  const longest = encodeMusicActivityTarget({
    query: '音'.repeat(100),
    game: false,
  });
  expect(
    buildEmbeddedAppActivityUrl('1234567890123456789', longest).length,
  ).toBeLessThanOrEqual(512);
  expect(
    parseMusicActivityTarget(
      `music:${encodeURIComponent(JSON.stringify({ query: '', game: 'yes' }))}`,
    ),
  ).toBeNull();
});

it('recognizes explicitly cataloged series and combines track aliases', () => {
  expect(
    buildMusicFacts([
      play('Theme - DS2', 'Dark Souls 2'),
      play('Theme - Dark Souls 2', 'Dark Souls 2'),
    ]).track,
  ).toEqual({ title: 'Theme - Dark Souls 2', count: 2 });
  expect(buildMusicFacts([play('Theme', 'Touhou Series')]).series).toEqual({
    title: 'Touhou Series',
    count: 1,
  });
  expect(buildMusicFacts([play('Artist - Song', null)]).series).toBeNull();
});
