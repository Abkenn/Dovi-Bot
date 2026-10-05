import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { PROD_ENV: 'prod', STAGING_ENV: 'stage' },
}));
vi.mock('../../src/modules/discord/component-lifecycle', () => ({
  registerComponentLifetime: vi.fn(),
  expireComponentLifetime: vi.fn(),
}));

import { parseEmbeddedAppStatsButton } from '../../src/modules/embedded-app/embedded-app-stats.discord';
import {
  buildMusicActivityButton,
  resolveMusicActivityButtonTarget,
} from '../../src/modules/music/music-activity.discord';
import { parseMusicActivityTarget } from '../../src/modules/music/music-activity-target';

afterEach(() => vi.useRealTimers());
it('uses a short activity button ID and restores the full query and mode', () => {
  const query = '音'.repeat(100);
  const row = buildMusicActivityButton('prod', { query, game: true });
  const button = row?.toJSON().components[0];
  expect(button && 'label' in button ? button.label : null).toBe('Music Stats');
  if (!button || !('custom_id' in button))
    throw new Error('Missing activity button');
  expect(button.custom_id.length).toBeLessThanOrEqual(100);
  const target = parseEmbeddedAppStatsButton(button.custom_id);
  expect(
    parseMusicActivityTarget(
      resolveMusicActivityButtonTarget(target?.gameName ?? null),
    ),
  ).toEqual({ query, game: true });
  expect(resolveMusicActivityButtonTarget('Dark Souls')).toBe('Dark Souls');
  expect(
    buildMusicActivityButton('elsewhere', { query, game: false }),
  ).toBeNull();
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 3_600_001);
  expect(resolveMusicActivityButtonTarget(target?.gameName ?? null)).toBeNull();
});
