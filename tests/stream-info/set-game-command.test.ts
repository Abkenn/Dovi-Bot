import { MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  assertCommandAccess: vi.fn(),
  editReply: vi.fn(),
  getStreamInfoEmbed: vi.fn(),
  runCommand: vi.fn(),
  setDefaultStreamGame: vi.fn(),
  updateLiveGameInfo: vi.fn(),
}));

vi.mock('@sapphire/framework', () => ({
  Command: class Command {
    public container = { client: { id: 'client' } };

    public constructor(_context: unknown, options: Record<string, unknown>) {
      Object.assign(this, options);
    }
  },
}));
vi.mock('../../src/config/discord-access', () => ({
  ADMIN_COMMAND_PERMISSION: 32n,
  BOT_GUILDS: { PROD_ENV: 'production-guild' },
}));
vi.mock('../../src/config/discord-command-guards', () => ({
  assertCommandAccess: dependencies.assertCommandAccess,
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: {
    DAVI_SET_GAME: {
      description: 'Updates the prod game.',
      guildIds: ['staging-guild'],
      name: 'davisetgame',
    },
    SET_GAME: {
      description: 'Updates the game.',
      guildIds: ['staging-guild', 'production-guild'],
      name: 'setgame',
    },
  },
}));
vi.mock('../../src/modules/boss-tracking/boss-tracking.service', () => ({
  updateLiveGameInfo: dependencies.updateLiveGameInfo,
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  EPHEMERAL_COMMAND_REPLY: { flags: MessageFlags.Ephemeral },
  runCommand: dependencies.runCommand,
}));
vi.mock('../../src/modules/stream-info/stream-default-game.service', () => ({
  setDefaultStreamGame: dependencies.setDefaultStreamGame,
}));
vi.mock('../../src/modules/stream-info/stream-info.discord', () => ({
  getStreamInfoEmbed: dependencies.getStreamInfoEmbed,
}));

import { DaviSetGameCommand } from '../../src/commands/davisetgame';
import { SetGameCommand } from '../../src/commands/setgame';

type CommandConstructor = typeof SetGameCommand | typeof DaviSetGameCommand;

const register = (CommandClass: CommandConstructor) => {
  const option = {
    setDescription: vi.fn().mockReturnThis(),
    setName: vi.fn().mockReturnThis(),
    setRequired: vi.fn().mockReturnThis(),
  };
  const builder = {
    addStringOption: vi.fn((configure) => {
      configure(option);
      return builder;
    }),
    setDefaultMemberPermissions: vi.fn().mockReturnThis(),
    setDescription: vi.fn().mockReturnThis(),
    setName: vi.fn().mockReturnThis(),
  };
  const registerChatInputCommand = vi.fn((configure) => configure(builder));
  const command = new CommandClass({} as never, {} as never);
  command.registerApplicationCommands({ registerChatInputCommand } as never);

  return { builder, command, option, registerChatInputCommand };
};

const interaction = {
  options: {
    getString: vi.fn((name: string, required?: boolean) => {
      if (name === 'game') return 'Ace Combat 7';
      if (required) throw new Error(`Missing required option ${name}`);
      return null;
    }),
  },
  user: { id: 'user-1' },
};

describe('set game commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.getStreamInfoEmbed.mockResolvedValue({ title: 'Stream Info' });
    dependencies.setDefaultStreamGame.mockResolvedValue(undefined);
    dependencies.updateLiveGameInfo.mockResolvedValue({
      gameName: 'Ace Combat 7',
    });
    dependencies.assertCommandAccess.mockReturnValue('interaction-guild');
    dependencies.runCommand.mockImplementation(async (options) => {
      const preflight = options.beforeDefer();

      return options.run({
        editReply: dependencies.editReply,
        preflight,
      });
    });
  });

  it('registers the regular and prod-from-staging command options', () => {
    const regular = register(SetGameCommand);
    const davi = register(DaviSetGameCommand);

    expect(regular.command.name).toBe('setgame');
    expect(regular.builder.addStringOption).toHaveBeenCalledTimes(3);
    expect(regular.option.setName).toHaveBeenCalledWith('game');
    expect(regular.option.setName).toHaveBeenCalledWith('aliases');
    expect(regular.option.setName).toHaveBeenCalledWith('tags');
    expect(davi.command.name).toBe('davisetgame');
    expect(davi.builder.addStringOption).toHaveBeenCalledOnce();
    expect(davi.builder.setDefaultMemberPermissions).toHaveBeenCalledWith(32n);
  });

  it('updates the current guild through the announcement-aware service', async () => {
    await SetGameCommand.prototype.chatInputRun.call(
      { container: { client: { id: 'client' } }, name: 'setgame' },
      interaction as never,
    );

    expect(dependencies.setDefaultStreamGame).toHaveBeenCalledWith({
      client: { id: 'client' },
      gameName: 'Ace Combat 7',
      guildId: 'interaction-guild',
    });
  });

  it('updates prod from staging through the announcement-aware service', async () => {
    await DaviSetGameCommand.prototype.chatInputRun.call(
      { container: { client: { id: 'client' } }, name: 'davisetgame' },
      interaction as never,
    );

    expect(dependencies.setDefaultStreamGame).toHaveBeenCalledWith({
      client: { id: 'client' },
      gameName: 'Ace Combat 7',
      guildId: 'production-guild',
    });
  });
});
