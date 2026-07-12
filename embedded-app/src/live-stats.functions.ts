import { createServerFn } from '@tanstack/react-start';
import { loadLiveStatsPayload } from './live-stats.server';

export const getLiveStats = createServerFn({ method: 'GET' }).handler(
  loadLiveStatsPayload,
);
