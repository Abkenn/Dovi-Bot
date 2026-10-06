import type { ArrayPage, ArrayPaginationOptions } from './pagination.types';

export const paginateArray = <T>(
  items: readonly T[],
  { cursor, pageSize }: ArrayPaginationOptions,
): ArrayPage<T> => {
  if (!Number.isSafeInteger(cursor) || cursor < 0)
    throw new RangeError(
      'Pagination cursor must be a non-negative safe integer.',
    );
  if (!Number.isSafeInteger(pageSize) || pageSize < 1)
    throw new RangeError(
      'Pagination page size must be a positive safe integer.',
    );
  const next = cursor + pageSize;
  return {
    results: items.slice(cursor, next),
    total: items.length,
    nextCursor: next < items.length ? next : null,
  };
};
