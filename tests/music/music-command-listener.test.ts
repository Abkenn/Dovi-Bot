import { Collection, SlashCommandBuilder } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  guard: vi.fn(),
  runner: vi.fn(),
  search: vi.fn(),
  upload: vi.fn(),
  editReply: vi.fn(),
}));
vi.mock('@sapphire/framework', () => ({
  Command: class {
    constructor(_context: unknown, options: object) {
      Object.assign(this, options);
    }
  },
  Listener: class {
    constructor(_context: unknown, options: object) {
      Object.assign(this, options);
    }
  },
}));
vi.mock('../../src/config/discord-command-guards', () => ({
  assertCommandAccess: dependencies.guard,
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: {
    MUSIC_SEARCH: {
      name: 'music-search',
      description: 'Find music',
      guildIds: ['staging'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  runCommand: dependencies.runner,
}));
vi.mock('../../src/modules/music/music.service', () => ({
  searchMusicCatalog: dependencies.search,
  importMusicUpload: dependencies.upload,
}));

import { MusicSearchCommand } from '../../src/commands/music-search';
import { MusicCatalogMessagesListener } from '../../src/listeners/music-catalog-messages';

describe('music command and listener wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.search.mockResolvedValue([]);
    dependencies.upload.mockResolvedValue('updated');
  });

  it('registers a required bounded query on staging', () => {
    const builder = new SlashCommandBuilder();
    const registerChatInputCommand = vi.fn(
      (configure: (builder: SlashCommandBuilder) => unknown) =>
        configure(builder),
    );
    new MusicSearchCommand({} as never, {}).registerApplicationCommands({
      registerChatInputCommand,
    } as never);
    expect(builder.toJSON()).toMatchObject({
      name: 'music-search',
      options: [
        { name: 'query', required: true, min_length: 2, max_length: 100 },
        {
          name: 'game',
          description:
            'Yes: list tracks from a game. No or omitted: search a track name.',
          choices: [
            { name: 'Yes: search games and list tracks', value: 'yes' },
            { name: 'No: search a track name (default)', value: 'no' },
          ],
        },
      ],
    });
    expect(registerChatInputCommand).toHaveBeenCalledWith(
      expect.any(Function),
      { guildIds: ['staging'] },
    );
  });

  it('runs the guard and returns the search reply through the command runner', async () => {
    dependencies.runner.mockImplementation(async (options) => {
      await options.beforeDefer();
      return options.run({ editReply: dependencies.editReply });
    });
    const interaction = {
      options: { getString: vi.fn().mockReturnValue('song') },
    };
    await MusicSearchCommand.prototype.chatInputRun.call(
      { name: 'music-search' },
      interaction as never,
    );
    expect(dependencies.guard).toHaveBeenCalled();
    expect(interaction.options.getString).toHaveBeenCalledWith('query', true);
    expect(dependencies.search).toHaveBeenCalledWith('song', { game: false });
    expect(dependencies.editReply).toHaveBeenCalledWith({
      content: 'No matching tracks found. Try part of the song or game name.',
    });
  });

  it('renders game search results through the game reply path', async () => {
    dependencies.runner.mockImplementation(async (options) =>
      options.run({ editReply: dependencies.editReply }),
    );
    dependencies.search.mockResolvedValue([
      {
        title: 'Majula - DS2',
        game: 'Dark Souls 2',
        streamDate: '2026-09-11',
        offsetSeconds: 60,
        video: { videoId: 'first', title: 'Music stream' },
      },
    ]);
    const interaction = {
      options: {
        getString: vi.fn((name: string) =>
          name === 'query' ? 'dark souls 2' : 'yes',
        ),
      },
    };
    await MusicSearchCommand.prototype.chatInputRun.call(
      { name: 'music-search' },
      interaction as never,
    );
    expect(dependencies.search).toHaveBeenCalledWith('dark souls 2', {
      game: true,
    });
    expect(dependencies.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('* [Majula - Dark Souls 2]'),
      }),
    );
  });

  it('processes attachment-only messages, isolates failures and ignores bots and DMs', async () => {
    const listener = new MusicCatalogMessagesListener({} as never, {});
    const attachment = {
      id: '2',
      name: '32.0.txt',
      url: 'https://cdn.discordapp.com/file',
      size: 200,
    };
    const message = {
      inGuild: () => true,
      id: '1',
      guildId: 'prod',
      author: { id: 'uploader', bot: false },
      attachments: new Collection([
        ['2', attachment],
        ['3', { ...attachment, id: '3' }],
      ]),
    };
    dependencies.upload.mockRejectedValueOnce(new Error('bad file'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await listener.run(message as never);
    expect(dependencies.upload).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalled();
    expect(dependencies.upload).toHaveBeenLastCalledWith({
      authorId: 'uploader',
      guildId: 'prod',
      messageId: '1',
      attachmentId: '3',
      filename: '32.0.txt',
      url: attachment.url,
      size: 200,
    });
    dependencies.upload.mockClear();
    await listener.run({ ...message, inGuild: () => false } as never);
    await listener.run({
      ...message,
      author: { ...message.author, bot: true },
    } as never);
    expect(dependencies.upload).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
