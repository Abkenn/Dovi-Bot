import { MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamKind } from '../../src/generated/prisma/client';

const dependencies = vi.hoisted(() => ({
  changeStreamSchedule: vi.fn(),
  editReply: vi.fn(),
  getStreamInfoEmbed: vi.fn(),
  refreshGuildStreamInfoMessages: vi.fn(),
  runCommand: vi.fn(),
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
    CHANGE_SCHEDULE: {
      name: 'changeschedule',
      description: 'Changes one scheduled stream type.',
      guildIds: ['staging-guild', 'production-guild'],
    },
    DAVI_CHANGE_SCHEDULE: {
      name: 'davichangeschedule',
      description: 'Changes one prod scheduled stream type.',
      guildIds: ['staging-guild'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  EPHEMERAL_COMMAND_REPLY: { flags: MessageFlags.Ephemeral },
  runCommand: dependencies.runCommand,
}));
vi.mock('../../src/modules/stream-info/stream-info.discord', () => ({
  getStreamInfoEmbed: dependencies.getStreamInfoEmbed,
}));
vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  changeStreamSchedule: dependencies.changeStreamSchedule,
}));
vi.mock(
  '../../src/modules/stream-info/stream-info-message-updater.service',
  () => ({
    refreshGuildStreamInfoMessages: dependencies.refreshGuildStreamInfoMessages,
  }),
);

import { ChangeScheduleCommand } from '../../src/commands/changeschedule';
import { DaviChangeScheduleCommand } from '../../src/commands/davichangeschedule';

type CommandConstructor =
  | typeof ChangeScheduleCommand
  | typeof DaviChangeScheduleCommand;

const register = (CommandClass: CommandConstructor) => {
  const option = {
    setName: vi.fn().mockReturnThis(),
    setDescription: vi.fn().mockReturnThis(),
    setRequired: vi.fn().mockReturnThis(),
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
  const command = new CommandClass({} as never, {} as never);
  command.registerApplicationCommands({ registerChatInputCommand } as never);
  return { builder, option, registerChatInputCommand };
};

const makeInteraction = (day: string, type: string) => ({
  options: {
    getString: vi.fn((name: string) => (name === 'day' ? day : type)),
  },
});

describe('change schedule commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.getStreamInfoEmbed.mockResolvedValue({ title: 'Stream Info' });
    dependencies.runCommand.mockImplementation(async (options) =>
      options.run({
        editReply: dependencies.editReply,
        preflight: 'interaction-guild',
      }),
    );
  });

  it('registers required day and type choices as admin commands', () => {
    const regular = register(ChangeScheduleCommand);
    const davi = register(DaviChangeScheduleCommand);

    expect(regular.builder.setDefaultMemberPermissions).toHaveBeenCalledWith(
      32n,
    );
    expect(regular.builder.addStringOption).toHaveBeenCalledTimes(2);
    expect(regular.option.setRequired).toHaveBeenCalledWith(true);
    expect(regular.registerChatInputCommand).toHaveBeenCalledWith(
      expect.any(Function),
      { guildIds: ['staging-guild', 'production-guild'] },
    );
    expect(davi.registerChatInputCommand).toHaveBeenCalledWith(
      expect.any(Function),
      { guildIds: ['staging-guild'] },
    );
  });

  it('changes the selected day and type in the interaction guild', async () => {
    await ChangeScheduleCommand.prototype.chatInputRun.call(
      { container: { client: { id: 'client' } }, name: 'changeschedule' },
      makeInteraction('FRIDAY', StreamKind.GAME) as never,
    );

    expect(dependencies.changeStreamSchedule).toHaveBeenCalledWith({
      guildId: 'interaction-guild',
      targetWeekday: 'FRIDAY',
      streamKind: StreamKind.GAME,
    });
    expect(dependencies.refreshGuildStreamInfoMessages).toHaveBeenCalledWith({
      client: { id: 'client' },
      guildId: 'interaction-guild',
    });
  });

  it('changes the selected prod schedule from staging', async () => {
    await DaviChangeScheduleCommand.prototype.chatInputRun.call(
      { container: { client: { id: 'client' } }, name: 'davichangeschedule' },
      makeInteraction('SATURDAY', StreamKind.MUSIC) as never,
    );

    expect(dependencies.changeStreamSchedule).toHaveBeenCalledWith({
      guildId: 'production-guild',
      targetWeekday: 'SATURDAY',
      streamKind: StreamKind.MUSIC,
    });
    expect(dependencies.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Prod env schedule updated.' }),
    );
  });
});
