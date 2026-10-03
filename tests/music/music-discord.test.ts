import { describe, expect, it } from 'vitest';
import { buildMusicSearchReply } from '../../src/modules/music/music.discord';

describe('music search response', () => {
  it('shows latest timestamped link, count, and silent credits on three lines', () => {
    expect(
      buildMusicSearchReply([
        {
          title: 'Been Good to Know Ya',
          count: 3,
          lastStream: 'Stream P4',
          lastDate: '2026-09-11',
          lastOffsetSeconds: 1365,
          video: { videoId: 'abcdefghijk', title: 'Music stream' },
        },
      ]),
    ).toEqual({
      content:
        'Latest stream: [Music stream · 2026-09-11 · 22:45](<https://www.youtube.com/watch?v=abcdefghijk&t=1365s>)\nHeard **3 times** in past streams.\n*Data collected by <@632504207441920011>.*',
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
        video: null,
      },
    ]);
    expect(response.content).toBe(
      'Latest stream: Stream 1 · 2021-10-01 · 1:00:01 (link unavailable)\nHeard **1 time** in past streams.\n*Data collected by <@632504207441920011>.*',
    );
    expect(buildMusicSearchReply(null).content).toContain('not been imported');
    expect(buildMusicSearchReply([]).content).toContain('No matching');
  });
});
