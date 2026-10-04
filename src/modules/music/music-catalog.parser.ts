import type { MusicPlay } from './music.types';
import {
  parseStreamHeader,
  timedTitle,
  trimSeparators,
} from './music-catalog.lines';
import { resolveMusicGames } from './music-games';
import { musicIndexMatchesTrack } from './music-tracks';

const parseStreamHistory = (history: string[]) => {
  const plays = new Map<string, MusicPlay>();
  const streams = new Set<string>();
  let stream: ReturnType<typeof parseStreamHeader> | undefined;
  let streamEntries = 0;
  for (const line of history) {
    if (
      !line ||
      line === 'Per Stream :' ||
      line.startsWith('https://youtu.be/')
    )
      continue;
    if (line.startsWith('Stream ')) {
      if (stream && streamEntries === 0)
        throw new Error(`Empty stream: ${stream.streamLabel}`);
      stream = parseStreamHeader(line);
      if (streams.has(stream.streamId))
        throw new Error(`Duplicate stream: ${stream.streamId}`);
      streams.add(stream.streamId);
      streamEntries = 0;
      continue;
    }
    if (!stream) throw new Error('Music entry without a stream.');
    const entry = timedTitle(line);
    if (!entry.title || entry.title.length > 1000)
      throw new Error('Invalid music title.');
    const key = `${stream.streamId}:${entry.offsetSeconds}`;
    if (plays.has(key)) throw new Error(`Duplicate music timestamp: ${key}`);
    plays.set(key, {
      streamLabel: stream.streamLabel,
      streamDate: stream.streamDate,
      musicMode: stream.musicMode,
      ...entry,
      originalTitle: entry.title,
      game: null,
    });
    streamEntries++;
  }
  if (plays.size === 0 || streamEntries === 0)
    throw new Error('Empty music history.');

  return plays;
};

const enrichFromGameIndex = (
  plays: Map<string, MusicPlay>,
  index: string[],
) => {
  let game = '';
  const games = new Set<string>();
  const enriched = new Set<string>();
  for (const line of index) {
    if (!line) continue;
    if (!line.startsWith('Stream ')) {
      game = trimSeparators(line);
      if (game) games.add(game);
      continue;
    }
    const remainder = line.slice('Stream '.length);
    const idEnd = remainder.indexOf(' ');
    const streamId = remainder.slice(0, idEnd);
    try {
      const entry = timedTitle(
        trimSeparators(remainder.slice(idEnd + 1).replaceAll(';', ':')),
      );
      const key = `${streamId}:${entry.offsetSeconds}`;
      const play = plays.get(key);
      if (
        play &&
        game &&
        entry.title &&
        !enriched.has(key) &&
        musicIndexMatchesTrack(play, entry.title, game)
      ) {
        play.title = entry.title;
        play.game = game;
        enriched.add(key);
      }
    } catch {
      // Inconsistent secondary-index rows leave the original history intact.
    }
  }
  return [...games];
};
export const parseMusicCatalog = (text: string): MusicPlay[] => {
  const lines = text.split('\n').map((line) => line.trim());
  if (lines.find((line) => line.length > 0) !== 'Per Stream :')
    throw new Error('Missing Per Stream history.');
  const indexStart = lines.indexOf('Per Game :');
  const history = indexStart < 0 ? lines : lines.slice(0, indexStart);
  const index = indexStart < 0 ? [] : lines.slice(indexStart + 1);
  const plays = parseStreamHistory(history);
  const indexedGames = enrichFromGameIndex(plays, index);
  return resolveMusicGames([...plays.values()], indexedGames);
};
