import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { STAGING_ENV: 'staging-guild', PROD_ENV: 'prod-guild' },
}));

import {
  getLogLevel,
  isDebugLevel,
  LOG_LEVEL,
} from '../../src/config/log-level';

describe('contextual log levels', () => {
  it('uses debug for staging and info for production and unknown contexts', () => {
    expect(getLogLevel({ guildId: 'staging-guild' })).toBe(LOG_LEVEL.DEBUG);
    expect(getLogLevel({ guildId: 'prod-guild' })).toBe(LOG_LEVEL.INFO);
    expect(getLogLevel({ guildId: 'another-guild' })).toBe(LOG_LEVEL.INFO);
    expect(getLogLevel({ guildId: null })).toBe(LOG_LEVEL.INFO);
    expect(getLogLevel()).toBe(LOG_LEVEL.INFO);
  });

  it('gives an explicit override priority over guild rules and the default', () => {
    expect(
      getLogLevel({ guildId: 'staging-guild', override: LOG_LEVEL.WARN }),
    ).toBe(LOG_LEVEL.WARN);
    expect(
      getLogLevel({ guildId: 'prod-guild', override: LOG_LEVEL.ERROR }),
    ).toBe(LOG_LEVEL.ERROR);
    expect(getLogLevel({ override: LOG_LEVEL.DEBUG })).toBe(LOG_LEVEL.DEBUG);
  });

  it('enables detailed diagnostics only at debug level', () => {
    expect(isDebugLevel({ guildId: 'staging-guild' })).toBe(true);
    expect(isDebugLevel({ guildId: 'prod-guild' })).toBe(false);
    expect(
      isDebugLevel({ guildId: 'staging-guild', override: LOG_LEVEL.INFO }),
    ).toBe(false);
  });
});
