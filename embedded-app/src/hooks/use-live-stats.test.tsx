import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLiveStats } from '../api';
import { useLiveStats } from './use-live-stats';

vi.mock('../api', () => ({ fetchLiveStats: vi.fn() }));

describe('useLiveStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('loads and refreshes stats every five seconds', async () => {
    vi.useFakeTimers();
    const stats = { game: null, currentBoss: null, killedBosses: [] };
    vi.mocked(fetchLiveStats).mockResolvedValue(stats);
    const { result } = renderHook(() => useLiveStats());

    await act(async () => Promise.resolve());
    expect(result.current.stats).toEqual(stats);
    await act(() => vi.advanceTimersByTimeAsync(5_000));

    expect(fetchLiveStats).toHaveBeenCalledTimes(2);
  });

  it('exposes API errors without discarding a future retry', async () => {
    vi.mocked(fetchLiveStats).mockRejectedValue(new Error('Unavailable'));
    const { result } = renderHook(() => useLiveStats());

    await waitFor(() => expect(result.current.error).toBe('Unavailable'));
    expect(result.current.loading).toBe(false);
  });
});
