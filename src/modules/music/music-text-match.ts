import { musicWords } from './music-normalization';

const cell = (row: number[], column: number) => row[column] ?? 0;

const similarity = (left: string, right: string) => {
  if (left === right) return 1;
  if (left.length < 4) return 0;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    for (let column = 1; column <= right.length; column++) {
      current.push(
        Math.min(
          cell(current, column - 1) + 1,
          cell(previous, column) + 1,
          cell(previous, column - 1) +
            Number(left.charAt(row - 1) !== right.charAt(column - 1)),
        ),
      );
    }
    previous = current;
  }
  return 1 - cell(previous, right.length) / Math.max(left.length, right.length);
};

export const scoreMusicText = (text: string, terms: string[]) => {
  if (!terms.length) return 0;
  const words = musicWords(text);
  const scores = terms.map((term) =>
    Math.max(0, ...words.map((word) => similarity(term, word))),
  );
  return scores.every((value) => value >= 0.7)
    ? scores.reduce((sum, value) => sum + value, 0) / terms.length
    : 0;
};
