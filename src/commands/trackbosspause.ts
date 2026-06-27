import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildBossTrackingEmbed } from '../modules/boss-tracking/boss-tracking.discord';
import { pauseLiveBossTracking } from '../modules/boss-tracking/boss-tracking.service';
import { runCommand } from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.TRACK_BOSS_PAUSE;

export class TrackBossPauseCommand extends Command {
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
              .setName('reason')
              .setDescription('Why tracking is paused')
              .setRequired(false),
          )
          .addIntegerOption((option) =>
            option
              .setName('current_deaths')
              .setDescription('Current run death count at pause')
              .setRequired(false)
              .setMinValue(0),
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
        const session = await pauseLiveBossTracking({
          guildId,
          reason: interaction.options.getString('reason'),
          currentDeaths: interaction.options.getInteger('current_deaths'),
        });

        return editReply({
          embeds: [
            buildBossTrackingEmbed({
              session,
              title: 'Boss Tracking Paused',
            }),
          ],
        });
      },
    });
  }
}
