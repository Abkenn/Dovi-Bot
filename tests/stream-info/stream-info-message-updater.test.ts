import { type Client, EmbedBuilder, type Message } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const streamInfoMessageQueries = vi.hoisted(() => ({
  deleteExpiredStreamInfoMessages: vi.fn(),
  deleteLastStreamInfoMessage: vi.fn(),
  findLatestStreamInfoCommandTargets: vi.fn(),
  findLastStreamInfoMessages: vi.fn(),
  upsertLastStreamInfoMessage: vi.fn(),
}));

const streamInfoDiscord = vi.hoisted(() => ({
  getStreamInfoEmbed: vi.fn(),
}));

vi.mock('@data/queries/stream-info-message', () => ({
  deleteExpiredStreamInfoMessages:
    streamInfoMessageQueries.deleteExpiredStreamInfoMessages,
  deleteLastStreamInfoMessage:
    streamInfoMessageQueries.deleteLastStreamInfoMessage,
  findLatestStreamInfoCommandTargets:
    streamInfoMessageQueries.findLatestStreamInfoCommandTargets,
  findLastStreamInfoMessages:
    streamInfoMessageQueries.findLastStreamInfoMessages,
  upsertLastStreamInfoMessage:
    streamInfoMessageQueries.upsertLastStreamInfoMessage,
}));

vi.mock('../../src/modules/stream-info/stream-info.discord', () => ({
  getStreamInfoEmbed: streamInfoDiscord.getStreamInfoEmbed,
}));

import {
  adoptLastStreamInfoMessage,
  refreshLastStreamInfoMessages,
  refreshStreamInfoMessage,
  registerLastStreamInfoMessage,
} from '../../src/modules/stream-info/stream-info-message-updater.service';

const makeClient = ({
  channel,
  botUserId = 'bot-1',
}: {
  channel: unknown;
  botUserId?: string | null;
}): Client =>
  ({
    user: botUserId ? { id: botUserId } : null,
    channels: {
      fetch: vi.fn().mockResolvedValue(channel),
    },
  }) as unknown as Client;

const makeMessage = () => {
  const edit = vi.fn().mockResolvedValue(undefined);

  return {
    id: 'message-1',
    edit,
  } as unknown as Message & { edit: typeof edit };
};

describe('stream info message updater', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    streamInfoMessageQueries.deleteExpiredStreamInfoMessages.mockResolvedValue(
      undefined,
    );
    streamInfoMessageQueries.findLastStreamInfoMessages.mockResolvedValue([]);
    streamInfoMessageQueries.upsertLastStreamInfoMessage.mockResolvedValue(
      undefined,
    );
    streamInfoMessageQueries.findLatestStreamInfoCommandTargets.mockResolvedValue(
      [],
    );
  });

  it('registers the last stream info command message for a guild', async () => {
    await registerLastStreamInfoMessage({
      guildId: 'guild-1',
      channelId: 'channel-1',
      message: { id: 'message-1' } as Message,
    });

    expect(
      streamInfoMessageQueries.upsertLastStreamInfoMessage,
    ).toHaveBeenCalledWith({
      guildId: 'guild-1',
      channelId: 'channel-1',
      messageId: 'message-1',
    });
  });

  it('does not fail stream info registration when storing the pointer fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    streamInfoMessageQueries.upsertLastStreamInfoMessage.mockRejectedValue(
      new Error('missing StreamInfoMessage table'),
    );

    await registerLastStreamInfoMessage({
      guildId: 'guild-1',
      channelId: 'channel-1',
      message: { id: 'message-1' } as Message,
    });

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to store stream info message',
      expect.any(Error),
    );

    consoleError.mockRestore();
  });

  it('skips registration when Discord did not return a message', async () => {
    await registerLastStreamInfoMessage({
      guildId: 'guild-1',
      channelId: 'channel-1',
      message: undefined,
    });

    expect(
      streamInfoMessageQueries.upsertLastStreamInfoMessage,
    ).not.toHaveBeenCalled();
  });

  it('refreshes a stored stream info message', async () => {
    const message = makeMessage();
    const channel = {
      messages: {
        fetch: vi.fn().mockResolvedValue(message),
      },
    };
    streamInfoDiscord.getStreamInfoEmbed.mockResolvedValue(
      new EmbedBuilder()
        .setTitle('Stream Info')
        .addFields({ name: 'Current stream', value: 'Live now' }),
    );

    await refreshStreamInfoMessage({
      client: makeClient({ channel }),
      pointer: {
        guildId: 'guild-1',
        channelId: 'channel-1',
        messageId: 'message-1',
      },
    });

    expect(channel.messages.fetch).toHaveBeenCalledWith('message-1');
    expect(message.edit).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedMentions: { parse: [] },
        components: expect.any(Array),
      }),
    );
  });

  it('forgets a stored message when Discord says it no longer exists', async () => {
    const channel = {
      messages: {
        fetch: vi.fn().mockRejectedValue({ code: 10008 }),
      },
    };

    await refreshStreamInfoMessage({
      client: makeClient({ channel }),
      pointer: {
        guildId: 'guild-1',
        channelId: 'channel-1',
        messageId: 'message-1',
      },
    });

    expect(
      streamInfoMessageQueries.deleteLastStreamInfoMessage,
    ).toHaveBeenCalledWith('message-1');
  });

  it('forgets a stored message when the channel is not message-backed', async () => {
    await refreshStreamInfoMessage({
      client: makeClient({ channel: null }),
      pointer: {
        guildId: 'guild-1',
        channelId: 'channel-1',
        messageId: 'message-1',
      },
    });

    expect(
      streamInfoMessageQueries.deleteLastStreamInfoMessage,
    ).toHaveBeenCalledWith('message-1');
  });

  it('logs unexpected refresh failures without forgetting the pointer', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const channel = {
      messages: {
        fetch: vi.fn().mockRejectedValue(new Error('Discord is tired')),
      },
    };

    await refreshStreamInfoMessage({
      client: makeClient({ channel }),
      pointer: {
        guildId: 'guild-1',
        channelId: 'channel-1',
        messageId: 'message-1',
      },
    });

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to refresh stream info message',
      expect.any(Error),
    );
    expect(
      streamInfoMessageQueries.deleteLastStreamInfoMessage,
    ).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('refreshes every stored stream info message', async () => {
    const message = makeMessage();
    const channel = {
      messages: {
        fetch: vi.fn().mockResolvedValue(message),
      },
    };
    streamInfoMessageQueries.findLastStreamInfoMessages.mockResolvedValue([
      {
        guildId: 'guild-1',
        channelId: 'channel-1',
        messageId: 'message-1',
      },
      {
        guildId: 'guild-2',
        channelId: 'channel-2',
        messageId: 'message-2',
      },
    ]);
    streamInfoDiscord.getStreamInfoEmbed.mockResolvedValue(
      new EmbedBuilder().setTitle('Stream Info'),
    );

    await refreshLastStreamInfoMessages(makeClient({ channel }));

    expect(
      streamInfoMessageQueries.deleteExpiredStreamInfoMessages,
    ).toHaveBeenCalledWith(expect.any(Date));
    expect(
      streamInfoMessageQueries.findLastStreamInfoMessages,
    ).toHaveBeenCalledWith(expect.any(Date));
    expect(message.edit).toHaveBeenCalledTimes(2);
  });

  it('adopts and refreshes an existing stream info message from recent bot messages', async () => {
    const message = {
      ...makeMessage(),
      author: {
        id: 'bot-1',
      },
      embeds: [],
      components: [
        {
          components: [{ content: '# Stream Info' }],
        },
      ],
    } as unknown as Message;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Map([['message-1', message]]))
      .mockResolvedValueOnce(message);
    const channel = {
      messages: {
        fetch,
      },
    };
    streamInfoDiscord.getStreamInfoEmbed.mockResolvedValue(
      new EmbedBuilder().setTitle('Stream Info'),
    );

    await adoptLastStreamInfoMessage({
      client: makeClient({ channel }),
      pointer: {
        guildId: 'guild-1',
        channelId: 'channel-1',
      },
    });

    expect(fetch).toHaveBeenCalledWith({ limit: 25 });
    expect(
      streamInfoMessageQueries.upsertLastStreamInfoMessage,
    ).toHaveBeenCalledWith({
      guildId: 'guild-1',
      channelId: 'channel-1',
      messageId: 'message-1',
    });
    expect(message.edit).toHaveBeenCalled();
  });

  it('still edits an adopted stream info message when storing the pointer fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const message = {
      ...makeMessage(),
      author: {
        id: 'bot-1',
      },
      embeds: [{ title: 'Stream Info' }],
      components: [],
    } as unknown as Message;
    const channel = {
      messages: {
        fetch: vi.fn().mockResolvedValue(new Map([['message-1', message]])),
      },
    };
    streamInfoMessageQueries.upsertLastStreamInfoMessage.mockRejectedValue(
      new Error('missing StreamInfoMessage table'),
    );
    streamInfoDiscord.getStreamInfoEmbed.mockResolvedValue(
      new EmbedBuilder().setTitle('Stream Info'),
    );

    await adoptLastStreamInfoMessage({
      client: makeClient({ channel }),
      pointer: {
        guildId: 'guild-1',
        channelId: 'channel-1',
      },
    });

    expect(message.edit).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to store adopted stream info message',
      expect.any(Error),
    );

    consoleError.mockRestore();
  });

  it('skips adoption when the bot user is not ready yet', async () => {
    await adoptLastStreamInfoMessage({
      client: makeClient({ channel: null, botUserId: null }),
      pointer: {
        guildId: 'guild-1',
        channelId: 'channel-1',
      },
    });

    expect(
      streamInfoMessageQueries.upsertLastStreamInfoMessage,
    ).not.toHaveBeenCalled();
  });

  it('skips adoption when no recent bot stream info message is found', async () => {
    const userMessage = {
      id: 'message-1',
      author: {
        id: 'user-1',
      },
      embeds: [{ title: 'Stream Info' }],
      components: [],
    } as unknown as Message;
    const botOtherMessage = {
      id: 'message-2',
      author: {
        id: 'bot-1',
      },
      embeds: [],
      components: [{ components: [{ content: '# Other Info' }] }],
    } as unknown as Message;
    const channel = {
      messages: {
        fetch: vi.fn().mockResolvedValue(
          new Map([
            ['message-1', userMessage],
            ['message-2', botOtherMessage],
          ]),
        ),
      },
    };

    await adoptLastStreamInfoMessage({
      client: makeClient({ channel }),
      pointer: {
        guildId: 'guild-1',
        channelId: 'channel-1',
      },
    });

    expect(
      streamInfoMessageQueries.upsertLastStreamInfoMessage,
    ).not.toHaveBeenCalled();
  });

  it('logs adoption failures without throwing', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const client = {
      user: {
        id: 'bot-1',
      },
      channels: {
        fetch: vi.fn().mockRejectedValue(new Error('Discord is still waking')),
      },
    } as unknown as Client;

    await adoptLastStreamInfoMessage({
      client,
      pointer: {
        guildId: 'guild-1',
        channelId: 'channel-1',
      },
    });

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to adopt stream info message',
      expect.any(Error),
    );

    consoleError.mockRestore();
  });

  it('adopts untracked channels from recent streaminfo command logs', async () => {
    const message = {
      ...makeMessage(),
      author: {
        id: 'bot-1',
      },
      embeds: [{ title: 'Stream Info' }],
      components: [],
    } as unknown as Message;
    const channel = {
      messages: {
        fetch: vi
          .fn()
          .mockResolvedValueOnce(new Map([['message-1', message]]))
          .mockResolvedValueOnce(new Map([['message-1', message]]))
          .mockResolvedValueOnce(new Map([['message-1', message]])),
      },
    };
    streamInfoMessageQueries.findLastStreamInfoMessages.mockResolvedValue([]);
    streamInfoMessageQueries.findLatestStreamInfoCommandTargets.mockResolvedValue(
      [
        {
          guildId: 'guild-1',
          channelId: 'channel-1',
        },
        {
          guildId: 'guild-1',
          channelId: 'channel-2',
        },
      ],
    );
    streamInfoDiscord.getStreamInfoEmbed.mockResolvedValue(
      new EmbedBuilder().setTitle('Stream Info'),
    );

    await refreshLastStreamInfoMessages(makeClient({ channel }));

    expect(
      streamInfoMessageQueries.findLatestStreamInfoCommandTargets,
    ).toHaveBeenCalledWith(expect.any(Date));
    expect(
      streamInfoMessageQueries.upsertLastStreamInfoMessage,
    ).toHaveBeenCalledWith({
      guildId: 'guild-1',
      channelId: 'channel-1',
      messageId: 'message-1',
    });
    expect(
      streamInfoMessageQueries.upsertLastStreamInfoMessage,
    ).toHaveBeenCalledWith({
      guildId: 'guild-1',
      channelId: 'channel-2',
      messageId: 'message-1',
    });
  });

  it('does not adopt command-log targets whose channel already has a stored message', async () => {
    const message = makeMessage();
    const channel = {
      messages: {
        fetch: vi
          .fn()
          .mockResolvedValueOnce(message)
          .mockResolvedValueOnce(
            new Map([
              [
                'message-1',
                {
                  ...message,
                  author: {
                    id: 'bot-1',
                  },
                  embeds: [{ title: 'Stream Info' }],
                  components: [],
                } as unknown as Message,
              ],
            ]),
          )
          .mockResolvedValueOnce(message),
      },
    };
    streamInfoMessageQueries.findLastStreamInfoMessages.mockResolvedValue([
      {
        guildId: 'guild-1',
        channelId: 'channel-1',
        messageId: 'message-1',
      },
    ]);
    streamInfoMessageQueries.findLatestStreamInfoCommandTargets.mockResolvedValue(
      [
        {
          guildId: 'guild-1',
          channelId: 'channel-1',
        },
        {
          guildId: 'guild-1',
          channelId: 'channel-2',
        },
      ],
    );
    streamInfoDiscord.getStreamInfoEmbed.mockResolvedValue(
      new EmbedBuilder().setTitle('Stream Info'),
    );

    await refreshLastStreamInfoMessages(makeClient({ channel }));

    expect(
      streamInfoMessageQueries.upsertLastStreamInfoMessage,
    ).toHaveBeenCalledTimes(1);
    expect(
      streamInfoMessageQueries.upsertLastStreamInfoMessage,
    ).toHaveBeenCalledWith({
      guildId: 'guild-1',
      channelId: 'channel-2',
      messageId: 'message-1',
    });
  });

  it('uses a 24 hour cutoff for stored messages and command-log adoption', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-19T12:00:00.000Z'));
    streamInfoMessageQueries.findLastStreamInfoMessages.mockResolvedValue([]);
    streamInfoMessageQueries.findLatestStreamInfoCommandTargets.mockResolvedValue(
      [],
    );

    await refreshLastStreamInfoMessages(makeClient({ channel: null }));

    expect(
      streamInfoMessageQueries.deleteExpiredStreamInfoMessages,
    ).toHaveBeenCalledWith(new Date('2026-06-18T12:00:00.000Z'));
    expect(
      streamInfoMessageQueries.findLastStreamInfoMessages,
    ).toHaveBeenCalledWith(new Date('2026-06-18T12:00:00.000Z'));
    expect(
      streamInfoMessageQueries.findLatestStreamInfoCommandTargets,
    ).toHaveBeenCalledWith(new Date('2026-06-18T12:00:00.000Z'));
  });

  it('continues adoption when the stream info message table is missing', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const message = {
      ...makeMessage(),
      author: {
        id: 'bot-1',
      },
      embeds: [{ title: 'Stream Info' }],
      components: [],
    } as unknown as Message;
    const channel = {
      messages: {
        fetch: vi.fn().mockResolvedValue(new Map([['message-1', message]])),
      },
    };
    streamInfoMessageQueries.deleteExpiredStreamInfoMessages.mockRejectedValue(
      new Error('missing StreamInfoMessage table'),
    );
    streamInfoMessageQueries.findLastStreamInfoMessages.mockRejectedValue(
      new Error('missing StreamInfoMessage table'),
    );
    streamInfoMessageQueries.findLatestStreamInfoCommandTargets.mockResolvedValue(
      [
        {
          guildId: 'guild-1',
          channelId: 'channel-1',
        },
      ],
    );
    streamInfoDiscord.getStreamInfoEmbed.mockResolvedValue(
      new EmbedBuilder().setTitle('Stream Info'),
    );

    await refreshLastStreamInfoMessages(makeClient({ channel }));

    expect(message.edit).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to delete expired stream info messages',
      expect.any(Error),
    );
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load stored stream info messages',
      expect.any(Error),
    );

    consoleError.mockRestore();
  });
});
