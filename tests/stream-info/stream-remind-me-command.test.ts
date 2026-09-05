import { MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  assertCommandAccess: vi.fn(),
  editReply: vi.fn(),
  runCommand: vi.fn(),
  setPermanentStreamReminder: vi.fn(),
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
    STREAM_REMIND_ME: {
      name: 'stream-remind-me',
      description: 'Manage reminders.',
      guildIds: ['staging-guild', 'production-guild'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  EPHEMERAL_COMMAND_REPLY: { flags: MessageFlags.Ephemeral },
  runCommand: dependencies.runCommand,
}));
vi.mock('../../src/modules/stream-info/stream-reminder.service', () => ({
  setPermanentStreamReminder: dependencies.setPermanentStreamReminder,
}));

import { StreamRemindMeCommand } from '../../src/commands/stream-remind-me';

const makeInteraction = (permanent: 'yes' | 'no' | null) => ({
  options: { getString: vi.fn().mockReturnValue(permanent) },
  user: { id: 'user-1' },
});

describe('/stream-remind-me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.runCommand.mockImplementation(async (options) =>
      options.run({
        editReply: dependencies.editReply,
        preflight: 'production-guild',
      }),
    );
  });

  it('registers the optional Yes or No permanent choice', () => {
    const setRequired = vi.fn().mockReturnThis();
    const addChoices = vi.fn().mockReturnValue({ setRequired });
    const setDescription = vi.fn().mockReturnValue({ addChoices });
    const setName = vi.fn().mockReturnValue({ setDescription });
    const builder = {
      setName: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      addStringOption: vi.fn((configure) => {
        configure({ setName });
        return builder;
      }),
    };
    const registerChatInputCommand = vi.fn((configure) => configure(builder));
    const command = new StreamRemindMeCommand({} as never, {});

    command.registerApplicationCommands({ registerChatInputCommand } as never);

    expect(addChoices).toHaveBeenCalledWith(
      { name: 'Yes', value: 'yes' },
      { name: 'No', value: 'no' },
    );
    expect(setRequired).toHaveBeenCalledWith(false);
  });

  it('enables permanent reminders by default', async () => {
    await StreamRemindMeCommand.prototype.chatInputRun.call(
      { name: 'stream-remind-me' },
      makeInteraction(null) as never,
    );

    expect(dependencies.setPermanentStreamReminder).toHaveBeenCalledWith({
      enabled: true,
      guildId: 'production-guild',
      userId: 'user-1',
    });
    expect(dependencies.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        deferReplyOptions: { flags: MessageFlags.Ephemeral },
      }),
    );
    expect(dependencies.editReply).toHaveBeenCalledWith({
      content:
        'Permanent stream reminders are on. I’ll DM you for future streams.',
    });
  });

  it('turns permanent reminders off explicitly', async () => {
    await StreamRemindMeCommand.prototype.chatInputRun.call(
      { name: 'stream-remind-me' },
      makeInteraction('no') as never,
    );

    expect(dependencies.setPermanentStreamReminder).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(dependencies.editReply).toHaveBeenCalledWith({
      content: 'Permanent stream reminders are off.',
    });
  });
});
