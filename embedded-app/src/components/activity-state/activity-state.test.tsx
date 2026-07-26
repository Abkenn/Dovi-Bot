import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivityErrorState, ActivityLoadingState } from '.';

describe('Activity states', () => {
  afterEach(() => vi.useRealTimers());

  it('renders an accessible dashboard-shaped loading state', () => {
    render(<ActivityLoadingState />);

    expect(screen.getByText('Waking up live stats...')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
      12,
    );
  });

  it('renders a loader error', () => {
    render(<ActivityErrorState message="Database unavailable" />);
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
  });

  it('automatically retries a recoverable Activity error', async () => {
    vi.useFakeTimers();
    const retry = vi.fn();
    render(
      <ActivityErrorState
        message="A new version is waking up."
        onRetry={retry}
      />,
    );

    expect(screen.getByText('Retrying automatically...')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(retry).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(retry).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('main')).toHaveClass('overflow-hidden');
  });
});
