import { Command } from '@sapphire/framework';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildBossTrackingEmbed } from '../modules/boss-tracking/boss-tracking.discord';
import { recordLiveBossDeath } from '../modules/boss-tracking/boss-tracking.service';
import { runCommand } from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.TRACK_BOSS_DEATH;

export class TrackBossDeathCommand extends Command {
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
              .setName('vod_time')
              .setDescription('Optional VOD death time, like 12:34 or 1:23:45')
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
        const session = await recordLiveBossDeath({
          guildId,
          vodTime: interaction.options.getString('vod_time'),
        });

        return editReply({
          embeds: [
            buildBossTrackingEmbed({
              session,
              title: 'Boss Death Recorded',
            }),
          ],
        });
      },
    });
  }
}
