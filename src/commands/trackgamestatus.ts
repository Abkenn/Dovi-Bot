import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { getLiveGameTrackingStatus } from '../modules/boss-tracking/boss-tracking.service';
import { buildGameTrackingStatusEmbed } from '../modules/boss-tracking/boss-tracking-game-status.discord';
import { runCommand } from '../modules/command-runner/run-command';
import { buildEmbeddedAppStatsButton } from '../modules/embedded-app/embedded-app-stats.discord';

const METADATA = COMMAND_METADATA.TRACK_GAME_STATUS;

export class TrackGameStatusCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: METADATA.name,
      description: METADATA.description,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption((option) =>
            option
              .setName('game')
              .setDescription('Game name, defaults to the stream game')
              .setRequired(false)
              .setAutocomplete(true),
          ),
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
        const status = await getLiveGameTrackingStatus({
          guildId,
          gameName: interaction.options.getString('game'),
        });
        const statsButton = buildEmbeddedAppStatsButton(
          guildId,
          status.gameName,
        );

        return editReply({
          embeds: [buildGameTrackingStatusEmbed(status)],
          components: statsButton ? [statsButton] : [],
        });
      },
    });
  }
}
