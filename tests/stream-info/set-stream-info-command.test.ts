import { MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  editReply: vi.fn(),
  getStreamInfoEmbed: vi.fn(),
  refreshRelevantTrackedStreamAnnouncements: vi.fn(),
  runCommand: vi.fn(),
  setStreamInfo: vi.fn(),
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
  assertCommandAccess: vi.fn(),
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: {
    SET_STREAM_INFO: {
      name: 'setstreaminfo',
      description: 'Updates stream info.',
      guildIds: ['staging-guild', 'production-guild'],
    },
    DAVI_SET_STREAM_INFO: {
      name: 'davisetstreaminfo',
      description: 'Updates prod stream info.',
      guildIds: ['staging-guild'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  EPHEMERAL_COMMAND_REPLY: { flags: MessageFlags.Ephemeral },
  runCommand: dependencies.runCommand,
}));
vi.mock(
  '../../src/modules/stream-info/stream-announcement-refresh.service',
  () => ({
    refreshRelevantTrackedStreamAnnouncements:
      dependencies.refreshRelevantTrackedStreamAnnouncements,
  }),
);
vi.mock('../../src/modules/stream-info/stream-info.discord', () => ({
  getStreamInfoEmbed: dependencies.getStreamInfoEmbed,
}));
vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  setStreamInfo: dependencies.setStreamInfo,
}));

import { DaviSetStreamInfoCommand } from '../../src/commands/davisetstreaminfo';
import { SetStreamInfoCommand } from '../../src/commands/setstreaminfo';

type CommandConstructor =
  | typeof SetStreamInfoCommand
  | typeof DaviSetStreamInfoCommand;

const register = (CommandClass: CommandConstructor) => {
  const option = {
    addChoices: vi.fn().mockReturnThis(),
    setAutocomplete: vi.fn().mockReturnThis(),
    setDescription: vi.fn().mockReturnThis(),
    setName: vi.fn().mockReturnThis(),
  };
  const builder = {
    addBooleanOption: vi.fn((configure) => {
      configure(option);
      return builder;
    }),
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
  return { builder, option };
};

const makeInteraction = (combined: boolean) => ({
  options: {
    getBoolean: vi.fn((name: string) =>
      name === 'combined' ? combined : null,
    ),
    getString: vi.fn(() => null),
  },
});

describe('set stream info commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.getStreamInfoEmbed.mockResolvedValue({ title: 'Stream Info' });
    dependencies.setStreamInfo.mockResolvedValue({
      streamDateKey: '2026-09-11',
    });
    dependencies.runCommand.mockImplementation(async (options) =>
      options.run({
        editReply: dependencies.editReply,
        preflight: 'interaction-guild',
      }),
    );
  });

  it('registers the combined option on both commands', () => {
    const regular = register(SetStreamInfoCommand);
    const davi = register(DaviSetStreamInfoCommand);

    expect(regular.builder.addBooleanOption).toHaveBeenCalledOnce();
    expect(davi.builder.addBooleanOption).toHaveBeenCalledOnce();
    expect(regular.option.setName).toHaveBeenCalledWith('combined');
    expect(davi.option.setName).toHaveBeenCalledWith('combined');
  });

  it('sets a combined stream and refreshes its tracked announcement', async () => {
    await SetStreamInfoCommand.prototype.chatInputRun.call(
      { container: { client: { id: 'client' } }, name: 'setstreaminfo' },
      makeInteraction(true) as never,
    );

    expect(dependencies.setStreamInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        combined: true,
        guildId: 'interaction-guild',
      }),
    );
    expect(
      dependencies.refreshRelevantTrackedStreamAnnouncements,
    ).toHaveBeenCalledWith({
      additionalStreamDateKey: '2026-09-11',
      client: { id: 'client' },
      guildId: 'interaction-guild',
    });
  });

  it('updates prod from the davi command with the same combined behavior', async () => {
    await DaviSetStreamInfoCommand.prototype.chatInputRun.call(
      { container: { client: { id: 'client' } }, name: 'davisetstreaminfo' },
      makeInteraction(false) as never,
    );

    expect(dependencies.setStreamInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        combined: false,
        guildId: 'production-guild',
      }),
    );
    expect(
      dependencies.refreshRelevantTrackedStreamAnnouncements,
    ).toHaveBeenCalledWith({
      additionalStreamDateKey: '2026-09-11',
      client: { id: 'client' },
      guildId: 'production-guild',
    });
  });
});
