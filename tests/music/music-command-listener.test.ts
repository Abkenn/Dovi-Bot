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
import { MusicSearchButtonsListener } from '../../src/listeners/music-search-buttons';

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
            { name: 'Yes', value: 'yes' },
            { name: 'No', value: 'no' },
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
      return options.run.staging({ editReply: dependencies.editReply });
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
      options.run.staging({ editReply: dependencies.editReply }),
    );
    dependencies.search.mockResolvedValue([
      {
        title: 'Majula - DS2',
        game: 'Dark Souls 2',
        streamDate: '2026-09-11',
        count: 1,
        offsetSeconds: 60,
        video: { videoId: 'first', title: 'Music stream' },
      },
    ]);
    const interaction = {
      user: { id: 'owner' },
      guildId: 'staging',
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

  it('wires staging pagination through the command and button listener while retaining the prod reply', async () => {
    dependencies.search.mockResolvedValue(
      Array.from({ length: 44 }, (_, index) => ({
        title: `Track ${index}`,
        game: 'Touhou Series',
        count: 1,
        streamDate: '2026-09-11',
        offsetSeconds: index * 60,
        video: null,
      })),
    );
    const interaction = {
      user: { id: 'owner' },
      guildId: 'staging',
      options: {
        getString: (name: string) => (name === 'query' ? 'touhou' : 'yes'),
      },
    };
    await MusicSearchCommand.prototype.chatInputRun.call(
      { name: 'music-search' },
      interaction as never,
    );
    const first = dependencies.editReply.mock.calls[0]?.[0];
    expect(first.content).toContain('Page 1 of');
    const customId = first.components[0].components[1].toJSON().custom_id;
    const listener = new MusicSearchButtonsListener({} as never, {});
    const click = {
      isButton: () => true,
      customId,
      user: interaction.user,
      guildId: 'staging',
      update: vi.fn(),
      reply: vi.fn(),
    };
    await listener.run(click as never);
    expect(click.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Page 2 of'),
      }),
    );
    await listener.run({ isButton: () => false } as never);
    await listener.run({ ...click, customId: 'unrelated' } as never);
    expect(click.update).toHaveBeenCalledTimes(1);
    click.update.mockRejectedValueOnce(new Error('Discord unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await listener.run(click as never);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
    dependencies.editReply.mockClear();
    dependencies.runner.mockImplementation(async (options) =>
      options.run.prod({ editReply: dependencies.editReply }),
    );
    await MusicSearchCommand.prototype.chatInputRun.call(
      { name: 'music-search' },
      interaction as never,
    );
    expect(
      dependencies.editReply.mock.calls[0]?.[0].components,
    ).toBeUndefined();
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
