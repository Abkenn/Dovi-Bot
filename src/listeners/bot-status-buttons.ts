import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import {
  BOT_GUILDS,
  isAllowedGuildForCommand,
} from '../config/discord-access';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  BOT_STATUS_REFRESH_CUSTOM_ID,
  buildBotStatusMessage,
} from '../modules/bot-status/bot-status.discord';
import { fetchBotStatus } from '../modules/bot-status/bot-status.service';

export class BotStatusButtonsListener extends Listener {
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
    if (!interaction.isButton()) {
      return;
    }

    if (interaction.customId !== BOT_STATUS_REFRESH_CUSTOM_ID) {
      return;
    }

    const guildId = interaction.guildId;

    if (
      !guildId ||
      !isAllowedGuildForCommand(guildId, COMMAND_METADATA.BOT_STATUS.guildIds)
    ) {
      return interaction.reply({
        content: 'This status check is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const status = await fetchBotStatus({
        includeDatabase: guildId === BOT_GUILDS.STAGING_ENV,
      });

      return interaction.update(buildBotStatusMessage(status));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong while checking bot status.';

      return interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
