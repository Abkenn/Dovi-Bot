import { Command } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';
import { MessageFlags } from 'discord.js';
import { withCommandLogging } from 'src/modules/command-logging/with-command-logging';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import {
  getStreamInfo,
  setDefaultGameName,
} from '../modules/stream-info/stream-info.service';

export class SetGameCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'setgame',
      description: 'Sets the default game for future regular game streams.',
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
              .setDescription('Default game name')
              .setRequired(true),
          ),
      {
        guildIds: [env.DISCORD_GUILD_ID],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return withCommandLogging({
      interaction,
      commandName: this.name,
      run: async () => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guildId = interaction.guildId ?? env.DISCORD_GUILD_ID;
        const game = interaction.options.getString('game', true);

        await setDefaultGameName(guildId, game);

        const streamInfo = await getStreamInfo(guildId);
        const embed = buildStreamInfoEmbed(streamInfo);

        return interaction.editReply({
          content: `Default game for future regular game streams updated to **${game}**.`,
          embeds: [embed],
        });
      },
    });
  }
}
