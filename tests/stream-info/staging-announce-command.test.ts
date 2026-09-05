import { MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  editReply: vi.fn(),
  postStagingStreamAnnouncement: vi.fn(),
  runCommand: vi.fn(),
}));

vi.mock('@sapphire/framework', () => ({
  Command: class Command {
    public constructor(_context: unknown, options: Record<string, unknown>) {
      Object.assign(this, options);
    }
  },
}));
vi.mock('../../src/config/discord-access', () => ({
  ADMIN_COMMAND_PERMISSION: 32n,
}));
vi.mock('../../src/config/discord-command-guards', () => ({
  assertCommandAccess: vi.fn(),
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: {
    STAGING_ANNOUNCE: {
      name: 'staging-announce',
      description: 'Post a staging announcement.',
      guildIds: ['staging-guild'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  EPHEMERAL_COMMAND_REPLY: { flags: MessageFlags.Ephemeral },
  runCommand: dependencies.runCommand,
}));
vi.mock(
  '../../src/modules/stream-info/stream-info-message-updater.service',
  () => ({
    postStagingStreamAnnouncement: dependencies.postStagingStreamAnnouncement,
  }),
);

import { StagingAnnounceCommand } from '../../src/commands/staging-announce';

describe('/staging-announce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.runCommand.mockImplementation(async (options) =>
      options.run({ editReply: dependencies.editReply }),
    );
  });

  it('registers in staging with the admin permission', () => {
    const builder = {
      setName: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      setDefaultMemberPermissions: vi.fn().mockReturnThis(),
    };
    const registerChatInputCommand = vi.fn((configure) => configure(builder));
    const command = new StagingAnnounceCommand({} as never, {});

    command.registerApplicationCommands({ registerChatInputCommand } as never);

    expect(builder.setDefaultMemberPermissions).toHaveBeenCalledWith(32n);
    expect(registerChatInputCommand).toHaveBeenCalledWith(
      expect.any(Function),
      { guildIds: ['staging-guild'] },
    );
  });

  it('posts the preview and replies privately', async () => {
    const interaction = { client: { id: 'client' } };

    await StagingAnnounceCommand.prototype.chatInputRun.call(
      { name: 'staging-announce' },
      interaction as never,
    );

    expect(dependencies.postStagingStreamAnnouncement).toHaveBeenCalledWith(
      interaction.client,
    );
    expect(dependencies.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        deferReplyOptions: { flags: MessageFlags.Ephemeral },
      }),
    );
    expect(dependencies.editReply).toHaveBeenCalledWith({
      content: 'Test stream announcement posted.',
    });
  });
});
