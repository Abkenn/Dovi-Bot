const segmenter = new Intl.Segmenter('en', { granularity: 'word' });

const ROMAN_NUMERALS: Record<string, string> = {
  i: '1',
  ii: '2',
  iii: '3',
  iv: '4',
  v: '5',
  vi: '6',
  vii: '7',
  viii: '8',
  ix: '9',
};

export const musicWords = (text: string): string[] => {
  const characters = [...text.normalize('NFKD').toLowerCase()].filter(
    (character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    },
  );
  return [...segmenter.segment(characters.join(''))]
    .filter((segment) => segment.isWordLike)
    .map((segment) => ROMAN_NUMERALS[segment.segment] ?? segment.segment);
};

export const musicIdentity = (text: string) =>
  musicWords(text).sort().join(' ');

export const isDigits = (text: string) =>
  text.length > 0 &&
  [...text].every((character) => character >= '0' && character <= '9');
