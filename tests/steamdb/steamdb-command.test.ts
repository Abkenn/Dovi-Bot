import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  assertCommandAccess: vi.fn(),
  buildSteamMessage: vi.fn().mockReturnValue('steam summary'),
  editReply: vi.fn(),
  findSteamGame: vi.fn(),
  runCommand: vi.fn(),
}));

vi.mock('@sapphire/framework', () => ({
  Command: class Command {
    public constructor(_context: unknown, options: Record<string, unknown>) {
      Object.assign(this, options);
    }
  },
}));
vi.mock('../../src/config/discord-command-guards', () => ({
  assertCommandAccess: dependencies.assertCommandAccess,
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: {
    STEAM: {
      name: 'steam',
      description: 'Shows ratings and completion time for a game.',
      guildIds: ['staging-guild', 'prod-guild'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  runCommand: dependencies.runCommand,
}));
vi.mock('../../src/modules/steam/steam.service', () => ({
  findSteamGame: dependencies.findSteamGame,
}));
vi.mock('../../src/modules/steam/steam.discord', () => ({
  buildSteamMessage: dependencies.buildSteamMessage,
}));

import { SteamCommand } from '../../src/commands/steam';

const interaction = {
  options: { getString: vi.fn().mockReturnValue('Moonlit Archive') },
};

describe('/steam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.runCommand.mockImplementation(async (options) => {
      await options.beforeDefer?.();
      return options.run({
        editReply: dependencies.editReply,
        signal: new AbortController().signal,
      });
    });
    dependencies.findSteamGame.mockResolvedValue({ game: {} });
  });

  it('registers required game autocomplete in staging and prod', () => {
    const option = {
      setName: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      setRequired: vi.fn().mockReturnThis(),
      setAutocomplete: vi.fn().mockReturnThis(),
    };
    const builder = {
      setName: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      addStringOption: vi.fn((configure) => {
        configure(option);
        return builder;
      }),
    };
    const registerChatInputCommand = vi.fn((configure, options) => {
      configure(builder);
      return options;
    });
    const command = new SteamCommand({} as never, {});

    command.registerApplicationCommands({ registerChatInputCommand } as never);

    expect(option.setName).toHaveBeenCalledWith('game');
    expect(option.setAutocomplete).toHaveBeenCalledWith(true);
    expect(registerChatInputCommand).toHaveBeenCalledWith(
      expect.any(Function),
      { guildIds: ['staging-guild', 'prod-guild'] },
    );
  });

  it('shows the formatted summary or a short missing-game response', async () => {
    await SteamCommand.prototype.chatInputRun.call(
      { name: 'steam' },
      interaction as never,
    );
    expect(dependencies.editReply).toHaveBeenLastCalledWith({
      content: 'steam summary',
    });

    dependencies.findSteamGame.mockResolvedValueOnce(null);
    await SteamCommand.prototype.chatInputRun.call(
      { name: 'steam' },
      interaction as never,
    );
    expect(dependencies.editReply).toHaveBeenLastCalledWith({
      content: 'Game not found.',
    });
  });
});
