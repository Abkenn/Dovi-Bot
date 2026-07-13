import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getEmbeddedAppLaunchTarget,
  registerEmbeddedAppLaunchTarget,
} from '../../src/modules/embedded-app/embedded-app-launch-target.service';

describe('embedded app launch targets', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps a game target for the launched Activity instance', () => {
    registerEmbeddedAppLaunchTarget('instance-1', 'UNDERTALE');

    expect(getEmbeddedAppLaunchTarget('instance-1')).toBe('UNDERTALE');
  });

  it('expires stale launch targets', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T20:00:00.000Z'));
    registerEmbeddedAppLaunchTarget('instance-expiring', 'Dark Souls III');
    vi.advanceTimersByTime(10 * 60 * 1_000 + 1);

    expect(getEmbeddedAppLaunchTarget('instance-expiring')).toBeNull();
  });

  it('caps retained launch targets', () => {
    for (let index = 0; index <= 100; index += 1) {
      registerEmbeddedAppLaunchTarget(`capped-${index}`, `Game ${index}`);
    }

    expect(getEmbeddedAppLaunchTarget('capped-0')).toBeNull();
    expect(getEmbeddedAppLaunchTarget('capped-100')).toBe('Game 100');
  });
});
