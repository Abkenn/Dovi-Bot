import type {
  MusicGameResult,
  MusicPlay,
  MusicSearchResult,
} from './music.types';
import { musicIdentity, musicWords } from './music-normalization';

const similarity = (left: string, right: string) => {
  if (left === right) return 1;
  if (left.length < 4) return 0;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    for (let column = 1; column <= right.length; column++) {
      current.push(
        Math.min(
          (current[column - 1] ?? 0) + 1,
          (previous[column] ?? 0) + 1,
          (previous[column - 1] ?? 0) +
            Number(left[row - 1] !== right[column - 1]),
        ),
      );
    }
    previous = current;
  }
  return (
    1 - (previous[right.length] ?? 0) / Math.max(left.length, right.length)
  );
};

const scoreMusicText = (text: string, terms: string[]) => {
  const words = musicWords(text);
  const scores = terms.map((term) =>
    Math.max(0, ...words.map((word) => similarity(term, word))),
  );
  return scores.every((value) => value >= 0.7)
    ? scores.reduce((sum, value) => sum + value, 0) / terms.length
    : 0;
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
  for (const play of plays) {
    const key = musicIdentity(play.title);
    const score = scoreMusicText(
      `${play.title} ${play.originalTitle} ${play.game ?? ''}`,
      terms,
    );
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
  const terms = musicWords(query.slice(0, 100));
  if (!terms.length) return [];
  const gameScores = new Map<string, number>();
  for (const play of plays) {
    if (!play.game || gameScores.has(play.game)) continue;
    gameScores.set(play.game, scoreMusicText(play.game, terms));
  }
  const bestScore = Math.max(0, ...gameScores.values());
  if (bestScore === 0) return [];
  const matchingGames = new Set(
    [...gameScores].flatMap(([game, score]) =>
      score === bestScore ? [game] : [],
    ),
  );
  return plays
    .filter(
      (play): play is MusicPlay & { game: string } =>
        play.game !== null && matchingGames.has(play.game),
    )
    .sort(
      (left, right) =>
        left.streamDate.localeCompare(right.streamDate) ||
        left.offsetSeconds - right.offsetSeconds ||
        left.title.localeCompare(right.title),
    );
};
