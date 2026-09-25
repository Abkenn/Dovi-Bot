import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  assertCommandAccess: vi.fn(),
  buildHltbMessage: vi.fn().mockReturnValue('completion times'),
  editReply: vi.fn(),
  findHltbGame: vi.fn(),
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
    HLTB: {
      name: 'hltb',
      description: 'Shows game completion times.',
      guildIds: ['staging-guild'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  runCommand: dependencies.runCommand,
}));
vi.mock('../../src/modules/hltb/hltb.service', () => ({
  findHltbGame: dependencies.findHltbGame,
}));
vi.mock('../../src/modules/hltb/hltb.discord', () => ({
  buildHltbMessage: dependencies.buildHltbMessage,
}));

import { HltbCommand } from '../../src/commands/hltb';

const interaction = {
  options: { getString: vi.fn().mockReturnValue('Moonlit Archive') },
};

describe('/hltb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.runCommand.mockImplementation(async (options) => {
      await options.beforeDefer?.();
      return options.run({
        editReply: dependencies.editReply,
        signal: new AbortController().signal,
      });
    });
    dependencies.findHltbGame.mockResolvedValue({ title: 'Moonlit Archive' });
  });

  it('registers one required autocomplete game option on staging', () => {
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
    const command = new HltbCommand({} as never, {});

    command.registerApplicationCommands({ registerChatInputCommand } as never);

    expect(option.setName).toHaveBeenCalledWith('game');
    expect(option.setRequired).toHaveBeenCalledWith(true);
    expect(option.setAutocomplete).toHaveBeenCalledWith(true);
    expect(registerChatInputCommand).toHaveBeenCalledWith(
      expect.any(Function),
      {
        guildIds: ['staging-guild'],
      },
    );
  });

  it('shows only the formatted completion times', async () => {
    await HltbCommand.prototype.chatInputRun.call(
      { name: 'hltb' },
      interaction as never,
    );

    expect(dependencies.findHltbGame).toHaveBeenCalledWith(
      'Moonlit Archive',
      expect.any(AbortSignal),
    );
    expect(dependencies.editReply).toHaveBeenCalledWith({
      content: 'completion times',
    });
  });

  it('gives a short response when no game is found', async () => {
    dependencies.findHltbGame.mockResolvedValue(null);

    await HltbCommand.prototype.chatInputRun.call(
      { name: 'hltb' },
      interaction as never,
    );

    expect(dependencies.editReply).toHaveBeenCalledWith({
      content: 'Game not found.',
    });
  });
});
