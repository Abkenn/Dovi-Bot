import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const preferences = vi.hoisted(() => ({
  reducedMotion: false,
  complete: () => {},
}));
vi.mock('motion/react', () => ({
  useReducedMotion: () => preferences.reducedMotion,
  motion: {
    div: ({
      onAnimationComplete,
      children,
      className,
    }: React.PropsWithChildren<{
      onAnimationComplete: () => void;
      className: string;
    }>) => {
      preferences.complete = onAnimationComplete;
      return (
        <div
          className={className}
          data-testid="glitch"
          onAnimationEnd={onAnimationComplete}
        >
          {children}
        </div>
      );
    },
  },
}));

import { SeasonalGlitch } from './seasonal-glitch';

beforeEach(() => {
  vi.useFakeTimers();
  preferences.reducedMotion = false;
});
afterEach(() => vi.useRealTimers());

describe('seasonal Activity glitch', () => {
  it('briefly appears once after the Activity settles, and stays gone when navigating or toggling the theme', async () => {
    const view = render(<SeasonalGlitch enabled />);
    expect(screen.queryByTestId('glitch')).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(8000));
    expect(screen.getByTestId('glitch')).toHaveClass('pointer-events-none');
    act(() => preferences.complete());
    expect(screen.queryByTestId('glitch')).not.toBeInTheDocument();
    view.rerender(<SeasonalGlitch enabled={false} />);
    view.rerender(<SeasonalGlitch enabled />);
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(screen.queryByTestId('glitch')).not.toBeInTheDocument();
  });

  it('does not run outside Halloween or with reduced motion', async () => {
    const view = render(<SeasonalGlitch enabled={false} />);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(screen.queryByTestId('glitch')).not.toBeInTheDocument();
    preferences.reducedMotion = true;
    view.rerender(<SeasonalGlitch enabled />);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(screen.queryByTestId('glitch')).not.toBeInTheDocument();
  });

  it('cancels the pending effect if the theme is disabled before it appears', async () => {
    const view = render(<SeasonalGlitch enabled />);
    view.rerender(<SeasonalGlitch enabled={false} />);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(screen.queryByTestId('glitch')).not.toBeInTheDocument();
  });
});
