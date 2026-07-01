import { ChannelType } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import {
  getDaviSayChannelAutocomplete,
  getDaviSayStickerAutocomplete,
  resolveDaviSayDestination,
  sendDaviSayMessage,
} from '../../src/modules/davi-say/davi-say.service';
import type { DaviSaySendClient } from '../../src/modules/davi-say/davi-say.types';

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

  it('filters server stickers for autocomplete', () => {
    expect(
      getDaviSayStickerAutocomplete({
        stickers: [
          { id: 'davi-wave', name: 'Davi Wave' },
          { id: 'davi-sus', name: 'Davi Sus' },
          { id: 'other', name: 'Bonk' },
        ],
        query: 'sus',
      }),
    ).toEqual([{ name: 'Davi Sus', value: 'davi-sus' }]);
  });

  it('sends a message and sticker together', async () => {
    const send = vi.fn();
    const client = {
      channels: {
        fetch: vi.fn().mockResolvedValue({ isSendable: () => true, send }),
      },
    };

    await sendDaviSayMessage({
      client: client as unknown as DaviSaySendClient,
      channelId: 'channel',
      message: 'hello',
      stickerId: 'sticker',
    });

    expect(send).toHaveBeenCalledWith({
      content: 'hello',
      stickers: ['sticker'],
    });
  });

  it('sends a sticker without message content', async () => {
    const send = vi.fn();
    const client = {
      channels: {
        fetch: vi.fn().mockResolvedValue({ isSendable: () => true, send }),
      },
    };

    await sendDaviSayMessage({
      client: client as unknown as DaviSaySendClient,
      channelId: 'channel',
      message: null,
      stickerId: 'sticker',
    });

    expect(send).toHaveBeenCalledWith({ stickers: ['sticker'] });
  });

  it('requires a message or sticker', async () => {
    const client = { channels: { fetch: vi.fn() } };

    await expect(
      sendDaviSayMessage({
        client: client as unknown as DaviSaySendClient,
        channelId: 'channel',
        message: null,
        stickerId: null,
      }),
    ).rejects.toThrow('Choose a message, a sticker, or both.');
  });
});
