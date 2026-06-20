import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedEnv = vi.hoisted(() => ({
  value: {
    DISCORD_STAGING_ENV_GUILD_ID: 'staging',
    DISCORD_PROD_ENV_GUILD_ID: 'prod',
    ENABLE_PROD_GUILD_COMMAND_REGISTRATION: true,
  },
}));

vi.mock('@zod-schemas/env.zod', () => ({
  get env() {
    return mockedEnv.value;
  },
}));

describe('Discord command guild access', () => {
  beforeEach(() => {
    vi.resetModules();
    mockedEnv.value.ENABLE_PROD_GUILD_COMMAND_REGISTRATION = true;
  });

  it('keeps ping-me staging-only while other commands register on prod', async () => {
    const { COMMAND_GUILDS, isAllowedGuildForCommand } = await import(
      '../../src/config/discord-access'
    );

    expect(COMMAND_GUILDS.PING_ME).toEqual(['staging']);
    expect(COMMAND_GUILDS.HELP).toEqual(['staging', 'prod']);
    expect(isAllowedGuildForCommand('staging', COMMAND_GUILDS.PING_ME)).toBe(
      true,
    );
    expect(isAllowedGuildForCommand('prod', COMMAND_GUILDS.PING_ME)).toBe(
      false,
    );
  });

  it('still respects disabled prod registration for other commands', async () => {
    mockedEnv.value.ENABLE_PROD_GUILD_COMMAND_REGISTRATION = false;
    const { COMMAND_GUILDS } = await import('../../src/config/discord-access');

    expect(COMMAND_GUILDS.PING_ME).toEqual(['staging']);
    expect(COMMAND_GUILDS.HELP).toEqual(['staging']);
  });
});
