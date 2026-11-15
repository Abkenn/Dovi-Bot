import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { getLiveStats } from './live-stats.functions';

export const liveStatsQueryOptions = queryOptions({
  queryKey: ['live-stats'],
  queryFn: () => getLiveStats(),
  staleTime: 5_000,
});

export const useLiveStatsQuery = () => useSuspenseQuery(liveStatsQueryOptions);
