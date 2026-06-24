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

  it('registers ping-me on prod when prod registration is enabled', async () => {
    const { COMMAND_GUILDS, isAllowedGuildForCommand } = await import(
      '../../src/config/discord-access'
    );

    expect(COMMAND_GUILDS.PING_ME).toEqual(['staging', 'prod']);
    expect(COMMAND_GUILDS.HELP).toEqual(['staging', 'prod']);
    expect(isAllowedGuildForCommand('staging', COMMAND_GUILDS.PING_ME)).toBe(
      true,
    );
    expect(isAllowedGuildForCommand('prod', COMMAND_GUILDS.PING_ME)).toBe(true);

    const { COMMAND_METADATA } = await import(
      '../../src/config/discord-command-metadata'
    );
    expect(COMMAND_METADATA.PING_ME.helpCategory).toBe('Misc');
  });

  it('respects disabled prod registration for ping-me and other commands', async () => {
    mockedEnv.value.ENABLE_PROD_GUILD_COMMAND_REGISTRATION = false;
    const { COMMAND_GUILDS } = await import('../../src/config/discord-access');

    expect(COMMAND_GUILDS.PING_ME).toEqual(['staging']);
    expect(COMMAND_GUILDS.HELP).toEqual(['staging']);
  });
});
