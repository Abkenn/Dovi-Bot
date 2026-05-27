import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import {
  ADMIN_COMMAND_PERMISSION,
  isAllowedGuildForCommand,
} from '../config/discord-access';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  buildHelpMessage,
  HELP_TOPIC_SELECT_CUSTOM_ID,
  isHelpTopicValue,
} from '../modules/help/help.discord';

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
    if (!interaction.isStringSelectMenu()) {
      return;
    }

    if (interaction.customId !== HELP_TOPIC_SELECT_CUSTOM_ID) {
      return;
    }

    const guildId = interaction.guildId;
    const topic = interaction.values[0];

    if (
      !guildId ||
      !isAllowedGuildForCommand(guildId, COMMAND_METADATA.HELP.guildIds) ||
      !topic ||
      !isHelpTopicValue(topic)
    ) {
      return interaction.reply({
        content: 'This help menu is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.update(
      buildHelpMessage({
        canManageGuild:
          interaction.memberPermissions?.has(ADMIN_COMMAND_PERMISSION) ?? false,
        guildId,
        topic,
      }),
    );
  }
}
