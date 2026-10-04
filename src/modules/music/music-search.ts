import type {
  MusicGameResult,
  MusicGameTrackResult,
  MusicPlay,
  MusicSearchResult,
} from './music.types';
import { musicTrackDisplayTitle } from './music-tracks';

export const groupMusicGameTracks = (
  plays: MusicGameResult[],
): MusicGameTrackResult[] => {
  const groups = new Map<string, MusicGameTrackResult>();
  for (const play of plays) {
    const title = musicTrackDisplayTitle(play.title, play.game);
    const key = `${musicIdentity(play.game)}:${musicIdentity(title)}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...play, count: 1 });
      continue;
    }
    const later = play.streamDate > existing.streamDate;
    const laterTimestamp =
      play.streamDate === existing.streamDate &&
      play.offsetSeconds > existing.offsetSeconds;
    const latest = later || laterTimestamp ? play : existing;
    groups.set(key, { ...latest, count: existing.count + 1 });
  }
  return [...groups.values()];
};

import { musicGameInitials, resolveMusicGames } from './music-games';
import { isDigits, musicIdentity, musicWords } from './music-normalization';
import { scoreMusicText } from './music-text-match';
import { musicTrackSearchText } from './music-tracks';

const gameSearchTerms = (plays: MusicPlay[], query: string) => {
  const gamesByInitialism = new Map<string, Set<string>>();
  for (const play of plays) {
    if (!play.game) continue;
    const words = musicWords(play.game);
    const last = words.at(-1) ?? '';
    const family = isDigits(last) ? words.slice(0, -1) : words;
    const initialism = musicGameInitials(family.join(' '));
    if (!initialism) continue;
    const games = gamesByInitialism.get(initialism) ?? new Set<string>();
    games.add(family.join(' '));
    gamesByInitialism.set(initialism, games);
  }
  return musicWords(query.slice(0, 100)).flatMap((term) => {
    const digitStart = [...term].findIndex((character) => isDigits(character));
    const initials = digitStart < 0 ? term : term.slice(0, digitStart);
    const number = digitStart < 0 ? '' : term.slice(digitStart);
    const games = gamesByInitialism.get(initials);
    if (!games || games.size !== 1) return [term];
    const family = musicWords([...games][0] ?? term);
    return isDigits(number) ? [...family, number] : family;
  });
};

export const searchMusicPlays = (
  plays: MusicPlay[],
  query: string,
): MusicSearchResult[] => {
  const terms = musicWords(query.slice(0, 100));
  if (!terms.length) return [];
  const groups = new Map<
    string,
    { result: MusicSearchResult; score: number }
  >();
  for (const play of resolveMusicGames(plays)) {
    const key = `${musicIdentity(play.game ?? '')}:${musicIdentity(play.title)}`;
    const score = scoreMusicText(musicTrackSearchText(play), terms);
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        score,
        result: {
          title: play.title,
          count: 1,
          lastStream: play.streamLabel,
          lastDate: play.streamDate,
          lastOffsetSeconds: play.offsetSeconds,
          game: play.game,
        },
      });
      continue;
    }
    group.score = Math.max(group.score, score);
    group.result.count++;
    const laterInSameStream =
      play.streamDate === group.result.lastDate &&
      play.offsetSeconds > group.result.lastOffsetSeconds;
    if (play.streamDate > group.result.lastDate || laterInSameStream) {
      group.result.lastStream = play.streamLabel;
      group.result.lastDate = play.streamDate;
      group.result.title = play.title;
      group.result.lastOffsetSeconds = play.offsetSeconds;
      group.result.game = play.game;
    }
  }
  return [...groups.values()]
    .filter((group) => group.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.result.lastDate.localeCompare(left.result.lastDate) ||
        left.result.title.localeCompare(right.result.title),
    )
    .slice(0, 5)
    .map((group) => group.result);
};

export const findMusicGamePlays = (
  plays: MusicPlay[],
  query: string,
): MusicGameResult[] => {
  const reconciled = resolveMusicGames(plays);
  const terms = gameSearchTerms(reconciled, query);
  if (!terms.length) return [];
  const gamePlays = reconciled.filter(
    (play): play is MusicPlay & { game: string } => play.game !== null,
  );
  const resolvedPlays = gamePlays;
  const series = new Set(
    resolvedPlays.flatMap((play) => {
      const words = musicWords(play.game);
      const last = words.at(-1) ?? '';
      return isDigits(last) ? [words.slice(0, -1).join(' ')] : [];
    }),
  );
  const numberedPlays = resolvedPlays.map((play) => {
    const words = musicWords(play.game);
    const originalWords = musicWords(play.originalTitle);
    const originalEndsInGame = words.every(
      (word, index) =>
        originalWords[originalWords.length - words.length + index] === word,
    );
    const originalStartsInGame =
      play.originalTitle.toLowerCase().startsWith(play.game.toLowerCase()) &&
      play.originalTitle.slice(play.game.length).trimStart().startsWith('-');
    const explicitlyUnnumbered = originalEndsInGame || originalStartsInGame;
    const unnumberedSeries =
      series.has(words.join(' ')) && explicitlyUnnumbered;
    return unnumberedSeries ? { ...play, game: `${play.game} 1` } : play;
  });
  const queryNumbers = terms.filter(isDigits);
  const scoredPlays = numberedPlays.flatMap((play) => {
    const gameNumbers = musicWords(play.game).filter(isDigits);
    if (!queryNumbers.every((number) => gameNumbers.includes(number)))
      return [];
    const score = scoreMusicText(play.game, terms);
    return score > 0 ? [{ play, score }] : [];
  });
  const bestScore = Math.max(0, ...scoredPlays.map(({ score }) => score));
  if (bestScore === 0) return [];
  return scoredPlays
    .filter(({ score }) => score === bestScore)
    .map(({ play }) => play)
    .sort(
      (left, right) =>
        left.streamDate.localeCompare(right.streamDate) ||
        left.offsetSeconds - right.offsetSeconds ||
        left.title.localeCompare(right.title),
    );
};
