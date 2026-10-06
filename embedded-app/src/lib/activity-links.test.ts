import { expect, it, vi } from 'vitest';
import {
  getActivityLinkOpener,
  registerActivityLinkOpener,
} from './activity-links';

it('keeps a replacement SDK connection when an older connection cleans up', () => {
  const first = vi.fn().mockResolvedValue(undefined);
  const second = vi.fn().mockResolvedValue(undefined);
  const unregisterFirst = registerActivityLinkOpener(first);
  const unregisterSecond = registerActivityLinkOpener(second);
  unregisterFirst();
  expect(getActivityLinkOpener()).toBe(second);
  unregisterSecond();
  expect(getActivityLinkOpener()).toBeNull();
});
