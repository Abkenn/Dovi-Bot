import {
  ComponentType,
  MessageFlags,
  ModalSubmitFields,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/command-runner/seasonal-theme.service', () => ({
  getBotSeasonalTheme: vi.fn().mockResolvedValue(null),
}));

vi.mock('@zod-schemas/env.zod', () => ({
  env: {
    DISCORD_STAGING_ENV_GUILD_ID: 'staging',
    DISCORD_PROD_ENV_GUILD_ID: 'prod',
    ENABLE_PROD_GUILD_COMMAND_REGISTRATION: true,
  },
}));
vi.mock('@sapphire/framework', () => ({
  Command: class {
    public constructor(_context: unknown, options: object) {
      Object.assign(this, options);
    }
  },
}));
const logging = vi.hoisted(() => ({
  createCommandExecutionLog: vi.fn(),
  createCommandErrorLog: vi.fn(),
}));
vi.mock(
  '../../src/modules/command-logging/command-logging.service',
  () => logging,
);

import { PlaygroundCommand } from '../../src/commands/playground';
import {
  refreshActivityInstances,
  registerActivityInstance,
} from '../../src/modules/embedded-app/activity-tracking.service';
import { handlePlaygroundInteraction } from '../../src/modules/playground/playground.service';

const commandInteraction = (
  guildId = 'staging',
  operator = true,
  subcommand = 'modal',
) => ({
  guildId,
  guild: null,
  member: null,
  memberPermissions: { has: () => operator },
  user: { id: 'alice' },
  options: {
    getSubcommand: () => subcommand,
    getString: (): string | null => null,
  },
  deferred: false,
  replied: false,
  deferReply: vi.fn(),
  editReply: vi.fn(),
  reply: vi.fn(),
});

const buttonInteraction = (guildId = 'staging', ownerId = 'alice') => ({
  isButton: () => true,
  isModalSubmit: () => false,
  customId: `playground:open:${ownerId}:${Date.now() + 600_000}`,
  guildId,
  user: { id: 'alice' },
  memberPermissions: { has: () => true },
  showModal: vi.fn(),
  reply: vi.fn(),
});

describe('playground command and component integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registers both experiments only in staging with Manage Server permission', () => {
    const builder = new SlashCommandBuilder();
    const registerChatInputCommand = vi.fn(
      (
        configure: (builder: SlashCommandBuilder) => unknown,
        _options: { guildIds: string[] },
      ) => configure(builder),
    );
    const command = new PlaygroundCommand({} as never, {});
    command.registerApplicationCommands({ registerChatInputCommand } as never);
    expect(builder.toJSON()).toMatchObject({
      name: 'playground',
      default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
      options: [{ name: 'modal' }, { name: 'activity' }],
    });
    expect(registerChatInputCommand.mock.calls[0]?.[1]).toEqual({
      guildIds: ['staging'],
    });
  });

  it('runs the real command runner and opens the modal from the private response button', async () => {
    const interaction = commandInteraction();
    await PlaygroundCommand.prototype.chatInputRun.call(
      { name: 'playground' } as PlaygroundCommand,
      interaction as never,
    );
    expect(interaction.deferReply).toHaveBeenCalledWith({
      flags: MessageFlags.Ephemeral,
    });
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ components: expect.any(Array) }),
    );
    const button = buttonInteraction();
    await handlePlaygroundInteraction(button as never);
    expect(button.showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Discord component playground',
        }),
      }),
    );
    expect(logging.createCommandExecutionLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SUCCESS' }),
    );
  });

  it.each([
    ['prod', true],
    ['staging', false],
  ])('rejects command access in %s with operator=%s before defer', async (guildId, operator) => {
    const interaction = commandInteraction(guildId, operator);
    await PlaygroundCommand.prototype.chatInputRun.call(
      { name: 'playground' } as PlaygroundCommand,
      interaction as never,
    );
    expect(interaction.deferReply).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
    expect(logging.createCommandExecutionLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'DENIED' }),
    );
  });

  it.each([
    ['prod', 'alice'],
    ['staging', 'bob'],
  ])('rejects component access in %s for owner %s', async (guildId, ownerId) => {
    const button = buttonInteraction(guildId, ownerId);
    await handlePlaygroundInteraction(button as never);
    expect(button.showModal).not.toHaveBeenCalled();
    expect(button.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it('reads real modal field getters and replies privately without changing settings', async () => {
    const button = buttonInteraction();
    const fields: ModalSubmitFields = Reflect.construct(ModalSubmitFields, [
      [
        {
          type: ComponentType.Label,
          component: {
            type: ComponentType.RadioGroup,
            customId: 'stream-type',
            value: 'music',
          },
        },
        {
          type: ComponentType.Label,
          component: {
            type: ComponentType.CheckboxGroup,
            customId: 'features',
            values: ['stats', 'music'],
          },
        },
        {
          type: ComponentType.Label,
          component: {
            type: ComponentType.Checkbox,
            customId: 'reminders',
            value: true,
          },
        },
      ],
    ]);
    const interaction = {
      ...button,
      customId: `playground:modal:alice:${Date.now() + 600_000}`,
      isButton: () => false,
      isModalSubmit: () => true,
      fields,
    };
    await handlePlaygroundInteraction(interaction as never);
    expect(interaction.reply).toHaveBeenCalledWith({
      content:
        'Modal demo submitted. No settings changed.\nStream type: music\nFeatures: stats, music\nReminders: enabled',
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    });
  });

  it('explains Discord rollout rejection and does not hide unrelated errors', async () => {
    const button = buttonInteraction();
    button.showModal.mockRejectedValue({ code: 50035 });
    await handlePlaygroundInteraction(button as never);
    expect(button.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('may not be enabled'),
      }),
    );
    button.showModal.mockRejectedValue(new Error('Offline'));
    await expect(handlePlaygroundInteraction(button as never)).rejects.toThrow(
      'Offline',
    );
  });

  it('rejects expired controls, including after a restart', async () => {
    const button = buttonInteraction();
    button.customId = `playground:open:alice:${Date.now() - 1}`;
    await handlePlaygroundInteraction(button as never);
    expect(button.showModal).not.toHaveBeenCalled();
    expect(button.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('expired') }),
    );
  });

  it('inspects production presence privately from staging without mixing environments', async () => {
    registerActivityInstance({
      instanceId: 'prod-instance',
      guildId: 'prod',
      channelId: 'prod-channel',
      launchedByUserId: 'operator',
      target: 'Elden Ring',
    });
    await refreshActivityInstances(async () => ({
      instanceId: 'prod-instance',
      location: { guildId: 'prod', channelId: 'prod-channel' },
      users: ['participant'],
    }));
    const interaction = commandInteraction('staging', true, 'activity');
    interaction.options.getString = () => 'prod';
    await PlaygroundCommand.prototype.chatInputRun.call(
      { name: 'playground' } as PlaygroundCommand,
      interaction as never,
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('<@participant>'),
        allowedMentions: { parse: [] },
      }),
    );
    interaction.options.getString = () => null;
    interaction.editReply.mockClear();
    await PlaygroundCommand.prototype.chatInputRun.call(
      { name: 'playground' } as PlaygroundCommand,
      interaction as never,
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('No tracked Activity instances'),
      }),
    );
  });
});
