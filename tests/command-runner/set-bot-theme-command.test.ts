import { SlashCommandBuilder } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  runCommand: vi.fn(),
  getBotThemeMode: vi.fn(),
  setBotThemeMode: vi.fn(),
  editReply: vi.fn(),
  assertCommandAccess: vi.fn(),
}));
vi.mock('@sapphire/framework', () => ({
  Command: class {
    constructor(_context: unknown, options: Record<string, unknown>) {
      Object.assign(this, options);
    }
  },
}));
vi.mock('../../src/config/discord-access', () => ({
  ADMIN_COMMAND_PERMISSION: 32n,
}));
vi.mock('../../src/config/discord-command-guards', () => ({
  assertCommandAccess: dependencies.assertCommandAccess,
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: {
    SET_BOT_THEME: {
      name: 'set-bot-theme',
      description: 'Set the bot theme.',
      guildIds: ['staging'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  EPHEMERAL_COMMAND_REPLY: { flags: 64 },
  runCommand: dependencies.runCommand,
}));
vi.mock('../../src/modules/command-runner/seasonal-theme.service', () => ({
  getBotThemeMode: dependencies.getBotThemeMode,
  setBotThemeMode: dependencies.setBotThemeMode,
}));

import { SetBotThemeCommand } from '../../src/commands/set-bot-theme';

beforeEach(() => {
  vi.clearAllMocks();
  dependencies.getBotThemeMode.mockResolvedValue('auto');
  dependencies.runCommand.mockImplementation(async (options) => {
    await options.beforeDefer();
    return options.run({ editReply: dependencies.editReply });
  });
});

describe('/set-bot-theme', () => {
  it('registers only in staging with Manage Server and configured mode choices', () => {
    const builder = new SlashCommandBuilder();
    const registerChatInputCommand = vi.fn((configure) => configure(builder));
    new SetBotThemeCommand({} as never, {}).registerApplicationCommands({
      registerChatInputCommand,
    } as never);
    expect(registerChatInputCommand).toHaveBeenCalledWith(
      expect.any(Function),
      { guildIds: ['staging'] },
    );
    expect(builder.toJSON()).toMatchObject({
      default_member_permissions: '32',
      options: [
        {
          name: 'mode',
          choices: [
            { value: 'auto' },
            { value: 'normal' },
            { value: 'halloween' },
          ],
        },
      ],
    });
  });

  it('persists an override, replies privately, and provides the previous setting to undo', async () => {
    const interaction = {
      options: { getString: () => 'halloween' },
      memberPermissions: { has: () => true },
    };
    await new SetBotThemeCommand({} as never, {}).chatInputRun(
      interaction as never,
    );
    expect(dependencies.setBotThemeMode).toHaveBeenCalledWith('halloween');
    expect(dependencies.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('/set-bot-theme mode:auto'),
    });
    expect(dependencies.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({ deferReplyOptions: { flags: 64 } }),
    );
  });

  it('inspects the current setting without writing', async () => {
    const interaction = {
      options: { getString: () => null },
      memberPermissions: { has: () => true },
    };
    await new SetBotThemeCommand({} as never, {}).chatInputRun(
      interaction as never,
    );
    expect(dependencies.setBotThemeMode).not.toHaveBeenCalled();
  });

  it('denies users lacking Manage Server before accessing the database', async () => {
    const interaction = { memberPermissions: { has: () => false } };
    await expect(
      new SetBotThemeCommand({} as never, {}).chatInputRun(
        interaction as never,
      ),
    ).rejects.toThrow('Manage Server');
    expect(dependencies.getBotThemeMode).not.toHaveBeenCalled();
  });
});
