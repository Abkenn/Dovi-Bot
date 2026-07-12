import { ChannelType } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import {
  fetchDaviSayChannels,
  fetchDaviSayStickers,
  getDaviSayChannelAutocomplete,
  getDaviSayStickerAutocomplete,
  getDaviSayTargetGuildId,
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
  it('maps environments to their configured guilds', () => {
    expect(getDaviSayTargetGuildId('staging')).toBe('staging');
    expect(getDaviSayTargetGuildId('prod')).toBe('prod');
  });

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
          { id: 'davi-wave', name: 'Davi Wave', available: true },
          { id: 'davi-sus', name: 'Davi Sus', available: true },
          { id: 'other', name: 'Bonk', available: true },
          { id: 'unavailable', name: 'Davi Sus Old', available: false },
        ],
        query: 'sus',
      }),
    ).toEqual([{ name: 'Davi Sus', value: 'davi-sus' }]);
  });

  it('limits and truncates autocomplete choices', () => {
    const channels = Array.from({ length: 30 }, (_, index) => ({
      id: `${index}`,
      name: `${String(index).padStart(2, '0')}-${'long'.repeat(30)}`,
      parentName: null,
      type: ChannelType.GuildText,
    }));

    const choices = getDaviSayChannelAutocomplete({ channels, query: '  ' });

    expect(choices).toHaveLength(25);
    expect(choices[0]?.name).toHaveLength(100);
    expect(choices[0]?.name.endsWith('...')).toBe(true);
  });

  it('fetches eligible guild channels and active threads', async () => {
    const fetchActiveThreads = vi.fn().mockResolvedValue({
      threads: new Map([
        [
          'thread',
          {
            id: 'thread',
            name: 'attempts',
            parent: { name: 'bosses' },
            type: ChannelType.PublicThread,
          },
        ],
      ]),
    });
    const guild = {
      channels: {
        fetch: vi.fn().mockResolvedValue(
          new Map([
            ['empty', null],
            [
              'text',
              {
                id: 'text',
                name: 'general',
                parent: null,
                type: ChannelType.GuildText,
              },
            ],
            [
              'category',
              {
                id: 'category',
                name: 'category',
                parent: null,
                type: ChannelType.GuildCategory,
              },
            ],
          ]),
        ),
        fetchActiveThreads,
      },
    };
    const client = { guilds: { fetch: vi.fn().mockResolvedValue(guild) } };

    await expect(
      fetchDaviSayChannels(client as never, 'prod'),
    ).resolves.toEqual([
      {
        id: 'text',
        name: 'general',
        parentName: null,
        type: ChannelType.GuildText,
      },
      {
        id: 'thread',
        name: 'attempts',
        parentName: 'bosses',
        type: ChannelType.PublicThread,
      },
    ]);
  });

  it('keeps guild channels when active thread fetching fails', async () => {
    const guild = {
      channels: {
        fetch: vi.fn().mockResolvedValue(new Map()),
        fetchActiveThreads: vi
          .fn()
          .mockRejectedValue(new Error('missing intent')),
      },
    };
    const client = { guilds: { fetch: vi.fn().mockResolvedValue(guild) } };

    await expect(
      fetchDaviSayChannels(client as never, 'prod'),
    ).resolves.toEqual([]);
  });

  it('fetches and normalizes server stickers', async () => {
    const guild = {
      stickers: {
        fetch: vi.fn().mockResolvedValue(
          new Map([
            ['one', { available: undefined, id: 'one', name: 'Wave' }],
            ['two', { available: false, id: 'two', name: 'Old Wave' }],
          ]),
        ),
      },
    };
    const client = { guilds: { fetch: vi.fn().mockResolvedValue(guild) } };

    await expect(
      fetchDaviSayStickers(client as never, 'prod'),
    ).resolves.toEqual([
      { available: true, id: 'one', name: 'Wave' },
      { available: false, id: 'two', name: 'Old Wave' },
    ]);
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

  it('sends message content without a sticker', async () => {
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
      stickerId: null,
    });

    expect(send).toHaveBeenCalledWith({ content: 'hello' });
  });

  it('rejects missing and non-sendable channels', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ isSendable: () => false });
    const client = { channels: { fetch } };
    const input = {
      client: client as unknown as DaviSaySendClient,
      channelId: 'channel',
      message: 'hello',
      stickerId: null,
    };

    await expect(sendDaviSayMessage(input)).rejects.toThrow(
      'Davi cannot send messages in that channel.',
    );
    await expect(sendDaviSayMessage(input)).rejects.toThrow(
      'Davi cannot send messages in that channel.',
    );
  });

  it('requires a message or sticker', async () => {
    const client = {
      channels: {
        fetch: vi.fn(),
      },
    };

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
