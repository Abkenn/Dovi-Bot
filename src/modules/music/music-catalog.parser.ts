import { DateTime } from 'luxon';
import type { MusicPlay } from './music.types';
import { isDigits } from './music-normalization';

const trimSeparators = (text: string): string => {
  let result = text.trim();
  while (result.startsWith('-') || result.startsWith(':'))
    result = result.slice(1).trim();
  while (result.endsWith('-') || result.endsWith(':'))
    result = result.slice(0, -1).trim();
  return result;
};

const timestampSeconds = (value: string): number | null => {
  const parts = value.split(':');
  if (![2, 3].includes(parts.length) || !parts.every(isDigits)) return null;
  const numbers = parts.map(Number);
  if (numbers.slice(1).some((part) => part > 59)) return null;
  const seconds = numbers.reduce((total, part) => total * 60 + part, 0);
  return seconds <= 86_400 ? seconds : null;
};

const timedTitle = (line: string) => {
  let startEnd = 0;
  while (
    startEnd < line.length &&
    '0123456789:'.includes(line[startEnd] ?? ' ')
  )
    startEnd++;
  const leading = timestampSeconds(
    line.slice(0, startEnd).endsWith(':')
      ? line.slice(0, startEnd - 1)
      : line.slice(0, startEnd),
  );
  if (leading !== null)
    return {
      offsetSeconds: leading,
      title: trimSeparators(line.slice(startEnd)),
    };
  let endStart = line.length;
  while (endStart > 0 && '0123456789:'.includes(line[endStart - 1] ?? ' '))
    endStart--;
  const trailing = timestampSeconds(line.slice(endStart));
  if (trailing === null)
    throw new Error(`Unrecognized music entry: ${line.slice(0, 120)}`);
  return {
    offsetSeconds: trailing,
    title: trimSeparators(line.slice(0, endStart)),
  };
};

const parseStreamHeader = (line: string) => {
  const separator = line.indexOf(':');
  const streamLabel = line.slice(0, separator).trim();
  const [day, month, rawYear, extra] = line
    .slice(separator + 1)
    .trim()
    .split('/');
  if (
    !day ||
    !month ||
    !rawYear ||
    extra ||
    ![day, month, rawYear].every(isDigits)
  ) {
    throw new Error(`Invalid stream date: ${line}`);
  }
  const year = Number(rawYear) < 100 ? 2000 + Number(rawYear) : Number(rawYear);
  const date = DateTime.fromObject(
    { year, month: Number(month), day: Number(day) },
    { zone: 'UTC' },
  );
  const streamDate = date.toISODate();
  const streamId = streamLabel.split(' ')[1];
  if (!streamDate || year < 2000 || year > 2100 || !streamId)
    throw new Error(`Invalid stream header: ${line}`);
  let musicMode: MusicPlay['musicMode'] = 'UNKNOWN';
  if (streamId.startsWith('P')) musicMode = 'PATREON_CAPITALISM';
  if (streamLabel.includes('(D)')) musicMode = 'DEMOCRACY';
  if (streamLabel.includes('(C)')) musicMode = 'CAPITALISM';
  return { streamLabel, streamDate, streamId, musicMode };
};

export const parseMusicCatalog = (text: string): MusicPlay[] => {
  const lines = text.split('\n').map((line) => line.trim());
  if (lines.find((line) => line.length > 0) !== 'Per Stream :')
    throw new Error('Missing Per Stream history.');
  const indexStart = lines.indexOf('Per Game :');
  const history = indexStart < 0 ? lines : lines.slice(0, indexStart);
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

  // The secondary index enriches matching history entries only.
  let game = '';
  const enriched = new Set<string>();
  for (const line of indexStart < 0 ? [] : lines.slice(indexStart + 1)) {
    if (!line) continue;
    if (!line.startsWith('Stream ')) {
      game = trimSeparators(line);
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
      if (play && game && entry.title && !enriched.has(key)) {
        play.title = entry.title;
        play.game = game;
        enriched.add(key);
      }
    } catch {
      // Inconsistent secondary-index rows leave the original history intact.
    }
  }
  return [...plays.values()];
};
