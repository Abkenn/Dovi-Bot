import { paginateArray } from 'orpc-stack/server';
import { expect, it } from 'vitest';

it('returns bounded pages with the full total and terminal cursor', () => {
  const items = ['first', 'second', 'third', 'fourth'];
  expect(paginateArray(items, { cursor: 0, pageSize: 2 })).toEqual({
    results: ['first', 'second'],
    total: 4,
    nextCursor: 2,
  });
  expect(paginateArray(items, { cursor: 2, pageSize: 2 })).toEqual({
    results: ['third', 'fourth'],
    total: 4,
    nextCursor: null,
  });
  expect(items).toEqual(['first', 'second', 'third', 'fourth']);
});

it('handles partial, empty, and out-of-range pages', () => {
  expect(paginateArray([1, 2, 3], { cursor: 2, pageSize: 2 })).toEqual({
    results: [3],
    total: 3,
    nextCursor: null,
  });
  expect(paginateArray([], { cursor: 0, pageSize: 2 })).toEqual({
    results: [],
    total: 0,
    nextCursor: null,
  });
  expect(paginateArray([1], { cursor: 10, pageSize: 2 })).toEqual({
    results: [],
    total: 1,
    nextCursor: null,
  });
});

it.each([
  { cursor: -1, pageSize: 2 },
  { cursor: 0.5, pageSize: 2 },
  { cursor: 0, pageSize: 0 },
  { cursor: 0, pageSize: 1.5 },
])('rejects invalid pagination options: %j', (options) => {
  expect(() => paginateArray([], options)).toThrow(RangeError);
});
