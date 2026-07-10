import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useElapsedSeconds } from './use-elapsed-seconds';

describe('useElapsedSeconds', () => {
  afterEach(() => vi.useRealTimers());

  it('ticks from the attempt start while active', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T18:00:05.000Z'));
    const { result } = renderHook(() =>
      useElapsedSeconds('2026-07-10T18:00:00.000Z', false),
    );

    expect(result.current).toBe(5);
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(result.current).toBe(6);
  });

  it('does not start a timer without an attempt', () => {
    const { result } = renderHook(() => useElapsedSeconds(null, false));
    expect(result.current).toBeNull();
  });
});
