import { describe, expect, it } from 'vitest';
import { parseMusicCatalog } from '../../src/modules/music/music-catalog.parser';
import {
  findMusicGamePlays,
  searchMusicPlays,
} from '../../src/modules/music/music-search';

const history = `Per Stream :
Stream 32 (D) : 25/09/02026
2:47 - Kokoto Village - Monster Hunter Generations
7:46 Avarice - Death's Door
Stream 2 : 20/12/21
Monster Hunter Generations-Kokoto Village: 3:56
Per Game :
Monster Hunter :
Stream 32 : 2:47 Kokoto Village - Generations
Stream 2 : 3:56 Kokoto Village - Generations
Death's Door :
Stream 32 : 7:46 Avarice`;

describe('music catalog', () => {
  it('retains stream modes, varied year formats and the latest song timestamp', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 32 (D) : 25/09/02026
2:47 - Village Theme - Example Game
Stream 31 (C) : 28/08/26
2:19:58:Another Game: Cave Theme
Stream P4 : 11/09/2026
22:45 Been Good to Know Ya - Cyberpunk 2077
Stream 1 : 01/10/21
1:00 Old Track - Old Game
Per Game :
Cyberpunk 2077 :
Stream P4 : 22:45 Been Good to Know Ya`);
    expect(new Set(plays.map((play) => play.streamLabel)).size).toBe(4);
    expect(plays).toHaveLength(4);
    expect(
      plays.find((play) => play.streamLabel === 'Stream 32 (D)'),
    ).toMatchObject({
      streamDate: '2026-09-25',
      offsetSeconds: 167,
      musicMode: 'DEMOCRACY',
    });
    expect(
      new Set(plays.map((play) => `${play.streamLabel}:${play.offsetSeconds}`))
        .size,
    ).toBe(plays.length);
    expect(
      plays.find((play) => play.streamLabel === 'Stream 31 (C)')?.musicMode,
    ).toBe('CAPITALISM');
    expect(
      plays.find((play) => play.streamLabel === 'Stream P4')?.musicMode,
    ).toBe('PATREON_CAPITALISM');
    expect(
      plays.find((play) => play.streamLabel === 'Stream 1')?.musicMode,
    ).toBe('UNKNOWN');
    expect(searchMusicPlays(plays, 'Been Good to Know Ya')[0]).toMatchObject({
      lastStream: 'Stream P4',
      lastDate: '2026-09-11',
      lastOffsetSeconds: 1365,
    });
  });

  it('joins index names onto plays while retaining original aliases and counting repeats', () => {
    const plays = parseMusicCatalog(history);
    expect(plays).toHaveLength(3);
    expect(searchMusicPlays(plays, 'kokotto vilage')[0]).toMatchObject({
      title: 'Kokoto Village - Generations',
      game: 'Monster Hunter',
      count: 2,
      lastStream: 'Stream 32 (D)',
      lastDate: '2026-09-25',
    });
    expect(searchMusicPlays(plays, 'zzzzzzz')).toEqual([]);
    expect(searchMusicPlays(plays, '  ')).toEqual([]);
  });

  it('assigns games only from matching per-game stream timestamps', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 10 : 01/01/26
1:00 Song One - Artist
2:00 Song Two - Artist
Per Game :
Dark Souls II :
Stream 10 : 1:00 Song One - Artist
Different Game :
Stream 10 : 3:00 Missing track`);
    expect(plays).toEqual([
      expect.objectContaining({
        title: 'Song One - Artist',
        game: 'Dark Souls II',
      }),
      expect.objectContaining({ title: 'Song Two - Artist', game: null }),
    ]);
  });

  it('finds every track from a game despite a Roman numeral query variant', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Majula - Artist
2:00 Longing - Artist
Stream 2 : 02/01/26
1:00 Firelink - Artist
Per Game :
Dark Souls II :
Stream 1 : 1:00 Majula - Artist
Stream 1 : 2:00 Longing - Artist
Dark Souls III :
Stream 2 : 1:00 Firelink - Artist`);
    expect(findMusicGamePlays(plays, 'dark souls 2')).toEqual([
      expect.objectContaining({
        title: 'Majula - Artist',
        game: 'Dark Souls II',
        offsetSeconds: 60,
      }),
      expect.objectContaining({
        title: 'Longing - Artist',
        game: 'Dark Souls II',
        offsetSeconds: 120,
      }),
    ]);
  });

  it('supports leading and trailing timestamps, parentheses, accents and reversed title order', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/10/21
2:00 Pokémon - Battle Theme
Battle Theme (Pokemon) 3:00
Other Game - Battle Theme: 4:00`);
    expect(searchMusicPlays(plays, 'pokemon')[0]?.count).toBe(2);
    expect(searchMusicPlays(plays, 'other game')[0]?.count).toBe(1);
  });

  it('counts repeated plays while choosing the newest date and latest timestamp', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/21
1:00 Repeated Track - Game
Stream 3 : 01/03/21
2:00 Repeated Track - Game
3:00 Repeated Track - Game
Stream 2 : 01/02/21
4:00 Repeated Track - Game`);
    expect(searchMusicPlays(plays, 'repeated track')[0]).toMatchObject({
      count: 4,
      lastDate: '2021-03-01',
      lastStream: 'Stream 3',
      lastOffsetSeconds: 180,
    });
  });

  it('ranks exact matches above typo matches, with stable ordering for tied results', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/21
1:00 Track - Beta
2:00 Track - Alpha
3:00 Tract - Game
Stream 2 : 01/02/21
1:00 Track - Gamma`);
    expect(
      searchMusicPlays(plays, 'track').map((result) => result.title),
    ).toEqual([
      'Track - Gamma',
      'Track - Alpha',
      'Track - Beta',
      'Tract - Game',
    ]);
  });

  it.each([
    '',
    'random notes',
    'Per Stream :\nStream 1 : 31/02/26\n1:00 Song',
    'Per Stream :\nStream 1 : 01/01/26\nmissing timestamp',
    'Per Stream :\nStream 1 : 01/01/26',
    'Per Stream :\nStream 1 : 01/01/26\n1:99 Song',
    'Per Stream :\nStream 1 : 01/01/26\n1:00 Song\n1:00 Different song',
  ])('rejects malformed history: %s', (text) => {
    expect(() => parseMusicCatalog(text)).toThrow();
  });
});
