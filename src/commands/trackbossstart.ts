import { Command } from '@sapphire/framework';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildBossTrackingEmbed } from '../modules/boss-tracking/boss-tracking.discord';
import { startLiveBossTracking } from '../modules/boss-tracking/boss-tracking.service';
import { runCommand } from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.TRACK_BOSS_START;

export class TrackBossStartCommand extends Command {
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
              .setDescription('Boss name')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('game')
              .setDescription('Game name, defaults to the stream game')
              .setRequired(false),
          )
          .addIntegerOption((option) =>
            option
              .setName('deaths')
              .setDescription('Current run death count before this boss')
              .setRequired(false)
              .setMinValue(0),
          )
          .addIntegerOption((option) =>
            option
              .setName('started_ago_seconds')
              .setDescription('How many seconds ago this boss attempt started')
              .setRequired(false)
              .setMinValue(0),
          )
          .addStringOption((option) =>
            option
              .setName('vod_time')
              .setDescription('Optional VOD start time, like 12:34 or 1:23:45')
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('vod')
              .setDescription('Optional VOD/stream label')
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('aliases')
              .setDescription('Names people type for the boss, comma-separated')
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('weak_aliases')
              .setDescription('Advanced: ambiguous names that need tag context')
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('tags')
              .setDescription(
                'Context words like area/game shorthand, comma-separated',
              )
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
        const session = await startLiveBossTracking({
          guildId,
          channelId: interaction.channelId,
          trackerUserId: interaction.user.id,
          gameName: interaction.options.getString('game'),
          bossName: interaction.options.getString('boss', true),
          startDeaths: interaction.options.getInteger('deaths') ?? 0,
          startedAgoSeconds: interaction.options.getInteger(
            'started_ago_seconds',
          ),
          aliases: interaction.options.getString('aliases'),
          weakAliases: interaction.options.getString('weak_aliases'),
          contextWords: interaction.options.getString('tags'),
          vod: interaction.options.getString('vod'),
          vodTime: interaction.options.getString('vod_time'),
        });

        return editReply({
          embeds: [
            buildBossTrackingEmbed({
              session,
              title: 'Boss Tracking Started',
            }),
          ],
        });
      },
    });
  }
}
