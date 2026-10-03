import { describe, expect, it } from 'vitest';

import { buildMusicSearchReply } from '../../src/modules/music/music.discord';

describe('music search response', () => {
  it('shows the resolved title, latest timestamped link, count, and silent credit', () => {
    expect(
      buildMusicSearchReply([
        {
          title: 'Been Good to Know Ya',
          count: 3,
          lastStream: 'Stream P4',
          lastDate: '2026-09-11',
          lastOffsetSeconds: 1365,
          game: 'Cyberpunk 2077',
          video: { videoId: 'abcdefghijk', title: 'Music stream' },
        },
      ]),
    ).toEqual({
      content:
        '**Been Good to Know Ya**\nLatest stream: [Music stream · 2026-09-11 · 22:45](<https://www.youtube.com/watch?v=abcdefghijk&t=1365s>)\nHeard **3 times** in past streams.\n*Data collected by <@632504207441920011>.*',
      allowedMentions: { parse: [] },
    });
  });

  it('shows the known date and count if no video can be verified', () => {
    const response = buildMusicSearchReply([
      {
        title: 'Song',
        count: 1,
        lastStream: 'Stream 1',
        lastDate: '2021-10-01',
        lastOffsetSeconds: 3601,
        game: null,
        video: null,
      },
    ]);
    expect(response.content).toBe(
      '**Song**\nLatest stream: Stream 1 · 2021-10-01 · 1:00:01 (link unavailable)\nHeard **1 time** in past streams.\n*Data collected by <@632504207441920011>.*',
    );
    expect(buildMusicSearchReply(null).content).toContain('not been imported');
    expect(buildMusicSearchReply([]).content).toContain('No matching');
  });

  it('lists every track in a game with compact timestamp links', () => {
    expect(
      buildMusicSearchReply(
        [
          {
            title: 'Majula',
            game: 'Dark Souls II',
            streamDate: '2026-09-11',
            offsetSeconds: 60,
            video: {
              videoId: 'first',
              title:
                'A very long Davi Vasc music stream title that needs shortening in this link',
            },
          },
          {
            title: 'Longing',
            game: 'Dark Souls II',
            streamDate: '2026-09-11',
            offsetSeconds: 120,
            video: { videoId: 'first', title: 'Music stream' },
          },
        ],
        { game: true },
      ),
    ).toEqual({
      content:
        '**Dark Souls II**\nMajula · [A very long Davi Vasc music stream title that needs sh… · 1:00](<https://www.youtube.com/watch?v=first&t=60s>)\nLonging · [Music stream · 2:00](<https://www.youtube.com/watch?v=first&t=120s>)\n*Data collected by <@632504207441920011>.*',
      allowedMentions: { parse: [] },
    });
  });
});
