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

  it('registers prod commands when prod registration is enabled', async () => {
    const { COMMAND_GUILDS, isAllowedGuildForCommand } = await import(
      '../../src/config/discord-access'
    );

    expect(COMMAND_GUILDS.PING_ME).toEqual(['staging', 'prod']);
    expect(COMMAND_GUILDS.HELP).toEqual(['staging', 'prod']);
    expect(COMMAND_GUILDS.POLL_HOST).toEqual(['staging']);
    expect(isAllowedGuildForCommand('staging', COMMAND_GUILDS.PING_ME)).toBe(
      true,
    );
    expect(isAllowedGuildForCommand('prod', COMMAND_GUILDS.PING_ME)).toBe(true);

    const { COMMAND_METADATA } = await import(
      '../../src/config/discord-command-metadata'
    );
    const { COMMAND_ACCESSES } = await import(
      '../../src/config/discord-command-access'
    );
    expect(COMMAND_METADATA.PING_ME.helpCategory).toBe('Misc');
    expect(
      Object.values(COMMAND_METADATA)
        .filter((command) =>
          command.guildIds.some((guildId) => guildId === 'prod'),
        )
        .filter((command) => command.access === COMMAND_ACCESSES.DEFAULT)
        .map((command) => command.name),
    ).toEqual([
      'help',
      'botstatus',
      'streaminfo',
      'showbossstats',
      'showgamestats',
      'bosstrialstats',
      'gamediscussionstats',
    ]);
  });

  it('respects disabled prod registration for ping-me and other commands', async () => {
    mockedEnv.value.ENABLE_PROD_GUILD_COMMAND_REGISTRATION = false;
    const { COMMAND_GUILDS } = await import('../../src/config/discord-access');

    expect(COMMAND_GUILDS.PING_ME).toEqual(['staging']);
    expect(COMMAND_GUILDS.HELP).toEqual(['staging']);
    expect(COMMAND_GUILDS.POLL_HOST).toEqual(['staging']);
  });
});
