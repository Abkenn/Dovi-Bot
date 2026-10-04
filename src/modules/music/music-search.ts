import type {
  MusicGameResult,
  MusicPlay,
  MusicSearchResult,
} from './music.types';
import { isDigits, musicIdentity, musicWords } from './music-normalization';

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

const gameInitialism = (game: string) =>
  musicWords(game)
    .map((word) => word[0] ?? '')
    .join('');

const gameSequelNumbers = (play: MusicPlay) => {
  if (!play.game) return [];
  const initialism = gameInitialism(play.game);
  if (!initialism) return [];
  return musicWords(`${play.title} ${play.originalTitle}`).flatMap((word) => {
    if (!word.startsWith(initialism)) return [];
    const number = word.slice(initialism.length);
    return isDigits(number) ? [number] : [];
  });
};

const resolvedGameTitle = (play: MusicPlay & { game: string }) => {
  const numbers = [...new Set(gameSequelNumbers(play))];
  const number = numbers[0];
  return numbers.length === 1 && number ? `${play.game} ${number}` : play.game;
};

const gameAliasTerms = (play: MusicPlay) => {
  if (!play.game) return [];
  const gameWords = musicWords(play.game);
  return gameSequelNumbers(play).flatMap((number) => [...gameWords, number]);
};

const musicSearchText = (play: MusicPlay) =>
  `${play.title} ${play.originalTitle} ${play.game ?? ''} ${gameAliasTerms(play).join(' ')}`;

const gameSearchTerms = (plays: MusicPlay[], query: string) => {
  const gamesByInitialism = new Map<string, Set<string>>();
  for (const play of plays) {
    if (!play.game) continue;
    const initialism = gameInitialism(play.game);
    if (!initialism) continue;
    const games = gamesByInitialism.get(initialism) ?? new Set<string>();
    games.add(play.game);
    gamesByInitialism.set(initialism, games);
  }
  return musicWords(query.slice(0, 100)).flatMap((term) => {
    const games = gamesByInitialism.get(term);
    if (!games || games.size !== 1) return [term];
    return musicWords([...games][0] ?? term);
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
  for (const play of plays) {
    const key = musicIdentity(play.title);
    const score = scoreMusicText(musicSearchText(play), terms);
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
  const terms = gameSearchTerms(plays, query);
  if (!terms.length) return [];
  const gamePlays = plays.filter(
    (play): play is MusicPlay & { game: string } => play.game !== null,
  );
  const resolvedPlays = gamePlays.map((play) => ({
    ...play,
    game: resolvedGameTitle(play),
  }));
  const series = new Set(
    resolvedPlays.flatMap((play) => {
      const words = musicWords(play.game);
      const last = words.at(-1) ?? '';
      return isDigits(last) ? [words.slice(0, -1).join(' ')] : [];
    }),
  );
  const numberedPlays = resolvedPlays.map((play) => {
    const words = musicWords(play.game);
    const unnumberedSeries = series.has(words.join(' '));
    return unnumberedSeries ? { ...play, game: `${play.game} 1` } : play;
  });
  const queryNumbers = terms.filter(isDigits);
  const scoredPlays = numberedPlays.flatMap((play) => {
    const gameNumbers = musicWords(play.game).filter(isDigits);
    if (!queryNumbers.every((number) => gameNumbers.includes(number)))
      return [];
    const score = scoreMusicText(musicSearchText(play), terms);
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
