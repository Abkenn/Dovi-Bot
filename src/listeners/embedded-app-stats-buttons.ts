import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import { BOT_GUILDS } from '../config/discord-access';
import { CommandExecutionStatus } from '../generated/prisma/client';
import { createInteractionExecutionLog } from '../modules/command-logging/command-logging.service';
import { launchEmbeddedAppStats } from '../modules/embedded-app/embedded-app-launch.service';
import { parseEmbeddedAppStatsButton } from '../modules/embedded-app/embedded-app-stats.discord';

const STATS_APP_ENTER_LOG_NAME = 'stats-app:enter';

const logStatsAppEnterSafely = async ({
  interaction,
  targetGame,
  status,
  durationMs,
  note,
}: {
  interaction: Interaction;
  targetGame: string | null;
  status: CommandExecutionStatus;
  durationMs: number;
  note?: string | null;
}) => {
  try {
    await createInteractionExecutionLog({
      interaction,
      commandName: STATS_APP_ENTER_LOG_NAME,
      optionsJson: {
        targetGame,
        customId: interaction.isButton() ? interaction.customId : null,
      },
      status,
      note: note ?? null,
      durationMs,
    });
  } catch (error) {
    console.error('Failed to log Stats app button interaction', error);
  }
};

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
    const startedAt = Date.now();

    if (!interaction.isButton()) {
      return;
    }

    const target = parseEmbeddedAppStatsButton(interaction.customId);

    if (!target) {
      return;
    }

    const isEmbeddedAppGuild =
      interaction.guildId === BOT_GUILDS.STAGING_ENV ||
      interaction.guildId === BOT_GUILDS.PROD_ENV;

    if (!isEmbeddedAppGuild) {
      await logStatsAppEnterSafely({
        interaction,
        targetGame: target.gameName,
        status: CommandExecutionStatus.DENIED,
        durationMs: Date.now() - startedAt,
        note: 'Live Stats is unavailable in this server.',
      });

      return interaction.reply({
        content: 'Live Stats is unavailable in this server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const response = await launchEmbeddedAppStats(
        interaction,
        target.gameName,
      );

      await logStatsAppEnterSafely({
        interaction,
        targetGame: target.gameName,
        status: CommandExecutionStatus.SUCCESS,
        durationMs: Date.now() - startedAt,
      });

      return response;
    } catch (error) {
      await logStatsAppEnterSafely({
        interaction,
        targetGame: target.gameName,
        status: CommandExecutionStatus.ERROR,
        durationMs: Date.now() - startedAt,
        note:
          error instanceof Error ? error.message : 'Activity launch failed.',
      });
      throw error;
    }
  }
}
