import type { LiveStats } from './api.types';

export const fetchLiveStats = async (
  signal?: AbortSignal,
): Promise<LiveStats> => {
  const response = await fetch('/api/embedded-app/stats', { signal });

  if (!response.ok) {
    throw new Error('Live stats are taking a nap.');
  }

  return response.json() as Promise<LiveStats>;
};
