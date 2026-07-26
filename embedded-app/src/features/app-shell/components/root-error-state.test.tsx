import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  getLiveStats: vi.fn(),
  snapshot: null as { cachedAt: string } | null,
}));

vi.mock('@/components/activity-state', () => ({
  ActivityErrorState: () => <div>Stats are resting</div>,
}));
vi.mock('@/live-stats.functions', () => ({
  getLiveStats: dependencies.getLiveStats,
}));
vi.mock('../lib/live-stats-cache', () => ({
  readCachedLiveStats: () => dependencies.snapshot,
}));
vi.mock('./cached-stats-content', () => ({
  CachedStatsContent: () => <div>Offline snapshot</div>,
}));

import { RootErrorState } from './root-error-state';

describe('RootErrorState', () => {
  afterEach(() => {
    vi.useRealTimers();
    dependencies.snapshot = null;
    dependencies.getLiveStats.mockReset();
  });

  it('shows the cached snapshot within five seconds', async () => {
    vi.useFakeTimers();
    dependencies.snapshot = { cachedAt: '2026-07-26T12:00:00.000Z' };
    render(<RootErrorState reset={vi.fn()} />);

    expect(screen.getByText('Stats are resting')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(screen.getByText('Offline snapshot')).toBeInTheDocument();
  });

  it('keeps stale data stable while recovery fails in the background', async () => {
    vi.useFakeTimers();
    dependencies.snapshot = { cachedAt: '2026-07-26T12:00:00.000Z' };
    dependencies.getLiveStats.mockRejectedValue(new Error('Unavailable'));
    const reset = vi.fn();
    render(<RootErrorState reset={reset} />);

    await act(() => vi.advanceTimersByTimeAsync(10_000));

    expect(screen.getByText('Offline snapshot')).toBeInTheDocument();
    expect(dependencies.getLiveStats).toHaveBeenCalledTimes(2);
    expect(reset).not.toHaveBeenCalled();
  });

  it('returns to live route data after a successful background recovery', async () => {
    vi.useFakeTimers();
    dependencies.getLiveStats.mockResolvedValue({});
    const reset = vi.fn();
    render(<RootErrorState reset={reset} />);

    await act(() => vi.advanceTimersByTimeAsync(5_000));

    expect(reset).toHaveBeenCalledOnce();
  });
});
