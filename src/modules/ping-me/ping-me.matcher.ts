import type { PingMeGuildBoundary } from './ping-me.types';

const MIN_FUZZY_KEYWORD_LENGTH = 5;
const wordSegmenter = new Intl.Segmenter('en', { granularity: 'word' });
const combiningMarkRanges = [
  { start: 0x0300, end: 0x036f },
  { start: 0x1ab0, end: 0x1aff },
  { start: 0x1dc0, end: 0x1dff },
  { start: 0x20d0, end: 0x20ff },
  { start: 0xfe20, end: 0xfe2f },
];

const isCombiningMark = (character: string) => {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return false;
  }

  return combiningMarkRanges.some(
    (range) => codePoint >= range.start && codePoint <= range.end,
  );
};

const removeCombiningMarks = (value: string) => {
  let result = '';

  for (const character of value.normalize('NFKD')) {
    if (!isCombiningMark(character)) {
      result += character;
    }
  }

  return result;
};

export const cleanPingMeKeyword = (value: string) => {
  let result = '';
  let needsSpace = false;

  for (const character of value.trim()) {
    const isWhitespace = character.trim().length === 0;

    if (isWhitespace) {
      needsSpace = result.length > 0;
    } else {
      if (needsSpace) {
        result += ' ';
        needsSpace = false;
      }

      result += character;
    }
  }

  return result;
};

export const normalizePingMeText = (value: string): string[] => {
  const normalizedValue =
    removeCombiningMarks(value).toLocaleLowerCase('en-US');
  const tokens: string[] = [];

  for (const segment of wordSegmenter.segment(normalizedValue)) {
    if (segment.isWordLike) {
      tokens.push(segment.segment);
    }
  }

  return tokens;
};

const compactPingMeText = (value: string) =>
  normalizePingMeText(value).join('');

const getMaximumEditDistance = (keywordLength: number) => {
  if (keywordLength < MIN_FUZZY_KEYWORD_LENGTH) {
    return 0;
  }

  return keywordLength >= 12 ? 2 : 1;
};

const isWithinEditDistance = (
  left: string,
  right: string,
  maximumDistance: number,
) => {
  if (Math.abs(left.length - right.length) > maximumDistance) {
    return false;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const insertion = (current[rightIndex - 1] ?? 0) + 1;
      const deletion = (previous[rightIndex] ?? 0) + 1;
      const substitution = (previous[rightIndex - 1] ?? 0) + substitutionCost;

      current.push(Math.min(insertion, deletion, substitution));
    }

    if (Math.min(...current) > maximumDistance) {
      return false;
    }

    previous = current;
  }

  return (previous[right.length] ?? maximumDistance + 1) <= maximumDistance;
};

const buildMessageCandidates = (
  messageTokens: string[],
  maximumWindowTokens: number,
) => {
  const candidates = new Set<string>();

  for (let start = 0; start < messageTokens.length; start += 1) {
    let candidate = '';

    for (
      let end = start;
      end < messageTokens.length && end < start + maximumWindowTokens;
      end += 1
    ) {
      candidate += messageTokens[end];
      candidates.add(candidate);
    }
  }

  return candidates;
};

export const doesPingMeKeywordMatch = (
  content: string,
  keyword: string,
): boolean => {
  const keywordTokens = normalizePingMeText(keyword);
  const normalizedKeyword = keywordTokens.join('');

  if (!normalizedKeyword) {
    return false;
  }

  const messageTokens = normalizePingMeText(content);
  const candidates = buildMessageCandidates(
    messageTokens,
    keywordTokens.length + 1,
  );
  const maximumDistance = getMaximumEditDistance(normalizedKeyword.length);

  return [...candidates].some((candidate) => {
    if (candidate === normalizedKeyword) {
      return true;
    }

    return isWithinEditDistance(candidate, normalizedKeyword, maximumDistance);
  });
};

export const getPingMeListeningSourceGuildIds = (
  messageGuildId: string,
  boundary: PingMeGuildBoundary,
): string[] => {
  if (messageGuildId === boundary.stagingGuildId) {
    return [boundary.stagingGuildId];
  }

  if (messageGuildId === boundary.prodGuildId) {
    return [boundary.stagingGuildId, boundary.prodGuildId];
  }

  return [];
};

export const normalizePingMeKeywordKey = (keyword: string) =>
  compactPingMeText(keyword);
