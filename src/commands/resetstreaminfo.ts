import { Command } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';
import { MessageFlags } from 'discord.js';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import {
  getStreamInfo,
  resetStreamInfo,
} from '../modules/stream-info/stream-info.service';

export class ResetStreamInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'resetstreaminfo',
      description:
        'Deletes the current or next stream override and reverts to defaults.',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
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

        await resetStreamInfo(guildId);

        const streamInfo = await getStreamInfo(guildId);
        const embed = buildStreamInfoEmbed(streamInfo);

        return interaction.editReply({
          content: 'Stream override reset to defaults.',
          embeds: [embed],
        });
      },
    });
  }
}
