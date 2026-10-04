import type { MusicPlay } from './music.types';
import { musicGameFamily, musicGameInitials } from './music-games';
import { isDigits, musicIdentity, musicWords } from './music-normalization';
import { scoreMusicText } from './music-text-match';

const withoutGame = (text: string, game: string | null) => {
  const words = musicWords(text);
  if (!game) return words.join(' ');
  const family = musicGameFamily(game);
  const labels = [musicWords(game), musicWords(family)];
  const metadata = new Set<number>();
  for (const label of labels) {
    words.forEach((_, index) => {
      if (label.every((word, offset) => words[index + offset] === word))
        label.forEach((_, offset) => {
          metadata.add(index + offset);
        });
    });
  }
  const initials = musicGameInitials(family);
  const aliasLabels = text
    .split('-')
    .slice(1)
    .map((part) => part.trim());
  const trackWords = words.filter((word, index) => {
    if (metadata.has(index)) return false;
    if (word === initials) return false;
    const uppercaseAlias =
      word.startsWith(initials) && aliasLabels.includes(word.toUpperCase());
    if (uppercaseAlias) return false;
    return !(
      word.startsWith(initials) && isDigits(word.slice(initials.length))
    );
  });
  if (musicIdentity(text) === musicIdentity(game)) return words.join(' ');
  return trackWords.join(' ');
};

export const musicTrackSearchText = (play: MusicPlay) =>
  withoutGame(play.title, play.game);

export const musicIndexMatchesTrack = (
  play: MusicPlay,
  title: string,
  game: string,
) => {
  const original = play.originalTitle;
  const separator = title.lastIndexOf(' - ');
  const song = separator < 0 ? title : title.slice(0, separator);
  const gameWords = musicWords(musicGameFamily(game));
  if (musicIdentity(song) === musicIdentity(musicGameFamily(game))) {
    const originalWords = musicWords(original);
    const mentions = originalWords.filter((_, index) =>
      gameWords.every((word, offset) => originalWords[index + offset] === word),
    );
    if (mentions.length < 2) return false;
  }
  const indexed = withoutGame(song, game);
  const originalWords = musicWords(original);
  const indexedWords = musicWords(indexed);
  const shorter =
    originalWords.length < indexedWords.length ? originalWords : indexedWords;
  const longer =
    originalWords.length < indexedWords.length ? indexed : original;
  return scoreMusicText(longer, shorter) >= 0.7;
};
