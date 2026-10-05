import type {
  MusicActivityResult,
  MusicFacts,
  MusicGameSearchView,
  MusicPlay,
  MusicSearchView,
} from './music.types';
import { musicGameFamily, resolveMusicGames } from './music-games';
import { musicIdentity, musicWords } from './music-normalization';
import { musicTrackDisplayTitle } from './music-tracks';

export const buildMusicFacts = (plays: MusicPlay[]): MusicFacts => {
  const tracks = new Map<string, { title: string; count: number }>();
  const families = new Map<
    string,
    { title: string; count: number; games: Set<string> }
  >();
  for (const play of resolveMusicGames(plays)) {
    const title = musicTrackDisplayTitle(play.title, play.game);
    const key = `${musicIdentity(play.game ?? '')}:${musicIdentity(title)}`;
    tracks.set(key, { title, count: (tracks.get(key)?.count ?? 0) + 1 });
    if (!play.game) continue;
    const family = musicGameFamily(play.game);
    const familyKey = musicIdentity(family);
    const current = families.get(familyKey) ?? {
      title: family,
      count: 0,
      games: new Set<string>(),
    };
    current.count += 1;
    current.games.add(musicIdentity(play.game));
    families.set(familyKey, current);
  }
  const rank = (
    left: { title: string; count: number },
    right: { title: string; count: number },
  ) => right.count - left.count || left.title.localeCompare(right.title);
  const track = [...tracks.values()].sort(rank)[0] ?? null;
  const winner = [...families.values()]
    .filter(
      (family) =>
        family.games.size > 1 || musicWords(family.title).at(-1) === 'series',
    )
    .sort(rank)[0];
  return {
    track,
    series: winner ? { title: winner.title, count: winner.count } : null,
  };
};

export const toMusicActivityResults = (
  results: (MusicSearchView | MusicGameSearchView)[],
): MusicActivityResult[] =>
  results.map((result) => {
    const offsetSeconds =
      'offsetSeconds' in result
        ? result.offsetSeconds
        : result.lastOffsetSeconds;
    return {
      title: musicTrackDisplayTitle(result.title, result.game),
      game: result.game ?? null,
      count: result.count,
      date: 'streamDate' in result ? result.streamDate : result.lastDate,
      offsetSeconds,
      url: result.video
        ? `https://www.youtube.com/watch?v=${result.video.videoId}&t=${offsetSeconds}s`
        : null,
    };
  });
