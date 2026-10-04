import { DateTime } from 'luxon';
import type { MusicPlay } from './music.types';
import { isDigits } from './music-normalization';

export const trimSeparators = (text: string): string => {
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

export const timedTitle = (line: string) => {
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

export const parseStreamHeader = (line: string) => {
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
