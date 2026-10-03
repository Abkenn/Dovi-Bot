const segmenter = new Intl.Segmenter('en', { granularity: 'word' });

export const musicWords = (text: string): string[] => {
  const characters = [...text.normalize('NFKD').toLowerCase()].filter(
    (character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    },
  );
  return [...segmenter.segment(characters.join(''))]
    .filter((segment) => segment.isWordLike)
    .map((segment) => segment.segment);
};

export const musicIdentity = (text: string) =>
  musicWords(text).sort().join(' ');

export const isDigits = (text: string) =>
  text.length > 0 &&
  [...text].every((character) => character >= '0' && character <= '9');
