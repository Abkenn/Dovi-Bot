import { Command } from '@sapphire/framework';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildShowBossStatsEmbed } from '../modules/boss-encounter-stats/boss/boss-encounter-stats.discord';
import { getBossView } from '../modules/bosses/bosses.service';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';

const METADATA = COMMAND_METADATA.SHOW_BOSS_STATS;

export class ShowBossStatsCommand extends Command {
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
              .setDescription('Game name')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('boss')
              .setDescription('Boss name')
              .setRequired(true)
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
    return withCommandLogging({
      interaction,
      commandName: this.name,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
      run: async ({ editReply }) => {
        const boss = await getBossView({
          gameName: interaction.options.getString('game', true),
          bossName: interaction.options.getString('boss', true),
        });

        return editReply({
          embeds: [buildShowBossStatsEmbed(boss)],
        });
      },
    });
  }
}
