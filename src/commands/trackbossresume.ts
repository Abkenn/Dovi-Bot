import { Command } from '@sapphire/framework';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildBossTrackingEmbed } from '../modules/boss-tracking/boss-tracking.discord';
import { resumeLiveBossTracking } from '../modules/boss-tracking/boss-tracking.service';
import { runCommand } from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.TRACK_BOSS_RESUME;

export class TrackBossResumeCommand extends Command {
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
              .setName('boss')
              .setDescription('Boss to resume, defaults to latest focused boss')
              .setRequired(false)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('game')
              .setDescription('Game name, defaults to the stream game')
              .setRequired(false)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('vod_time')
              .setDescription('Optional VOD resume time, like 12:34 or 1:23:45')
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('vod')
              .setDescription('Optional new VOD/stream label')
              .setRequired(false),
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
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
      run: async ({ editReply, preflight: guildId }) => {
        const session = await resumeLiveBossTracking({
          guildId,
          gameName: interaction.options.getString('game'),
          bossName: interaction.options.getString('boss'),
          vod: interaction.options.getString('vod'),
          vodTime: interaction.options.getString('vod_time'),
        });

        return editReply({
          embeds: [
            buildBossTrackingEmbed({
              session,
              title: 'Boss Tracking Resumed',
            }),
          ],
        });
      },
    });
  }
}
