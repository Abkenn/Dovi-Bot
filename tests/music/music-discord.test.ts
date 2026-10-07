import { describe, expect, it } from 'vitest';

import {
  buildMusicGamePages,
  buildMusicSearchReply,
} from '../../src/modules/music/music.discord';

describe('music search response', () => {
  it('renders game-shaped results safely when the caller omits the game option', () => {
    const result = {
      title: 'Majula - DS2',
      game: 'Dark Souls 2',
      count: 1,
      streamDate: '2026-09-11',
      offsetSeconds: 60,
      video: null,
    };
    expect(buildMusicSearchReply([result])).toEqual(
      buildMusicSearchReply([result], { game: true }),
    );
  });
  it.each([
    'https://youtu.be/ofeCOBSAWRQ',
    '<https://youtu.be/ofeCOBSAWRQ>',
    '(https://www.youtube.com/watch?v=ofeCOBSAWRQ)',
  ])('removes catalog source URLs from track labels without losing the timestamped stream link: %s', (sourceUrl) => {
    const result = {
      title: `Oriental Sky of Scarlet Perception - TH10.5 SWR  ${sourceUrl}`,
      game: 'Touhou Series',
      count: 1,
      streamDate: '2026-09-11',
      offsetSeconds: 5756,
      video: { videoId: '8DZ9PgcyZTs', title: 'Music stream' },
    };
    const expectedLine =
      '* [Oriental Sky of Scarlet Perception - TH10.5 SWR](<https://www.youtube.com/watch?v=8DZ9PgcyZTs&t=5756s>) (1:35:56) · heard 1 time';
    expect(buildMusicGamePages([result])[0]).toContain(expectedLine);
    expect(buildMusicSearchReply([result], { game: true }).content).toContain(
      expectedLine,
    );
    expect(
      buildMusicSearchReply([
        {
          title: result.title,
          game: result.game,
          count: 1,
          lastStream: 'Stream 1',
          lastDate: result.streamDate,
          lastOffsetSeconds: result.offsetSeconds,
          video: result.video,
        },
      ]).content,
    ).toContain('**Oriental Sky of Scarlet Perception - TH10.5 SWR**');
    expect(result.title).toContain(sourceUrl);
  });

  it.each([
    ['Song - https://youtu.be/source', 'Song'],
    ['Song(https://youtu.be/source)', 'Song'],
    ['Songhttps://youtu.be/source', 'Song'],
    ['Song [www.example.com/source]', 'Song'],
    ['https://youtu.be/source', 'Track title unavailable'],
  ])('keeps a safe, readable title when a source URL is appended as %s', (title, label) => {
    const result = {
      title,
      game: 'Touhou Series',
      count: 2,
      streamDate: '2026-09-11',
      offsetSeconds: 5756,
      video: { videoId: 'abcdefghijk', title: 'Music stream' },
    };
    const expectedLine = `* [${label}](<https://www.youtube.com/watch?v=abcdefghijk&t=5756s>) (1:35:56) · heard 2 times`;
    expect(buildMusicGamePages([result])[0]).toContain(expectedLine);
    expect(buildMusicSearchReply([result], { game: true }).content).toContain(
      expectedLine,
    );
  });

  it('keeps punctuation and multiline titles readable while removing multiple source URLs', () => {
    const reply = buildMusicSearchReply([
      {
        title:
          'Song (Reprise)\nhttps://youtu.be/first\tPart II https://example.org/source',
        game: null,
        count: 1,
        lastStream: 'Stream 1',
        lastDate: '2026-09-11',
        lastOffsetSeconds: 60,
        video: null,
      },
    ]);
    expect(reply.content).toContain('**Song (Reprise)**');
    expect(reply.content).not.toContain('https://');
  });
  it('shows the total play count beside the latest timestamp link', () => {
    const reply = buildMusicSearchReply(
      [
        {
          title: "World's End Valentine",
          game: 'OMORI',
          count: 5,
          streamDate: '2026-09-11',
          offsetSeconds: 1220,
          video: { videoId: 'latest', title: 'Music stream' },
        },
      ],
      { game: true },
    );
    expect(reply.content).toContain(
      "* [World's End Valentine](<https://www.youtube.com/watch?v=latest&t=1220s>) (20:20) · heard 5 times",
    );
  });
  it('expands ambiguous initials using the resolved game and keeps numbered query headings specific', () => {
    const reply = buildMusicSearchReply(
      [
        {
          title: 'Cries of Coral - AC6',
          game: 'Armored Core 6',
          streamDate: '2026-09-11',
          count: 1,
          offsetSeconds: 60,
          video: null,
        },
        {
          title: 'Naval Blockade - AC5',
          game: 'Ace Combat 5',
          streamDate: '2026-09-11',
          count: 1,
          offsetSeconds: 120,
          video: null,
        },
      ],
      { game: true },
    );
    expect(reply.content).toContain(
      '* Cries of Coral - Armored Core 6 (1:00; link unavailable)',
    );
    expect(reply.content).toContain(
      '* Naval Blockade - Ace Combat 5 (2:00; link unavailable)',
    );
    expect(
      buildMusicSearchReply(
        [
          {
            title: 'Majula - DS2',
            game: 'Dark Souls 2',
            streamDate: '2026-09-11',
            count: 1,
            offsetSeconds: 60,
            video: null,
          },
        ],
        { game: true, query: 'dark souls 2' },
      ).content.split('\n')[0],
    ).toBe('**Dark Souls 2**');
  });
  it('uses a series heading and full game names for a broad query even with one catalog game', () => {
    const reply = buildMusicSearchReply(
      [
        {
          title: 'The Only Thing They Fear Is You - D1',
          game: 'Doom 1',
          streamDate: '2026-09-11',
          count: 1,
          offsetSeconds: 60,
          video: { videoId: 'first', title: 'Video title' },
        },
      ],
      { game: true, query: 'doom' },
    );
    expect(reply.content.split('\n')[0]).toBe('**Doom Series**');
    expect(reply.content).toContain(
      '* [The Only Thing They Fear Is You - Doom](<https://www.youtube.com/watch?v=first&t=60s>) (1:00)',
    );
    expect(reply.content).not.toContain('Video title');
  });
  it.each([
    6, 5,
  ])('uses track hyperlinks for crowded replies with %i tracks', (count) => {
    const results = Array.from({ length: count }, (_, index) => ({
      title: `Naval Blockade ${index} - AC5${count === 5 ? ' extra long track name'.repeat(4) : ''}`,
      game: 'Ace Combat 5',
      streamDate: '2026-09-11',
      count: 1,
      offsetSeconds: 3325,
      video: { videoId: 'abcdefghijk', title: 'Video title '.repeat(5) },
    }));
    const reply = buildMusicSearchReply(results, { game: true });
    expect(reply.content).toContain(
      `* [Naval Blockade 0 - Ace Combat 5${count === 5 ? ' extra long track name'.repeat(4) : ''}](<https://www.youtube.com/watch?v=abcdefghijk&t=3325s>) (55:25)`,
    );
    expect(reply.content).not.toContain('Video title');
    expect(reply.content).not.toContain('more tracks');
  });

  it('keeps long franchise results within the limit without splitting links or losing credits', () => {
    const results = Array.from({ length: 30 }, (_, index) => ({
      title: `Track ${index} - AC${index % 2 === 0 ? 5 : 7}`,
      game: `Ace Combat ${index % 2 === 0 ? 5 : 7}`,
      streamDate: '2026-09-11',
      count: 1,
      offsetSeconds: index * 60,
      video: {
        videoId: 'abcdefghijk',
        title: 'A long stream title '.repeat(5),
      },
    }));
    const reply = buildMusicSearchReply(results, { game: true });
    expect(reply.content.length).toBeLessThanOrEqual(2_000);
    expect(reply.content.split('\n')[0]).toBe('**Ace Combat Series**');
    expect(reply.content).toContain('more tracks');
    expect(
      reply.content.endsWith('*Data collected by <@632504207441920011>.*'),
    ).toBe(true);
    for (const line of reply.content
      .split('\n')
      .filter((line) => line.includes('https://'))) {
      expect(line).toContain('s>) (');
    }
  });

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
            count: 1,
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
            count: 1,
            offsetSeconds: 120,
            video: { videoId: 'first', title: 'Music stream' },
          },
        ],
        { game: true },
      ),
    ).toEqual({
      content:
        '**Dark Souls II**\n* [Majula](<https://www.youtube.com/watch?v=first&t=60s>) (1:00) · heard 1 time\n* [Longing](<https://www.youtube.com/watch?v=first&t=120s>) (2:00) · heard 1 time\n*Data collected by <@632504207441920011>.*',
      allowedMentions: { parse: [] },
    });
  });
});
