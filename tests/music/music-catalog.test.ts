import { describe, expect, it } from 'vitest';
import { buildMusicSearchReply } from '../../src/modules/music/music.discord';
import { parseMusicCatalog } from '../../src/modules/music/music-catalog.parser';
import {
  findMusicGamePlays,
  groupMusicGameTracks,
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
  it('finds named sequels within a parent game without matching song names', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 City of Tears - Hollow Knight
2:00 Lost Lace - Hollow Knight Silksong
3:00 Hollow Knight Silksong - Cogwork Core
Per Game :
Hollow Knight :
Stream 1 : 1:00 City of Tears
Stream 1 : 2:00 Lost Lace
Stream 1 : 3:00 Cogwork Core`);
    expect(
      findMusicGamePlays(plays, 'silksong').map((play) => play.offsetSeconds),
    ).toEqual([120, 180]);
    expect(findMusicGamePlays(plays, 'hollow knight silksong')).toHaveLength(2);
    expect(findMusicGamePlays(plays, 'hollow knight')).toHaveLength(3);
    expect(findMusicGamePlays(plays, 'lost lace')).toEqual([]);
    expect(findMusicGamePlays(plays, 'cogwork')).toEqual([]);
  });
  it('does not fuzzy-match short queries to unrelated songs', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Save Room - Resident Evil Remake
Per Game :
Resident Evil :
Stream 1 : 1:00 Save Room - RE1 Remake`);
    expect(searchMusicPlays(plays, 'doom')).toEqual([]);
    expect(searchMusicPlays(plays, 'room')).toHaveLength(1);
  });
  it('preserves songs named after their game without accepting a game label as a replacement song', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Undertale - Undertale
2:00 Hollow Knight - Title Theme
Per Game :
Undertale :
Stream 1 : 1:00 Undertale
Hollow Knight :
Stream 1 : 2:00 Hollow Knight - HK1`);
    expect(searchMusicPlays(plays, 'undertale')).toHaveLength(1);
    expect(plays[1]?.title).toBe('Hollow Knight - Title Theme');
    expect(searchMusicPlays(plays, 'hollow knight')).toEqual([]);
    expect(searchMusicPlays(plays, 'title theme')).toHaveLength(1);
  });
  it('searches song names without matching game metadata or abbreviations', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Majula - Dark Souls II
2:00 Sir Alonne - DS2
Per Game :
Dark Souls :
Stream 1 : 1:00 Majula - DS2
Stream 1 : 2:00 Sir Alonne - DS2`);
    expect(searchMusicPlays(plays, 'dark souls')).toEqual([]);
    expect(searchMusicPlays(plays, 'ds2')).toEqual([]);
    expect(searchMusicPlays(plays, 'majulla')[0]?.title).toBe('Majula - DS2');
    expect(searchMusicPlays(plays, 'sir alone')[0]?.title).toBe(
      'Sir Alonne - DS2',
    );
    expect(findMusicGamePlays(plays, 'dark souls 2')).toHaveLength(2);
  });

  it('does not turn parenthesized soundtrack numbers into sequels', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Example Game - (143) Cat Theme
Per Game :
Example Game :
Stream 1 : 1:00 Cat Theme`);
    expect(plays[0]?.game).toBe('Example Game');
    expect(findMusicGamePlays(plays, 'example game 143')).toEqual([]);
  });

  it('preserves letter X titles while accepting Roman ten with independent numeric evidence', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Xenoblade Chronicles X - Theme X
2:00 Mega Man X - Central Highway
3:00 Final Fantasy X - To Zanarkand
Per Game :
Xenoblade Chronicles :
Stream 1 : 1:00 Theme X - XC X
Mega Man :
Stream 1 : 2:00 Central Highway - MMX1
Final Fantasy :
Stream 1 : 3:00 To Zanarkand - FF10`);
    expect(plays.map((play) => play.game)).toEqual([
      'Xenoblade Chronicles X',
      'Mega Man X 1',
      'Final Fantasy 10',
    ]);
    expect(findMusicGamePlays(plays, 'xenoblade chronicles 10')).toEqual([]);
    expect(findMusicGamePlays(plays, 'mega man 10')).toEqual([]);
    expect(findMusicGamePlays(plays, 'final fantasy 10')).toHaveLength(1);
  });

  it('does not combine identically named songs from different games', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 First Game - Main Theme
2:00 Second Game - Main Theme
Per Game :
First Game :
Stream 1 : 1:00 Main Theme
Second Game :
Stream 1 : 2:00 Main Theme`);
    expect(
      searchMusicPlays(plays, 'main theme').map((result) => ({
        game: result.game,
        count: result.count,
      })),
    ).toEqual([
      { game: 'First Game', count: 1 },
      { game: 'Second Game', count: 1 },
    ]);
  });

  it('infers missing index entries from explicit game names already in the catalog', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Minecraft - Pigstep
2:00 Minecraft - Creator
Per Game :
Minecraft :
Stream 1 : 1:00 Pigstep`);
    expect(plays[1]?.game).toBe('Minecraft');
    expect(searchMusicPlays(plays, 'minecraft')).toEqual([]);
    expect(searchMusicPlays(plays, 'creator')).toHaveLength(1);
  });

  it('does not overwrite a song with an unrelated index row at the same timestamp', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Monster Hunter Frontier G5 - Inagami Battle Theme
Per Game :
Epic Battle Fantasy :
Stream 1 : 1:00 Blade & Switch - EBF5
Monster Hunter :
Stream 1 : 1:00 Inagami Battle Theme - MHF`);
    expect(plays[0]).toMatchObject({
      title: 'Inagami Battle Theme - MHF',
      game: 'Monster Hunter',
    });
    expect(searchMusicPlays(plays, 'blade switch')).toEqual([]);
    expect(searchMusicPlays(plays, 'inagami')[0]?.title).toBe(
      'Inagami Battle Theme - MHF',
    );
  });

  it('prioritizes explicit original game names over a conflicting index and rejects ambiguous initials', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Contact With You - ARMORED CORE VI
2:00 Naval Blockade - Ace Combat 5
3:00 Cries of Coral - Armored Core VI
4:00 Armored Core Tribute - Ace Combat 5
Per Game :
Ace Combat :
Stream 1 : 1:00 Contact With You - AC6
Stream 1 : 2:00 Naval Blockade - AC5
Stream 1 : 4:00 Armored Core Tribute - AC5
Armored Core :
Stream 1 : 3:00 Cries of Coral - AC6`);
    expect(
      findMusicGamePlays(plays, 'armored core').map((play) => play.title),
    ).toEqual(['Contact With You - AC6', 'Cries of Coral - AC6']);
    expect(
      findMusicGamePlays(plays, 'ace combat').map((play) => play.title),
    ).toEqual(['Naval Blockade - AC5', 'Armored Core Tribute - AC5']);
    expect(
      findMusicGamePlays(plays, 'armored core 6').every(
        (play) => play.game === 'Armored Core 6',
      ),
    ).toBe(true);
    expect(findMusicGamePlays(plays, 'ac6')).toEqual([]);
    expect(plays[0]?.game).toBe('Armored Core 6');
    expect(searchMusicPlays(plays, 'contact with you')[0]?.game).toBe(
      'Armored Core 6',
    );
  });

  it('keeps ambiguous numbered initials contextual and does not invent sequel numbers', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Track - AC6
2:00 Second Track - AC6
Per Game :
Ace Combat :
Stream 1 : 1:00 Track - AC6
Armored Core :
Stream 1 : 2:00 Second Track - AC6`);
    expect(findMusicGamePlays(plays, 'ac6')).toEqual([]);
    expect(findMusicGamePlays(plays, 'ace combat 6')).toEqual([]);
    expect(findMusicGamePlays(plays, 'armored core 6')).toEqual([]);
  });

  it('does not call a named franchise entry game one merely because its index lacks a number', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Theme - Armored Core: Verdict Day
2:00 Theme Two - Armored Core VI
Per Game :
Armored Core :
Stream 1 : 1:00 Theme - Verdict Day
Stream 1 : 2:00 Theme Two - AC6`);
    expect(findMusicGamePlays(plays, 'armored core 1')).toEqual([]);
    expect(findMusicGamePlays(plays, 'armored core')).toHaveLength(2);
  });

  it('treats unnumbered franchise entries as game one while keeping sequels separate', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Original Theme - Ace Combat
2:00 Sequel Theme - AC2
Per Game :
Ace Combat :
Stream 1 : 1:00 Original Theme - Ace Combat
Stream 1 : 2:00 Sequel Theme - AC2`);
    expect(findMusicGamePlays(plays, 'ace combat 1')).toEqual([
      expect.objectContaining({
        title: 'Original Theme - Ace Combat',
        game: 'Ace Combat 1',
      }),
    ]);
    expect(findMusicGamePlays(plays, 'ace combat 2')).toEqual([
      expect.objectContaining({
        title: 'Sequel Theme - AC2',
        game: 'Ace Combat 2',
      }),
    ]);
    const results = findMusicGamePlays(plays, 'ace combat');
    expect(
      buildMusicSearchReply(
        groupMusicGameTracks(results).map((result) => ({
          ...result,
          video: null,
        })),
        { game: true },
      ).content.split('\n')[0],
    ).toBe('**Ace Combat Series**');
  });

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

  it('uses sequel aliases in track labels when the source groups a franchise together', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Majula - DS2
2:00 Firelink - DS3
Per Game :
Dark Souls :
Stream 1 : 1:00 Majula - DS2
Stream 1 : 2:00 Firelink - DS3`);
    expect(findMusicGamePlays(plays, 'dark souls II')).toEqual([
      expect.objectContaining({ title: 'Majula - DS2', game: 'Dark Souls 2' }),
    ]);
    const results = findMusicGamePlays(plays, 'dark souls 2');
    expect(
      buildMusicSearchReply(
        groupMusicGameTracks(results).map((result) => ({
          ...result,
          video: null,
        })),
        { game: true },
      ).content.split('\n')[0],
    ).toBe('**Dark Souls 2**');
  });

  it('resolves unique game initials without guessing ambiguous ones', () => {
    const plays = parseMusicCatalog(`Per Stream :
Stream 1 : 01/01/26
1:00 Limgrave - Artist
2:00 Venice - Artist
3:00 Brotherhood - Artist
4:00 Rubicon - Artist
Per Game :
Elden Ring :
Stream 1 : 1:00 Limgrave - Artist
Assassin's Creed 2 :
Stream 1 : 2:00 Venice - Artist
Ace Combat 2 :
Stream 1 : 3:00 Brotherhood - Artist
Armored Core 2 :
Stream 1 : 4:00 Rubicon - Artist`);
    expect(findMusicGamePlays(plays, 'er')).toEqual([
      expect.objectContaining({
        title: 'Limgrave - Artist',
        game: 'Elden Ring',
      }),
    ]);
    expect(findMusicGamePlays(plays, 'ac2')).toEqual([]);
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
