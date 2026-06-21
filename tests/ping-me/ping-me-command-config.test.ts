import { describe, expect, it } from 'vitest';
import { PING_ME_COMMAND_CONFIG } from '../../src/modules/ping-me/ping-me.config';

describe('ping-me command privacy', () => {
  it('keeps command logging available for administrator debugging', () => {
    expect(PING_ME_COMMAND_CONFIG.withCommandLogging).toBe(true);
  });
});
