import { MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  buildStreamAnnouncementChangePreview: vi.fn(),
  editReply: vi.fn(),
  prepareStreamAnnouncementChange: vi.fn(),
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
  BOT_GUILDS: { PROD_ENV: 'production-guild' },
}));
vi.mock('../../src/config/discord-command-guards', () => ({
  assertCommandAccess: vi.fn(),
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: {
    DAVI_UPDATE_ANNOUNCEMENT: {
      name: 'davi-update-announcement',
      description: 'Update announcement.',
      guildIds: ['staging-guild'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  EPHEMERAL_COMMAND_REPLY: { flags: MessageFlags.Ephemeral },
  runCommand: dependencies.runCommand,
}));
vi.mock(
  '../../src/modules/stream-info/stream-announcement-change.service',
  () => ({
    prepareStreamAnnouncementChange:
      dependencies.prepareStreamAnnouncementChange,
  }),
);
vi.mock('../../src/modules/stream-info/stream-info.discord', () => ({
  buildStreamAnnouncementChangePreview:
    dependencies.buildStreamAnnouncementChangePreview,
}));

import { DaviUpdateAnnouncementCommand } from '../../src/commands/davi-update-announcement';

const makeInteraction = (values: Record<string, string | null>) => ({
  client: { id: 'client' },
  options: {
    getString: vi.fn((name: string) => values[name] ?? null),
  },
  user: { id: 'user-1' },
});

describe('/davi-update-announcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.prepareStreamAnnouncementChange.mockResolvedValue({
      action: 'UPDATE',
      requestId: 'request-1',
      streamDateKey: '2026-09-11',
      streamInfo: {
        current: null,
        previous: null,
        next: null,
        timezone: 'UTC',
      },
      streamUrl: 'https://youtube.test/watch?v=stream',
      targetGuildId: 'production-guild',
    });
    dependencies.buildStreamAnnouncementChangePreview.mockReturnValue({
      content: 'preview',
    });
    dependencies.runCommand.mockImplementation(async (options) =>
      options.run({ editReply: dependencies.editReply }),
    );
  });

  it('registers all optional controls as an admin staging command', () => {
    const option = {
      setName: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      setMinLength: vi.fn().mockReturnThis(),
      setMaxLength: vi.fn().mockReturnThis(),
      addChoices: vi.fn().mockReturnThis(),
    };
    const builder = {
      setName: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      setDefaultMemberPermissions: vi.fn().mockReturnThis(),
      addStringOption: vi.fn((configure) => {
        configure(option);
        return builder;
      }),
    };
    const registerChatInputCommand = vi.fn((configure) => configure(builder));
    const command = new DaviUpdateAnnouncementCommand({} as never, {});

    command.registerApplicationCommands({ registerChatInputCommand } as never);

    expect(builder.addStringOption).toHaveBeenCalledTimes(8);
    expect(builder.setDefaultMemberPermissions).toHaveBeenCalledWith(32n);
  });

  it('prepares an ephemeral manual-push preview with provided edits', async () => {
    const interaction = makeInteraction({
      action: 'PUSH',
      game: 'Onimusha',
      music_mode: 'DICTATORSHIP',
      music_theme: 'Boss themes',
      stream_url: 'https://youtube.test/watch?v=stream',
      title: 'Launch night',
      type: 'GAME',
    });

    await DaviUpdateAnnouncementCommand.prototype.chatInputRun.call(
      { name: 'davi-update-announcement' },
      interaction as never,
    );

    expect(dependencies.prepareStreamAnnouncementChange).toHaveBeenCalledWith({
      action: 'PUSH',
      gameName: 'Onimusha',
      musicMode: 'DICTATORSHIP',
      musicTheme: 'Boss themes',
      requestedByUserId: 'user-1',
      streamKind: 'GAME',
      streamUrl: 'https://youtube.test/watch?v=stream',
      title: 'Launch night',
    });
    expect(dependencies.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        deferReplyOptions: { flags: MessageFlags.Ephemeral },
      }),
    );
    expect(dependencies.editReply).toHaveBeenCalledWith({ content: 'preview' });
  });

  it('prepares an explicit delete and defaults missing actions to update', async () => {
    const deleteInteraction = makeInteraction({
      action: 'DELETE',
      announcement_message: '123456789012345678',
      type: 'MUSIC',
    });
    await DaviUpdateAnnouncementCommand.prototype.chatInputRun.call(
      { name: 'davi-update-announcement' },
      deleteInteraction as never,
    );
    expect(
      dependencies.prepareStreamAnnouncementChange,
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        announcementMessageId: '123456789012345678',
        streamKind: 'MUSIC',
      }),
    );

    await DaviUpdateAnnouncementCommand.prototype.chatInputRun.call(
      { name: 'davi-update-announcement' },
      makeInteraction({}) as never,
    );
    expect(
      dependencies.prepareStreamAnnouncementChange,
    ).toHaveBeenLastCalledWith({
      action: 'UPDATE',
      requestedByUserId: 'user-1',
    });
  });
});
