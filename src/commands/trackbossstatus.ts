import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildBossTrackingEmbed } from '../modules/boss-tracking/boss-tracking.discord';
import { getLiveBossTrackingStatus } from '../modules/boss-tracking/boss-tracking.service';
import { runCommand } from '../modules/command-runner/run-command';
import { buildEmbeddedAppStatsButton } from '../modules/embedded-app/embedded-app-stats.discord';

const METADATA = COMMAND_METADATA.TRACK_BOSS_STATUS;

export class TrackBossStatusCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: METADATA.name,
      description: METADATA.description,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
      {
        guildIds: [...METADATA.guildIds],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, preflight: guildId }) => {
        const session = await getLiveBossTrackingStatus().catch((error) => {
          if (
            error instanceof Error &&
            error.message === 'No boss tracking session has been recorded yet.'
          ) {
            return null;
          }

          throw error;
        });

        if (!session) {
          const statsButton = buildEmbeddedAppStatsButton(
            guildId,
            null,
            interaction.channel?.isThread() ?? false,
          );

          return editReply({
            content:
              'No boss is being tracked right now. Use `/trackbossstart` when Davi reaches one.',
            embeds: [],
            components: statsButton ? [statsButton] : [],
          });
        }

        const statsButton = buildEmbeddedAppStatsButton(
          guildId,
          session.game.name,
          interaction.channel?.isThread() ?? false,
        );

        return editReply({
          embeds: [
            buildBossTrackingEmbed({
              session,
              title: 'Boss Tracking Status',
            }),
          ],
          components: statsButton ? [statsButton] : [],
        });
      },
    });
  }
}
