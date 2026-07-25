import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLiveStatsRefresh } from './use-live-stats-refresh';

describe('useLiveStatsRefresh', () => {
  afterEach(() => vi.useRealTimers());

  it('refreshes immediately and every five seconds', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    renderHook(() => useLiveStatsRefresh(refresh));

    expect(refresh).toHaveBeenCalledOnce();

    await act(() => vi.advanceTimersByTimeAsync(5_000));

    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
