import { Listener } from '@sapphire/framework';
import {
  type APIMessageTopLevelComponent,
  ComponentType,
  Events,
  type Interaction,
  MessageFlags,
} from 'discord.js';
import { BOT_GUILDS } from '../config/discord-access';
import { CommandExecutionStatus } from '../generated/prisma/client';
import { getNumberProperty } from '../lib/type-guards';
import { createInteractionExecutionLog } from '../modules/command-logging/command-logging.service';
import { trackInteractionComponentReply } from '../modules/discord/component-lifecycle';
import {
  launchEmbeddedAppStats,
  replyWithEmbeddedAppStatsLink,
} from '../modules/embedded-app/embedded-app-launch.service';
import { parseEmbeddedAppStatsButton } from '../modules/embedded-app/embedded-app-stats.discord';
import { resolveMusicActivityButtonTarget } from '../modules/music/music-activity.discord';

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
    try {
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
        await interaction.reply({
          content: 'Live Stats is unavailable in this server.',
          flags: MessageFlags.Ephemeral,
        });
        await logStatsAppEnterSafely({
          interaction,
          targetGame: target.gameName,
          status: CommandExecutionStatus.DENIED,
          durationMs: Date.now() - startedAt,
          note: 'Live Stats is unavailable in this server.',
        });

        return;
      }

      try {
        const launchTarget = resolveMusicActivityButtonTarget(target.gameName);
        if (target.gameName && !launchTarget) {
          const components = interaction.message.components.flatMap(
            (row): APIMessageTopLevelComponent[] => {
              const component = row.toJSON();
              if (component.type !== ComponentType.ActionRow)
                return [component];
              const remaining = component.components.filter(
                (button) =>
                  !(
                    'custom_id' in button &&
                    button.custom_id === interaction.customId
                  ),
              );
              return remaining.length
                ? [{ ...component, components: remaining }]
                : [];
            },
          );
          await interaction.update({ components });
          return;
        }
        const result = interaction.channel?.isThread()
          ? await replyWithEmbeddedAppStatsLink(interaction, launchTarget)
          : await launchEmbeddedAppStats(interaction, launchTarget);

        await logStatsAppEnterSafely({
          interaction,
          targetGame: target.gameName,
          status: result.launched
            ? CommandExecutionStatus.SUCCESS
            : CommandExecutionStatus.ERROR,
          durationMs: Date.now() - startedAt,
          note: result.note,
        });

        return;
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
    } catch (error) {
      if (getNumberProperty(error, 'code') !== 10062) throw error;
    } finally {
      await trackInteractionComponentReply(interaction);
    }
  }
}
