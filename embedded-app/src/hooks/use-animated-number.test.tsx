import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnimatedNumber } from './use-animated-number';

const { animateMock } = vi.hoisted(() => ({
  animateMock: vi.fn(() => ({ stop: vi.fn() })),
}));

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  animate: animateMock,
}));

describe('useAnimatedNumber', () => {
  beforeEach(() => {
    animateMock.mockClear();
  });

  it('starts a stat at zero on its first visit', () => {
    const { result } = renderHook(() =>
      useAnimatedNumber({ value: 178, cacheKey: 'hook:first-visit' }),
    );

    expect(result.current.displayValue.get()).toBe('0');
    expect(result.current.visit).toBe('first');
  });

  it('recognizes a previously animated stat on remount', () => {
    const firstRender = renderHook(() =>
      useAnimatedNumber({ value: 20, cacheKey: 'hook:returning-visit' }),
    );
    firstRender.unmount();

    const { result } = renderHook(() =>
      useAnimatedNumber({ value: 20, cacheKey: 'hook:returning-visit' }),
    );

    expect(result.current.visit).toBe('returning');
    expect(animateMock).toHaveBeenLastCalledWith(
      expect.anything(),
      20,
      expect.objectContaining({ duration: 0.3 }),
    );
  });

  it('uses the same animation duration when a mounted value updates', () => {
    const { rerender } = renderHook(
      ({ value }) =>
        useAnimatedNumber({ value, cacheKey: 'hook:value-update' }),
      { initialProps: { value: 10 } },
    );

    rerender({ value: 11 });

    expect(animateMock).toHaveBeenLastCalledWith(
      expect.anything(),
      11,
      expect.objectContaining({ duration: 0.3 }),
    );
  });
});
