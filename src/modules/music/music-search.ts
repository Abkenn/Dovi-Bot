import type { MusicPlay, MusicSearchResult } from './music.types';
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
    const words = musicWords(`${play.title} ${play.originalTitle}`);
    const scores = terms.map((term) =>
      Math.max(0, ...words.map((word) => similarity(term, word))),
    );
    const score = scores.every((value) => value >= 0.7)
      ? scores.reduce((sum, value) => sum + value, 0) / terms.length
      : 0;
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
