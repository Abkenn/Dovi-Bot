import { MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  assertCommandAccess: vi.fn(),
  buildEmbeddedAppStatsButton: vi.fn(),
  buildStreamInfoEmbed: vi.fn(),
  buildStreamReminderButton: vi.fn(),
  editReply: vi.fn(),
  getStreamInfo: vi.fn(),
  mergeButtonActionRows: vi.fn(),
  registerLastStreamInfoMessage: vi.fn(),
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
vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: {
    STAGING_ENV: 'staging-guild',
    PROD_ENV: 'production-guild',
  },
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: {
    STREAM_INFO: {
      name: 'streaminfo',
      description: 'Shows stream information.',
      guildIds: ['staging-guild', 'production-guild'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  EPHEMERAL_COMMAND_REPLY: { flags: MessageFlags.Ephemeral },
  runCommand: dependencies.runCommand,
}));
vi.mock('../../src/modules/embedded-app/embedded-app-stats.discord', () => ({
  buildEmbeddedAppStatsButton: dependencies.buildEmbeddedAppStatsButton,
}));
vi.mock('../../src/modules/discord/component-embed', () => ({
  mergeButtonActionRows: dependencies.mergeButtonActionRows,
}));
vi.mock('../../src/modules/stream-info/stream-info.discord', () => ({
  buildStreamInfoEmbed: dependencies.buildStreamInfoEmbed,
  buildStreamReminderButton: dependencies.buildStreamReminderButton,
}));
vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: dependencies.getStreamInfo,
}));
vi.mock(
  '../../src/modules/stream-info/stream-info-message-updater.service',
  () => ({
    registerLastStreamInfoMessage: dependencies.registerLastStreamInfoMessage,
  }),
);
vi.mock('../../src/modules/stream-info/stream-reminder.utils', () => ({
  getStreamReminderOccurrence: vi.fn().mockReturnValue(null),
}));

import { StreamInfoCommand } from '../../src/commands/streaminfo';

const makeInteraction = (isPrivate: boolean | null, isThread = false) => ({
  channelId: isThread ? 'thread-1' : 'channel-1',
  channel: {
    isThread: () => isThread,
  },
  options: {
    getBoolean: vi.fn().mockReturnValue(isPrivate),
  },
});

describe('/streaminfo response privacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.getStreamInfo.mockResolvedValue({ current: null, next: null });
    dependencies.buildStreamInfoEmbed.mockReturnValue({ title: 'Stream Info' });
    dependencies.buildStreamReminderButton.mockReturnValue(null);
    dependencies.buildEmbeddedAppStatsButton.mockReturnValue({
      type: 'stats-button',
    });
    dependencies.editReply.mockResolvedValue({ id: 'message-1' });
    dependencies.registerLastStreamInfoMessage.mockResolvedValue(undefined);
    dependencies.mergeButtonActionRows.mockReturnValue({ type: 'merged-row' });
    dependencies.runCommand.mockImplementation(async (options) => {
      options.beforeDefer();
      return options.run({
        editReply: dependencies.editReply,
        preflight: 'production-guild',
      });
    });
  });

  it('registers the optional private boolean for both configured guilds', () => {
    const setRequired = vi.fn().mockReturnThis();
    const setDescription = vi.fn().mockReturnValue({ setRequired });
    const setName = vi.fn().mockReturnValue({ setDescription });
    const option = { setName };
    const addBooleanOption = vi.fn((configure) => {
      configure(option);
      return builder;
    });
    const builder = {
      setName: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      addBooleanOption,
    };
    const registerChatInputCommand = vi.fn((configure) => configure(builder));
    const command = new StreamInfoCommand({} as never, {});

    command.registerApplicationCommands({ registerChatInputCommand } as never);

    expect(registerChatInputCommand).toHaveBeenCalledWith(
      expect.any(Function),
      {
        guildIds: ['staging-guild', 'production-guild'],
      },
    );
    expect(builder.setName).toHaveBeenCalledWith('streaminfo');
    expect(setName).toHaveBeenCalledWith('private');
    expect(setDescription).toHaveBeenCalledWith(
      'Only you can see the response',
    );
    expect(setRequired).toHaveBeenCalledWith(false);
  });

  it('uses an ephemeral response that is not registered for background edits', async () => {
    const interaction = makeInteraction(true);

    await StreamInfoCommand.prototype.chatInputRun.call(
      { name: 'streaminfo' },
      interaction as never,
    );

    expect(dependencies.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        deferReplyOptions: { flags: MessageFlags.Ephemeral },
      }),
    );
    expect(dependencies.buildEmbeddedAppStatsButton).toHaveBeenCalledWith(
      'production-guild',
    );
    expect(dependencies.registerLastStreamInfoMessage).not.toHaveBeenCalled();
    expect(dependencies.assertCommandAccess).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({ name: 'streaminfo' }),
    );
  });

  it('keeps a public normal-channel response registered for background edits', async () => {
    const interaction = makeInteraction(null);
    dependencies.buildEmbeddedAppStatsButton.mockReturnValue(null);

    await StreamInfoCommand.prototype.chatInputRun.call(
      { name: 'streaminfo' },
      interaction as never,
    );

    expect(dependencies.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({ deferReplyOptions: {} }),
    );
    expect(dependencies.registerLastStreamInfoMessage).toHaveBeenCalledWith({
      guildId: 'production-guild',
      channelId: 'channel-1',
      message: { id: 'message-1' },
    });
  });

  it('keeps the Stats button in thread responses', async () => {
    const interaction = makeInteraction(false, true);
    const reminderButton = { type: 'reminder-button' };
    dependencies.buildStreamReminderButton.mockReturnValue(reminderButton);

    await StreamInfoCommand.prototype.chatInputRun.call(
      { name: 'streaminfo' },
      interaction as never,
    );

    expect(dependencies.buildEmbeddedAppStatsButton).toHaveBeenCalledWith(
      'production-guild',
    );
    expect(dependencies.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        components: [reminderButton, { type: 'stats-button' }],
      }),
    );
  });

  it('combines the buttons into one row in staging only', async () => {
    const reminderButton = { type: 'reminder-button' };
    const statsButton = { type: 'stats-button' };
    dependencies.buildStreamReminderButton.mockReturnValue(reminderButton);
    dependencies.buildEmbeddedAppStatsButton.mockReturnValue(statsButton);
    dependencies.runCommand.mockImplementation(async (options) =>
      options.run({
        editReply: dependencies.editReply,
        preflight: 'staging-guild',
      }),
    );

    await StreamInfoCommand.prototype.chatInputRun.call(
      { name: 'streaminfo' },
      makeInteraction(false) as never,
    );

    expect(dependencies.mergeButtonActionRows).toHaveBeenCalledWith([
      reminderButton,
      statsButton,
    ]);
    expect(dependencies.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ components: [{ type: 'merged-row' }] }),
    );
  });
});
