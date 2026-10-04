import { MessageFlags, MessageFlagsBitField } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/command-logging/command-logging.service', () => ({
  createCommandExecutionLog: vi.fn(),
  createCommandErrorLog: vi.fn(),
}));
vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { STAGING_ENV: 'staging', PROD_ENV: 'prod' },
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  HELP_COMMANDS: [],
}));

import { MusicSearchButtonsListener } from '../../src/listeners/music-search-buttons';
import { runCommand } from '../../src/modules/command-runner/run-command';
import { createMusicSearchPagination } from '../../src/modules/music/music-pagination';

describe('component cleanup through command and listener replies', () => {
  afterEach(() => vi.useRealTimers());

  it('cleans the public command reply at session expiry and the private listener reply before its webhook expires', async () => {
    vi.useFakeTimers();
    const page = createMusicSearchPagination({
      pages: ['first page', 'second page'],
      guildId: 'prod',
    });
    const publicMessage = {
      id: 'command-message',
      content: 'first page',
      flags: new MessageFlagsBitField(),
      components: page.components ?? [],
      edit: vi.fn(),
      fetch: vi.fn(),
    };
    publicMessage.fetch.mockResolvedValue(publicMessage);
    const command = {
      guildId: 'prod',
      deferred: false,
      replied: false,
      deferReply: vi.fn(async () => {
        command.deferred = true;
      }),
      editReply: vi.fn(async () => {
        command.replied = true;
        return publicMessage;
      }),
    };
    await runCommand({
      interaction: command as never,
      commandName: 'music-search',
      withCommandLogging: false,
      run: ({ editReply }) => editReply(page),
    });
    const next = page.components?.[0]?.components[1]?.toJSON();
    if (!next || !('custom_id' in next)) throw new Error('Missing Next button');
    const privateMessage = {
      ...publicMessage,
      id: 'private-message',
      content: 'second page',
      flags: new MessageFlagsBitField(MessageFlags.Ephemeral),
    };
    const click = {
      isButton: () => true,
      customId: next.custom_id,
      guildId: 'prod',
      message: publicMessage,
      replied: false,
      reply: vi.fn(async () => {
        click.replied = true;
      }),
      fetchReply: vi.fn().mockResolvedValue(privateMessage),
      editReply: vi.fn(),
    };
    await MusicSearchButtonsListener.prototype.run.call(
      {} as never,
      click as never,
    );
    expect(click.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'second page' }),
    );
    await vi.advanceTimersByTimeAsync(14 * 60_000);
    expect(click.editReply).toHaveBeenCalledWith({ components: [] });
    expect(publicMessage.edit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(46 * 60_000);
    expect(publicMessage.edit).toHaveBeenCalledWith({ components: [] });
    expect(command.editReply).toHaveBeenCalledOnce();
    expect(publicMessage.content).toBe('first page');
    expect(privateMessage.content).toBe('second page');
  });
});
