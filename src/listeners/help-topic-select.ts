import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import {
  ADMIN_COMMAND_PERMISSION,
  isAllowedGuildForCommand,
} from '../config/discord-access';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { CommandExecutionStatus } from '../generated/prisma/client';
import { createInteractionExecutionLog } from '../modules/command-logging/command-logging.service';
import {
  buildHelpMessage,
  HELP_TOPIC_SELECT_CUSTOM_ID,
  isHelpTopicValue,
} from '../modules/help/help.discord';

const HELP_TOPIC_SELECT_LOG_NAME = 'help:topic-select';

const logHelpTopicSelectSafely = async ({
  interaction,
  status,
  topic,
  source,
  durationMs,
  note,
}: {
  interaction: Interaction;
  status: CommandExecutionStatus;
  topic: string | null;
  source: 'public' | 'ephemeral' | 'unknown';
  durationMs: number | null;
  note?: string | null;
}) => {
  try {
    await createInteractionExecutionLog({
      interaction,
      commandName: HELP_TOPIC_SELECT_LOG_NAME,
      optionsJson: {
        topic,
        source,
        customId: interaction.isStringSelectMenu()
          ? interaction.customId
          : null,
      },
      status,
      note: note ?? null,
      durationMs,
    });
  } catch (error) {
    console.error('Failed to log help topic select interaction', error);
  }
};

export class HelpTopicSelectListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.InteractionCreate,
    });
  }

  public override async run(interaction: Interaction) {
    const startedAt = Date.now();

    if (!interaction.isStringSelectMenu()) {
      return;
    }

    if (interaction.customId !== HELP_TOPIC_SELECT_CUSTOM_ID) {
      return;
    }

    const guildId = interaction.guildId;
    const topic = interaction.values[0];
    const source = interaction.message.flags.has(MessageFlags.Ephemeral)
      ? 'ephemeral'
      : 'public';

    if (
      !guildId ||
      !isAllowedGuildForCommand(guildId, COMMAND_METADATA.HELP.guildIds) ||
      !topic ||
      !isHelpTopicValue(topic)
    ) {
      await logHelpTopicSelectSafely({
        interaction,
        status: CommandExecutionStatus.DENIED,
        topic: topic ?? null,
        source,
        durationMs: Date.now() - startedAt,
        note: 'Help topic select is no longer available.',
      });

      return interaction.reply({
        content: 'This help menu is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const helpMessage = buildHelpMessage({
      canManageGuild:
        interaction.memberPermissions?.has(ADMIN_COMMAND_PERMISSION) ?? false,
      guildId,
      topic,
    });

    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      const response = await interaction.update(helpMessage);

      await logHelpTopicSelectSafely({
        interaction,
        status: CommandExecutionStatus.SUCCESS,
        topic,
        source,
        durationMs: Date.now() - startedAt,
      });

      return response;
    }

    const response = await interaction.reply({
      components: helpMessage.components ?? [],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    await logHelpTopicSelectSafely({
      interaction,
      status: CommandExecutionStatus.SUCCESS,
      topic,
      source,
      durationMs: Date.now() - startedAt,
    });

    return response;
  }
}
