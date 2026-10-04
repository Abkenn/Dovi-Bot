import type { MusicPlay } from './music.types';
import { isDigits, musicWords } from './music-normalization';

const segmenter = new Intl.Segmenter('en', { granularity: 'word' });

export const musicGameInitials = (game: string) =>
  musicWords(game)
    .map((word) => (isDigits(word) ? word : (word[0] ?? '')))
    .join('');

export const musicGameFamily = (game: string) => {
  const words = game.split(' ');
  const last = musicWords(words.at(-1) ?? '')[0] ?? '';
  return isDigits(last) ? words.slice(0, -1).join(' ') : game;
};

const indexedNumbers = (title: string, game: string) => {
  const initials = musicGameInitials(game);
  return [
    ...new Set(
      musicWords(title).flatMap((word) => {
        if (!word.startsWith(initials)) return [];
        const suffix = word.slice(initials.length);
        return isDigits(suffix) ? [suffix] : [];
      }),
    ),
  ];
};

const explicitGame = (
  play: MusicPlay,
  games: { name: string; words: string[] }[],
) => {
  const original = musicWords(play.originalTitle);
  const segments = [...segmenter.segment(play.originalTitle)].filter(
    (segment) => segment.isWordLike,
  );
  const matches = games.flatMap(({ name: game, words }) => {
    return original.flatMap((_, index) => {
      if (!words.every((word, offset) => original[index + offset] === word))
        return [];
      const last = segments[index + words.length - 1];
      const next = segments[index + words.length];
      const adjacent =
        last &&
        next &&
        play.originalTitle
          .slice(last.index + last.segment.length, next.index)
          .trim() === '';
      const suffix = original[index + words.length] ?? '';
      const numbered = isDigits(words.at(-1) ?? '');
      let resolved = game;
      if (!numbered && adjacent && isDigits(suffix))
        resolved = `${game} ${suffix}`;
      if (!numbered && adjacent && suffix === 'x') {
        const number = indexedNumbers(play.title, game).includes('10')
          ? '10'
          : 'X';
        resolved = `${game} ${number}`;
      }
      return [
        { game: resolved, score: words.length + Number(resolved !== game) },
      ];
    });
  });
  const bestScore = Math.max(0, ...matches.map((match) => match.score));
  const best = [
    ...new Set(
      matches
        .filter((match) => match.score === bestScore)
        .map((match) => match.game),
    ),
  ];
  return best.length === 1 ? best[0] : undefined;
};

const unambiguousInitials = (games: string[]) => {
  const families = [...new Set(games.map(musicGameFamily))];
  const counts = new Map<string, number>();
  for (const family of families) {
    const initials = musicGameInitials(family);
    counts.set(initials, (counts.get(initials) ?? 0) + 1);
  }
  return new Set(
    [...counts]
      .filter(([, count]) => count === 1)
      .map(([initials]) => initials),
  );
};

const resolvePlay = (
  play: MusicPlay,
  games: { name: string; words: string[] }[],
  uniqueInitials: Set<string>,
) => {
  const explicit = explicitGame(play, games);
  const game = explicit ?? play.game;
  if (!game) return play;
  if (isDigits(musicWords(game).at(-1) ?? '')) return { ...play, game };
  const canUseAlias =
    Boolean(explicit) || uniqueInitials.has(musicGameInitials(game));
  if (!canUseAlias) return { ...play, game };
  const numbers = indexedNumbers(play.title, game);
  const number = numbers.length === 1 ? numbers[0] : undefined;
  return { ...play, game: number ? `${game} ${number}` : game };
};

export const resolveMusicGames = (
  plays: MusicPlay[],
  indexedGames: string[] = [],
): MusicPlay[] => {
  const games = [
    ...new Set([
      ...indexedGames,
      ...plays.flatMap((play) =>
        play.game ? [play.game, musicGameFamily(play.game)] : [],
      ),
    ]),
  ];
  const uniqueInitials = unambiguousInitials(games);
  const labels = games.map((name) => ({ name, words: musicWords(name) }));
  return plays.map((play) => resolvePlay(play, labels, uniqueInitials));
};
