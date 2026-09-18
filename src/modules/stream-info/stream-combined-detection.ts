const WORD_SEGMENTER = new Intl.Segmenter('en', { granularity: 'word' });

const ROMAN_NUMERALS = new Map([
  ['i', '1'],
  ['ii', '2'],
  ['iii', '3'],
  ['iv', '4'],
  ['v', '5'],
  ['vi', '6'],
  ['vii', '7'],
  ['viii', '8'],
]);

const ACRONYM_STOP_WORDS = new Set(['a', 'and', 'of', 'the']);

const getWords = (value: string): string[] =>
  [...WORD_SEGMENTER.segment(value)]
    .filter((segment) => segment.isWordLike)
    .map((segment) => segment.segment.toLocaleLowerCase('en'))
    .map((word) => ROMAN_NUMERALS.get(word) ?? word);

const compactWords = (words: readonly string[]): string => words.join('');

const withoutDigits = (value: string): string =>
  [...value].filter((character) => !'0123456789'.includes(character)).join('');

const getAcronym = (words: readonly string[]): string =>
  words
    .filter((word) => !ACRONYM_STOP_WORDS.has(word))
    .map((word) => {
      const numericSuffix = [...word].filter((character) =>
        '0123456789'.includes(character),
      );
      const firstCharacter = word[0] ?? '';

      return '0123456789'.includes(firstCharacter)
        ? word
        : `${firstCharacter}${numericSuffix.join('')}`;
    })
    .join('');

const getEditDistance = (left: string, right: string): number => {
  const previousRow = [...right].map((_, index) => index + 1);
  previousRow.unshift(0);

  for (const [leftIndex, leftCharacter] of [...left].entries()) {
    const currentRow = [leftIndex + 1];

    for (const [rightIndex, rightCharacter] of [...right].entries()) {
      currentRow.push(
        Math.min(
          (currentRow[rightIndex] ?? 0) + 1,
          (previousRow[rightIndex + 1] ?? 0) + 1,
          (previousRow[rightIndex] ?? 0) +
            (leftCharacter === rightCharacter ? 0 : 1),
        ),
      );
    }

    previousRow.splice(0, previousRow.length, ...currentRow);
  }

  return previousRow[right.length] ?? left.length;
};

const isSimilarGameName = (candidate: string, gameName: string): boolean => {
  const candidateWords = getWords(candidate);
  const gameWords = getWords(gameName);
  const compactCandidate = compactWords(candidateWords);
  const compactGame = compactWords(gameWords);
  const gameAcronym = getAcronym(gameWords);
  const candidateFamily = withoutDigits(compactCandidate);
  const gameFamily = withoutDigits(compactGame);
  const gameAcronymFamily = withoutDigits(gameAcronym);

  if (compactCandidate.length < 2 || compactGame.length < 2) {
    return false;
  }

  if (
    compactCandidate === compactGame ||
    compactCandidate === gameAcronym ||
    (compactCandidate.length >= 3 &&
      gameAcronym.startsWith(compactCandidate)) ||
    (candidateFamily.length >= 2 &&
      gameAcronymFamily.startsWith(candidateFamily)) ||
    (candidateFamily.length >= 3 && gameFamily.startsWith(candidateFamily)) ||
    (candidateFamily.length >= 4 && gameFamily.includes(candidateFamily))
  ) {
    return true;
  }

  const shorterLength = Math.min(compactCandidate.length, compactGame.length);
  const longerLength = Math.max(compactCandidate.length, compactGame.length);
  const hasMeaningfulContainment =
    shorterLength >= 4 &&
    shorterLength / longerLength >= 0.55 &&
    (compactCandidate.includes(compactGame) ||
      compactGame.includes(compactCandidate));
  if (hasMeaningfulContainment) {
    return true;
  }

  const similarity =
    1 - getEditDistance(compactCandidate, compactGame) / longerLength;
  return similarity >= 0.72;
};

const getGameCandidate = (videoTitle: string): string | null => {
  const plusIndex = videoTitle.indexOf('+');
  if (plusIndex < 0) {
    return null;
  }

  const afterPlus = videoTitle.slice(plusIndex + 1);
  const laterSegment = [...WORD_SEGMENTER.segment(afterPlus)].find(
    (segment) =>
      segment.isWordLike && segment.segment.toLocaleLowerCase('en') === 'later',
  );
  if (!laterSegment) {
    return null;
  }

  const candidate = afterPlus.slice(0, laterSegment.index).trim();
  return candidate || null;
};

export const doesVideoTitleIndicateCombinedStream = (
  videoTitle: string,
  gameName: string,
): boolean => {
  const candidate = getGameCandidate(videoTitle);
  return candidate !== null && isSimilarGameName(candidate, gameName);
};
