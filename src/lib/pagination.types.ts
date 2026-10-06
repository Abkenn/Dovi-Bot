export type ArrayPaginationOptions = {
  cursor: number;
  pageSize: number;
};

export type ArrayPage<T> = {
  results: T[];
  total: number;
  nextCursor: number | null;
};
