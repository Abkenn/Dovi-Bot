import { Command } from '@sapphire/framework';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildBossTrackingEmbed } from '../modules/boss-tracking/boss-tracking.discord';
import { endLiveBossTracking } from '../modules/boss-tracking/boss-tracking.service';
import { runCommand } from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.TRACK_BOSS_END;

export class TrackBossEndCommand extends Command {
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
              .setName('result')
              .setDescription('How tracking ended, defaults to killed')
              .setRequired(false)
              .addChoices(
                { name: 'Killed', value: 'killed' },
                { name: 'Abandoned', value: 'abandoned' },
              ),
          )
          .addIntegerOption((option) =>
            option
              .setName('boss_deaths')
              .setDescription('Final deaths to this boss, if correcting')
              .setRequired(false)
              .setMinValue(0),
          )
          .addIntegerOption((option) =>
            option
              .setName('game_deaths')
              .setDescription('Current total game deaths after this boss')
              .setRequired(false)
              .setMinValue(0),
          )
          .addNumberOption((option) =>
            option
              .setName('total_minutes')
              .setDescription('Optional VOD/manual total tracked minutes')
              .setRequired(false)
              .setMinValue(0),
          )
          .addStringOption((option) =>
            option
              .setName('vod_time')
              .setDescription('Optional VOD end time, like 12:34 or 1:23:45')
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
        const totalMinutes = interaction.options.getNumber('total_minutes');
        const bossDeaths = interaction.options.getInteger('boss_deaths');
        const gameDeaths = interaction.options.getInteger('game_deaths');
        const session = await endLiveBossTracking({
          guildId,
          result: interaction.options.getString('result') ?? 'killed',
          ...(bossDeaths === null ? {} : { bossDeaths }),
          ...(gameDeaths === null ? {} : { gameDeaths }),
          ...(totalMinutes === null ? {} : { totalMinutes }),
          vodTime: interaction.options.getString('vod_time'),
        });

        return editReply({
          embeds: [
            buildBossTrackingEmbed({
              session,
              title: 'Boss Tracking Ended',
            }),
          ],
        });
      },
    });
  }
}
