import { ChannelType } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import {
  getDaviSayChannelAutocomplete,
  resolveDaviSayDestination,
} from '../../src/modules/davi-say/davi-say.service';

vi.mock('@zod-schemas/env.zod', () => ({
  env: {
    DISCORD_STAGING_ENV_GUILD_ID: 'staging',
    DISCORD_PROD_ENV_GUILD_ID: 'prod',
    ENABLE_PROD_GUILD_COMMAND_REGISTRATION: true,
  },
}));

describe('davi-say service', () => {
  it('uses the staging bot channel when no channel is selected', () => {
    expect(
      resolveDaviSayDestination({
        selectedChannelId: null,
        selectedEnvironment: null,
      }),
    ).toEqual({
      channelId: '1482741535610110163',
      environment: 'staging',
    });
  });

  it('defaults selected channel lookups to prod', () => {
    expect(
      resolveDaviSayDestination({
        selectedChannelId: 'prod-channel',
        selectedEnvironment: null,
      }),
    ).toEqual({
      channelId: 'prod-channel',
      environment: 'prod',
    });
  });

  it('honors an explicit staging environment for a selected channel', () => {
    expect(
      resolveDaviSayDestination({
        selectedChannelId: 'staging-channel',
        selectedEnvironment: 'staging',
      }),
    ).toEqual({
      channelId: 'staging-channel',
      environment: 'staging',
    });
  });

  it('includes text channels, forums, and forum threads in autocomplete', () => {
    expect(
      getDaviSayChannelAutocomplete({
        channels: [
          {
            id: 'general',
            name: 'general',
            parentName: null,
            type: ChannelType.GuildText,
          },
          {
            id: 'mod-forum',
            name: 'mod-chat',
            parentName: 'Staff',
            type: ChannelType.GuildForum,
          },
          {
            id: 'forum-thread',
            name: 'incident notes',
            parentName: 'mod-chat',
            type: ChannelType.PublicThread,
          },
          {
            id: 'category',
            name: 'Hidden',
            parentName: null,
            type: ChannelType.GuildCategory,
          },
        ],
        query: 'mod',
      }),
    ).toEqual([
      {
        name: '#mod-chat / incident notes [thread]',
        value: 'forum-thread',
      },
      {
        name: '#Staff / mod-chat [forum]',
        value: 'mod-forum',
      },
    ]);
  });
});
