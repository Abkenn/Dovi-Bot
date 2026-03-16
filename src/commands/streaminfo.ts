import { Command } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import { getStreamInfo } from '../modules/stream-info/stream-info.service';

export class StreamInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'streaminfo',
      description: 'Shows current and next stream information.',
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
    await interaction.deferReply();

    const guildId = interaction.guildId ?? env.DISCORD_GUILD_ID;
    const streamInfo = await getStreamInfo(guildId);
    const embed = buildStreamInfoEmbed(streamInfo);

    return interaction.editReply({
      embeds: [embed],
    });
  }
}
