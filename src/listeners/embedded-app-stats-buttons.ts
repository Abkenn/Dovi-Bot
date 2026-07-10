import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import { BOT_GUILDS } from '../config/discord-access';
import { launchEmbeddedAppStats } from '../modules/embedded-app/embedded-app-launch.service';
import { EMBEDDED_APP_STATS_CUSTOM_ID } from '../modules/stream-info/stream-info.discord';

export class EmbeddedAppStatsButtonsListener extends Listener {
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
    if (
      !interaction.isButton() ||
      interaction.customId !== EMBEDDED_APP_STATS_CUSTOM_ID
    ) {
      return;
    }

    if (interaction.guildId !== BOT_GUILDS.STAGING_ENV) {
      return interaction.reply({
        content: 'Live Stats is currently available only in staging.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return launchEmbeddedAppStats(interaction);
  }
}
