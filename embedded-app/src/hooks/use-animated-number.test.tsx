import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAnimatedNumber } from './use-animated-number';

describe('useAnimatedNumber', () => {
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
  });
});
